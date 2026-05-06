from __future__ import annotations

from typing import Iterable, List

import numpy as np


def normalize_landmarks(landmarks: np.ndarray) -> np.ndarray:
    """
    Normalize 21 hand landmarks.

    - Use wrist (index 0) as origin.
    - Scale by maximum distance of any landmark from origin.

    Args:
        landmarks: (21, 3) array of raw (x, y, z) landmarks.

    Returns:
        (21, 3) array of normalized landmarks.
    """
    if landmarks.shape != (21, 3):
        raise ValueError(f"Expected landmarks of shape (21, 3), got {landmarks.shape}")

    # Translate so that wrist is at origin
    origin = landmarks[0].copy()
    translated = landmarks - origin

    # Scale by max distance from origin to ensure scale invariance
    distances = np.linalg.norm(translated, axis=1)
    max_dist = float(np.max(distances))
    if max_dist > 0.0:
        translated /= max_dist

    return translated


def extract_static_features(landmarks: np.ndarray) -> np.ndarray:
    """
    Extract a 63D feature vector from a single frame (static sign).

    Args:
        landmarks: (21, 3) array.

    Returns:
        (63,) feature vector (flattened normalized landmarks).
    """
    normalized = normalize_landmarks(landmarks)
    return normalized.flatten()


def extract_dynamic_features(frames_landmarks: Iterable[np.ndarray]) -> np.ndarray:
    """
    Extract a 1890D feature vector from a sequence of 30 frames.

    Args:
        frames_landmarks: iterable of 30 arrays, each of shape (21, 3).

    Returns:
        (1890,) feature vector.
    """
    normalized_frames: List[np.ndarray] = []
    for lm in frames_landmarks:
        normalized_frames.append(normalize_landmarks(lm))

    if len(normalized_frames) != 30:
        raise ValueError(
            f"Dynamic gestures must contain exactly 30 frames, got {len(normalized_frames)}"
        )

    stacked = np.stack(normalized_frames, axis=0)  # (30, 21, 3)
    return stacked.flatten()

