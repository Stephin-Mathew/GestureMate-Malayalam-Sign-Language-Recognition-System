import streamlit as st


def show() -> None:
    """Home page explaining the application."""
    st.title("Malayalam Sign Language Recognition")

    st.markdown(
        """
This application recognizes **Malayalam Sign Language** gestures using your webcam.

### Gesture Types
- **Static signs**:
  - Recognized from a **single frame**.
  - Feature vector: 21 hand landmarks × (x, y, z) = **63 features**.
- **Dynamic signs**:
  - Recognized from a **sequence of 30 frames**.
  - Feature vector: 30 frames × 21 landmarks × 3 values = **1890 features**.

All Malayalam characters and gesture labels are **defined by you** when collecting data.

Use the sidebar to:
- **Add New Sign**: collect training data for static and dynamic signs.
- **Train Models**: train Random Forest models on the collected data.
- **Live Recognition**: run real-time recognition from your webcam.
"""
    )

