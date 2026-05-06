// Proxy set-mode request to Flask backend
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const flaskUrl = process.env.FLASK_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${flaskUrl}/set-mode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });

        if (!response.ok) {
            throw new Error(`Flask backend responded with status: ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error calling Flask set-mode:', error);
        res.status(200).json({ status: 'ok', flaskAvailable: false });
    }
}
