from flask import Flask, render_template, Response, jsonify
import cv2
import traceback
import sys

# Import GestureMateEngine with error handling
try:
    from test_live_core import GestureMateEngine
except ImportError as e:
    print(f"FATAL ERROR: Could not import GestureMateEngine from test_live_core")
    print(f"Error: {e}")
    print("\nPlease ensure test_live_core.py exists in the same directory as app.py")
    sys.exit(1)
except Exception as e:
    print(f"FATAL ERROR: Unexpected error importing test_live_core")
    print(f"Error: {e}")
    traceback.print_exc()
    sys.exit(1)

app = Flask(__name__)

# Lazy initialization - engine created only when needed
engine = None

latest_state = {
    "char": "—",
    "sentence": "",
    "confidence": 0.0
}

def get_engine():
    """Lazy initialization of GestureMateEngine to avoid premature initialization"""
    global engine
    if engine is None:
        print(">>> Initializing GestureMateEngine (lazy init)")
        engine = GestureMateEngine()
    return engine

def generate_frames():
    """Fail-safe video frame generator with proper error handling"""
    cap = None
    try:
        # Initialize camera
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("ERROR: Could not open camera")
            return
        
        # Set camera properties for better performance
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        
        print(">>> Camera initialized, starting frame generation")
        
        while True:
            try:
                success, frame = cap.read()
                if not success:
                    print("WARNING: Failed to read frame from camera")
                    continue

                # Get engine (lazy init)
                engine = get_engine()
                
                # Process frame with error handling
                try:
                    frame, char, sentence, conf = engine.process_frame(frame)
                except Exception as e:
                    print(f"ERROR in process_frame: {e}")
                    traceback.print_exc()
                    # Continue with unprocessed frame
                    char = "—"
                    sentence = latest_state.get("sentence", "")
                    conf = 0.0

                # Update shared state for frontend
                latest_state["char"] = char
                latest_state["sentence"] = sentence
                latest_state["confidence"] = round(conf, 2)

                # Encode frame to JPEG
                try:
                    ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    if not ret:
                        print("WARNING: Failed to encode frame")
                        continue
                except Exception as e:
                    print(f"ERROR encoding frame: {e}")
                    continue

                # Yield frame in MJPEG format
                try:
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n" +
                        buffer.tobytes() + b"\r\n"
                    )
                except Exception as e:
                    print(f"ERROR yielding frame: {e}")
                    break
                    
            except Exception as e:
                print(f"ERROR in frame loop: {e}")
                traceback.print_exc()
                # Continue trying to read frames
                continue
                
    except Exception as e:
        print(f"FATAL ERROR in generate_frames: {e}")
        traceback.print_exc()
    finally:
        # Always release camera
        if cap is not None:
            cap.release()
            print(">>> Camera released")

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
    """Return current recognition state"""
    return jsonify(latest_state)

@app.route("/reset", methods=["POST"])
def reset():
    """Reset the sentence state"""
    global engine
    latest_state["sentence"] = ""
    latest_state["char"] = "—"
    latest_state["confidence"] = 0.0
    
    # Reset engine state if initialized
    if engine is not None:
        engine.current_sentence = ""
        engine.best_char = None
        engine.best_confidence = 0.0
        engine.prediction_buffer.clear()
    
    return jsonify({"status": "reset", "state": latest_state})

@app.route("/health")
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok", 
        "engine_initialized": engine is not None,
        "latest_state": latest_state
    })

if __name__ == "__main__":
    print("=" * 50)
    print("GestureMate Flask Backend Starting...")
    print("=" * 50)
    print("NOTE: ML engine will initialize lazily on first frame")
    print("NOTE: Auto-reloader is DISABLED to prevent multiple initializations")
    print("=" * 50)
    
    try:
        app.run(
            host="0.0.0.0",
            port=5000,
            debug=True,
            use_reloader=False,  # Critical: prevents multiple OpenCV/MediaPipe initializations
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n>>> Shutting down gracefully...")
        if engine is not None:
            # Cleanup if needed
            pass
    except Exception as e:
        print(f"FATAL ERROR starting Flask: {e}")
        traceback.print_exc()
