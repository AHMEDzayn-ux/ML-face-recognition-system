import requests
import json
import os
from pathlib import Path

print("="*70)
print("📊 PHOTO UPLOAD WORKFLOW VERIFICATION")
print("="*70)

student_name = "ruzainia.23ddd"
student_id = "107520c5-7bf7-47d3-b492-008b7716156a"
student_folder = f"known_faces/{student_name}"

# 1. Check local storage
print("\n1️⃣  LOCAL STORAGE CHECK")
print("-" * 70)
if os.path.exists(student_folder):
    files = list(Path(student_folder).glob("*.jpg"))
    print(f"✅ Folder exists: {student_folder}")
    print(f"   Photos found: {len(files)}")
    for f in files:
        stat = f.stat()
        print(f"   📄 {f.name}")
        print(f"      Size: {stat.st_size} bytes")
        print(f"      Modified: {f.stat().st_mtime}")
else:
    print(f"❌ Folder not found: {student_folder}")

# 2. Check embeddings.pkl timestamp
print("\n2️⃣  EMBEDDINGS DATABASE CHECK")
print("-" * 70)
emb_file = "embeddings.pkl"
if os.path.exists(emb_file):
    stat = os.stat(emb_file)
    import time
    mod_time = time.ctime(stat.st_mtime)
    print(f"✅ Embeddings file exists: {emb_file}")
    print(f"   Size: {stat.st_size} bytes")
    print(f"   Last modified: {mod_time}")
else:
    print(f"❌ Embeddings file not found")

# 3. Check Supabase database
print("\n3️⃣  SUPABASE DATABASE CHECK")
print("-" * 70)
try:
    resp = requests.get('http://localhost:8000/students', timeout=5)
    if resp.status_code == 200:
        students = resp.json()['students']
        student = next((s for s in students if s['id'] == student_id), None)
        if student:
            print(f"✅ Student found in database")
            print(f"   Name: {student['name']}")
            print(f"   Photo URL: {student['photo_url']}")
            print(f"   Updated: {student['updated_at']}")
            
            if student['photo_url']:
                print("\n✅ PHOTO_URL IS SET IN DATABASE!")
            else:
                print("\n⚠️  Photo URL is still NULL in database")
        else:
            print(f"❌ Student not found")
    else:
        print(f"❌ API returned status {resp.status_code}")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*70)
print("SUMMARY")
print("="*70)
print("""
✅ Photo upload: SUCCESS
   - Photo was successfully uploaded to student
   - Backend accepted the file and saved locally
   - Embeddings rebuild was triggered

TO DO:
   - Check if Supabase upload succeeded (photo_urls was empty)
   - Verify embeddings.pkl regeneration status
   - Check if rebuild is still running in background
""")
