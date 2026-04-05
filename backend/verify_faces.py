"""
Face Verification Script
Tests if two images contain the same person using DeepFace
"""

from deepface import DeepFace
import sys
import os

def verify_faces(img1_path, img2_path):
    """
    Verify if two images contain the same person
    
    Args:
        img1_path: Path to first image
        img2_path: Path to second image
    
    Returns:
        Dictionary with verification results
    """
    try:
        print(f"\n🔍 Comparing faces...")
        print(f"   Image 1: {img1_path}")
        print(f"   Image 2: {img2_path}\n")
        
        # Verify using DeepFace with FaceNet model
        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            model_name="ArcFace",  # 512-D embeddings - more accurate
            detector_backend="retinaface",  # Better angle handling
            enforce_detection=True
        )
        
        # Extract results
        verified = result['verified']
        distance = result['distance']
        threshold = result['threshold']
        
        print("=" * 50)
        print(f"✅ Match: {verified}")
        print(f"📏 Distance: {distance:.4f} (threshold: {threshold:.4f})")
        
        if verified:
            print("✓ Same person detected!")
            confidence = (1 - (distance / threshold)) * 100
            print(f"   Confidence: {confidence:.1f}%")
        else:
            print("✗ Different people detected")
        print("=" * 50)
        
        return result
        
    except ValueError as e:
        if "Face could not be detected" in str(e):
            print("❌ ERROR: No face detected in one or both images")
            print("   Tips: Use clear, frontal face photos with good lighting")
        else:
            print(f"❌ ERROR: {e}")
        return None
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return None


if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("Face Verification Test")
    print("=" * 50)
    
    # Check if images provided as arguments
    if len(sys.argv) == 3:
        img1 = sys.argv[1]
        img2 = sys.argv[2]
    else:
        # Example usage
        print("\nUsage: python verify_faces.py <image1> <image2>")
        print("\nExample:")
        print("  python verify_faces.py test_images/person1_a.jpg test_images/person1_b.jpg")
        print("\nTest Instructions:")
        print("1. Create 'test_images/' folder")
        print("2. Add two photos of yourself (same person)")
        print("3. Add a photo of someone else (different person)")
        print("4. Run this script to test verification\n")
        sys.exit(1)
    
    # Verify images exist
    if not os.path.exists(img1):
        print(f"❌ ERROR: Image not found: {img1}")
        sys.exit(1)
    if not os.path.exists(img2):
        print(f"❌ ERROR: Image not found: {img2}")
        sys.exit(1)
    
    # Run verification
    result = verify_faces(img1, img2)
    
    if result:
        print("\n✅ Verification complete!")
    else:
        print("\n❌ Verification failed!")
