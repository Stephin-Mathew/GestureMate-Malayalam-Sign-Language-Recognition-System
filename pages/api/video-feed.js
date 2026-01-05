// Proxy video feed from Flask backend
// Note: For better performance, configure CORS in Flask and connect directly
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const flaskUrl = process.env.FLASK_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${flaskUrl}/video_feed`, {
            headers: {
                'Accept': 'multipart/x-mixed-replace; boundary=frame',
            },
        });

        if (!response.ok) {
            throw new Error(`Flask backend responded with status: ${response.status}`);
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Connection', 'keep-alive');

        // Pipe the response
        if (response.body) {
            const reader = response.body.getReader();

            const pump = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            res.end();
                            break;
                        }
                        res.write(Buffer.from(value));
                    }
                } catch (error) {
                    console.error('Streaming error:', error);
                    res.end();
                }
            };

            pump();
        } else {
            res.status(500).json({ error: 'No response body from Flask' });
        }
    } catch (error) {
        console.error('Error proxying video feed:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to connect to video feed. Make sure Flask backend is running.' });
        }
    }
}

