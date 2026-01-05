#!/usr/bin/env python3
"""
Pre-flight check script to verify all dependencies and files are available
before starting the Flask server.
"""

import sys
import os

def check_file(filepath, description):
    """Check if a file exists"""
    if os.path.exists(filepath):
        print(f"✓ {description}: {filepath}")
        return True
    else:
        print(f"✗ {description} NOT FOUND: {filepath}")
        return False

def check_import(module_name, description):
    """Check if a Python module can be imported"""
    try:
        __import__(module_name)
        print(f"✓ {description}: {module_name}")
        return True
    except ImportError as e:
        print(f"✗ {description} NOT AVAILABLE: {module_name}")
        print(f"  Error: {e}")
        return False

def main():
    print("=" * 60)
    print("GestureMate Setup Check")
    print("=" * 60)
    
    all_ok = True
    
    # Check Python version
    print(f"\nPython version: {sys.version}")
    if sys.version_info < (3, 7):
        print("✗ Python 3.7 or higher is required")
        all_ok = False
    else:
        print("✓ Python version OK")
    
    # Check required modules
    print("\n--- Checking Python Dependencies ---")
    modules = [
        ("flask", "Flask"),
        ("cv2", "OpenCV"),
        ("mediapipe", "MediaPipe"),
        ("numpy", "NumPy"),
        ("sklearn", "scikit-learn"),
        ("PIL", "Pillow"),
    ]
    
    for module, name in modules:
        if not check_import(module, name):
            all_ok = False
    
    # Check required files
    print("\n--- Checking Required Files ---")
    files = [
        ("test_live_core.py", "Core engine module"),
        ("app.py", "Flask application"),
        ("labels.txt", "Labels file"),
        ("model/static_sign_model.pkl", "ML model file"),
    ]
    
    for filepath, description in files:
        if not check_file(filepath, description):
            all_ok = False
    
    # Check camera availability
    print("\n--- Checking Camera ---")
    try:
        import cv2
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            print("✓ Camera is available")
            cap.release()
        else:
            print("✗ Camera is not available (may be in use by another application)")
            all_ok = False
    except Exception as e:
        print(f"✗ Error checking camera: {e}")
        all_ok = False
    
    print("\n" + "=" * 60)
    if all_ok:
        print("✓ All checks passed! You can start the Flask server.")
        print("\nTo start the server, run:")
        print("  python app.py")
        return 0
    else:
        print("✗ Some checks failed. Please fix the issues above.")
        print("\nTo install dependencies, run:")
        print("  pip install -r requirements.txt")
        return 1

if __name__ == "__main__":
    sys.exit(main())

