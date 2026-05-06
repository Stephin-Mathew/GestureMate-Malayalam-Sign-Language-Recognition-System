# GestureMate — Malayalam Sign Language Recognition System

> **Final Year B.Tech Computer Science & Engineering Project**

GestureMate is a real-time Malayalam sign language recognition and communication platform designed to bridge the communication gap between deaf and mute individuals and the general public — without the need for a human interpreter. The system recognises hand gestures conforming to the **Malayalam Sign Language standard developed by the National Institute for Speech and Hearing (NISH), Trivandrum**, converts them into text, and also provides bidirectional voice–text support so that hearing users can communicate naturally with deaf and mute users on the same screen.

**Team:** Stephin Mathew · Kevin Biju Kulangara · Jeswin Sabu · Prapanch J

---

## Table of Contents

- [Motivation](#motivation)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Supported Signs](#supported-signs)
- [Modules](#modules)
  - [Sign Recognition](#1-sign-recognition)
  - [Voice-to-Text](#2-voice-to-text)
  - [Learning Module](#3-learning-module)
  - [Game Module](#4-game-module)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1 — Clone the Repository](#1--clone-the-repository)
  - [2 — Set Up the Python Backend](#2--set-up-the-python-backend)
  - [3 — Set Up the Next.js Frontend](#3--set-up-the-nextjs-frontend)
  - [4 — Configure Environment Variables](#4--configure-environment-variables)
  - [5 — Run the Application](#5--run-the-application)
- [Project Structure](#project-structure)
- [Dataset & Model](#dataset--model)
- [Case Study](#case-study)
- [Team](#team)
- [Contact](#contact)
- [Acknowledgements](#acknowledgements)

---

## Motivation

Deaf and mute individuals frequently face significant barriers when communicating with the general public, as most interactions require a sign language interpreter as an intermediary. This dependency limits spontaneous, independent communication and can be a source of social exclusion.

GestureMate addresses this problem directly. A deaf or mute user can form sentences character by character using Malayalam sign language gestures captured through a standard webcam. The recognised text is displayed on screen and can be spoken aloud at the press of a button, allowing hearing users to follow the conversation without any prior knowledge of sign language. Conversely, a hearing user can speak naturally in Malayalam — their speech is transcribed in real time and displayed for the deaf or mute user to read.

The system focuses specifically on the **NISH Malayalam Sign Language**, ensuring the gestures are standardised and compatible with the curriculum taught in schools for the deaf across Kerala.

---

## Key Features

| Feature | Description |
|---|---|
| **Real-Time Sign Recognition** | Webcam feed is processed at up to 60 fps using MediaPipe hand landmark detection and a Random Forest classifier |
| **Static & Dynamic Gesture Support** | Handles both single-pose (static) signs and motion-based (dynamic) signs |
| **Sentence Builder** | Individual signs are accumulated into a full sentence with backspace and reset support |
| **Text-to-Speech (TTS)** | The complete signed sentence can be spoken aloud using Google Cloud / Gemini TTS |
| **Voice-to-Text** | Hearing users can speak in Malayalam (ml-IN); speech is transcribed in real time using the Web Speech API |
| **Fast Conversation Mode** | Auto-commits a recognised character after three consecutive stable readings (~600 ms), enabling hands-free, low-latency input |
| **Learning Module** | An interactive tutorial displaying video demonstrations for all supported Malayalam characters |
| **Game Module** | A 15-level gamified practice environment with XP rewards, difficulty tiers, and an in-game sign video reference |
| **User Authentication** | Secure sign-up and login via Clerk; progress is persisted per user in MongoDB |
| **Offline Progress Backup** | Game progress is mirrored to `localStorage` so no data is lost during connectivity issues |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Sign     │  │   Learning   │  │   Game Module    │  │
│  │Recognition │  │   Module     │  │  (15 Levels)     │  │
│  └─────┬──────┘  └──────────────┘  └────────┬─────────┘  │
│        │  HTTP polling (200 ms)             │            │
└────────┼──────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────┐
│            Flask Backend  (localhost:5000)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              GestureMateEngine                        │  │
│  │  ┌────────────────────┐  ┌──────────────────────┐   │  │
│  │  │   MediaPipe Hands  │  │  Random Forest Model  │   │  │
│  │  │  (21 landmarks)    │  │  static_sign_model    │   │  │
│  │  └────────────────────┘  └──────────────────────┘   │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Dynamic Gesture Pipeline (30-frame buffer)    │  │  │
│  │  │  + Majority-Vote Locking (10-frame window)     │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│  MJPEG stream → /video_feed                                │
│  JSON state   → /status                                    │
└───────────────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────┐
│              MongoDB (via Mongoose)                        │
│  User accounts · Game progress · Completed levels · XP    │
└───────────────────────────────────────────────────────────┘
```

The Next.js frontend connects directly to the Flask backend at `localhost:5000` for the MJPEG camera stream (low-latency) and polls the `/status` endpoint every 200 ms to receive the currently detected character, confidence score, and full sentence state. All other application logic (authentication, progress storage, TTS) flows through the Next.js API routes.

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16 / React 19** | Page routing, UI rendering, API routes |
| **Clerk** | User authentication (sign-up, login, session management) |
| **Tailwind CSS 4** | Utility-first styling |
| **Web Speech API** | Real-time Malayalam voice recognition (Chrome / Edge) |
| **Google Cloud TTS / Gemini TTS** | Text-to-speech audio synthesis |

### Backend
| Technology | Purpose |
|---|---|
| **Python 3** | Core runtime |
| **Flask** | HTTP server, MJPEG streaming |
| **MediaPipe** | Real-time hand landmark detection (21 keypoints per hand) |
| **OpenCV** | Camera capture, frame processing, JPEG encoding |
| **scikit-learn** | Random Forest classifier (static signs) |
| **NumPy** | Feature vector construction and normalisation |
| **joblib / pickle** | Model serialisation |

### Database & Cloud
| Technology | Purpose |
|---|---|
| **MongoDB (Mongoose)** | User profiles, game progress, completed levels, XP |
| **Google Cloud** | Text-to-Speech API credentials |

---

## Supported Signs

The system currently recognises **51 distinct Malayalam characters** (consonants, vowels, and selected diacritical matras), plus two control gestures:

- **NEXT** — commits the currently pending character to the sentence
- **SPACE** — inserts a space between words

The full character set follows the NISH Malayalam Sign Language standard and includes:

```
അ ആ ഇ ഉ ഋ എ ഒ
ക ഖ ഗ ഘ ങ ച ഛ ജ ഞ
ട ഠ ഡ ഢ ണ ത ഥ ദ ധ ന
പ ഫ ബ ഭ യ ര ല വ ശ ഷ സ ഹ
ള ഴ റ ർ ൾ
ാ ് ു ൂ ി ീ െ േ
+ NEXT  + SPACE
```

Additional character mappings (vowel signs, conjuncts, chillu letters) are available in the Learning and Game modules via video demonstrations.

---

## Modules

### 1. Sign Recognition

The core module of GestureMate. A live webcam feed is displayed on the left panel, with real-time recognition results on the right.

**How it works:**
1. The Flask backend streams an annotated MJPEG feed to the browser; MediaPipe overlays hand landmark connections on each frame.
2. For every frame, the 21 hand landmarks are extracted and normalised (wrist as origin, scaled by maximum landmark distance).
3. In **Static Mode**, the 2D feature vector (42 values) is classified by the Random Forest model. Readings above 40% confidence are accumulated in a 5-frame buffer; majority vote determines the final character.
4. In **Dynamic Mode**, a rolling buffer of 30 consecutive 3D landmark frames is maintained. A 1890-dimensional feature vector is extracted and classified by a separate dynamic model. A majority-vote lock (6/10 frames must agree) prevents false positives.
5. The recognised character and accumulated sentence are displayed and updated continuously.

**Controls:**
- **Reset** — clears the current sentence
- **Backspace** — removes the last character
- **Fast Conversation Mode** — when enabled, characters are auto-committed after three consecutive stable readings (~600 ms), eliminating the need for the NEXT gesture
- **Speak (TTS)** — reads the complete signed sentence aloud using Gemini TTS

---

### 2. Voice-to-Text

Integrated directly into the Sign Recognition page, this module allows hearing users to communicate without typing.

- The microphone activates automatically when the page loads.
- Spoken Malayalam is transcribed in real time using the browser's Web Speech API (`ml-IN` locale).
- Interim (live) and final transcripts are displayed separately.
- The final transcript can be spoken back using the same TTS engine, providing a full conversational loop.
- The microphone is automatically paused while TTS audio is playing to prevent feedback, and resumes automatically after playback ends.

---

### 3. Learning Module

An interactive reference guide for users who want to learn or revise the NISH Malayalam sign alphabet.

- All supported characters are displayed in a clickable grid.
- Selecting any character opens a modal video player that demonstrates the correct hand gesture for that sign.
- Videos are served locally from `/public/videos/` and are mapped to character identifiers (e.g., `sign_16.mp4` for ക).

This module was designed as a self-study resource and requires no camera or internet connection beyond the initial page load.

---

### 4. Game Module

A gamified practice environment designed to reinforce sign language learning through structured, progressively challenging exercises.

**Levels & Difficulty:**

| Difficulty | Levels | XP Range | Description |
|---|---|---|---|
| ⭐ Easy | 1 – 4 | 50 – 120 XP | 2–3 signs per word (e.g., *കാർ*, *വര*) |
| ⭐⭐ Medium | 5 – 8 | 150 – 225 XP | 3–4 signs, includes diacritical matras |
| ⭐⭐⭐ Hard | 9 – 12 | 275 – 400 XP | 4–5 signs, virama clusters and compound matras |
| ⭐⭐⭐⭐ Expert | 13 – 15 | 500 – 750 XP | Full sentences (e.g., *ഞാൻ ഒരു പക്ഷിയെ കണ്ടു*) |

**How to play:**
1. Select an unlocked level from the level grid.
2. A target Malayalam word or sentence is displayed.
3. Form the signs for each character using your hand in front of the webcam.
4. As each character is correctly matched, the tile turns green.
5. When the complete sentence matches the target, you win the level and earn XP.
6. Levels are unlocked sequentially; completing a level permanently unlocks the next.

**Additional game features:**
- Clicking any character tile opens an in-game video tutorial for that specific sign.
- A live timer tracks how long you take to complete each level.
- XP and progress are saved to MongoDB and backed up to `localStorage` for resilience against network interruptions.
- Fast Conversation Mode and Static/Dynamic mode toggles are available in-game.

---

## Getting Started

### Prerequisites

Ensure the following are installed on your system before proceeding:

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | ≥ 18.x | [Download](https://nodejs.org/) |
| **npm** | ≥ 9.x | Included with Node.js |
| **Python** | ≥ 3.9 | [Download](https://www.python.org/) |
| **pip** | Latest | Included with Python |
| **Webcam** | Any | Required for sign recognition and the game module |
| **Chrome or Edge** | Latest | Required for voice recognition (Web Speech API) |
| **MongoDB** | Atlas or local | For user accounts and game progress |
| **Clerk account** | Free tier | [clerk.com](https://clerk.com) — for authentication |
| **Google Cloud account** | — | For Text-to-Speech (optional but recommended) |

---

### 1 — Clone the Repository

```bash
git clone https://github.com/Stephin-Mathew/GestureMate-Malayalam-Sign-Language-Recognition-System.git
cd GestureMate-Malayalam-Sign-Language-Recognition-System
```

---

### 2 — Set Up the Python Backend

Navigate to the `backend/` directory and create a virtual environment:

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**`requirements.txt` installs:**
- `flask` — HTTP server and MJPEG streaming
- `opencv-python` — camera capture and frame processing
- `mediapipe` — hand landmark detection
- `numpy` — numerical computation
- `scikit-learn` — Random Forest classifier
- `Pillow` — image utilities

**Verify the model files are present:**

```
backend/
├── model/
│   └── static_sign_model.pkl        ← Required (trained Random Forest)
├── labels.txt                       ← Character label mapping
├── app.py
└── test_live_core.py
```

> **⚠️ Model Not Included in Repository:** The trained model file (`static_sign_model.pkl`) is **not included** in this repository because it exceeds GitHub's recommended file size limit (the file is ~70 MB). You will need to either request the model file directly from the project team or retrain it using your own dataset. To request the model, please reach out via the contact details in the [Contact](#contact) section below. A dynamic gesture model (`sign_language_app/models/dynamic_model.pkl`) is also required for dynamic gesture support; contact the team to obtain it.

---

### 3 — Set Up the Next.js Frontend

From the project root directory (not `backend/`):

```bash
# Return to the root directory
cd ..

# Install Node.js dependencies
npm install
```

---

### 4 — Configure Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# ── Clerk Authentication ─────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_secret_key

# Clerk redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# ── MongoDB ──────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority

# ── Google Cloud Text-to-Speech ──────────────────────────────
# Path to your Google Cloud service account JSON key file
GOOGLE_APPLICATION_CREDENTIALS=./gen-lang-client-xxxx.json
```

**Getting your credentials:**

- **Clerk keys:** Create a free application at [clerk.com](https://clerk.com) → Dashboard → API Keys.
- **MongoDB URI:** Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com), add a database user, and copy the connection string.
- **Google Cloud TTS JSON key:** Follow the steps below.

#### Obtaining the Google Cloud Text-to-Speech Service Account Key

This is the JSON credentials file that allows GestureMate to call the Google Cloud Text-to-Speech API. Follow these steps to generate one:

1. **Create or open a Google Cloud project**
   - Go to the [Google Cloud Console](https://console.cloud.google.com).
   - Click the project selector at the top and choose **New Project** (or select an existing one).

2. **Enable the Text-to-Speech API**
   - In the left sidebar, navigate to **APIs & Services → Library**.
   - Search for **Cloud Text-to-Speech API** and click **Enable**.

3. **Create a Service Account**
   - Go to **APIs & Services → Credentials**.
   - Click **+ Create Credentials → Service Account**.
   - Give it a name (e.g., `gesturemate-tts`) and click **Create and Continue**.
   - For the role, select **Basic → Editor** (or the more restrictive **Cloud Text-to-Speech User** if available).
   - Click **Done**.

4. **Generate and download the JSON key**
   - On the **Credentials** page, click on the service account you just created.
   - Go to the **Keys** tab → **Add Key → Create new key**.
   - Select **JSON** and click **Create**.
   - A `.json` file will be downloaded automatically to your computer.

5. **Place the key file in the project**
   - Move the downloaded JSON file into the project root directory (next to `package.json`).
   - Rename it to something recognisable if needed (e.g., `gen-lang-client.json`).
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` variable in your `.env.local` to point to this file:

   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./gen-lang-client.json
   ```

> **Security:** Never commit this JSON file to a public repository. It is already listed in `.gitignore` to prevent accidental exposure.

---

### 5 — Run the Application

The application requires **two separate processes** running simultaneously: the Flask backend and the Next.js frontend.

#### Terminal 1 — Start the Flask Backend

```bash
cd backend

# Activate virtual environment (if not already active)
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

python app.py
```

You should see output similar to:

```
============================================================
GestureMate Flask Backend Starting...
============================================================
>>> Pre-warming camera...
>>> Camera pre-warmed OK
 * Running on http://127.0.0.1:5000
```

> **Important:** Run `app.py` from **inside** the `backend/` directory, as the engine expects model files at relative paths (`model/static_sign_model.pkl`, `labels.txt`).

#### Terminal 2 — Start the Next.js Frontend

```bash
# From the project root directory
npm run dev
```

The development server will start at:

```
http://localhost:3000
```

Open this URL in **Chrome** or **Edge** for full functionality, including voice recognition.

#### Verify the Setup

1. Open `http://localhost:3000` in your browser.
2. Sign up for an account (or log in if you already have one).
3. Navigate to **Sign Recognition** from the home dashboard.
4. You should see the live camera feed with MediaPipe hand landmarks overlaid.
5. The status indicator in the top-right of the camera panel should show **● Connected** (green).
6. Hold up your hand and perform a sign — the detected character and confidence score will update in real time.

> **Troubleshooting:** If the feed shows **● Disconnected**, ensure the Flask backend (`python app.py`) is running in a separate terminal and that no other application is using port 5000.

---

## Project Structure

```
GestureMate/
│
├── backend/                        # Python Flask backend
│   ├── app.py                      # Flask server, MJPEG stream, REST endpoints
│   ├── test_live_core.py           # GestureMateEngine (MediaPipe + ML inference)
│   ├── labels.txt                  # Sign ID → Malayalam character mapping
│   ├── requirements.txt            # Python dependencies
│   └── model/
│       └── static_sign_model.pkl   # Trained Random Forest model (static signs)
│
├── sign_language_app/              # Standalone training utilities
│   └── models/
│       └── dynamic_model.pkl       # Trained model for dynamic gestures (optional)
│
├── pages/                          # Next.js pages
│   ├── index.js                    # Home dashboard
│   ├── sign-recognition.js         # Sign recognition + voice-to-text page
│   ├── learning.js                 # Learning module
│   ├── game.js                     # Gamified practice module
│   ├── custom-training.js          # Custom sign training utility
│   └── api/                        # Next.js API routes (proxy to Flask + DB)
│       ├── status.js               # Proxy → Flask /status
│       ├── reset.js                # Proxy → Flask /reset
│       ├── patch-sentence.js       # Proxy → Flask /patch-sentence
│       ├── set-mode.js             # Proxy → Flask /set-mode
│       ├── video-feed.js           # Proxy → Flask /video_feed
│       ├── game-progress.js        # Read/write game progress to MongoDB
│       ├── gemini-tts.js           # Text-to-Speech via Google Cloud / Gemini
│       └── sync-user.js            # Sync Clerk user to MongoDB on login
│
├── components/                     # Reusable React components
│   ├── Navigation.js               # Top navigation bar
│   ├── AlphabetTutorial.js         # Sign video grid + modal (Learning module)
│   ├── FeatureCard.js              # Home page feature cards
│   ├── HeaderSection.js            # Home page hero banner
│   ├── Footer.js                   # Page footer
│   └── Loading.js                  # Loading screen
│
├── models/                         # Mongoose schema definitions
│   ├── User.js                     # User model
│   └── GameProgress.js             # Game progress model
│
├── lib/                            # Shared utilities
│   ├── mongodb.js                  # MongoDB connection helper
│   └── auth.js                     # Server-side auth helpers
│
├── public/
│   └── videos/                     # Sign language tutorial videos
│       ├── sign_01.mp4             # Video for അ
│       ├── sign_02.mp4             # Video for ആ
│       └── ...                     # (one file per sign)
│
├── styles/                         # Global CSS
├── .env.local                      # Environment variables (not committed)
├── next.config.js                  # Next.js configuration
└── package.json                    # Node.js dependencies and scripts
```

---

## Dataset & Model

### Data Collection

A custom dataset was created specifically for this project. For each of the 51 supported Malayalam sign language characters, a minimum of **200 training images** were captured under varied conditions (different hand orientations, skin tones, lighting, and backgrounds) to ensure robust generalisation.

### Feature Extraction

MediaPipe Hands extracts **21 3D keypoints** per hand per frame. For static sign recognition, the 2D (x, y) coordinates are used, yielding a 42-dimensional feature vector after normalisation:

1. **Translation normalisation** — the wrist keypoint (landmark 0) is subtracted from all landmarks to make the representation position-invariant.
2. **Scale normalisation** — all coordinates are divided by the maximum absolute value, making the representation scale-invariant.

For dynamic gesture recognition, 30 consecutive frames of 3D (x, y, z) landmarks are stacked into a 1890-dimensional feature vector.

### Model

A **Random Forest** classifier was selected for its:
- High accuracy on tabular/structured landmark data
- Robustness to overfitting with limited training data
- Fast inference speed suitable for real-time operation (60 fps target)
- Built-in probability estimates (`predict_proba`) used for the confidence bar and thresholding

The trained static model achieves high classification accuracy across the full Malayalam character set. Static signs generally yield higher confidence than dynamic ones due to the absence of motion variability.

---

## Case Study

The Learning and Game modules were designed based on a formal case study conducted at **CSI Vocational Higher Secondary School for the Deaf, Thiruvalla, Kerala**.

Key findings from the case study:
- Students in schools for the deaf follow the same CBSE/State Board curriculum as hearing students, leaving very limited dedicated time for sign language practice during school hours.
- As a result, the responsibility for learning and reinforcing sign language largely falls on the individual student, who must practise independently outside of school.
- Students responded positively to gamified learning formats and indicated that interactive practice tools would significantly improve their motivation and retention.

These insights directly shaped the design of GestureMate's Game Module — specifically the progressive difficulty structure, XP reward system, and the availability of in-game video tutorials that allow students to reference the correct gesture for any character without leaving the practice environment.

---

## Contact

For questions, collaboration enquiries, or to request the trained model files (which are not included in this repository due to file size constraints), please reach out:

- **Stephin Mathew** — [stephinmathew2000@gmail.com](mailto:stephinmathew2000@gmail.com)

---

## Acknowledgements

- **National Institute for Speech and Hearing (NISH), Trivandrum** — for the standardised Malayalam Sign Language system that forms the basis of the gesture set used in this project.
- **CSI Vocational Higher Secondary School for the Deaf, Thiruvalla, Kerala** — for participating in the case study that informed the design of the Learning and Game modules.
- **Google MediaPipe** — for the open-source hand landmark detection framework.
- **Clerk** — for authentication infrastructure.

---

*Developed as a Final Year B.Tech Computer Science & Engineering Project by Stephin Mathew, Kevin Biju Kulangara, Jeswin Sabu, and Prapanch J.*
