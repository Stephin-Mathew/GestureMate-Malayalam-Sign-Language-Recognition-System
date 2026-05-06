from __future__ import annotations

import tkinter as tk
from collections import deque
from queue import Empty, Queue
from threading import Event, Thread
from tkinter import messagebox, ttk
from typing import Deque, Optional

import cv2
import numpy as np
from PIL import Image, ImageTk
import time

from utils.camera import open_camera, read_frame, release_camera
from utils.data_utils import (
    DYNAMIC_CSV,
    DYNAMIC_MODEL_PATH,
    STATIC_CSV,
    STATIC_MODEL_PATH,
    append_sample_to_csv,
    load_dataset,
    load_model,
    save_model,
    train_random_forest,
)
from utils.feature_extractor import (
    extract_dynamic_features,
    extract_static_features,
)
from utils.mediapipe_utils import get_global_detector


class SignLanguageApp:
    """Tkinter UI for Malayalam Sign Language Recognition."""

    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Malayalam Sign Language Recognition")
        self.root.minsize(960, 640)

        # Neutral background for the root window
        self.root.configure(bg="#f5f5f5")

        # Fonts for consistent typography across the app
        self.font_title = ("Segoe UI", 18, "bold")
        self.font_section = ("Segoe UI", 13, "bold")
        self.font_normal = ("Segoe UI", 10)
        self.font_status = ("Segoe UI", 9)

        # State (shared with worker thread where noted)
        self.detector = get_global_detector()
        # Camera object is owned and used only by the worker thread
        self.cap: Optional[cv2.VideoCapture] = None
        # Current mode is read by both UI and worker threads
        self.mode: str = "idle"  # idle, static_collect, dynamic_collect, static_recog, dynamic_recog
        self.dynamic_buffer: Deque[np.ndarray] = deque(maxlen=30)
        # Separate dynamic buffer used by the worker for live dynamic recognition
        self._worker_dyn_buffer: Deque[np.ndarray] = deque(maxlen=60)

        self.static_model = None
        self.dynamic_model = None

        # Threading & communication
        # - worker_thread runs heavy work (camera, MediaPipe, feature extraction, prediction)
        # - result_queue passes results & status back to the UI thread
        # - worker_stop_event is used to terminate the worker cleanly
        self.result_queue: "Queue[dict]" = Queue()
        self.worker_stop_event = Event()
        self.worker_thread: Optional[Thread] = None

        # Shared UI variables (Tkinter-only; updated from UI thread)
        self.status_var = tk.StringVar(value="")
        self.prediction_var = tk.StringVar(value="")
        self.progress_var = tk.DoubleVar(value=0.0)

        # Layout (containers and widgets)
        self._build_ui()

        # Start background worker thread once
        self.worker_thread = Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()

        # Start UI-side queue polling (lightweight, uses root.after)
        self._poll_queue()

        # Ensure clean shutdown of worker when window is closed
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    # --------------------------------------------------------------------- UI
    def _build_ui(self) -> None:
        # Root-level container frames: header, main content (tabs), status bar

        # Main container holds header + content (uses grid for good scaling)
        self.main_container = ttk.Frame(self.root, padding=(10, 10, 10, 5))
        self.main_container.pack(fill="both", expand=True)

        self.main_container.columnconfigure(0, weight=1)
        self.main_container.rowconfigure(1, weight=1)  # content row grows

        # Header
        header_frame = ttk.Frame(self.main_container)
        header_frame.grid(row=0, column=0, sticky="ew", pady=(0, 8))

        header_label = ttk.Label(
            header_frame,
            text="Malayalam Sign Language Recognition",
            font=self.font_title,
        )
        header_label.pack(anchor="w")

        # Main content area with Notebook
        content_frame = ttk.Frame(self.main_container)
        content_frame.grid(row=1, column=0, sticky="nsew")
        content_frame.columnconfigure(0, weight=1)
        content_frame.rowconfigure(0, weight=1)

        notebook = ttk.Notebook(content_frame)
        notebook.grid(row=0, column=0, sticky="nsew")

        # Individual tab frames
        self.home_frame = ttk.Frame(notebook, padding=(12, 12, 12, 12))
        self.collect_frame = ttk.Frame(notebook, padding=(12, 12, 12, 12))
        self.train_frame = ttk.Frame(notebook, padding=(12, 12, 12, 12))
        self.recognize_frame = ttk.Frame(notebook, padding=(12, 12, 12, 12))

        notebook.add(self.home_frame, text="Home")
        notebook.add(self.collect_frame, text="Add New Sign")
        notebook.add(self.train_frame, text="Train Models")
        notebook.add(self.recognize_frame, text="Live Recognition")

        # Build contents of each tab
        self._build_home_tab()
        self._build_collect_tab()
        self._build_train_tab()
        self._build_recognize_tab()

        # Status bar at the bottom of the window
        status_bar = ttk.Label(
            self.root,
            textvariable=self.status_var,
            relief=tk.SUNKEN,
            anchor="w",
            padding=(8, 4),
            font=self.font_status,
        )
        status_bar.pack(fill="x", side=tk.BOTTOM)

    def _build_home_tab(self) -> None:
        # Use a simple vertical layout with consistent padding
        self.home_frame.columnconfigure(0, weight=1)

        title = ttk.Label(
            self.home_frame,
            text="Overview",
            font=self.font_section,
        )
        title.grid(row=0, column=0, sticky="w", pady=(0, 8))

        text = (
            "This application recognizes Malayalam Sign Language gestures using your webcam.\n\n"
            "Gesture types:\n"
            "• Static signs: single-frame gestures (63 features).\n"
            "• Dynamic signs: motion over 30 frames (1890 features).\n\n"
            "Use the other tabs to collect data, train models, and run live recognition."
        )
        lbl = ttk.Label(
            self.home_frame,
            text=text,
            justify="left",
            font=self.font_normal,
            wraplength=800,
        )
        lbl.grid(row=1, column=0, sticky="nw", pady=(0, 8))

    def _build_collect_tab(self) -> None:
        # Top-level layout inside the tab: controls at top, video below
        self.collect_frame.columnconfigure(0, weight=1)

        frm_controls = ttk.Frame(self.collect_frame)
        frm_controls.grid(row=0, column=0, sticky="ew")
        frm_controls.columnconfigure(1, weight=1)

        # Row 0: Sign type
        ttk.Label(
            frm_controls,
            text="Sign type:",
            font=self.font_normal,
        ).grid(row=0, column=0, sticky="w", padx=(0, 8), pady=(0, 4))
        self.collect_sign_type = tk.StringVar(value="Static")
        cmb = ttk.Combobox(
            frm_controls,
            textvariable=self.collect_sign_type,
            values=["Static", "Dynamic"],
            state="readonly",
            width=10,
        )
        cmb.grid(row=0, column=1, sticky="w", padx=(0, 8), pady=(0, 4))

        # Row 1: Label entry
        ttk.Label(
            frm_controls,
            text="Malayalam label:",
            font=self.font_normal,
        ).grid(row=1, column=0, sticky="w", padx=(0, 8), pady=4)
        self.collect_label_var = tk.StringVar()
        entry = ttk.Entry(
            frm_controls,
            textvariable=self.collect_label_var,
            width=20,
        )
        entry.grid(row=1, column=1, sticky="w", pady=4)

        # Row 2: Buttons
        btn_start = ttk.Button(
            frm_controls,
            text="Start Recording",
            command=self.start_collect,
        )
        btn_start.grid(row=2, column=0, sticky="w", pady=(8, 4))

        btn_abort = ttk.Button(
            frm_controls,
            text="Abort",
            command=self.abort_collect,
        )
        btn_abort.grid(row=2, column=1, sticky="w", pady=(8, 4))

        # Row 3: Progress for dynamic
        ttk.Label(
            frm_controls,
            text="Dynamic frames:",
            font=self.font_normal,
        ).grid(row=3, column=0, sticky="w", padx=(0, 8), pady=(8, 0))
        self.progress_bar = ttk.Progressbar(
            frm_controls, variable=self.progress_var, maximum=30, length=200
        )
        self.progress_bar.grid(row=3, column=1, sticky="w", pady=(8, 0))

        # Row 1: Video display area, centered and allowed to grow
        self.collect_frame.rowconfigure(1, weight=1)
        video_container = ttk.Frame(self.collect_frame)
        video_container.grid(row=1, column=0, sticky="nsew", pady=(12, 0))
        video_container.columnconfigure(0, weight=1)
        video_container.rowconfigure(0, weight=1)

        self.collect_video_label = ttk.Label(video_container, anchor="center")
        self.collect_video_label.grid(row=0, column=0, sticky="nsew")

    def _build_train_tab(self) -> None:
        self.train_frame.columnconfigure(0, weight=1)
        self.train_frame.rowconfigure(1, weight=1)

        # Section header
        header = ttk.Label(
            self.train_frame,
            text="Train Random Forest Models",
            font=self.font_section,
        )
        header.grid(row=0, column=0, sticky="w", pady=(0, 8))

        # Controls row
        frm = ttk.Frame(self.train_frame)
        frm.grid(row=1, column=0, sticky="ew")
        frm.columnconfigure(0, weight=0)
        frm.columnconfigure(1, weight=0)
        frm.columnconfigure(2, weight=1)

        btn_static = ttk.Button(
            frm,
            text="Train Static Model",
            command=self.train_static_model,
        )
        btn_static.grid(row=0, column=0, sticky="w", pady=(0, 8), padx=(0, 8))

        btn_dynamic = ttk.Button(
            frm,
            text="Train Dynamic Model",
            command=self.train_dynamic_model,
        )
        btn_dynamic.grid(row=0, column=1, sticky="w", pady=(0, 8))

        # Training log output
        output_container = ttk.Frame(self.train_frame)
        output_container.grid(row=2, column=0, sticky="nsew", pady=(4, 0))
        output_container.columnconfigure(0, weight=1)
        output_container.rowconfigure(0, weight=1)

        self.train_output = tk.Text(
            output_container,
            width=80,
            height=16,
            state="disabled",
            wrap="word",
        )
        self.train_output.grid(row=0, column=0, sticky="nsew")

    def _build_recognize_tab(self) -> None:
        self.recognize_frame.columnconfigure(0, weight=1)
        self.recognize_frame.rowconfigure(1, weight=1)

        frm_controls = ttk.Frame(self.recognize_frame)
        frm_controls.grid(row=0, column=0, sticky="ew")
        frm_controls.columnconfigure(1, weight=1)

        ttk.Label(
            frm_controls,
            text="Recognition mode:",
            font=self.font_normal,
        ).grid(row=0, column=0, sticky="w", padx=(0, 8), pady=(0, 4))
        self.recog_mode_var = tk.StringVar(value="Static Recognition")
        cmb = ttk.Combobox(
            frm_controls,
            textvariable=self.recog_mode_var,
            values=["Static Recognition", "Dynamic Recognition"],
            state="readonly",
            width=18,
        )
        cmb.grid(row=0, column=1, sticky="w", pady=(0, 4))

        btn_start = ttk.Button(
            frm_controls,
            text="Start",
            command=self.start_recognition,
        )
        btn_start.grid(row=1, column=0, sticky="w", pady=(8, 4))

        btn_stop = ttk.Button(
            frm_controls,
            text="Stop",
            command=self.stop_recognition,
        )
        btn_stop.grid(row=1, column=1, sticky="w", pady=(8, 4))

        self.recog_info_label = ttk.Label(
            frm_controls,
            textvariable=self.prediction_var,
            font=self.font_normal,
        )
        self.recog_info_label.grid(
            row=2, column=0, columnspan=2, sticky="w", pady=(8, 0)
        )

        # Video display area
        video_container = ttk.Frame(self.recognize_frame)
        video_container.grid(row=1, column=0, sticky="nsew", pady=(12, 0))
        video_container.columnconfigure(0, weight=1)
        video_container.rowconfigure(0, weight=1)

        self.recog_video_label = ttk.Label(video_container, anchor="center")
        self.recog_video_label.grid(row=0, column=0, sticky="nsew")

    # -------------------------------------------------------------- Collection
    def start_collect(self) -> None:
        label = self.collect_label_var.get().strip()
        if not label:
            messagebox.showwarning("Missing label", "Please enter a Malayalam label.")
            return

        sign_type = self.collect_sign_type.get()
        self.dynamic_buffer.clear()
        self.progress_var.set(0)

        if sign_type == "Static":
            self.mode = "static_collect"
            self.status_var.set(f"Collecting static sample for label '{label}'...")
        else:
            self.mode = "dynamic_collect"
            self.status_var.set(f"Collecting dynamic sample for label '{label}' (30 frames)...")

    def abort_collect(self) -> None:
        if self.mode in ("static_collect", "dynamic_collect"):
            self.mode = "idle"
            self.dynamic_buffer.clear()
            self.progress_var.set(0)
            self.status_var.set("Collection aborted. No sample saved.")

    # -------------------------------------------------------------- Recognition
    def start_recognition(self) -> None:
        mode = self.recog_mode_var.get()
        self.dynamic_buffer.clear()
        if mode == "Static Recognition":
            # Lazy-load static model
            if self.static_model is None:
                try:
                    self.static_model = load_model(STATIC_MODEL_PATH)
                except FileNotFoundError:
                    messagebox.showwarning(
                        "Model missing",
                        "Static model file not found. Train it first on the 'Train Models' tab.",
                    )
                    return
            self.mode = "static_recog"
            self.status_var.set("Static recognition running...")
        else:
            if self.dynamic_model is None:
                try:
                    self.dynamic_model = load_model(DYNAMIC_MODEL_PATH)
                except FileNotFoundError:
                    messagebox.showwarning(
                        "Model missing",
                        "Dynamic model file not found. Train it first on the 'Train Models' tab.",
                    )
                    return
            self.mode = "dynamic_recog"
            self.status_var.set("Dynamic recognition running...")

    def stop_recognition(self) -> None:
        if self.mode in ("static_recog", "dynamic_recog"):
            self.mode = "idle"
            self.dynamic_buffer.clear()
            self.prediction_var.set("")
            self.status_var.set("Recognition stopped.")

    # -------------------------------------------------------------- Training
    def _append_train_output(self, text: str) -> None:
        self.train_output.configure(state="normal")
        self.train_output.insert("end", text + "\n")
        self.train_output.configure(state="disabled")
        self.train_output.see("end")

    def train_static_model(self) -> None:
        try:
            X, y = load_dataset(STATIC_CSV)
        except FileNotFoundError:
            messagebox.showwarning(
                "Dataset missing",
                f"No static dataset found at {STATIC_CSV.name}. Collect samples first.",
            )
            return
        except Exception as e:  # noqa: BLE001
            messagebox.showerror("Error", str(e))
            return

        self._append_train_output("Training static model...")
        try:
            model, metrics = train_random_forest(X, y)
        except Exception as e:  # noqa: BLE001
            messagebox.showerror("Training error", str(e))
            self._append_train_output(f"Error: {e}")
            return

        save_model(model, STATIC_MODEL_PATH)
        self.static_model = model

        self._append_train_output(
            f"Static model trained. Accuracy: {metrics['accuracy']:.3f}, "
            f"samples: {metrics['num_samples']}"
        )
        self._append_train_output(f"Samples per class: {metrics['samples_per_class']}")

    def train_dynamic_model(self) -> None:
        try:
            X, y = load_dataset(DYNAMIC_CSV)
        except FileNotFoundError:
            messagebox.showwarning(
                "Dataset missing",
                f"No dynamic dataset found at {DYNAMIC_CSV.name}. Collect samples first.",
            )
            return
        except Exception as e:  # noqa: BLE001
            messagebox.showerror("Error", str(e))
            return

        self._append_train_output("Training dynamic model...")
        try:
            model, metrics = train_random_forest(X, y)
        except Exception as e:  # noqa: BLE001
            messagebox.showerror("Training error", str(e))
            self._append_train_output(f"Error: {e}")
            return

        save_model(model, DYNAMIC_MODEL_PATH)
        self.dynamic_model = model

        self._append_train_output(
            f"Dynamic model trained. Accuracy: {metrics['accuracy']:.3f}, "
            f"samples: {metrics['num_samples']}"
        )
        self._append_train_output(f"Samples per class: {metrics['samples_per_class']}")

    # -------------------------------------------------------------- Worker thread logic
    def _worker_loop(self) -> None:
        """
        Background worker loop.

        Heavy operations performed here (in a background thread):
        - Open/close the camera as needed.
        - Read frames from the camera.
        - Run MediaPipe hand detection.
        - Run feature extraction and model prediction for live recognition.
        - Manage gesture-level locking for static and dynamic recognition.
        - Send frames, locked predictions, and status messages back to the UI thread via result_queue.

        This function NEVER touches Tkinter widgets directly.
        """

        # Tunable constants for gesture-level locking
        CONF_THRESHOLD = 0.75
        STABLE_FRAMES = 8
        RESET_FRAMES = 10

        # Gesture-level state (lives entirely inside the worker thread)
        gesture_locked: bool = False
        locked_label: Optional[str] = None
        locked_confidence: float = 0.0
        stable_count: int = 0
        no_hand_count: int = 0
        prev_label: Optional[str] = None

        last_mode: str = "idle"

        while not self.worker_stop_event.is_set():
            current_mode = self.mode  # simple state read; UI thread may change it

            # If the recognition mode changes, reset all gesture-level state.
            if current_mode != last_mode:
                gesture_locked = False
                locked_label = None
                locked_confidence = 0.0
                stable_count = 0
                no_hand_count = 0
                prev_label = None
                self._worker_dyn_buffer.clear()
                last_mode = current_mode

            if current_mode == "idle":
                # When idle, ensure camera is released and sleep briefly.
                if self.cap is not None:
                    release_camera(self.cap)
                    self.cap = None
                time.sleep(0.03)
                continue

            # Ensure camera is open
            if self.cap is None:
                self.cap = open_camera()
                if self.cap is None:
                    # Inform UI about the failure via the queue
                    self.result_queue.put(
                        {"kind": "status", "text": "Unable to open webcam.", "mode": current_mode}
                    )
                    time.sleep(0.5)
                    continue

            # Read a frame
            ok, frame = read_frame(self.cap)
            if not ok:
                self.result_queue.put(
                    {"kind": "status", "text": "Failed to read frame from camera.", "mode": current_mode}
                )
                time.sleep(0.1)
                continue

            # Run MediaPipe hand detection
            annotated, landmarks = self.detector.process(frame)

            # Always send the processed frame and landmarks back to the main thread
            self.result_queue.put(
                {
                    "kind": "frame",
                    "frame": annotated,
                    "landmarks": landmarks,
                    "mode": current_mode,
                }
            )

            # -------------------------------------------------- Static recognition gesture locking
            if current_mode == "static_recog":
                # No hand detected: increment no-hand counter and reset stability.
                if landmarks is None:
                    no_hand_count += 1
                    stable_count = 0

                    # Inform UI that no hand was detected (status only, not a prediction).
                    self.result_queue.put({"kind": "static_no_hand"})

                    # Auto-reset after a run of frames with no hand.
                    if no_hand_count >= RESET_FRAMES:
                        gesture_locked = False
                        locked_label = None
                        locked_confidence = 0.0
                        prev_label = None
                        stable_count = 0
                    # Nothing else to do this frame.

                else:
                    # Hand present: reset no-hand counter.
                    no_hand_count = 0

                    # If a gesture is already locked, wait only for reset conditions.
                    if gesture_locked:
                        # Do not run additional predictions while locked.
                        pass
                    elif self.static_model is not None:
                        # Only run prediction when not locked.
                        try:
                            features = extract_static_features(landmarks).reshape(1, -1)
                            probs = self.static_model.predict_proba(features)[0]
                            idx = int(np.argmax(probs))
                            label = str(self.static_model.classes_[idx])
                            conf = float(probs[idx])

                            if conf >= CONF_THRESHOLD:
                                if label == prev_label:
                                    stable_count += 1
                                else:
                                    prev_label = label
                                    stable_count = 1

                                if stable_count >= STABLE_FRAMES:
                                    # LOCK the gesture; send exactly one locked prediction.
                                    gesture_locked = True
                                    locked_label = label
                                    locked_confidence = conf
                                    self.result_queue.put(
                                        {
                                            "kind": "static_locked",
                                            "label": locked_label,
                                            "conf": locked_confidence,
                                        }
                                    )
                            else:
                                # Confidence below threshold resets stability window.
                                prev_label = label
                                stable_count = 1
                        except Exception:
                            # Swallow prediction errors to avoid crashing the worker
                            pass

            # -------------------------------------------------- Dynamic recognition gesture locking
            elif current_mode == "dynamic_recog":
                if landmarks is None:
                    # No landmarks this frame: increment no-hand counter.
                    no_hand_count += 1

                    # When locked, use a run of missing landmarks as a reset signal.
                    if no_hand_count >= RESET_FRAMES:
                        gesture_locked = False
                        locked_label = None
                        locked_confidence = 0.0
                        prev_label = None
                        stable_count = 0
                        self._worker_dyn_buffer.clear()
                else:
                    # Landmarks available: reset no-hand counter.
                    no_hand_count = 0

                    # While locked, do not accumulate more frames or run predictions.
                    if gesture_locked or self.dynamic_model is None:
                        pass
                    else:
                        # Maintain a rolling buffer of landmarks in the worker thread.
                        self._worker_dyn_buffer.append(landmarks)
                        buffer_len = len(self._worker_dyn_buffer)

                        if buffer_len < 30:
                            # Not enough frames yet; inform UI of buffer progress.
                            self.result_queue.put(
                                {
                                    "kind": "dynamic_buffer",
                                    "buffer_len": buffer_len,
                                }
                            )
                        else:
                            try:
                                last_frames = list(self._worker_dyn_buffer)[-30:]
                                features = extract_dynamic_features(last_frames).reshape(1, -1)
                                probs = self.dynamic_model.predict_proba(features)[0]
                                idx = int(np.argmax(probs))
                                label = str(self.dynamic_model.classes_[idx])
                                conf = float(probs[idx])

                                if conf >= CONF_THRESHOLD:
                                    if label == prev_label:
                                        stable_count += 1
                                    else:
                                        prev_label = label
                                        stable_count = 1

                                    if stable_count >= STABLE_FRAMES:
                                        # LOCK the dynamic gesture and send exactly one message.
                                        gesture_locked = True
                                        locked_label = label
                                        locked_confidence = conf
                                        self.result_queue.put(
                                            {
                                                "kind": "dynamic_locked",
                                                "label": locked_label,
                                                "conf": locked_confidence,
                                            }
                                        )
                                else:
                                    # Below threshold -> restart stability window at this label.
                                    prev_label = label
                                    stable_count = 1
                            except Exception:
                                # Swallow prediction errors to avoid crashing the worker
                                pass

            # Target around ~30 FPS without busy-waiting
            time.sleep(0.03)

        # Clean up camera on worker exit
        if self.cap is not None:
            release_camera(self.cap)
            self.cap = None

    # -------------------------------------------------------------- UI thread: queue polling
    def _poll_queue(self) -> None:
        """
        Periodically called in the Tk main thread.

        - Reads messages from result_queue (non-blocking).
        - Updates Tkinter widgets and internal state safely.
        """
        try:
            while True:
                msg = self.result_queue.get_nowait()
                self._handle_worker_message(msg)
        except Empty:
            pass

        # Schedule next poll; this keeps UI responsive without while True on the main thread.
        self.root.after(30, self._poll_queue)

    def _handle_worker_message(self, msg: dict) -> None:
        """Handle a single message from the worker thread (runs on UI thread)."""
        kind = msg.get("kind")

        if kind == "status":
            text = msg.get("text", "")
            if text:
                self.status_var.set(text)
            return

        if kind == "frame":
            frame = msg.get("frame")
            landmarks = msg.get("landmarks")
            mode = self.mode  # rely on current mode, which user may have changed via UI

            if frame is None:
                return

            # Route frame display and processing based on current mode
            if mode in ("static_collect", "dynamic_collect"):
                self._show_frame(self.collect_video_label, frame)
                self._handle_collect_step(landmarks)
            elif mode in ("static_recog", "dynamic_recog"):
                # For recognition, the heavy work is done in the worker;
                # the UI thread only updates the live video feed here.
                self._show_frame(self.recog_video_label, frame)

            return

        # Static recognition status / locked results from worker
        if kind == "static_no_hand":
            if self.mode == "static_recog":
                self.prediction_var.set("No hand detected.")
            return

        if kind == "static_locked":
            if self.mode == "static_recog":
                label = msg.get("label", "")
                conf = msg.get("conf", 0.0)
                self.prediction_var.set(f"Predicted: {label} (confidence {conf:.2f})")
            return

        # Dynamic recognition buffer/progress and locked results
        if kind == "dynamic_buffer":
            if self.mode == "dynamic_recog":
                buf_len = int(msg.get("buffer_len", 0))
                self.prediction_var.set(f"Frames in buffer: {buf_len}/30")
            return

        if kind == "dynamic_locked":
            if self.mode == "dynamic_recog":
                label = msg.get("label", "")
                conf = msg.get("conf", 0.0)
                self.prediction_var.set(
                    f"Predicted: {label} (confidence {conf:.2f})"
                )
            return

    def _show_frame(self, label_widget: ttk.Label, frame_bgr: np.ndarray) -> None:
        # Laterally invert (mirror) the frame for a more natural user experience
        mirrored = cv2.flip(frame_bgr, 1)
        rgb = cv2.cvtColor(mirrored, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(rgb)
        imgtk = ImageTk.PhotoImage(image=img)
        label_widget.imgtk = imgtk  # keep reference
        label_widget.configure(image=imgtk)

    # ---------------------------------------------------------- Mode Handlers
    def _handle_collect_step(self, landmarks: Optional[np.ndarray]) -> None:
        label = self.collect_label_var.get().strip()
        if not label:
            return

        if self.mode == "static_collect":
            if landmarks is not None:
                features = extract_static_features(landmarks)
                append_sample_to_csv(features, label, STATIC_CSV)
                self.status_var.set(f"Static sample for '{label}' saved to {STATIC_CSV.name}.")
                self.mode = "idle"
        elif self.mode == "dynamic_collect":
            if landmarks is not None and len(self.dynamic_buffer) < 30:
                self.dynamic_buffer.append(landmarks)
                self.progress_var.set(len(self.dynamic_buffer))

            if len(self.dynamic_buffer) == 30:
                features = extract_dynamic_features(list(self.dynamic_buffer))
                append_sample_to_csv(features, label, DYNAMIC_CSV)
                self.status_var.set(
                    f"Dynamic sample for '{label}' saved to {DYNAMIC_CSV.name}."
                )
                self.dynamic_buffer.clear()
                self.progress_var.set(0)
                self.mode = "idle"

    def _handle_recognition_step(self, landmarks: Optional[np.ndarray]) -> None:
        if self.mode == "static_recog":
            if self.static_model is None or landmarks is None:
                if landmarks is None:
                    self.prediction_var.set("No hand detected.")
                return
            features = extract_static_features(landmarks).reshape(1, -1)
            probs = self.static_model.predict_proba(features)[0]
            idx = int(np.argmax(probs))
            label = str(self.static_model.classes_[idx])
            conf = float(probs[idx])
            self.prediction_var.set(f"Predicted: {label} (confidence {conf:.2f})")
        elif self.mode == "dynamic_recog":
            if landmarks is not None:
                self.dynamic_buffer.append(landmarks)
            if len(self.dynamic_buffer) < 30:
                self.prediction_var.set(f"Frames in buffer: {len(self.dynamic_buffer)}/30")
                return

            if self.dynamic_model is None:
                return

            # Use last 30 frames
            buffer_list = list(self.dynamic_buffer)[-30:]
            features = extract_dynamic_features(buffer_list).reshape(1, -1)
            probs = self.dynamic_model.predict_proba(features)[0]
            idx = int(np.argmax(probs))
            label = str(self.dynamic_model.classes_[idx])
            conf = float(probs[idx])
            self.prediction_var.set(
                f"Frames in buffer: {len(self.dynamic_buffer)}/30 | "
                f"Predicted: {label} (confidence {conf:.2f})"
            )
    # -------------------------------------------------------------- Shutdown hook
    def _on_close(self) -> None:
        """
        Cleanly stop worker thread and close the Tkinter window.

        This is bound to the WM_DELETE_WINDOW protocol.
        """
        self.mode = "idle"
        self.worker_stop_event.set()
        if self.worker_thread is not None and self.worker_thread.is_alive():
            # Wait briefly for worker to exit to avoid hanging on close
            self.worker_thread.join(timeout=1.0)

        # Now destroy the Tk window
        self.root.destroy()


def main() -> None:
    root = tk.Tk()
    app = SignLanguageApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()

