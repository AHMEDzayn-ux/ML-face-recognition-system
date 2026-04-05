import requests
import json

# Get students from API
resp = requests.get('http://localhost:8000/students', timeout=5)
students = resp.json()['students']

# Find the student we uploaded to
target_student = [x for x in students if x['name'] == 'ruzainia.23ddd'][0]

print("="*60)
print("📊 PHOTO UPLOAD VERIFICATION RESULTS")
print("="*60)

print(f"\nStudent: {target_student['name']}")
print(f"  ID: {target_student['id']}")
print(f"  Photo URL in Supabase: {target_student['photo_url']}")
print(f"  Last Updated: {target_student['updated_at']}")

if target_student['photo_url']:
    print("\n✅ Photo URL is stored in Supabase database!")
else:
    print("\n❌ Photo URL is NOT in Supabase database!")

print("\n" + "="*60)
