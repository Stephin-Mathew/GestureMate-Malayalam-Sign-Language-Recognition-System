import cv2
import mediapipe as mp
import numpy as np
import pickle
import os
import joblib
from collections import deque

# ================= LABEL LOADING =================

def load_labels(path="labels.txt"):
    """Load labels from file with error handling"""
    labels = []
    if not os.path.exists(path):
        print(f"WARNING: Labels file '{path}' not found. Using default labels.")
        # Return default labels if file doesn't exist
        return ["A", "B", "C", "D", "E", "NEXT", "SPACE"]
    
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split(",")
                if len(parts) == 2:
                    labels.append(parts[1].strip())
        print(f">>> Loaded {len(labels)} labels from {path}")
    except Exception as e:
        print(f"ERROR loading labels: {e}")
        return ["A", "B", "C", "D", "E", "NEXT", "SPACE"]
    
    return labels if labels else ["A", "B", "C", "D", "E", "NEXT", "SPACE"]

# ================= LANDMARK NORMALIZATION (static — 2D) =================

def normalize_landmarks(landmarks):
    landmarks = np.array(landmarks).reshape(21, 2)

    # Use wrist as origin
    wrist = landmarks[0]
    landmarks = landmarks - wrist

    # Scale normalization
    max_val = np.max(np.abs(landmarks))
    if max_val != 0:
        landmarks = landmarks / max_val

    return landmarks.flatten()

# ================= DYNAMIC FEATURE EXTRACTION (3D — mirrors tkinter app) =================

def _normalize_landmarks_3d(landmarks_3d: np.ndarray) -> np.ndarray:
    """
    Normalize a (21, 3) landmark array.
    - Translate so wrist is at origin.
    - Scale by max L2 distance from origin.
    Mirrors sign_language_app/utils/feature_extractor.py :: normalize_landmarks.
    """
    if landmarks_3d.shape != (21, 3):
        raise ValueError(f"Expected (21, 3) landmarks, got {landmarks_3d.shape}")
    origin = landmarks_3d[0].copy()
    translated = landmarks_3d - origin
    distances = np.linalg.norm(translated, axis=1)
    max_dist = float(np.max(distances))
    if max_dist > 0.0:
        translated /= max_dist
    return translated


def extract_dynamic_features(frames_landmarks) -> np.ndarray:
    """
    Extract a 1890-D feature vector from exactly 30 frames of (21, 3) landmarks.
    Mirrors sign_language_app/utils/feature_extractor.py :: extract_dynamic_features.
    """
    normalized_frames = [_normalize_landmarks_3d(lm) for lm in frames_landmarks]
    if len(normalized_frames) != 30:
        raise ValueError(
            f"Dynamic gestures must contain exactly 30 frames, got {len(normalized_frames)}"
        )
    stacked = np.stack(normalized_frames, axis=0)  # (30, 21, 3)
    return stacked.flatten()  # (1890,)

# ================= MAIN ENGINE =================

class GestureMateEngine:
    def __init__(self):
        self.model = None
        self.hands = None
        self.labels = load_labels()

        # Temporal smoothing (static)
        self.prediction_buffer = deque(maxlen=5)

        # Sentence state
        self.current_sentence = ""
        self.best_char = None
        self.best_confidence = 0.0

        # MediaPipe utils
        self.mp_hands = mp.solutions.hands
        self.mp_draw = mp.solutions.drawing_utils

        # -------------------------------
        # Dynamic gesture recognition
        # -------------------------------
        self.dynamic_model = None
        self.dynamic_buffer = deque(maxlen=30)

        self.dynamic_prev_label = None
        self.dynamic_stable_count = 0
        self.dynamic_locked = False
        self.dynamic_locked_label = None    # held until lock resets
        self.dynamic_locked_conf = 0.0
        self.dynamic_no_hand_count = 0

        self.DYN_CONF_THRESHOLD = 0.25   # floor to filter noise; vote majority handles stability
        self.DYN_STABLE_FRAMES = 5        # kept for reference (vote approach is now used)
        self.DYN_RESET_FRAMES = 10

        # Majority-vote locking
        self.dynamic_vote_buffer = deque(maxlen=10)  # last N (label, conf) pairs
        self.DYN_VOTE_WINDOW = 10    # look at last 10 predictions
        self.DYN_VOTE_MAJORITY = 6   # label must appear >= 6/10 times

        # last raw model confidence (for confidence bar on skip frames)
        self.last_confidence = 0.0

        # Recognition mode: 'static' or 'dynamic'
        self.recognition_mode = "static"

    # -------- Lazy initialization (safe for Flask) --------
    def lazy_init(self):
        if self.model is None:
            print(">>> Initializing ML engine")
            
            model_path = "model/static_sign_model.pkl"
            if not os.path.exists(model_path):
                print(f"ERROR: Model file '{model_path}' not found!")
                print("Please ensure the model file exists in the 'model' directory.")
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            try:
                with open(model_path, "rb") as f:
                    self.model = pickle.load(f)
                print(f">>> Static model loaded successfully from {model_path}")
            except Exception as e:
                print(f"ERROR loading static model: {e}")
                raise

            try:
                self.hands = self.mp_hands.Hands(
                    max_num_hands=1,
                    min_detection_confidence=0.6,
                    min_tracking_confidence=0.6
                )
                print(">>> MediaPipe Hands initialized")
            except Exception as e:
                print(f"ERROR initializing MediaPipe: {e}")
                raise

        # Lazy-load dynamic model (non-fatal if missing)
        if self.dynamic_model is None:
            dyn_path = "../sign_language_app/models/dynamic_model.pkl"
            if os.path.exists(dyn_path):
                try:
                    self.dynamic_model = joblib.load(dyn_path)
                    print(f">>> Dynamic model loaded from {dyn_path}")
                except Exception as e:
                    print(f"WARNING: Could not load dynamic model: {e}")
            else:
                print(f"WARNING: Dynamic model not found at '{dyn_path}'. Dynamic gestures disabled.")

    # -------- Dynamic pipeline (runs parallel to static) --------
    def _run_dynamic_pipeline(self, landmarks_3d):
        """
        Run the dynamic gesture recognition pipeline for one frame.

        Args:
            landmarks_3d: numpy array of shape (21, 3), or None if no hand detected.

        Returns:
            (label, confidence) tuple if a gesture was stably recognized and locked,
            or None otherwise.
        """
        if self.dynamic_model is None:
            return None

        # No hand detected this frame
        if landmarks_3d is None:
            self.dynamic_no_hand_count += 1
            if self.dynamic_no_hand_count >= self.DYN_RESET_FRAMES:
                self.dynamic_buffer.clear()
                self.dynamic_locked = False
                self.dynamic_locked_label = None
                self.dynamic_locked_conf = 0.0
                self.dynamic_stable_count = 0
                self.dynamic_prev_label = None
                self.dynamic_vote_buffer.clear()
            return None

        self.dynamic_no_hand_count = 0

        # While a gesture is locked, wait for it to be reset by a no-hand window
        if self.dynamic_locked:
            return None

        # Accumulate frames into rolling buffer
        self.dynamic_buffer.append(landmarks_3d)

        if len(self.dynamic_buffer) < 30:
            return None

        # Extract 1890-D feature vector
        try:
            features = extract_dynamic_features(list(self.dynamic_buffer))
            probs = self.dynamic_model.predict_proba([features])[0]
            idx = int(probs.argmax())
            label = str(self.dynamic_model.classes_[idx])
            conf = float(probs[idx])
        except Exception as e:
            print(f"WARNING: Dynamic prediction error: {e}")
            return None

        # Debug — print every prediction so we can see what the model is outputting
        print(f"DYN predict: label={label!r}  conf={conf:.3f}  buf={len(self.dynamic_vote_buffer)}/{self.DYN_VOTE_WINDOW}")

        # ── Majority-vote locking (more robust than N-consecutive) ───────
        # Accumulate (label, conf) pairs; lock when the plurality label
        # appears ≥ DYN_VOTE_MAJORITY times AND its average confidence
        # exceeds DYN_CONF_THRESHOLD.
        self.dynamic_vote_buffer.append((label, conf))

        if len(self.dynamic_vote_buffer) >= self.DYN_VOTE_WINDOW:
            # Tally votes by label
            from collections import Counter
            counts = Counter(lbl for lbl, _ in self.dynamic_vote_buffer)
            best_label, best_count = counts.most_common(1)[0]
            # Average confidence only for that label
            avg_conf = float(np.mean([c for lbl, c in self.dynamic_vote_buffer if lbl == best_label]))

            if best_count >= self.DYN_VOTE_MAJORITY and avg_conf >= self.DYN_CONF_THRESHOLD:
                print(f"DYN LOCKED: {best_label!r}  votes={best_count}/{self.DYN_VOTE_WINDOW}  avg_conf={avg_conf:.3f}")
                self.dynamic_locked = True
                self.dynamic_locked_label = best_label
                self.dynamic_locked_conf = avg_conf
                return (best_label, avg_conf)

        return None


    # -------- Switch recognition mode (resets transient state) --------
    def set_mode(self, mode: str):
        """Switch between 'static' and 'dynamic' recognition and reset buffers."""
        if mode not in ("static", "dynamic"):
            return
        self.recognition_mode = mode
        # Clear static state
        self.prediction_buffer.clear()
        self.best_char = None
        self.best_confidence = 0.0
        # Clear dynamic state
        self.dynamic_buffer.clear()
        self.dynamic_locked = False
        self.dynamic_locked_label = None
        self.dynamic_locked_conf = 0.0
        self.dynamic_stable_count = 0
        self.dynamic_prev_label = None
        self.dynamic_no_hand_count = 0
        self.dynamic_vote_buffer.clear()
        print(f">>> Recognition mode set to: {mode}")

    # -------- Main frame processing --------
    def process_frame(self, frame, skip_ml=False):
        self.lazy_init()

        # Mirror camera for natural view
        frame = cv2.flip(frame, 1)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self.hands.process(rgb)

        # When skipping ML, still draw landmarks but process dynamic pipeline fully
        if skip_ml:
            if result.multi_hand_landmarks:
                for hand_landmarks in result.multi_hand_landmarks:
                    self.mp_draw.draw_landmarks(
                        frame,
                        hand_landmarks,
                        self.mp_hands.HAND_CONNECTIONS
                    )
                    # ── Dynamic mode: ALWAYS feed the pipeline even on skip frames ──
                    # Capture the result and run the same hold/commit logic as the main path.
                    if self.recognition_mode == "dynamic" and self.dynamic_model is not None:
                        landmarks_3d = np.array(
                            [[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark],
                            dtype=np.float32
                        )
                        skip_result = self._run_dynamic_pipeline(landmarks_3d)
                        if skip_result is not None:
                            dyn_label, dyn_conf = skip_result
                            if dyn_label.lower() == "next":
                                # COMMIT pending char
                                if self.best_char:
                                    self.current_sentence += self.best_char
                                self.best_char = None
                                self.best_confidence = 0.0
                            else:
                                # HOLD as pending — but never store control labels
                                if dyn_label.lower().strip() not in ('next', 'space', 'delete'):
                                    self.best_char = dyn_label
                                    self.best_confidence = dyn_conf
            else:
                if self.recognition_mode == "dynamic":
                    self._run_dynamic_pipeline(None)  # count no-hand frames

            # Return last known state
            if not result.multi_hand_landmarks:
                display_char = "—"
                confidence_out = 0.0
            elif self.recognition_mode == "dynamic":
                # Show pending char; show "✓" when locked after a commit (best_char is None)
                if self.best_char:
                    display_char = self.best_char
                    confidence_out = self.best_confidence
                elif self.dynamic_locked:
                    # Locked but nothing pending = NEXT was just committed
                    display_char = "✓"
                    confidence_out = self.dynamic_locked_conf
                else:
                    display_char = "—"
                    confidence_out = 0.0
            elif len(self.prediction_buffer) >= 3:
                final_pred = max(set(self.prediction_buffer), key=self.prediction_buffer.count)
                display_char = self.labels[final_pred] if final_pred < len(self.labels) else "—"
                confidence_out = self.last_confidence
            else:
                display_char = "—"
                confidence_out = self.last_confidence
            return frame, display_char, self.current_sentence, confidence_out

        display_char = "—"
        confidence_out = 0.0

        # No hand → signal dynamic pipeline to count no-hand frames (may reset lock)
        if not result.multi_hand_landmarks:
            self.prediction_buffer.clear()
            self._run_dynamic_pipeline(None)
            return frame, display_char, self.current_sentence, confidence_out

        for hand_landmarks in result.multi_hand_landmarks:

            # Draw MediaPipe landmarks (always, regardless of mode)
            self.mp_draw.draw_landmarks(
                frame,
                hand_landmarks,
                self.mp_hands.HAND_CONNECTIONS
            )

            # Extract landmarks once
            landmarks_2d = [[lm.x, lm.y] for lm in hand_landmarks.landmark]
            landmarks_3d = np.array(
                [[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark],
                dtype=np.float32
            )  # shape (21, 3)

            # ── MODE: DYNAMIC ─────────────────────────────────────────────
            if self.recognition_mode == "dynamic":
                # Only dynamic pipeline runs; static model is not called
                result = self._run_dynamic_pipeline(landmarks_3d)

                if result is not None:
                    dyn_label, dyn_conf = result

                    if dyn_label.lower() == "next":
                        # COMMIT: append the pending char to the sentence
                        if self.best_char:
                            self.current_sentence += self.best_char
                        self.best_char = None
                        self.best_confidence = 0.0
                        display_char = "✓"
                        confidence_out = dyn_conf
                    else:
                        # HOLD: store as the pending character — never store control labels
                        if dyn_label.lower().strip() not in ('next', 'space', 'delete'):
                            self.best_char = dyn_label
                            self.best_confidence = dyn_conf
                            display_char = dyn_label
                            confidence_out = dyn_conf

                elif self.dynamic_locked:
                    # Locked but best_char is None = NEXT was just committed, show ✓
                    display_char = '✓'
                    confidence_out = self.dynamic_locked_conf

                elif self.best_char:
                    # Lock released (no-hand timeout) but pending char still waiting
                    # best_char intentionally preserved — user hasn't committed yet
                    display_char = self.best_char

                continue  # skip static pipeline below

            # ── MODE: STATIC ──────────────────────────────────────────────
            # Dynamic pipeline is not called in static mode
            data = normalize_landmarks(landmarks_2d).reshape(1, -1)
            probs = self.model.predict_proba(data)[0]
            prediction = int(np.argmax(probs))
            confidence = float(np.max(probs))
            confidence_out = confidence
            self.last_confidence = confidence   # always track for confidence bar

            if prediction >= len(self.labels):
                self.prediction_buffer.clear()
                continue

            label = self.labels[prediction]

            if confidence < 0.4:
                self.prediction_buffer.clear()
                continue

            # Gate: add to buffer for any reading above 55 % so the frontend
            # fast-conversation mode (which checks > 55 %) gets a stable char
            if confidence > 0.55:
                self.prediction_buffer.append(prediction)
                if label not in ["NEXT", "SPACE"]:
                    if confidence > self.best_confidence:
                        self.best_confidence = confidence
                        self.best_char = label

            if len(self.prediction_buffer) >= 3:
                final_pred = max(
                    set(self.prediction_buffer),
                    key=self.prediction_buffer.count
                )
                final_label = self.labels[final_pred]

                if final_label == "NEXT":
                    if self.best_char:
                        self.current_sentence += self.best_char
                    self._reset_state()
                    display_char = "✓"
                elif final_label == "SPACE":
                    self.current_sentence += " "
                    self._reset_state()
                    display_char = "␣"
                else:
                    display_char = final_label

        return frame, display_char, self.current_sentence, confidence_out


    # -------- Reset state after commit --------
    def _reset_state(self):
        self.best_char = None
        self.best_confidence = 0.0
        self.prediction_buffer.clear()
