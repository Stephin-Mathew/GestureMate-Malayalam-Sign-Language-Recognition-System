from __future__ import annotations

import time
from typing import List

import numpy as np
import streamlit as st

from utils.camera import open_camera, read_frame, release_camera
from utils.data_utils import DYNAMIC_CSV, STATIC_CSV, append_sample_to_csv
from utils.feature_extractor import (
    extract_dynamic_features,
    extract_static_features,
)
from utils.mediapipe_utils import get_global_detector


def _collect_static_sample(label: str) -> None:
    """Capture a single-frame static sample and save to CSV."""
    detector = get_global_detector()
    cap = open_camera()
    if cap is None:
        st.error("Unable to open webcam. Please check your camera.")
        return

    placeholder = st.empty()
    st.info("Showing live feed. A static sample will be captured when a hand is detected.")

    features: np.ndarray | None = None

    # Capture until we detect a hand or a timeout
    start_time = time.time()
    timeout_sec = 10
    while time.time() - start_time < timeout_sec:
        ok, frame = read_frame(cap)
        if not ok:
            st.warning("Failed to read frame from camera.")
            break

        annotated, landmarks = detector.process(frame)
        placeholder.image(cv2_to_rgb(annotated), channels="RGB")

        if landmarks is not None:
            features = extract_static_features(landmarks)
            break

        time.sleep(0.03)  # ~30 FPS

    release_camera(cap)

    if features is None:
        st.warning("No hand detected within the time limit. Static sample not saved.")
        return

    append_sample_to_csv(features, label, STATIC_CSV)
    st.success(f"Static sample for label '{label}' saved to {STATIC_CSV.name}.")


def _collect_dynamic_sample(label: str) -> None:
    """Capture a 30-frame dynamic sample and save to CSV."""
    detector = get_global_detector()
    cap = open_camera()
    if cap is None:
        st.error("Unable to open webcam. Please check your camera.")
        return

    placeholder = st.empty()
    progress_bar = st.progress(0)
    st.info(
        "Recording dynamic gesture. Please perform the motion for ~2 seconds. "
        "Press 'q' in the OpenCV window to stop early (sample will be discarded if < 30 valid frames)."
    )

    collected_landmarks: List[np.ndarray] = []
    max_frames = 30

    while len(collected_landmarks) < max_frames:
        ok, frame = read_frame(cap)
        if not ok:
            st.warning("Failed to read frame from camera.")
            break

        annotated, landmarks = detector.process(frame)
        placeholder.image(cv2_to_rgb(annotated), channels="RGB")

        # Only count frames where a hand is detected
        if landmarks is not None:
            collected_landmarks.append(landmarks)
            progress_bar.progress(len(collected_landmarks) / max_frames)

        # Allow user to stop early via keyboard in case of issues
        # (Streamlit cannot easily interrupt the loop via button press)
        import cv2

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

        time.sleep(0.03)

    release_camera(cap)

    if len(collected_landmarks) < max_frames:
        st.warning(
            f"Only collected {len(collected_landmarks)} valid frames (< {max_frames}). "
            "Dynamic sample discarded."
        )
        return

    features = extract_dynamic_features(collected_landmarks)
    append_sample_to_csv(features, label, DYNAMIC_CSV)
    st.success(f"Dynamic sample for label '{label}' saved to {DYNAMIC_CSV.name}.")


def cv2_to_rgb(frame_bgr: np.ndarray) -> np.ndarray:
    """Convert BGR (OpenCV) image to RGB for Streamlit display."""
    import cv2

    return cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)


def show() -> None:
    """Page for collecting new sign samples."""
    st.header("Add New Sign (Data Collection)")

    sign_type = st.selectbox("Select sign type", options=["Static", "Dynamic"])
    label = st.text_input("Malayalam character label (e.g., ക)")

    col1, col2 = st.columns(2)
    start = col1.button("Start Recording")
    stop = col2.button("Stop Recording")

    if stop:
        st.info(
            "Stop Recording button is currently informational only. "
            "Dynamic capture can be interrupted by pressing 'q' in the OpenCV window."
        )

    if not label:
        st.warning("Please enter a label before recording.")
        return

    if start:
        if sign_type == "Static":
            _collect_static_sample(label)
        else:
            _collect_dynamic_sample(label)

