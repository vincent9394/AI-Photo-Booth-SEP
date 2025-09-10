import { formidable } from 'formidable';
import fs from 'fs';

// This tells Vercel to not use its default body parser, as we are handling it ourselves
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

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const apiFormData = new FormData();
    const fileContent = fs.readFileSync(imageFile.filepath);
    apiFormData.append('image_file', new Blob([fileContent]), imageFile.originalFilename);
    apiFormData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        // Securely access the API key from environment variables
        'X-Api-Key': process.env.REMOVE_BG_API_KEY,
      },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('remove.bg API Error:', errorData);
      return res.status(response.status).json(errorData);
    }

    const imageBlob = await response.blob();
    const buffer = Buffer.from(await imageBlob.arrayBuffer());
    
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);

  } catch (error) {
    console.error('Error in remove-background function:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
