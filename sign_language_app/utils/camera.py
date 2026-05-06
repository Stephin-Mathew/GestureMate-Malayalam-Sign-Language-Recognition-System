from __future__ import annotations

from typing import Optional, Tuple

import cv2
import numpy as np


def open_camera(device_index: int = 0) -> Optional[cv2.VideoCapture]:
    """Open a webcam device and return the capture object."""
    cap = cv2.VideoCapture(device_index)
    if not cap.isOpened():
        return None

    # Try to set a reasonable resolution for performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    return cap


def read_frame(cap: cv2.VideoCapture) -> Tuple[bool, Optional[np.ndarray]]:
    """Read a single frame from the camera."""
    if cap is None:
        return False, None
    ok, frame = cap.read()
    if not ok:
        return False, None
    return True, frame


def release_camera(cap: Optional[cv2.VideoCapture]) -> None:
    """Release the webcam safely."""
    if cap is not None:
        cap.release()

