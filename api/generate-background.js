export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Vercel automatically parses JSON bodies, so we can access it directly
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Securely access the API key from environment variables
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    
    const payload = {
        instances: [{ prompt: prompt }],
        parameters: { "sampleCount": 1 }
    };

    try {
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            const error = await apiResponse.json();
            console.error('API Error Response:', error);
            return res.status(apiResponse.status).json({ error: error.error?.message || 'Failed to get a valid response from the AI service.' });
        }

        const result = await apiResponse.json();
        // Send the successful result back to the frontend
        res.status(200).json(result);

    } catch (error) {
        console.error('Error in generate-background function:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
