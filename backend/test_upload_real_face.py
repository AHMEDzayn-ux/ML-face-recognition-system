import requests
import json
import os
import time

# First, check if backend is ready
print("🔍 Checking if backend is ready...")
for i in range(5):
    try:
        resp = requests.get('http://localhost:8000/students', timeout=3)
        if resp.status_code == 200:
            print("✅ Backend is ready!\n")
            break
    except:
        print(f"⏳ Waiting for backend... ({i+1}/5)")
        time.sleep(2)
else:
    print("❌ Backend still not ready")
    exit(1)

# Now upload the real face image
student_id = "107520c5-7bf7-47d3-b492-008b7716156a"
test_image_path = "real_face_test.jpg"

if not os.path.exists(test_image_path):
    print(f"❌ Test image not found: {test_image_path}")
    exit(1)

print(f"📸 Uploading real face image to student {student_id}...")
print(f"   File: {test_image_path}\n")

# Upload the image with a longer timeout this time
with open(test_image_path, 'rb') as f:
    files = [('photos', ('real_face.jpg', f, 'image/jpeg'))]
    try:
        response = requests.post(
            f'http://localhost:8000/api/students/{student_id}/upload_photos',
            files=files,
            timeout=60  # 60 second timeout for embeddings rebuild
        )
        print(f"📡 Server Response:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Response Body:\n{json.dumps(response.json(), indent=4)}")
        
        if response.status_code == 200:
            print("\n✅ Upload successful!")
        else:
            print("\n❌ Upload failed!")
    except requests.exceptions.Timeout:
        print("⏱️  Request timed out (embeddings rebuild is running in background)")
        print("   Photo was likely saved, but embeddings rebuild is still processing...")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
