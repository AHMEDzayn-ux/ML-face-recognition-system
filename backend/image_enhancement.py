"""
Image Enhancement Module for Facial Recognition
Provides brightness detection and adaptive enhancement for poor lighting conditions.
Optimized for minimal latency impact.

Configuration:
- BRIGHTNESS_THRESHOLD: 60 (0-255 scale, lower = darker)
- CLAHE_CLIP_LIMIT: 2.0 (prevents noise amplification)
- CLAHE_TILE_SIZE: 8x8 (balances local vs global enhancement)
- GAMMA_CORRECTION: 1.5-2.2 (adaptive based on darkness level)
"""

import cv2
import numpy as np

# Configuration parameters
BRIGHTNESS_THRESHOLD = 60  # Images below this value will be enhanced
CLAHE_CLIP_LIMIT = 2.0     # Contrast limit for CLAHE
CLAHE_TILE_SIZE = (8, 8)   # Tile grid size for CLAHE
GAMMA_VERY_DARK = 2.2      # Gamma for very dark images (brightness < 40)
GAMMA_DARK = 1.8           # Gamma for dark images (brightness < 50)
GAMMA_DIM = 1.5            # Gamma for dim images (brightness < 60)
DENOISE_THRESHOLD = 40     # Apply denoising only if brightness < this value


def calculate_brightness(img):
    """
    Calculate average brightness of an image.
    
    Args:
        img: OpenCV image (BGR format)
    
    Returns:
        float: Average brightness (0-255 scale)
    """
    # Convert to grayscale for brightness calculation (faster than HSV)
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    # Calculate mean brightness
    return np.mean(gray)


def is_poorly_lit(img, threshold=None):
    """
    Check if image has poor lighting conditions.
    
    Args:
        img: OpenCV image (BGR format)
        threshold: Brightness threshold (0-255). Uses BRIGHTNESS_THRESHOLD if None.
    
    Returns:
        bool: True if image is poorly lit
    """
    if threshold is None:
        threshold = BRIGHTNESS_THRESHOLD
    
    brightness = calculate_brightness(img)
    return brightness < threshold


def enhance_brightness(img, brightness=None):
    """
    Adaptively enhance image brightness and contrast.
    Optimized for speed - only processes when needed.
    
    Args:
        img: OpenCV image (BGR format)
        brightness: Optional pre-calculated brightness value
    
    Returns:
        Enhanced image (same format as input)
    """
    if brightness is None:
        brightness = calculate_brightness(img)
    
    # Only enhance if image is dark
    # This saves processing time on well-lit images
    if brightness >= BRIGHTNESS_THRESHOLD:
        return img
    
    # Convert to LAB color space for better brightness control
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE to L-channel for local contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=CLAHE_CLIP_LIMIT, tileGridSize=CLAHE_TILE_SIZE)
    l_enhanced = clahe.apply(l)
    
    # Adaptive gamma correction based on darkness level
    if brightness < 40:
        gamma = GAMMA_VERY_DARK  # Strong correction for very dark images
    elif brightness < 50:
        gamma = GAMMA_DARK       # Medium correction
    else:
        gamma = GAMMA_DIM        # Light correction
    
    # Apply gamma correction to brighten
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 
                      for i in np.arange(0, 256)]).astype("uint8")
    l_gamma = cv2.LUT(l_enhanced, table)
    
    # Merge channels back
    enhanced_lab = cv2.merge([l_gamma, a, b])
    enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    
    # Optional: Apply bilateral filter only for very dark/noisy images
    # This preserves edges while reducing noise from enhancement
    if brightness < DENOISE_THRESHOLD:
        enhanced = cv2.bilateralFilter(enhanced, d=5, sigmaColor=50, sigmaSpace=50)
    
    return enhanced


def preprocess_for_recognition(img):
    """
    Complete preprocessing pipeline for facial recognition.
    Combines brightness enhancement with standard preprocessing.
    
    Args:
        img: OpenCV image (BGR format)
    
    Returns:
        Preprocessed image ready for DeepFace
    """
    # 1. Calculate brightness once
    brightness = calculate_brightness(img)
    
    # 2. Enhance only if needed (saves time on well-lit images)
    if brightness < BRIGHTNESS_THRESHOLD:
        img = enhance_brightness(img, brightness=brightness)
    
    # 3. Standard preprocessing can be added here if needed
    # (resize is done in main.py, so we skip it here)
    
    return img
