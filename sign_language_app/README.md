# Malayalam Sign Language Recognition

This is a complete **Tkinter desktop application** for recognizing **Malayalam Sign Language** gestures using **MediaPipe Hands**, **OpenCV**, and **Random Forest** classifiers.

The app supports:

- **Static signs** (single-frame gestures)
- **Dynamic signs** (30-frame motion sequences)

All signs and labels are provided **interactively by the user** via the GUI.

## Features

- Add new static and dynamic signs with your webcam
- Store samples in CSV files:
  - `data/static_signs.csv`
  - `data/dynamic_signs.csv`
- Train two separate Random Forest models:
  - `models/static_model.pkl` (63 features)
  - `models/dynamic_model.pkl` (1890 features)
- Real-time recognition from webcam for both static and dynamic modes

## Project Structure

```text
sign_language_app/
├── app.py                # Tkinter UI entry point
├── data/
│   ├── static_signs.csv
│   ├── dynamic_signs.csv
├── models/
│   ├── static_model.pkl
│   ├── dynamic_model.pkl
├── utils/
│   ├── camera.py
│   ├── mediapipe_utils.py
│   ├── feature_extractor.py
│   ├── data_utils.py
├── USAGE.md
└── requirements.txt
```

## Installation

```bash
cd sign_language_app
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Running the App

From inside the `sign_language_app` directory:

```bash
python app.py
```

This will open a Tkinter window with tabs for:

- Home
- Add New Sign
- Train Models
- Live Recognition

## Notes

- The app uses **CPU-only** Random Forest models (no deep learning).
- Malayalam labels are **never hardcoded** – you enter them in the UI.
- Make sure your webcam is accessible and not used by other applications.

