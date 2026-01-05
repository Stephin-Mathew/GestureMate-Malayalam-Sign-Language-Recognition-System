// Proxy status updates from Flask backend
export default async function handler(req, res) {
  try {
    const flaskUrl = process.env.FLASK_BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${flaskUrl}/status`);

    if (!response.ok) {
      throw new Error(`Flask backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching status:', error);
    // Return default state if Flask backend is not available
    res.status(200).json({
      char: "—",
      sentence: "",
      confidence: 0.0
    });
  }
}

