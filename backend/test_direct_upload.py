"""
Test Direct Supabase Storage Upload
This tests if we can actually upload to Supabase storage
"""

import os
from dotenv import load_dotenv
from supabase import create_client
from PIL import Image
import io

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

print(f"🔧 Supabase URL: {supabase_url[:50]}...")
print(f"🔑 Supabase Key: {supabase_key[:20]}...")

if not supabase_url or not supabase_key:
    print("❌ Missing Supabase credentials in .env")
    exit(1)

supabase = create_client(supabase_url, supabase_key)
print("✅ Supabase client created\n")

# Create a test image with a face (simple red square for now)
print("📸 Creating test image...")
img = Image.new('RGB', (100, 100), color='red')
img_bytes = io.BytesIO()
img.save(img_bytes, format='JPEG')
img_bytes.seek(0)
file_content = img_bytes.getvalue()
print(f"   Image size: {len(file_content)} bytes\n")

# Test 1: Upload to root
print("1️⃣  Testing upload to root path...")
try:
    response = supabase.storage.from_("student-photos").upload(
        "test_root.jpg",
        file_content,
        {"content-type": "image/jpeg"}
    )
    print(f"   ✅ Root upload SUCCESS: {response}")
except Exception as e:
    print(f"   ❌ Root upload FAILED: {e}\n")

# Test 2: Upload with folder structure
print("\n2️⃣  Testing upload with folder path...")
try:
    response = supabase.storage.from_("student-photos").upload(
        "test_student/test_folder/photo.jpg",
        file_content,
        {"content-type": "image/jpeg"}
    )
    print(f"   ✅ Folder upload SUCCESS: {response}")
except Exception as e:
    print(f"   ❌ Folder upload FAILED: {e}\n")

# Test 3: Try to get public URL
print("\n3️⃣  Testing get_public_url...")
try:
    url = supabase.storage.from_("student-photos").get_public_url("test_root.jpg")
    print(f"   ✅ Public URL: {url}")
except Exception as e:
    print(f"   ❌ Get URL failed: {e}\n")

# Test 4: List files
print("\n4️⃣  Listing files in bucket...")
try:
    files = supabase.storage.from_("student-photos").list()
    print(f"   ✅ Found {len(files)} files:")
    for f in files[:5]:
        print(f"      • {f['name']} ({f['metadata'].get('size', 'N/A')} bytes)")
except Exception as e:
    print(f"   ❌ List failed: {e}\n")

print("\n" + "="*60)
print("✅ If uploads succeeded, the problem is in the backend code")
print("❌ If uploads failed, there's a Supabase configuration issue")
print("="*60)
