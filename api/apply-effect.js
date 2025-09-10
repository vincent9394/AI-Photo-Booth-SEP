import { formidable } from 'formidable';
import fs from 'fs';

// This tells Vercel to not use its default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const form = formidable({});

  try {
    const [fields, files] = await form.parse(req);
    const imageFile = files.image_file?.[0];
    const prompt = fields.prompt?.[0];

    if (!imageFile || !prompt) {
      return res.status(400).json({ error: 'Image file and prompt are required.' });
    }

    // Convert the uploaded file to a base64 string for the API
    const fileContent = fs.readFileSync(imageFile.filepath);
    const base64ImageData = fileContent.toString('base64');
    
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    // We use the gemini-2.5-flash-image-preview model, which is designed for image editing
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: imageFile.mimetype, data: base64ImageData } }
        ]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'] // We only want the image back
      },
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.json();
      console.error('AI Effect API Error:', error);
      return res.status(apiResponse.status).json({ error: 'Failed to get a valid response from the AI service.' });
    }

    const result = await apiResponse.json();
    const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

    if (!base64Data) {
      console.error('No image data in AI response:', result);
      return res.status(500).json({ error: 'AI did not return an image. It might have been blocked for safety reasons.' });
    }
    
    // Send the new image back to the frontend
    res.status(200).json({ base64Data });

  } catch (error) {
    console.error('Error in apply-effect function:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
