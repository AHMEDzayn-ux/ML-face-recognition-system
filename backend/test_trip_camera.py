"""
Test Trip Camera Recognition
Simulates what happens when someone uses the camera in a trip
"""

import requests
import json
from PIL import Image
import io

BASE_URL = "http://localhost:8000"

def get_trips():
    """Get all trips"""
    try:
        response = requests.get(f"{BASE_URL}/api/trips")
        if response.status_code == 200:
            data = response.json()
            trips = data.get('data', [])
            print(f"✅ Found {len(trips)} trips:")
            for trip in trips:
                print(f"   • {trip['name']} (ID: {trip['id']})")
            return trips
        else:
            print(f"❌ Error fetching trips: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def get_trip_participants(trip_id):
    """Get participants in a trip"""
    try:
        response = requests.get(f"{BASE_URL}/api/trips/{trip_id}/participants")
        if response.status_code == 200:
            data = response.json()
            if 'data' in data:
                participants = data['data']
            else:
                participants = data
            
            print(f"\n✅ Trip participants ({len(participants)} total):")
            for p in participants[:5]:
                name = p.get('name', 'Unknown')
                print(f"   • {name}")
            return participants
        else:
            print(f"❌ Error fetching participants: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def test_trip_checkin(trip_id):
    """Test trip checkin with a dummy image"""
    print(f"\n🔍 Testing trip camera checkin for trip: {trip_id}")
    
    # Create a simple test image (red square)
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    try:
        files = {'image': ('test.jpg', img_bytes.getvalue(), 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/trips/{trip_id}/checkin",
            files=files
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        return response.json()
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def main():
    print("=" * 70)
    print("TESTING TRIP CAMERA RECOGNITION")
    print("=" * 70)
    
    # Get trips
    print("\n1️⃣  Getting trips...")
    trips = get_trips()
    
    if not trips:
        print("❌ No trips found. Create a trip first.")
        return
    
    trip = trips[0]
    trip_id = trip['id']
    
    # Get participants
    print(f"\n2️⃣  Getting participants for trip: {trip['name']}")
    participants = get_trip_participants(trip_id)
    
    if not participants:
        print("❌ No participants found in trip.")
        return
    
    # Test checkin
    print(f"\n3️⃣  Testing camera checkin...")
    result = test_trip_checkin(trip_id)
    
    print("\n" + "=" * 70)
    if result and result.get('success'):
        print("✅ TRIP CAMERA RECOGNITION WORKS!")
    else:
        print("⚠️  Camera recognition didn't match student (expected for dummy image)")
        if result:
            print(f"   Reason: {result.get('message', 'Unknown')}")

if __name__ == "__main__":
    main()
