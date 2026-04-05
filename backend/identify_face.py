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


def identify_face(image_path, database_file="embeddings.pkl", threshold=0.4, min_confidence=60.0, min_distance_gap=0.05):
    """
    Identify a person from an image with enhanced validation
    
    Args:
        image_path: Path to the test image
        database_file: Path to embeddings database
        threshold: Maximum distance for a match (default 0.3 - stricter)
        min_confidence: Minimum confidence % required (default 70%)
        min_distance_gap: Minimum gap between 1st and 2nd match (default 0.1)
    
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
    
    # Calculate confidence
    if best_distance < threshold:
        confidence = (1 - (best_distance / threshold)) * 100
    else:
        confidence = 0.0
    
    # VALIDATION CHECK 1: Distance threshold
    if best_distance >= threshold:
        print(f"❌ UNKNOWN PERSON")
        print(f"   Closest match: {best_match} (distance: {best_distance:.4f})")
        print(f"   Threshold: {threshold}")
        print(f"   ⚠️  Distance too high - no confident match")
        
        result = {
            'identified': False,
            'name': None,
            'closest_match': best_match,
            'distance': best_distance,
            'confidence': confidence,
            'threshold': threshold,
            'reason': 'distance_too_high',
            'all_matches': all_results
        }
    
    # VALIDATION CHECK 2: Minimum confidence
    elif confidence < min_confidence:
        print(f"❌ UNKNOWN PERSON")
        print(f"   Closest match: {best_match} (distance: {best_distance:.4f})")
        print(f"   Confidence: {confidence:.1f}% (minimum: {min_confidence}%)")
        print(f"   ⚠️  Confidence too low - match not reliable")
        
        result = {
            'identified': False,
            'name': None,
            'closest_match': best_match,
            'distance': best_distance,
            'confidence': confidence,
            'threshold': threshold,
            'reason': 'confidence_too_low',
            'all_matches': all_results
        }
    
    # VALIDATION CHECK 3: Distance gap between 1st and 2nd match
    elif len(all_results) >= 2:
        second_distance = all_results[1]['distance']
        distance_gap = second_distance - best_distance
        
        if distance_gap < min_distance_gap:
            print(f"❌ AMBIGUOUS MATCH")
            print(f"   1st match: {best_match} (distance: {best_distance:.4f})")
            print(f"   2nd match: {all_results[1]['name']} (distance: {second_distance:.4f})")
            print(f"   Distance gap: {distance_gap:.4f} (minimum: {min_distance_gap})")
            print(f"   ⚠️  Two people are too similar - cannot distinguish reliably")
            
            result = {
                'identified': False,
                'name': None,
                'closest_match': best_match,
                'second_match': all_results[1]['name'],
                'distance': best_distance,
                'confidence': confidence,
                'distance_gap': distance_gap,
                'threshold': threshold,
                'reason': 'ambiguous_match',
                'all_matches': all_results
            }
        else:
            # All validations passed!
            print(f"✅ IDENTIFIED: {best_match}")
            print(f"   Distance: {best_distance:.4f} (threshold: {threshold})")
            print(f"   Confidence: {confidence:.1f}%")
            print(f"   Distance gap from 2nd: {distance_gap:.4f} ✓")
            
            result = {
                'identified': True,
                'name': best_match,
                'distance': best_distance,
                'confidence': confidence,
                'threshold': threshold,
                'distance_gap': distance_gap,
                'all_matches': all_results
            }
    else:
        # Only one person in database - simpler validation
        print(f"✅ IDENTIFIED: {best_match}")
        print(f"   Distance: {best_distance:.4f} (threshold: {threshold})")
        print(f"   Confidence: {confidence:.1f}%")
        print(f"   Note: Only one person in database")
        
        result = {
            'identified': True,
            'name': best_match,
            'distance': best_distance,
            'confidence': confidence,
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
        print("  python identify_face.py test_images/unknown.jpg 0.4")
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
