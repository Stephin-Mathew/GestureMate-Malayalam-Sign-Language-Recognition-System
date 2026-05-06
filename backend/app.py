from flask import Flask, render_template, Response, jsonify, request, after_this_request
import cv2
import threading
import traceback
import sys
import os

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

# ── CORS helper: allow browser to connect directly (bypass Next.js proxy) ────
def _add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

@app.after_request
def apply_cors(response):
    return _add_cors(response)

@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    from flask import make_response
    return _add_cors(make_response('', 204))

# Lazy initialization - engine created only when needed
engine = None
# Camera pre-warm: open cap once at startup
_cap_lock = threading.Lock()
_shared_cap = None

def get_shared_cap():
    """Return (and lazily open) a shared cv2.VideoCapture."""
    global _shared_cap
    with _cap_lock:
        if _shared_cap is None or not _shared_cap.isOpened():
            print('>>> Pre-warming camera...')
            cap = cv2.VideoCapture(0)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 60)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            _shared_cap = cap
            print('>>> Camera pre-warmed OK')
        return _shared_cap

latest_state = {
    "char": "—",
    "sentence": "",
    "confidence": 0.0,
    "prediction_type": "static",   # "static" or "dynamic"
    "dynamic_frames": 0,           # 0-30, how many frames buffered
    "dynamic_locked": False,       # True while a dynamic gesture is locked
    "recognition_mode": "static",  # currently selected mode
    "pending_char": None           # character held pending a 'next' commit (dynamic mode)
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
    try:
        # Reuse the pre-warmed shared capture
        cap = get_shared_cap()
        if not cap.isOpened():
            print("ERROR: Could not open camera")
            return

        print(">>> Using pre-warmed camera, starting frame generation")

        frame_count = 0
        
        while True:
            try:
                success, frame = cap.read()
                if not success:
                    print("WARNING: Failed to read frame from camera")
                    continue

                # Get engine (lazy init)
                engine = get_engine()
                frame_count += 1

                # Run full ML inference every other frame to hit ~60 fps.
                # MediaPipe landmark drawing still happens every frame inside process_frame.
                skip_ml = (frame_count % 2 == 0)

                # Process frame with error handling
                try:
                    frame, char, sentence, conf = engine.process_frame(frame, skip_ml=skip_ml)
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
                # Expose dynamic engine internals
                if engine is not None:
                    latest_state["dynamic_frames"] = len(engine.dynamic_buffer)
                    latest_state["dynamic_locked"] = engine.dynamic_locked
                    latest_state["recognition_mode"] = engine.recognition_mode
                    latest_state["pending_char"] = engine.best_char  # None if nothing pending
                    if engine.dynamic_locked and char not in ("—", "✓", "␣"):
                        latest_state["prediction_type"] = "dynamic"
                    else:
                        latest_state["prediction_type"] = "static"

                # Encode frame to JPEG — quality 72 gives a good speed/quality tradeoff at 60 fps
                try:
                    ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 72])
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
    # Note: we do NOT release the shared cap here — it stays open for the next request.

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
    latest_state["prediction_type"] = "static"
    latest_state["dynamic_frames"] = 0
    latest_state["dynamic_locked"] = False
    latest_state["pending_char"] = None

    if engine is not None:
        engine.current_sentence = ""
        engine.best_char = None
        engine.best_confidence = 0.0
        engine.prediction_buffer.clear()

    return jsonify({"status": "reset", "state": latest_state})

@app.route("/patch-sentence", methods=["POST"])
def patch_sentence():
    """Overwrite the current sentence (e.g. after a backspace from the frontend)"""
    global engine
    data = request.get_json(silent=True) or {}
    new_sentence = data.get("sentence", "")

    latest_state["sentence"] = new_sentence
    latest_state["char"] = "—"
    latest_state["confidence"] = 0.0
    latest_state["prediction_type"] = "static"
    latest_state["pending_char"] = None

    if engine is not None:
        engine.current_sentence = new_sentence
        engine.best_char = None
        engine.best_confidence = 0.0
        engine.prediction_buffer.clear()

    return jsonify({"status": "patched", "state": latest_state})

@app.route("/health")
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "engine_initialized": engine is not None,
        "latest_state": latest_state
    })

@app.route("/set-mode", methods=["POST"])
def set_mode():
    """Switch recognition mode between 'static' and 'dynamic'"""
    global engine
    data = request.get_json(silent=True) or {}
    mode = data.get("mode", "static")
    if mode not in ("static", "dynamic"):
        return jsonify({"error": "mode must be 'static' or 'dynamic'"}), 400

    latest_state["recognition_mode"] = mode
    latest_state["char"] = "—"
    latest_state["confidence"] = 0.0
    latest_state["dynamic_frames"] = 0
    latest_state["dynamic_locked"] = False
    latest_state["prediction_type"] = mode

    if engine is not None:
        engine.set_mode(mode)

    return jsonify({"status": "ok", "recognition_mode": mode})


if __name__ == "__main__":
    print("=" * 60)
    print("GestureMate Flask Backend Starting...")
    print("=" * 60)
    print(f"NOTE: Working directory: {os.getcwd()}")
    print("NOTE: Run this script from inside the backend/ directory!")
    print("NOTE: ML engine will initialize lazily on first frame")
    print("NOTE: Auto-reloader is DISABLED to prevent multiple initializations")
    print("NOTE: Camera pre-warmed at startup — faster first-frame delivery")
    print("=" * 60)

    # Pre-warm the camera in a background thread so it's ready before the
    # first /video_feed request arrives.
    threading.Thread(target=get_shared_cap, daemon=True).start()
    
    try:
        app.run(
            host="127.0.0.1",
            port=5000,
            debug=False,
            use_reloader=False,
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
