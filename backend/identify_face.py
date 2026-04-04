"""
Face Identification Script
Identifies a person from a new photo by comparing against known faces database
"""

import os
import sys
import pickle
import numpy as np
from deepface import DeepFace

def load_database(database_file="embeddings.pkl"):
    """Load the embeddings database"""
    try:
        with open(database_file, 'rb') as f:
            embeddings_db = pickle.load(f)
        return embeddings_db
    except FileNotFoundError:
        print(f"❌ ERROR: Database file not found: {database_file}")
        print("   Run: python build_embeddings.py first")
        return None
    except Exception as e:
        print(f"❌ ERROR loading database: {e}")
        return None


def calculate_cosine_distance(embedding1, embedding2):
    """Calculate cosine distance between two embeddings"""
    embedding1 = np.array(embedding1)
    embedding2 = np.array(embedding2)
    
    # Cosine similarity
    dot_product = np.dot(embedding1, embedding2)
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)
    
    similarity = dot_product / (norm1 * norm2)
    
    # Convert to distance (0 = identical, 2 = opposite)
    distance = 1 - similarity
    
    return distance


def identify_face(image_path, database_file="embeddings.pkl", threshold=0.4):
    """
    Identify a person from an image
    
    Args:
        image_path: Path to the test image
        database_file: Path to embeddings database
        threshold: Maximum distance for a match (lower = stricter)
    
    Returns:
        Dictionary with identification results
    """
    
    # Load database
    embeddings_db = load_database(database_file)
    if embeddings_db is None:
        return None
    
    if len(embeddings_db) == 0:
        print("❌ ERROR: Database is empty!")
        print("   Add faces to known_faces/ and run build_embeddings.py")
        return None
    
    print("=" * 60)
    print(f"🔍 Identifying face from: {image_path}")
    print("=" * 60)
    
    # Check if image exists
    if not os.path.exists(image_path):
        print(f"❌ ERROR: Image not found: {image_path}")
        return None
    
    # Extract embedding from test image
    print("\n📸 Extracting face embedding from test image...")
    try:
        test_embedding_objs = DeepFace.represent(
            img_path=image_path,
            model_name="Facenet",
            detector_backend="mtcnn",
            enforce_detection=True
        )
        test_embedding = test_embedding_objs[0]["embedding"]
        print("✅ Face detected and embedding extracted")
        
    except Exception as e:
        print(f"❌ ERROR: Could not detect face in image")
        print(f"   {str(e)[:100]}")
        print("\n💡 Tips:")
        print("   - Use a clear, frontal face photo")
        print("   - Ensure good lighting")
        print("   - Face should be clearly visible")
        return None
    
    # Compare against all known faces
    print(f"\n🔎 Comparing against {len(embeddings_db)} known people...")
    print("-" * 60)
    
    best_match = None
    best_distance = float('inf')
    all_results = []
    
    for person_name, person_embeddings in embeddings_db.items():
        # Compare against all photos of this person
        distances = []
        
        for embedding_data in person_embeddings:
            known_embedding = embedding_data['embedding']
            distance = calculate_cosine_distance(test_embedding, known_embedding)
            distances.append(distance)
        
        # Use minimum distance (best match for this person)
        min_distance = min(distances)
        avg_distance = sum(distances) / len(distances)
        
        all_results.append({
            'name': person_name,
            'distance': min_distance,
            'avg_distance': avg_distance,
            'photos_compared': len(distances)
        })
        
        # Update best match
        if min_distance < best_distance:
            best_distance = min_distance
            best_match = person_name
        
        # Show result for this person
        match_symbol = "✓" if min_distance < threshold else "✗"
        print(f"  {match_symbol} {person_name:20s} - Distance: {min_distance:.4f} (avg: {avg_distance:.4f})")
    
    # Sort results by distance
    all_results.sort(key=lambda x: x['distance'])
    
    print("\n" + "=" * 60)
    print("🎯 RESULT")
    print("=" * 60)
    
    if best_distance < threshold:
        confidence = (1 - (best_distance / threshold)) * 100
        print(f"✅ IDENTIFIED: {best_match}")
        print(f"   Distance: {best_distance:.4f} (threshold: {threshold})")
        print(f"   Confidence: {confidence:.1f}%")
        
        result = {
            'identified': True,
            'name': best_match,
            'distance': best_distance,
            'confidence': confidence,
            'threshold': threshold,
            'all_matches': all_results
        }
    else:
        print(f"❌ UNKNOWN PERSON")
        print(f"   Closest match: {best_match} (distance: {best_distance:.4f})")
        print(f"   Threshold: {threshold}")
        print(f"   No match found above confidence threshold")
        
        result = {
            'identified': False,
            'name': None,
            'closest_match': best_match,
            'distance': best_distance,
            'threshold': threshold,
            'all_matches': all_results
        }
    
    print("=" * 60)
    
    return result


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Face Identification System")
    print("=" * 60)
    
    # Check command line arguments
    if len(sys.argv) < 2:
        print("\nUsage: python identify_face.py <test_image.jpg> [threshold]")
        print("\nExample:")
        print("  python identify_face.py test_images/unknown.jpg")
        print("  python identify_face.py test_images/unknown.jpg 0.3")
        print("\nOptional threshold (default: 0.4):")
        print("  - Lower (0.3): Stricter matching, fewer false positives")
        print("  - Higher (0.5): More lenient, may have false positives")
        print("\nMake sure you have:")
        print("  1. Created embeddings.pkl (run build_embeddings.py)")
        print("  2. Test image with a clear face")
        sys.exit(1)
    
    test_image = sys.argv[1]
    threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.4
    
    # Run identification
    result = identify_face(test_image, threshold=threshold)
    
    if result:
        print("\n✅ Identification complete!")
        
        if result['identified']:
            print(f"\n🎉 Welcome, {result['name']}!")
        else:
            print("\n⚠️  Person not recognized in database")
    else:
        print("\n❌ Identification failed!")
