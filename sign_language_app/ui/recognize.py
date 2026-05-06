from __future__ import annotations

import time
from typing import Deque, List
from collections import deque

import numpy as np

from utils.camera import open_camera, read_frame, release_camera
from utils.data_utils import (
    DYNAMIC_MODEL_PATH,
    STATIC_MODEL_PATH,
    load_model,
)
from utils.feature_extractor import (
    extract_dynamic_features,
    extract_static_features,
)
from utils.mediapipe_utils import get_global_detector


def cv2_to_rgb(frame_bgr: np.ndarray) -> np.ndarray:
    """Convert BGR (OpenCV) image to RGB for Streamlit display."""
    import cv2

    return cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)


def _static_recognition_loop() -> None:
    """Run static sign recognition in real time."""
    try:
        model = load_model(STATIC_MODEL_PATH)
    except FileNotFoundError:
        st.warning("Static model not found. Train it first on the 'Train Models' page.")
        return

    detector = get_global_detector()
    cap = open_camera()
    if cap is None:
        st.error("Unable to open webcam. Please check your camera.")
        return

    frame_placeholder = st.empty()
    label_placeholder = st.empty()

    st.info(
        "Static recognition running. Close the browser tab or stop the app to end the loop."
    )

    while True:
        start_t = time.time()
        ok, frame = read_frame(cap)
        if not ok:
            st.warning("Failed to read frame from camera.")
            break

        annotated, landmarks = detector.process(frame)

        if landmarks is not None:
            features = extract_static_features(landmarks).reshape(1, -1)
            # Predict label and confidence (using class probabilities)
            probs = model.predict_proba(features)[0]
            pred_idx = int(np.argmax(probs))
            pred_label = str(model.classes_[pred_idx])
            confidence = float(probs[pred_idx])

            label_placeholder.markdown(
                f"**Predicted label:** {pred_label} &nbsp;&nbsp; "
                f"**Confidence:** {confidence:.2f}"
            )
        else:
            label_placeholder.markdown("**No hand detected**")

        frame_placeholder.image(cv2_to_rgb(annotated), channels="RGB")

        # Keep latency under ~300 ms
        elapsed = time.time() - start_t
        if elapsed < 0.03:
            time.sleep(0.03 - elapsed)

        # Allow user to break via keyboard (best-effort in this context)
        import cv2

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    release_camera(cap)


def _dynamic_recognition_loop() -> None:
    """Run dynamic sign recognition using a rolling 30-frame buffer."""
    try:
        model = load_model(DYNAMIC_MODEL_PATH)
    except FileNotFoundError:
        st.warning("Dynamic model not found. Train it first on the 'Train Models' page.")
        return

    detector = get_global_detector()
    cap = open_camera()
    if cap is None:
        st.error("Unable to open webcam. Please check your camera.")
        return

    frame_placeholder = st.empty()
    label_placeholder = st.empty()
    progress_placeholder = st.empty()

    buffer: Deque[np.ndarray] = deque(maxlen=30)

    st.info(
        "Dynamic recognition running. Perform a gesture repeatedly. "
        "Close the browser tab or press 'q' in the OpenCV window to stop."
    )

    while True:
        start_t = time.time()
        ok, frame = read_frame(cap)
        if not ok:
            st.warning("Failed to read frame from camera.")
            break

        annotated, landmarks = detector.process(frame)

        if landmarks is not None:
            buffer.append(landmarks)

        # Display how many valid frames are currently in the buffer
        progress_placeholder.text(f"Frames in buffer: {len(buffer)}/30")

        # When we have 30 frames, run prediction on the sequence
        if len(buffer) == 30:
            features = extract_dynamic_features(list(buffer)).reshape(1, -1)
            probs = model.predict_proba(features)[0]
            pred_idx = int(np.argmax(probs))
            pred_label = str(model.classes_[pred_idx])
            confidence = float(probs[pred_idx])

            label_placeholder.markdown(
                f"**Predicted label:** {pred_label} &nbsp;&nbsp; "
                f"**Confidence:** {confidence:.2f}"
            )

        frame_placeholder.image(cv2_to_rgb(annotated), channels="RGB")

        elapsed = time.time() - start_t
        if elapsed < 0.03:
            time.sleep(0.03 - elapsed)

        import cv2

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    release_camera(cap)


def show() -> None:
    """Page for live recognition of static and dynamic signs."""
    st.header("Live Recognition")

    mode = st.radio("Recognition mode", options=["Static Recognition", "Dynamic Recognition"])

    if st.button("Start"):
        if mode == "Static Recognition":
            _static_recognition_loop()
        else:
            _dynamic_recognition_loop()

