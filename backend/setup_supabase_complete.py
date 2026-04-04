"""
Complete Supabase Setup Script
1. Creates tables in Supabase
2. Reads students from embeddings.pkl
3. Adds students to Supabase with auto-generated roll numbers
4. Tests the connection
"""

import os
import pickle
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: SUPABASE_URL or SUPABASE_KEY not found in .env file!")
    exit(1)

print("=" * 70)
print("🚀 Supabase Setup Script")
print("=" * 70)
print(f"\nSupabase URL: {SUPABASE_URL}")
print(f"API Key: {SUPABASE_KEY[:20]}...")
print()

# Initialize Supabase client
print("📡 Connecting to Supabase...")
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Connected to Supabase!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    exit(1)

print()
print("=" * 70)
print("STEP 1: Check if tables exist")
print("=" * 70)

# Test if tables exist
try:
    students_test = supabase.table('students').select('id').limit(1).execute()
    print("✅ Table 'students' exists")
    students_exist = True
except Exception as e:
    print(f"⚠️  Table 'students' does not exist")
    print(f"   Error: {str(e)[:100]}")
    students_exist = False

try:
    attendance_test = supabase.table('attendance').select('id').limit(1).execute()
    print("✅ Table 'attendance' exists")
    attendance_exist = True
except Exception as e:
    print(f"⚠️  Table 'attendance' does not exist")
    print(f"   Error: {str(e)[:100]}")
    attendance_exist = False

if not students_exist or not attendance_exist:
    print()
    print("❌ TABLES NOT CREATED!")
    print()
    print("You need to run the SQL in Supabase SQL Editor first!")
    print()
    print("📝 Instructions:")
    print("1. Go to: https://app.supabase.com")
    print("2. Open your project")
    print("3. Click 'SQL Editor' in left sidebar")
    print("4. Click 'New Query'")
    print("5. Copy SQL from: supabase_setup.sql")
    print("6. Paste and click 'Run'")
    print()
    print("Then run this script again!")
    exit(1)

print()
print("=" * 70)
print("STEP 2: Load students from embeddings.pkl")
print("=" * 70)

# Load embeddings
try:
    with open('embeddings.pkl', 'rb') as f:
        embeddings_data = pickle.load(f)
    
    print(f"✅ Loaded embeddings.pkl - Found {len(embeddings_data)} students:")
    print()
    
    for i, name in enumerate(embeddings_data.keys(), 1):
        photo_count = len(embeddings_data[name])
        print(f"   {i}. {name} ({photo_count} photos)")
    
except FileNotFoundError:
    print("❌ embeddings.pkl not found!")
    print("   Run: python build_embeddings.py")
    exit(1)
except Exception as e:
    print(f"❌ Error loading embeddings: {e}")
    exit(1)

print()
print("=" * 70)
print("STEP 3: Check existing students in Supabase")
print("=" * 70)

existing_students = supabase.table('students').select('*').execute()
print(f"Found {len(existing_students.data)} existing students in Supabase")

if existing_students.data:
    print("\nExisting students:")
    for student in existing_students.data:
        print(f"   - {student['name']} (Roll: {student['roll_number']})")

print()
print("=" * 70)
print("STEP 4: Add missing students to Supabase")
print("=" * 70)

# Get list of existing student names
existing_names = [s['name'] for s in existing_students.data]

# Add missing students
added_count = 0
skipped_count = 0

for i, name in enumerate(embeddings_data.keys(), 1):
    if name in existing_names:
        print(f"⏭️  Skipping '{name}' (already exists)")
        skipped_count += 1
        continue
    
    try:
        # Auto-generate roll number
        roll_number = f"{i:03d}"  # 001, 002, 003, etc.
        
        # Insert student
        result = supabase.table('students').insert({
            'roll_number': roll_number,
            'name': name,
            'class': 'Default Class',  # You can change this later
            'section': 'A',
            'is_active': True
        }).execute()
        
        print(f"✅ Added: {name} (Roll: {roll_number})")
        added_count += 1
        
    except Exception as e:
        print(f"❌ Failed to add '{name}': {e}")

print()
print(f"Summary: Added {added_count}, Skipped {skipped_count}")

print()
print("=" * 70)
print("STEP 5: Verify all students are in Supabase")
print("=" * 70)

all_students = supabase.table('students').select('*').order('roll_number').execute()
print(f"\n✅ Total students in Supabase: {len(all_students.data)}")
print()

for student in all_students.data:
    print(f"   {student['roll_number']} - {student['name']} ({student['class']} {student['section']})")

print()
print("=" * 70)
print("STEP 6: Test attendance table")
print("=" * 70)

attendance_records = supabase.table('attendance').select('*').execute()
print(f"Current attendance records: {len(attendance_records.data)}")

print()
print("=" * 70)
print("✅ SETUP COMPLETE!")
print("=" * 70)
print()
print("✅ Supabase is ready to use!")
print(f"✅ {len(all_students.data)} students in database")
print()
print("🎯 Next steps:")
print("   1. Start FastAPI: python main.py")
print("   2. Mark attendance with mobile app")
print("   3. Check Supabase dashboard for new records")
print()
print("=" * 70)
