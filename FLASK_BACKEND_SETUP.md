# Flask Backend Setup for Sign Recognition

This guide explains how to set up and run the Flask backend for sign recognition functionality.

## Prerequisites

1. Python 3.7 or higher
2. Flask backend with `GestureMateEngine` from `test_live_core.py`
3. Flask app (`app.py`) running on port 5000

## Flask Backend Requirements

Your Flask backend should have the following structure:

```python
from flask import Flask, render_template, Response, jsonify
import cv2
from test_live_core import GestureMateEngine

app = Flask(__name__)
engine = GestureMateEngine()

latest_state = {
    "char": "—",
    "sentence": "",
    "confidence": 0.0
}

def generate_frames():
    cap = cv2.VideoCapture(0)
    while True:
        success, frame = cap.read()
        if not success:
            continue
        frame, char, sentence, conf = engine.process_frame(frame)
        latest_state["char"] = char
        latest_state["sentence"] = sentence
        latest_state["confidence"] = round(conf, 2)
        ret, buffer = cv2.imencode(".jpg", frame)
        if not ret:
            continue
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" +
            buffer.tobytes() + b"\r\n"
        )

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/status")
def status():
    return jsonify(latest_state)

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False,
        threaded=True
    )
```

## Setup Instructions

### 1. Configure Flask Backend URL (Optional)

If your Flask backend is running on a different URL or port, you can configure it by adding to your `.env.local` file:

```env
FLASK_BACKEND_URL=http://localhost:5000
```

The default is `http://localhost:5000`.

### 2. Start Flask Backend

Navigate to your Flask backend directory and run:

```bash
python app.py
```

The Flask server should start on `http://localhost:5000`.

### 3. Start Next.js Frontend

In the Next.js project directory, run:

```bash
npm run dev
```

The Next.js server will start on `http://localhost:3000`.

### 4. Access Sign Recognition

1. Navigate to `http://localhost:3000`
2. Log in with Clerk authentication
3. Go to the Sign Recognition page
4. The video feed should automatically start streaming from the Flask backend
5. Status updates (character, sentence, confidence) will update every 200ms

## How It Works

### Architecture

- **Flask Backend**: Handles video capture, sign recognition processing, and provides:
  - `/video_feed`: Streams video frames as MJPEG
  - `/status`: Returns JSON with latest recognition state (char, sentence, confidence)

- **Next.js Frontend**: 
  - `/api/video-feed`: Proxies video stream from Flask (avoids CORS issues)
  - `/api/status`: Proxies status updates from Flask
  - `/sign-recognition`: React page that displays video feed and real-time status

### Data Flow

1. Flask captures video from camera (index 0)
2. Each frame is processed by `GestureMateEngine.process_frame()`
3. Recognition results are stored in `latest_state`
4. Video frames are streamed via `/video_feed` endpoint
5. Next.js proxies both video feed and status to frontend
6. Frontend displays video and updates status every 200ms

## Troubleshooting

### Video Feed Not Showing

1. **Check Flask is running**: Ensure Flask backend is running on port 5000
2. **Check camera access**: Make sure camera is available and not being used by another application
3. **Check browser console**: Look for CORS or connection errors
4. **Verify API proxy**: Check that `/api/video-feed` is accessible

### Status Not Updating

1. **Check Flask `/status` endpoint**: Visit `http://localhost:5000/status` directly
2. **Check Next.js API**: Visit `http://localhost:3000/api/status`
3. **Check browser console**: Look for fetch errors
4. **Verify connection status**: The UI shows a connection indicator

### CORS Issues (if connecting directly to Flask)

If you want to connect directly to Flask (bypassing Next.js proxy), you need to configure CORS in Flask:

```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
```

Then update `pages/sign-recognition.js` to use Flask URL directly:

```javascript
const flaskUrl = process.env.NEXT_PUBLIC_FLASK_BACKEND_URL || 'http://localhost:5000';
// Use: src={`${flaskUrl}/video_feed`} instead of src={videoFeedUrl}
```

## Environment Variables

Create a `.env.local` file in the Next.js project root:

```env
# Flask Backend URL (optional, defaults to http://localhost:5000)
FLASK_BACKEND_URL=http://localhost:5000

# For direct connection from browser (if CORS is enabled)
NEXT_PUBLIC_FLASK_BACKEND_URL=http://localhost:5000

# Clerk Authentication (existing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key_here
CLERK_SECRET_KEY=your_key_here
```

## Notes

- The video feed uses MJPEG streaming (multipart/x-mixed-replace)
- Status updates are polled every 200ms for real-time feel
- The connection status indicator shows if the backend is reachable
- Reset button clears the sentence but doesn't affect the video stream

