"""
Diagnose Trip Camera Recognition Issue
Check what embeddings exist and what students are in the trip
"""

import requests
import json
import pickle
import os

BASE_URL = 'http://localhost:8000'

def get_embeddings():
    """Load embeddings and show students"""
    try:
        with open('embeddings.pkl', 'rb') as f:
            embeddings_db = pickle.load(f)
        
        print(f"✅ Embeddings database loaded")
        print(f"📊 Students in embeddings: {len(embeddings_db)}")
        for name in sorted(list(embeddings_db.keys()))[:10]:
            count = len(embeddings_db[name])
            print(f"   • {name} ({count} photo)")
        if len(embeddings_db) > 10:
            print(f"   ... and {len(embeddings_db) - 10} more")
        
        return embeddings_db
    except Exception as e:
        print(f"❌ Error loading embeddings: {e}")
        return {}

def get_trip_participants(trip_id):
    """Get participants in a trip"""
    response = requests.get(f'{BASE_URL}/api/trips/{trip_id}/participants')
    if response.status_code == 200:
        data = response.json()
        
        # Handle different response formats
        if isinstance(data, dict) and 'data' in data:
            participants = data['data']
        elif isinstance(data, list):
            participants = data
        else:
            print(f"Unknown response format: {type(data)}")
            print(data)
            return []
        
        print(f"\n✅ Found {len(participants)} participants in trip")
        for p in participants[:10]:
            name = p.get('name', 'Unknown')
            print(f"   • {name}")
        if len(participants) > 10:
            print(f"   ... and {len(participants) - 10} more")
        
        return participants
    else:
        print(f"❌ Error fetching participants: {response.status_code}")
        print(response.json())
        return []

def check_embeddings_match(embeddings_db, participants):
    """Check if participant names match embeddings"""
    print(f"\n🔍 CHECKING MATCH STATUS:")
    
    missing_embeddings = []
    has_embeddings = []
    
    for p in participants:
        name = p.get('name', 'Unknown')
        if name in embeddings_db:
            has_embeddings.append(name)
            print(f"   ✅ {name} - HAS embeddings")
        else:
            missing_embeddings.append(name)
            print(f"   ❌ {name} - NO embeddings")
    
    print(f"\n📊 Summary:")
    print(f"   With embeddings: {len(has_embeddings)}")
    print(f"   Missing embeddings: {len(missing_embeddings)}")
    
    if missing_embeddings:
        print(f"\n⚠️ PROBLEM FOUND!")
        print(f"These students need photos uploaded:")
        for name in missing_embeddings[:5]:
            print(f"   • {name}")
        if len(missing_embeddings) > 5:
            print(f"   ... and {len(missing_embeddings) - 5} more")
    
    return missing_embeddings, has_embeddings

def main():
    print("=" * 70)
    print("DIAGNOSING TRIP CAMERA RECOGNITION ISSUE")
    print("=" * 70)
    
    print("\n1️⃣ Loading embeddings...")
    embeddings_db = get_embeddings()
    
    print("\n2️⃣ Getting first trip...")
    response = requests.get(f'{BASE_URL}/api/trips')
    trips = response.json().get('trips', [])
    
    if not trips:
        print("❌ No trips found")
        return
    
    trip = trips[0]
    print(f"✅ Using trip: '{trip['name']}'")
    
    print("\n3️⃣ Getting trip participants...")
    participants = get_trip_participants(trip['id'])
    
    if not participants:
        print("❌ No participants found")
        return
    
    print("\n4️⃣ Checking embeddings match...")
    missing, matched = check_embeddings_match(embeddings_db, participants)
    
    print("\n" + "=" * 70)
    if missing:
        print("🔴 ISSUE IDENTIFIED:")
        print(f"Trip has {len(missing)} students without embeddings!")
        print("\n📝 SOLUTION:")
        print("1. Upload photos for these students")
        print("2. Run: python build_embeddings.py")
        print("3. Try trip camera again")
    else:
        print("✅ All trip students have embeddings!")
        print("   Issue may be elsewhere - check name matching or distance thresholds")

if __name__ == "__main__":
    main()
