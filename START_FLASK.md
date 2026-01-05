# Starting the Flask Backend

## Quick Start

1. **Check your setup first:**
   ```bash
   python check_setup.py
   ```

2. **Install dependencies (if needed):**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Flask server:**
   ```bash
   python app.py
   ```

## Troubleshooting

### Terminal Exits Immediately

If the terminal exits right after running `python app.py`, check:

1. **Missing dependencies:**
   ```bash
   pip install flask opencv-python mediapipe numpy scikit-learn Pillow
   ```

2. **Missing model files:**
   - Ensure `model/static_sign_model.pkl` exists
   - Ensure `labels.txt` exists in the same directory as `app.py`

3. **Camera issues:**
   - Make sure no other application is using the camera
   - Try a different camera index (change `cv2.VideoCapture(0)` to `cv2.VideoCapture(1)`)

4. **Check for errors:**
   - Run `python check_setup.py` to verify everything is set up correctly
   - Look for error messages in the terminal output

### Common Issues

#### "ModuleNotFoundError: No module named 'test_live_core'"
- Ensure `test_live_core.py` is in the same directory as `app.py`

#### "FileNotFoundError: Model file not found"
- Create a `model` directory and place `static_sign_model.pkl` inside it
- Or update the path in `test_live_core.py` if your model is elsewhere

#### "Could not open camera"
- Close other applications using the camera (Zoom, Teams, etc.)
- Check camera permissions
- Try a different camera index

#### Flask starts but video feed doesn't work
- Check that the camera is actually working: `python -c "import cv2; cap = cv2.VideoCapture(0); print('Camera OK' if cap.isOpened() else 'Camera FAILED'); cap.release()"`
- Check browser console for errors
- Verify Flask is running on `http://localhost:5000`

## Expected Output

When Flask starts successfully, you should see:

```
==================================================
GestureMate Flask Backend Starting...
==================================================
NOTE: ML engine will initialize lazily on first frame
NOTE: Auto-reloader is DISABLED to prevent multiple initializations
==================================================
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment.
 * Running on http://0.0.0.0:5000
Press CTRL+C to quit
```

When the first video frame is requested, you'll see:
```
>>> Initializing GestureMateEngine (lazy init)
>>> Initializing ML engine
>>> Model loaded successfully from model/static_sign_model.pkl
>>> MediaPipe Hands initialized
>>> Camera initialized, starting frame generation
```

## Health Check

Once Flask is running, you can check if it's working:

- **Health endpoint:** `http://localhost:5000/health`
- **Status endpoint:** `http://localhost:5000/status`
- **Video feed:** `http://localhost:5000/video_feed`

## Integration with Next.js

After Flask is running:

1. Start Next.js: `npm run dev`
2. Navigate to: `http://localhost:3000/sign-recognition`
3. The page will automatically connect to Flask on port 5000

