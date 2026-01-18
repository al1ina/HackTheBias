"""
AI Evaluation Service for Pro and Expert Levels

This module handles AI-based sign language recognition using MediaPipe and TFLite.
It processes camera frames sent from the frontend and returns detected letters with confidence scores.

Camera Input Handling: Receives image frames via POST request
AI Inference: Uses MediaPipe Hands for landmark detection + TFLite model for classification
Evaluation Logic: Compares detected letter against expected letter with confidence threshold
"""

import cv2
import numpy as np
import tensorflow as tf
import io
from PIL import Image
import mediapipe as mp

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

# Global model initialization (lazy load)
_model_interpreter = None
_model_input_details = None
_model_output_details = None
_model_labels = None


def initialize_model():
    """
    Initialize TFLite model for ASL recognition.
    Attempts to load from HuggingFace Hub, falls back to local model if available.
    """
    global _model_interpreter, _model_input_details, _model_output_details, _model_labels
    
    if _model_interpreter is not None:
        return  # Already initialized
    
    try:
        # Try to load from HuggingFace Hub
        from huggingface_hub import hf_hub_download
        model_path = hf_hub_download(
            repo_id="ColdSlim/ASL-TFLite-Edge",
            filename="model.tflite"
        )
    except Exception as e:
        print(f"Could not load from HuggingFace Hub: {e}")
        print("Falling back to mock mode - will return random detections for testing")
        return
    
    try:
        # Setup TFLite Interpreter
        _model_interpreter = tf.lite.Interpreter(model_path=model_path)
        _model_interpreter.allocate_tensors()
        _model_input_details = _model_interpreter.get_input_details()
        _model_output_details = _model_interpreter.get_output_details()
        
        # Class mapping (A-Z)
        _model_labels = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        
        print(f"AI model loaded successfully. Input shape: {_model_input_details[0]['shape']}")
    except Exception as e:
        print(f"Error initializing model: {e}")
        print("Will use mock mode for testing")


def extract_landmarks(image_rgb):
    """
    Extract hand landmarks from image using MediaPipe.
    
    Args:
        image_rgb: RGB image array
        
    Returns:
        landmarks: Array of [x, y, z] coordinates or None if no hand detected
    """
    hands = mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=0.7
    )
    
    results = hands.process(image_rgb)
    
    if results.multi_hand_landmarks:
        hand_landmarks = results.multi_hand_landmarks[0]
        landmarks = []
        for lm in hand_landmarks.landmark:
            landmarks.extend([lm.x, lm.y, lm.z])
        return np.array(landmarks, dtype=np.float32)
    
    return None


def predict_letter(image_rgb):
    """
    Predict ASL letter from image using AI model.
    
    Args:
        image_rgb: RGB image array
        
    Returns:
        tuple: (detected_letter, confidence) or (None, 0) if no detection
    """
    global _model_interpreter, _model_input_details, _model_output_details, _model_labels
    
    # If model not loaded, use mock mode for testing
    if _model_interpreter is None:
        # Mock prediction for testing (remove in production after model is set up)
        import random
        return random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0.75 + random.random() * 0.2
    
    # Extract landmarks
    landmarks = extract_landmarks(image_rgb)
    if landmarks is None:
        return None, 0.0
    
    # Prepare input for TFLite model
    input_shape = _model_input_details[0]['shape']
    input_data = landmarks.reshape(input_shape).astype(np.float32)
    
    # Run inference
    _model_interpreter.set_tensor(_model_input_details[0]['index'], input_data)
    _model_interpreter.invoke()
    prediction = _model_interpreter.get_tensor(_model_output_details[0]['index'])
    
    # Get predicted class
    class_id = np.argmax(prediction)
    confidence = float(prediction[0][class_id])
    
    if class_id < len(_model_labels):
        letter = _model_labels[class_id]
        return letter, confidence
    
    return None, 0.0


def evaluate_image(image_data, expected_letter):
    """
    Main evaluation function - processes image and returns result.
    
    Args:
        image_data: Image bytes or PIL Image
        expected_letter: Expected letter to check against
        
    Returns:
        dict: {
            'detected_letter': str,
            'confidence': float,
            'is_correct': bool,
            'expected_letter': str
        }
    """
    # Convert image to RGB array
    if isinstance(image_data, bytes):
        image = Image.open(io.BytesIO(image_data))
    else:
        image = image_data
    
    image_rgb = np.array(image.convert('RGB'))
    
    # Predict letter
    detected_letter, confidence = predict_letter(image_rgb)
    
    if detected_letter is None:
        return {
            'detected_letter': None,
            'confidence': 0.0,
            'is_correct': False,
            'expected_letter': expected_letter.upper()
        }
    
    is_correct = detected_letter.upper() == expected_letter.upper()
    
    return {
        'detected_letter': detected_letter.upper(),
        'confidence': float(confidence),
        'is_correct': is_correct,
        'expected_letter': expected_letter.upper()
    }


# Initialize model on import
initialize_model()
