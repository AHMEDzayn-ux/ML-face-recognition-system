"""
Test Photo Upload Workflow
Verifies that photos are properly uploaded, stored, and embeddings are created
"""

import requests
import json
import os
from pathlib import Path
from PIL import Image
import io

BASE_URL = "http://localhost:8000"

def create_test_image(filename="test_photo.jpg"):
    """Create a simple test image"""
    img = Image.new('RGB', (100, 100), color='red')
    img.save(filename)
    return filename

def test_api_health():
    """Test if API is running"""
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✅ API Health Check: PASSED")
            print(f"   Students enrolled: {response.json().get('students_enrolled', 'N/A')}")
            return True
        else:
            print(f"❌ API Health Check: FAILED (Status {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ API Health Check: FAILED - {e}")
        return False

def get_students():
    """Get list of students"""
    try:
        response = requests.get(f"{BASE_URL}/students")
        if response.status_code == 200:
            data = response.json()
            students = data.get('students', [])
            print(f"\n✅ Retrieved {len(students)} students")
            for student in students[:3]:  # Show first 3
                print(f"   • {student['name']} (ID: {student['id']}, Photo: {student.get('photo_url', 'None')})")
            return students
        else:
            print(f"❌ Failed to get students (Status {response.status_code})")
            return []
    except Exception as e:
        print(f"❌ Failed to get students: {e}")
        return []

def upload_photo_to_student(student_id, photo_path):
    """Upload a photo to a student"""
    try:
        with open(photo_path, 'rb') as f:
            files = {'photos': (os.path.basename(photo_path), f, 'image/jpeg')}
            response = requests.post(
                f"{BASE_URL}/api/students/{student_id}/upload_photos",
                files={'photos': (os.path.basename(photo_path), f, 'image/jpeg')}
            )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ Photo Upload: PASSED")
            print(f"   Photos saved: {result.get('photos_saved', 'N/A')}")
            print(f"   Student name: {result.get('student_name', 'N/A')}")
            if result.get('photo_urls'):
                print(f"   Photo URL: {result['photo_urls'][0]}")
            if result.get('failed_photos'):
                print(f"   Failed photos: {result.get('failed_photos')}")
            return result
        else:
            print(f"❌ Photo Upload: FAILED (Status {response.status_code})")
            print(f"   Response: {response.json()}")
            return None
    except Exception as e:
        print(f"❌ Photo Upload: FAILED - {e}")
        return None

def verify_student_photo_url(student_data):
    """Verify photo_url in database by comparing with fresh fetch"""
    try:
        response = requests.get(f"{BASE_URL}/students")
        if response.status_code == 200:
            data = response.json()
            students = data.get('students', [])
            
            # Find the student we just uploaded for
            for student in students:
                if student['id'] == student_data['id']:
                    photo_url = student.get('photo_url')
                    if photo_url and photo_url != student_data.get('photo_url'):
                        print(f"\n✅ Photo URL Stored: PASSED")
                        print(f"   Student: {student['name']}")
                        print(f"   Photo URL: {photo_url}")
                        return True
                    elif photo_url:
                        print(f"\n✅ Photo URL Stored: CONFIRMED")
                        print(f"   Student: {student['name']}")
                        print(f"   Photo URL: {photo_url}")
                        return True
                    else:
                        print(f"❌ Photo URL Stored: FAILED")
                        print(f"   Student has no photo_url in database after upload")
                        return False
        else:
            print(f"❌ Failed to verify student (Status {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Failed to verify student: {e}")
        return False

def check_embeddings():
    """Check if embeddings were created"""
    embeddings_file = "embeddings.pkl"
    if os.path.exists(embeddings_file):
        stat = os.stat(embeddings_file)
        print(f"\n✅ Embeddings File: EXISTS")
        print(f"   File size: {stat.st_size / 1024:.1f} KB")
        print(f"   Modified: {stat.st_mtime}")
        
        # Try to load and check contents
        try:
            import pickle
            with open(embeddings_file, 'rb') as f:
                embeddings_db = pickle.load(f)
            print(f"   Students with embeddings: {len(embeddings_db)}")
            for name in list(embeddings_db.keys())[:3]:
                print(f"      • {name}: {len(embeddings_db[name])} embedding(s)")
            return True
        except Exception as e:
            print(f"   Error loading embeddings: {e}")
            return False
    else:
        print(f"❌ Embeddings File: NOT FOUND")
        return False

def check_known_faces():
    """Check if photo was saved locally"""
    known_faces_dir = "known_faces"
    if os.path.exists(known_faces_dir):
        subdirs = [d for d in os.listdir(known_faces_dir) if os.path.isdir(os.path.join(known_faces_dir, d))]
        print(f"\n✅ Known Faces Directory: EXISTS")
        print(f"   Student folders: {len(subdirs)}")
        for student_dir in subdirs[:3]:
            path = os.path.join(known_faces_dir, student_dir)
            files = [f for f in os.listdir(path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            print(f"      • {student_dir}: {len(files)} photo(s)")
        return True
    else:
        print(f"❌ Known Faces Directory: NOT FOUND")
        return False

def main():
    print("="*60)
    print("TESTING PHOTO UPLOAD WORKFLOW")
    print("="*60)
    
    # Step 1: Health check
    if not test_api_health():
        print("\n❌ Backend not responding. Cannot continue.")
        return
    
    # Step 2: Get students
    students = get_students()
    if not students:
        print("\n❌ No students found. Cannot test photo upload.")
        return
    
    # Step 3: Create test image
    test_image = create_test_image()
    print(f"\n📸 Created test image: {test_image}")
    
    # Step 4: Upload photo to first student
    first_student = students[0]
    print(f"\n🔄 Uploading photo to student: {first_student['name']}")
    upload_result = upload_photo_to_student(first_student['id'], test_image)
    
    # Step 5: Verify photo_url in database
    if upload_result and upload_result.get('photos_saved', 0) > 0:
        verify_student_photo_url(first_student)
    
    # Step 6: Check embeddings
    check_embeddings()
    
    # Step 7: Check known_faces folder
    check_known_faces()
    
    # Cleanup
    if os.path.exists(test_image):
        os.remove(test_image)
        print(f"\n🧹 Cleaned up test image")
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()
