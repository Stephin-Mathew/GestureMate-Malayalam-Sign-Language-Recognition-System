// Proxy patch-sentence request to Flask backend
// This allows the frontend to correct the sentence state after a backspace
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sentence } = req.body || {};
    if (typeof sentence !== 'string') {
        return res.status(400).json({ error: 'sentence string is required' });
    }

    try {
        const flaskUrl = process.env.FLASK_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${flaskUrl}/patch-sentence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sentence }),
        });

        if (!response.ok) {
            throw new Error(`Flask responded with ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error patching Flask sentence:', error);
        res.status(200).json({ status: 'ok', flaskAvailable: false });
    }
}
