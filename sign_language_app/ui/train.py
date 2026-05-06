from __future__ import annotations

import traceback

import streamlit as st

from utils.data_utils import (
    DYNAMIC_CSV,
    STATIC_CSV,
    DYNAMIC_MODEL_PATH,
    STATIC_MODEL_PATH,
    load_dataset,
    save_model,
    train_random_forest,
)


def _train_and_report(csv_path, model_path, model_type: str) -> None:
    """Train a RandomForest on the given CSV and report metrics."""
    try:
        X, y = load_dataset(csv_path)
    except FileNotFoundError:
        st.warning(f"No dataset found for {model_type} signs at {csv_path.name}.")
        return
    except ValueError as e:
        st.error(str(e))
        return

    if len(set(y)) < 1:
        st.warning(f"Dataset for {model_type} signs is empty.")
        return

    if len(set(y)) == 1:
        st.warning(
            f"Dataset for {model_type} signs has only one class. "
            "Random Forest can still train, but recognition will be limited."
        )

    with st.spinner(f"Training {model_type} model..."):
        try:
            model, metrics = train_random_forest(X, y)
        except Exception as e:  # noqa: BLE001
            st.error(f"Failed to train {model_type} model: {e}")
            st.text(traceback.format_exc())
            return

    save_model(model, model_path)

    st.success(f"{model_type} model trained and saved to {model_path.name}.")
    st.write("**Training accuracy (on validation split):**", f"{metrics['accuracy']:.3f}")
    st.write("**Number of samples:**", metrics["num_samples"])
    st.write("**Samples per class:**")
    st.json(metrics["samples_per_class"])


def show() -> None:
    """Page for training static and dynamic models."""
    st.header("Train Models")

    st.markdown(
        """
Train separate **Random Forest** models for:

- **Static signs** (63 features)
- **Dynamic signs** (1890 features)
"""
    )

    col1, col2 = st.columns(2)
    train_static = col1.button("Train Static Model")
    train_dynamic = col2.button("Train Dynamic Model")

    if train_static:
        _train_and_report(STATIC_CSV, STATIC_MODEL_PATH, "static")

    if train_dynamic:
        _train_and_report(DYNAMIC_CSV, DYNAMIC_MODEL_PATH, "dynamic")

