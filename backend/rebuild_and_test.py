"""
Rebuild Embeddings and Test Trip Recognition
This script rebuilds embeddings with all student photos and tests trip recognition
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def rebuild_embeddings():
    """Trigger embeddings rebuild"""
    print("🔄 Triggering embeddings rebuild...")
    print("   (This will pull photos from Supabase database)")
    
    try:
        response = requests.post(f"{BASE_URL}/api/rebuild_embeddings")
        if response.status_code == 200:
            print(f"✅ Rebuild started in background")
            return True
        else:
            print(f"❌ Failed to start rebuild: {response.json()}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def check_rebuild_status():
    """Check embeddings rebuild status"""
    try:
        response = requests.get(f"{BASE_URL}/api/rebuild_status")
        if response.status_code == 200:
            status = response.json().get('status', {})
            is_running = status.get('is_running', False)
            last_status = status.get('last_status', 'unknown')
            
            if is_running:
                print(f"⏳ Rebuild in progress...")
                return False
            else:
                print(f"✅ Rebuild complete! Status: {last_status}")
                return True
        else:
            print(f"Error checking status: {response.json()}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def get_api_health():
    """Check API and embeddings status"""
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            print(f"API Status: ✅ Online")
            print(f"   Students in embeddings: {data.get('students_enrolled', 0)}")
            return data.get('students_enrolled', 0)
        else:
            print(f"API Status: ❌ Error")
            return 0
    except Exception as e:
        print(f"API Status: ❌ {e}")
        return 0

def main():
    print("=" * 70)
    print("REBUILDING EMBEDDINGS WITH DATABASE PHOTOS")
    print("=" * 70)
    
    # Check API health first
    print("\n1️⃣  Checking API...")
    students_before = get_api_health()
    
    # Rebuild embeddings
    print("\n2️⃣  Rebuilding embeddings...")
    if not rebuild_embeddings():
        print("❌ Failed to trigger rebuild")
        return
    
    # Wait for rebuild
    print("\n3️⃣  Waiting for rebuild to complete...")
    print("   (This may take 2-5 minutes on first run)")
    
    max_wait = 300  # 5 minutes
    waited = 0
    check_interval = 5  # Check every 5 seconds
    
    while waited < max_wait:
        time.sleep(check_interval)
        waited += check_interval
        
        if check_rebuild_status():
            break
        
        # Show progress
        if waited % 30 == 0:
            print(f"   ⏳ Still rebuilding... ({waited}s elapsed)")
    
    # Check final status
    print("\n4️⃣  Checking final embeddings...")
    students_after = get_api_health()
    
    if students_after > students_before:
        print(f"\n✅ EMBEDDINGS REBUILT SUCCESSFULLY!")
        print(f"   Before: {students_before} students")
        print(f"   After: {students_after} students")
        print(f"\n🚀 Trip camera recognition should now work!")
    else:
        print(f"\n⚠️  Embeddings count unchanged: {students_after}")
        print(f"   Check backend logs to see if photos were added")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()
