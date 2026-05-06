from __future__ import annotations

from pathlib import Path
from typing import Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

STATIC_CSV = DATA_DIR / "static_signs.csv"
DYNAMIC_CSV = DATA_DIR / "dynamic_signs.csv"

STATIC_MODEL_PATH = MODELS_DIR / "static_model.pkl"
DYNAMIC_MODEL_PATH = MODELS_DIR / "dynamic_model.pkl"


def ensure_directories() -> None:
    """Ensure that data and model directories exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)


def _feature_column_names(num_features: int) -> list[str]:
    return [f"f{i}" for i in range(num_features)]


def append_sample_to_csv(features: np.ndarray, label: str, csv_path: Path) -> None:
    """
    Append a single sample to a CSV file.

    The last column is the label; feature columns are numeric.
    """
    ensure_directories()

    num_features = features.shape[0]
    cols = _feature_column_names(num_features) + ["label"]

    df_row = pd.DataFrame(
        [np.concatenate([features.astype(float), np.array([label], dtype=object)])],
        columns=cols,
    )

    if csv_path.exists():
        df_row.to_csv(csv_path, mode="a", header=False, index=False)
    else:
        df_row.to_csv(csv_path, mode="w", header=True, index=False)


def load_dataset(csv_path: Path) -> Tuple[np.ndarray, np.ndarray]:
    """Load features and labels from a CSV file."""
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset file does not exist: {csv_path}")

    df = pd.read_csv(csv_path)
    if df.empty:
        raise ValueError(f"Dataset file is empty: {csv_path}")

    if "label" not in df.columns:
        raise ValueError("CSV must contain a 'label' column as the last column.")

    # Ensure no missing values
    if df.isna().any().any():
        raise ValueError("Dataset contains missing values. Please clean the CSV.")

    X = df.drop(columns=["label"]).to_numpy(dtype=float)
    y = df["label"].to_numpy()
    return X, y


def train_random_forest(
    X: np.ndarray, y: np.ndarray
) -> Tuple[RandomForestClassifier, Dict[str, float]]:
    """
    Train a RandomForestClassifier with the required hyperparameters.

    Returns:
        model: Trained RandomForestClassifier.
        metrics: Dict with training accuracy and sample stats.
    """
    if X.shape[0] < 2:
        raise ValueError("Need at least 2 samples to train a model.")

    # Simple train/validation split to report accuracy
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if len(set(y)) > 1 else None
    )

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_val)
    acc = accuracy_score(y_val, y_pred)

    # Per-class sample counts (on full dataset)
    unique, counts = np.unique(y, return_counts=True)
    samples_per_class = {str(label): int(count) for label, count in zip(unique, counts)}

    metrics = {
        "accuracy": float(acc),
        "num_samples": int(X.shape[0]),
    }
    # type: ignore[assignment]
    metrics["samples_per_class"] = samples_per_class  # attach dict
    return model, metrics


def save_model(model: RandomForestClassifier, path: Path) -> None:
    ensure_directories()
    joblib.dump(model, path)


def load_model(path: Path) -> RandomForestClassifier:
    if not path.exists():
        raise FileNotFoundError(f"Model file does not exist: {path}")
    model = joblib.load(path)
    if not isinstance(model, RandomForestClassifier):
        raise TypeError("Loaded model is not a RandomForestClassifier.")
    return model

