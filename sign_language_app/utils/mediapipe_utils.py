from __future__ import annotations

from typing import Optional, Tuple

from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

# Try legacy MediaPipe Hands API first; fall back to Tasks API if unavailable.
try:
    mp_hands = mp.solutions.hands  # type: ignore[attr-defined]
    _USE_LEGACY_HANDS = True
except AttributeError:
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision

    _USE_LEGACY_HANDS = False

    BASE_DIR = Path(__file__).resolve().parents[1]
    MODELS_DIR = BASE_DIR / "models"
    HAND_LANDMARKER_MODEL = MODELS_DIR / "hand_landmarker.task"


class HandDetector:
    """Wrapper around MediaPipe Hands for single-hand landmark extraction."""

    def __init__(
        self,
        max_num_hands: int = 1,
        detection_confidence: float = 0.5,
        tracking_confidence: float = 0.5,
    ) -> None:
        if _USE_LEGACY_HANDS:
            # Legacy solutions API (mp.solutions.hands)
            self._hands = mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=max_num_hands,
                min_detection_confidence=detection_confidence,
                min_tracking_confidence=tracking_confidence,
                model_complexity=1,
            )
        else:
            # Tasks-based Hand Landmarker
            if not HAND_LANDMARKER_MODEL.exists():
                raise FileNotFoundError(
                    f"Hand Landmarker model file not found at '{HAND_LANDMARKER_MODEL}'.\n"
                    "Download 'hand_landmarker.task' from the official MediaPipe site and place it "
                    "in the 'models' directory of the project."
                )

            base_options = python.BaseOptions(model_asset_path=str(HAND_LANDMARKER_MODEL))
            options = vision.HandLandmarkerOptions(
                base_options=base_options,
                num_hands=max_num_hands,
                min_hand_detection_confidence=detection_confidence,
                min_hand_presence_confidence=tracking_confidence,
            )
            self._hands = vision.HandLandmarker.create_from_options(options)

    def process(
        self, frame_bgr: np.ndarray
    ) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """
        Detect a single hand in a BGR frame and return landmarks.

        Returns:
            annotated_frame: frame with landmarks drawn (BGR).
            landmarks: (21, 3) array of (x, y, z) in normalized coordinates,
                       or None if no hand is detected.
        """
        annotated = frame_bgr.copy()
        landmark_array: Optional[np.ndarray] = None

        if _USE_LEGACY_HANDS:
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            results = self._hands.process(frame_rgb)

            if results.multi_hand_landmarks:
                hand_landmarks = results.multi_hand_landmarks[0]
                mp.solutions.drawing_utils.draw_landmarks(
                    annotated,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp.solutions.drawing_styles.get_default_hand_landmarks_style(),
                    mp.solutions.drawing_styles.get_default_hand_connections_style(),
                )

                coords = []
                for lm in hand_landmarks.landmark:
                    coords.append([lm.x, lm.y, lm.z])
                landmark_array = np.array(coords, dtype=np.float32)
        else:
            # Tasks Hand Landmarker
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
            result = self._hands.detect(mp_image)

            if result.hand_landmarks:
                h, w, _ = frame_bgr.shape
                hand_landmarks = result.hand_landmarks[0]
                coords = []
                for lm in hand_landmarks:
                    coords.append([lm.x, lm.y, lm.z])
                    # Draw simple landmark points for feedback
                    px, py = int(lm.x * w), int(lm.y * h)
                    cv2.circle(annotated, (px, py), 3, (0, 255, 0), -1)
                landmark_array = np.array(coords, dtype=np.float32)

        return annotated, landmark_array


_GLOBAL_DETECTOR: Optional[HandDetector] = None


def get_global_detector() -> HandDetector:
    """Return a lazily-created global HandDetector instance."""
    global _GLOBAL_DETECTOR
    if _GLOBAL_DETECTOR is None:
        _GLOBAL_DETECTOR = HandDetector()
    return _GLOBAL_DETECTOR

