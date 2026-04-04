"""
Quick Supabase Test - Check Connection & Tables
"""
import os
from dotenv import load_dotenv

print("Testing Supabase connection...")
print()

# Load environment
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

print(f"URL: {url}")
print(f"Key: {key[:30]}..." if key else "Key: NOT FOUND")
print()

if not url or not key:
    print("ERROR: .env file not configured!")
    print("Edit .env file with your Supabase credentials")
    exit(1)

# Try to connect
try:
    from supabase import create_client
    supabase = create_client(url, key)
    print("✅ Supabase client created")
except Exception as e:
    print(f"❌ Failed to create client: {e}")
    exit(1)

# Test tables
print()
print("Checking tables...")
print()

# Students table
try:
    result = supabase.table('students').select('*').execute()
    print(f"✅ students table EXISTS - {len(result.data)} records")
    for s in result.data[:5]:
        print(f"   - {s.get('name', 'Unknown')}")
except Exception as e:
    print(f"❌ students table ERROR:")
    print(f"   {str(e)[:200]}")
    print()
    print("👉 YOU NEED TO RUN THE SQL FIRST!")
    print("   1. Open: https://app.supabase.com")
    print("   2. Go to SQL Editor")
    print("   3. Copy SQL from: supabase_setup.sql")
    print("   4. Click Run")

print()

# Attendance table
try:
    result = supabase.table('attendance').select('*').execute()
    print(f"✅ attendance table EXISTS - {len(result.data)} records")
except Exception as e:
    print(f"❌ attendance table ERROR:")
    print(f"   {str(e)[:200]}")

print()
print("=" * 60)
