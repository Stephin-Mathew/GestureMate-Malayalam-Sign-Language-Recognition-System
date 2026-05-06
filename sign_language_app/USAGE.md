# Malayalam Sign Language App — Usage Guide

This guide explains how to **use** the Malayalam Sign Language Recognition app end to end.

---

## 1. Prerequisites

- **Python 3.9+**
- Working **webcam**
- Installed dependencies:

```bash
cd sign_language_app
python -m venv .venv
.\.venv\Scripts\activate  # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

---

## 2. Start the App

From inside `sign_language_app`:

```bash
python app.py
```

This opens a Tkinter desktop window with tabs:

- `Home`
- `Add New Sign`
- `Train Models`
- `Live Recognition`

---

## 3. Adding New Signs (Data Collection)

Switch to the **“Add New Sign”** tab in the Tkinter window.

### 3.1 Choose Sign Type

- `Static`:
  - Single-frame hand pose.
  - Features: 21 landmarks × (x, y, z) = 63 features.
- `Dynamic`:
  - Motion over exactly 30 valid frames.
  - Features: 30 × 21 × 3 = 1890 features.

### 3.2 Enter Label

- In the **text input**, type the **Malayalam character** you’re recording (e.g. `ക`, `ച`).
- Labels are **not hardcoded**; you can enter any Malayalam or custom symbol.

### 3.3 Record Static Sign

1. Set `Sign type` = `Static`.
2. Enter a label (e.g. `ക`).
3. Click **“Start Recording”**.
4. Hold the static gesture in front of the webcam.
5. The app:
   - Runs MediaPipe Hands on each frame.
   - Uses the **first detected hand** only.
   - Normalizes landmarks (wrist as origin, scaled by max distance).
   - Captures a sample when a hand is detected.
6. On success you’ll see:
   - A success message.
   - Sample saved to `data/static_signs.csv`.

If no hand is detected within ~10 seconds, the sample is **not saved** and a warning is shown.

### 3.4 Record Dynamic Sign

1. Set `Sign type` = `Dynamic`.
2. Enter a label (e.g. `ക`).
3. Click **“Start Recording”**.
4. Perform the gesture motion continuously for about **2–3 seconds** in front of the camera.
5. The app:
   - Collects only frames where a hand is detected.
   - Shows a **progress bar**: frames collected / 30.
   - Stops automatically when 30 valid frames are collected.
6. On success:
   - 30 normalized landmark frames are flattened to 1890 features.
   - Sample is saved to `data/dynamic_signs.csv`.

If fewer than 30 valid frames are collected (e.g. you stop moving or press `q` in the OpenCV window), the sample is **discarded** and a warning is displayed.

---

## 4. Training the Models

Switch to the **“Train Models”** tab.

You will see two buttons:

- `Train Static Model`
- `Train Dynamic Model`

### 4.1 Train Static Model

1. Make sure you have at least a few entries in `data/static_signs.csv`
   (collect multiple examples per label for best results).
2. Click **“Train Static Model”**.
3. The app:
   - Loads and validates `data/static_signs.csv`.
   - Trains a `RandomForestClassifier` with:
     - `n_estimators=300`
     - `max_depth=None`
     - `random_state=42`
     - `n_jobs=-1` (CPU parallelism)
   - Performs a train/validation split and computes accuracy.
   - Saves the model as `models/static_model.pkl`.
4. After training finishes you’ll see:
   - Validation accuracy.
   - Total number of samples.
   - Number of samples per class (label).

If the CSV is missing, empty, or has invalid data, a clear warning or error is shown instead.

### 4.2 Train Dynamic Model

1. Collect several dynamic samples per label into `data/dynamic_signs.csv`.
2. Click **“Train Dynamic Model”**.
3. The app trains another `RandomForestClassifier` with the same hyperparameters on 1890-D features.
4. The trained model is saved as `models/dynamic_model.pkl`.
5. Similar statistics (accuracy, samples per class) are displayed.

> **Tip:** Try to record multiple examples of each sign, with slight variations in speed and position, to improve robustness.

---

## 5. Live Recognition

Switch to the **“Live Recognition”** tab.

### 5.1 Select Mode

- `Static Recognition`:
  - Uses `models/static_model.pkl`.
  - Predicts from a **single frame**.
- `Dynamic Recognition`:
  - Uses `models/dynamic_model.pkl`.
  - Predicts from a **rolling buffer of 30 frames**.

### 5.2 Start Recognition

1. Choose `Static Recognition` or `Dynamic Recognition`.
2. Click **“Start”**.
3. The app opens the webcam and starts processing frames in real time.

#### Static Mode

- For each frame:
  - If a hand is detected:
    - Extracts 63-D static features.
    - Predicts label and probability with the static model.
    - Displays: **Predicted label** and **Confidence**.
  - If no hand:
    - Displays **“No hand detected”**.

#### Dynamic Mode

- Maintains a sliding buffer of up to **30 recent hand frames**.
- Only frames with a detected hand are stored.
- When the buffer reaches length 30:
  - Extracts 1890-D dynamic features.
  - Predicts label and probability with the dynamic model.
  - Displays: **Predicted label** and **Confidence**.
- A small text indicator shows **`Frames in buffer: N/30`** in real time.

### 5.3 Stopping Recognition

- Click the **“Stop”** button on the Live Recognition tab, **or**
- Close the Tkinter window.

---

## 6. Data & Model Files

- **Static samples CSV**: `data/static_signs.csv`
- **Dynamic samples CSV**: `data/dynamic_signs.csv`
- **Static model**: `models/static_model.pkl`
- **Dynamic model**: `models/dynamic_model.pkl`

All CSVs:

- Use **numeric feature columns** (`f0`…`f62` or `f0`…`f1889`).
- Use **`label`** as the final column.
- Contain **no missing values** (the app enforces this on load).

---

## 7. Practical Tips

- Record **several samples per sign** for both static and dynamic gestures.
- Try to keep your hand roughly centered and fully inside the camera frame.
- Avoid strong motion blur or very low light.
- If recognition is poor for a particular sign:
  - Collect more data for that sign.
  - Retrain the corresponding model.

