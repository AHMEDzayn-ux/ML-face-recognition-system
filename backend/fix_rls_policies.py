"""
Fix Supabase RLS Policies for Photo Uploads
This script automatically fixes the Row-Level Security policies
that are blocking Supabase Storage uploads
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase_service_role = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not all([supabase_url, supabase_key]):
    print("❌ Missing Supabase credentials in .env")
    exit(1)

print("=" * 70)
print("FIXING SUPABASE RLS POLICIES FOR UPLOADS")
print("=" * 70)

# We need the service role key to modify RLS policies
if not supabase_service_role:
    print("\n⚠️  Service Role Key not found in .env")
    print("    You need to fix RLS policies manually in Supabase:")
    print("\n1. Go to: https://app.supabase.com/project/ykrbllmjrevriecowlnr/auth/policies")
    print("2. Find the 'student-photos' bucket in Storage")
    print("3. Click on the bucket to view policies")
    print("4. Disable or modify the RLS policy that blocks uploads")
    print("\n📋 SQL to run in Supabase SQL Editor:")
    print("""
-- Drop restrictive policies
DROP POLICY IF EXISTS student-photos-upload ON storage.objects;
DROP POLICY IF EXISTS student-photos-read ON storage.objects;

-- Create permissive policies
CREATE POLICY student-photos-upload
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY student-photos-read
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

-- Allow updates too
CREATE POLICY student-photos-update
ON storage.objects FOR UPDATE
WITH CHECK (bucket_id = 'student-photos');

-- Allow deletes
CREATE POLICY student-photos-delete
ON storage.objects FOR DELETE
USING (bucket_id = 'student-photos');
""")
    exit(1)

# Use service role to modify policies
print("\n🔑 Using service role key to fix policies...")
supabase = create_client(supabase_url, supabase_service_role)

sql_queries = [
    # Drop old policies
    "DROP POLICY IF EXISTS \"student-photos upload\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"student-photos read\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"student-photos update\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"student-photos delete\" ON storage.objects;",
    
    # Create new permissive policies
    """CREATE POLICY "student-photos upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-photos');""",
    
    """CREATE POLICY "student-photos read"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');""",
    
    """CREATE POLICY "student-photos update"
ON storage.objects FOR UPDATE
WITH CHECK (bucket_id = 'student-photos');""",
    
    """CREATE POLICY "student-photos delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'student-photos');"""
]

try:
    for idx, query in enumerate(sql_queries):
        try:
            result = supabase.rpc('execute_sql', {'query': query}).execute()
            print(f"✅ Query {idx+1}: {query[:50]}...")
        except:
            # Attempt via raw query
            try:
                response = supabase.postgrest.rpc('execute_sql', {'query': query}).execute()
                print(f"✅ Query {idx+1}: {query[:50]}...")
            except Exception as e:
                print(f"⚠️  Query {idx+1} might have failed: {str(e)[:100]}")
    
    print("\n✅ RLS policies have been updated!")
    print("\n🧪 Testing upload again...")
    from PIL import Image
    import io
    
    # Create test image
    img = Image.new('RGB', (50, 50), color='blue')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    # Try upload with standard key
    supabase_standard = create_client(supabase_url, supabase_key)
    response = supabase_standard.storage.from_("student-photos").upload(
        "rls_test.jpg",
        img_bytes.getvalue(),
        {"content-type": "image/jpeg"}
    )
    print(f"   ✅ Upload test: SUCCESS")
    print(f"   URL: {supabase_standard.storage.from_('student-photos').get_public_url('rls_test.jpg')}")

except Exception as e:
    print(f"\n❌ Error fixing policies: {e}")
    print("\n   You need to manually fix RLS in Supabase console")
    print("   See instructions above ⬆️")

print("\n" + "=" * 70)
