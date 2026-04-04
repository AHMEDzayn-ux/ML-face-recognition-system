# Individual Dependency Verification Commands

## Step 1: Activate Virtual Environment

```batch
venv\Scripts\activate.bat
```

## Step 2: Check Python Version

```batch
python --version
```

**Expected:** Python 3.8.x, 3.9.x, 3.10.x, or 3.11.x

## Step 3: Check pip

```batch
pip --version
```

## Step 4: List All Installed Packages

```batch
pip listpip
```

## Step 5: Check Each Package Individually

### Check NumPy

```batch
python -c "import numpy; print('NumPy version:', numpy.__version__)"
```

### Check Pillow

```batch
python -c "import PIL; print('Pillow version:', PIL.__version__)"
```

### Check OpenCV

```batch
python -c "import cv2; print('OpenCV version:', cv2.__version__)"
```

### Check TensorFlow

```batch
python -c "import tensorflow as tf; print('TensorFlow version:', tf.__version__)"
```

### Check DeepFace

```batch
python -c "import deepface; print('DeepFace version:', deepface.__version__)"
```

## Step 6: Test DeepFace Import

```batch
python -c "from deepface import DeepFace; print('DeepFace imported successfully!')"
```

## Step 7: Run Full Verification Script

```batch
python verify_dependencies.py
```

---

## If Any Package is Missing, Install It:

### Install individual packages:

```batch
pip install numpy
pip install pillow
pip install opencv-python
pip install tensorflow
pip install deepface
```

### Or install all at once:

```batch
pip install -r requirements.txt
```

### Upgrade all packages:

```batch
pip install --upgrade -r requirements.txt
```

---

## Troubleshooting

### If virtual environment doesn't exist:

```batch
python -m venv venv
```

### If using Python 3.11 specifically:

```batch
C:\Users\YourName\AppData\Local\Programs\Python\Python311\python.exe -m venv venv
```

### Clear pip cache and reinstall:

```batch
pip cache purge
pip install --no-cache-dir -r requirements.txt
```
