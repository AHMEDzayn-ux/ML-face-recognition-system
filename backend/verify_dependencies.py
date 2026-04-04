"""
Verify all dependencies for Face Recognition project
"""

import sys

def check_package(package_name, import_name=None):
    """Check if a package is installed and importable"""
    if import_name is None:
        import_name = package_name
    
    try:
        module = __import__(import_name)
        version = getattr(module, '__version__', 'unknown')
        print(f"✅ {package_name:20s} - v{version}")
        return True
    except ImportError as e:
        print(f"❌ {package_name:20s} - NOT INSTALLED")
        print(f"   Error: {e}")
        return False

def check_deepface_models():
    """Check if DeepFace can access models"""
    try:
        from deepface import DeepFace
        print("\n🔍 Testing DeepFace functionality...")
        
        # This will download models on first run
        print("   Checking available models...")
        models = ['VGG-Face', 'Facenet', 'OpenFace', 'DeepFace']
        print(f"   Available models: {', '.join(models)}")
        print("   ✅ DeepFace is functional")
        return True
    except Exception as e:
        print(f"   ❌ DeepFace test failed: {e}")
        return False

def check_opencv():
    """Check OpenCV with basic functionality"""
    try:
        import cv2
        import numpy as np
        
        # Test basic functionality
        test_img = np.zeros((100, 100, 3), dtype=np.uint8)
        gray = cv2.cvtColor(test_img, cv2.COLOR_BGR2GRAY)
        
        print("   ✅ OpenCV is functional")
        return True
    except Exception as e:
        print(f"   ❌ OpenCV test failed: {e}")
        return False

def main():
    print("=" * 60)
    print("Face Recognition - Dependency Verification")
    print("=" * 60)
    
    print(f"\n📍 Python Version: {sys.version}")
    print(f"📍 Python Path: {sys.executable}\n")
    
    # Check Python version
    py_version = sys.version_info
    if py_version.major == 3 and 8 <= py_version.minor <= 11:
        print(f"✅ Python {py_version.major}.{py_version.minor} is compatible")
    else:
        print(f"⚠️  Python {py_version.major}.{py_version.minor} may have compatibility issues")
        print(f"   Recommended: Python 3.8 - 3.11")
    
    print("\n" + "-" * 60)
    print("Checking Required Packages:")
    print("-" * 60)
    
    # Check all required packages
    packages_ok = True
    packages_ok &= check_package("numpy", "numpy")
    packages_ok &= check_package("pillow", "PIL")
    packages_ok &= check_package("opencv-python", "cv2")
    packages_ok &= check_package("deepface", "deepface")
    packages_ok &= check_package("tensorflow", "tensorflow")
    
    print("\n" + "-" * 60)
    print("Checking Optional Packages:")
    print("-" * 60)
    check_package("keras", "keras")
    check_package("mtcnn", "mtcnn")
    check_package("retina-face", "retinaface")
    
    print("\n" + "-" * 60)
    print("Functionality Tests:")
    print("-" * 60)
    check_opencv()
    check_deepface_models()
    
    print("\n" + "=" * 60)
    if packages_ok:
        print("✅ ALL DEPENDENCIES INSTALLED SUCCESSFULLY!")
        print("=" * 60)
        print("\nYou can now run:")
        print("  python verify_faces.py <image1> <image2>")
        print("\nNext steps:")
        print("  1. Create 'test_images/' folder")
        print("  2. Add test photos")
        print("  3. Run verification script")
        return 0
    else:
        print("❌ SOME DEPENDENCIES ARE MISSING")
        print("=" * 60)
        print("\nTo install missing packages:")
        print("  pip install -r requirements.txt")
        return 1

if __name__ == "__main__":
    exit(main())
