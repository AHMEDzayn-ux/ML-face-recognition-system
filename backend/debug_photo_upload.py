"""
Debug Photo Upload Issues
This script finds the actual problem with photo uploads
"""

import requests
import json
import os
from pathlib import Path

BASE_URL = "http://localhost:8000"

def test_backend():
    """Test if backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✅ Backend is running")
        print(f"   Students in embeddings: {response.json().get('students_enrolled')}")
        return True
    except:
        print(f"❌ Backend is NOT running at {BASE_URL}")
        print(f"   Please start: python main.py")
        return False

def check_supabase_connection():
    """Check Supabase connection via the API"""
    try:
        # Make any API call that requires Supabase
        response = requests.get(f"{BASE_URL}/students")
        if response.status_code == 200:
            print(f"✅ Supabase connection: WORKING")
            data = response.json()
            print(f"   Students in database: {data.get('total', len(data.get('students', [])))}")
            return True
        else:
            print(f"❌ Supabase connection: FAILED (Status {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Supabase connection: FAILED ({e})")
        return False

def check_storage_bucket():
    """Check if student-photos bucket is accessible"""
    try:
        # Try to get public bucket info via Supabase SDK
        import sys
        sys.path.insert(0, os.getcwd())
        
        from dotenv import load_dotenv
        load_dotenv()
        
        from supabase import create_client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            print(f"❌ Supabase credentials: NOT FOUND in .env")
            return False
        
        supabase = create_client(supabase_url, supabase_key)
        print(f"✅ Supabase credentials: LOADED")
        print(f"   URL: {supabase_url[:50]}...")
        
        # Try to list files in bucket
        try:
            files = supabase.storage.from_("student-photos").list()
            print(f"✅ student-photos bucket: ACCESSIBLE")
            print(f"   Files in bucket: {len(files) if files else 0}")
            if files:
                for f in files[:3]:
                    print(f"      • {f['name']}")
        except Exception as e:
            print(f"⚠️  student-photos bucket error: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Supabase setup issue: {e}")
        return False

def check_known_faces_folder():
    """Check if known_faces folder exists and is writable"""
    if os.path.exists("known_faces"):
        print(f"✅ known_faces folder: EXISTS")
        
        # Check if we can write to it
        try:
            test_file = os.path.join("known_faces", ".write_test")
            with open(test_file, "w") as f:
                f.write("test")
            os.remove(test_file)
            print(f"   Writable: YES")
        except:
            print(f"   Writable: NO (Permission issue)")
        
        # Count student folders
        student_folders = [d for d in os.listdir("known_faces") 
                          if os.path.isdir(os.path.join("known_faces", d))]
        print(f"   Student folders: {len(student_folders)}")
        return True
    else:
        print(f"❌ known_faces folder: NOT FOUND")
        return False

def get_sample_student():
    """Get a student we can test with"""
    try:
        response = requests.get(f"{BASE_URL}/students")
        if response.status_code == 200:
            data = response.json()
            students = data.get('students', [])
            
            if students:
                student = students[0]
                print(f"\n📌 Test Student Selected:")
                print(f"   Name: {student['name']}")
                print(f"   ID: {student['id']}")
                print(f"   Current photo_url: {student.get('photo_url', 'None')}")
                return student
        
        print(f"❌ No students found")
        return None
    except Exception as e:
        print(f"❌ Error getting students: {e}")
        return None

def main():
    print("="*70)
    print("DEBUGGING PHOTO UPLOAD ISSUES")
    print("="*70)
    
    print("\n1️⃣  Backend Connection")
    print("-" * 70)
    if not test_backend():
        return
    
    print("\n2️⃣  Supabase Connection")
    print("-" * 70)
    if not check_supabase_connection():
        return
    
    print("\n3️⃣  Supabase Storage (student-photos bucket)")
    print("-" * 70)
    check_storage_bucket()
    
    print("\n4️⃣  Local File Storage (known_faces folder)")
    print("-" * 70)
    check_known_faces_folder()
    
    print("\n5️⃣  Sample Student for Testing")
    print("-" * 70)
    student = get_sample_student()
    
    if student:
        print("\n📝 Next Steps:")
        print("   1. Upload a photo of a REAL FACE to this student")
        print("   2. Check Supabase Storage browser https://app.supabase.com/project/ykrbllmjrevriecowlnr/storage/buckets")
        print("   3. Check if photo_url appears in the student record")
        print("   4. Run: python test_photo_upload.py to test again")
    
    print("\n" + "="*70)
    print("DIAGNOSIS COMPLETE")
    print("="*70)

if __name__ == "__main__":
    main()
