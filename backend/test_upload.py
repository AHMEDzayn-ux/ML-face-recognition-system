import requests
import json
import os

student_id = "107520c5-7bf7-47d3-b492-008b7716156a"
test_image_path = "test_photo.jpg"

# Check if test image exists
if not os.path.exists(test_image_path):
    print(f"❌ Test image not found: {test_image_path}")
    exit(1)

print(f"📸 Uploading test image to student {student_id}...")
print(f"   File: {test_image_path}")

# Try to upload the image
with open(test_image_path, 'rb') as f:
    files = {'file': ('test_photo.jpg', f, 'image/jpeg')}
    try:
        response = requests.post(
            f'http://localhost:8000/api/students/{student_id}/upload_photos',
            files=files,
            timeout=10
        )
        print(f"\n📡 Server Response:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Response Body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("\n✅ Upload successful!")
        else:
            print("\n❌ Upload failed!")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
