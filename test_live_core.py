import cv2
import mediapipe as mp
import numpy as np
import pickle
import os
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

# ================= LANDMARK NORMALIZATION =================

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

# ================= MAIN ENGINE =================

class GestureMateEngine:
    def __init__(self):
        self.model = None
        self.hands = None
        self.labels = load_labels()

        # Temporal smoothing
        self.prediction_buffer = deque(maxlen=5)

        # Sentence state
        self.current_sentence = ""
        self.best_char = None
        self.best_confidence = 0.0

        # MediaPipe utils
        self.mp_hands = mp.solutions.hands
        self.mp_draw = mp.solutions.drawing_utils

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
                print(f">>> Model loaded successfully from {model_path}")
            except Exception as e:
                print(f"ERROR loading model: {e}")
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

    # -------- Main frame processing --------
    def process_frame(self, frame):
        self.lazy_init()

        # Mirror camera for natural view
        frame = cv2.flip(frame, 1)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self.hands.process(rgb)

        display_char = "—"
        confidence_out = 0.0

        # No hand → show nothing
        if not result.multi_hand_landmarks:
            self.prediction_buffer.clear()
            return frame, display_char, self.current_sentence, confidence_out

        for hand_landmarks in result.multi_hand_landmarks:

            # Draw MediaPipe landmarks
            self.mp_draw.draw_landmarks(
                frame,
                hand_landmarks,
                self.mp_hands.HAND_CONNECTIONS
            )

            landmarks = [[lm.x, lm.y] for lm in hand_landmarks.landmark]
            data = normalize_landmarks(landmarks).reshape(1, -1)

            # Predict
            probs = self.model.predict_proba(data)[0]
            prediction = int(np.argmax(probs))
            confidence = float(np.max(probs))
            confidence_out = confidence

            # Safety check
            if prediction >= len(self.labels):
                self.prediction_buffer.clear()
                return frame, display_char, self.current_sentence, confidence_out

            label = self.labels[prediction]

            # Low confidence → suppress output
            if confidence < 0.5:
                self.prediction_buffer.clear()
                return frame, display_char, self.current_sentence, confidence_out

            # High-confidence frame
            if confidence > 0.7:
                self.prediction_buffer.append(prediction)

                # Track best character (for NEXT)
                if label not in ["NEXT", "SPACE"]:
                    if confidence > self.best_confidence:
                        self.best_confidence = confidence
                        self.best_char = label

            # Stable decision
            if len(self.prediction_buffer) >= 3:
                final_pred = max(
                    set(self.prediction_buffer),
                    key=self.prediction_buffer.count
                )
                final_label = self.labels[final_pred]

                # NEXT → commit best character
                if final_label == "NEXT":
                    if self.best_char:
                        self.current_sentence += self.best_char
                    self._reset_state()
                    display_char = "✓"

                # SPACE → add space
                elif final_label == "SPACE":
                    self.current_sentence += " "
                    self._reset_state()
                    display_char = "␣"

                # Normal character
                else:
                    display_char = final_label

        return frame, display_char, self.current_sentence, confidence_out

    # -------- Reset state after commit --------
    def _reset_state(self):
        self.best_char = None
        self.best_confidence = 0.0
        self.prediction_buffer.clear()
