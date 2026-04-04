"""
Build Known Faces Database
Creates embeddings database from organized face photos
"""

import os
import pickle
import numpy as np
from deepface import DeepFace
from pathlib import Path

def build_embeddings_database(known_faces_dir="known_faces", output_file="embeddings.pkl"):
    """
    Build embeddings database from known faces directory
    
    Directory structure:
        known_faces/
            person_name_1/
                photo1.jpg
                photo2.jpg
            person_name_2/
                photo1.jpg
    
    Args:
        known_faces_dir: Directory containing person folders
        output_file: Output pickle file for embeddings
    
    Returns:
        Dictionary of embeddings
    """
    
    if not os.path.exists(known_faces_dir):
        print(f"❌ ERROR: Directory '{known_faces_dir}' not found!")
        print(f"\nCreate the directory structure:")
        print(f"  known_faces/")
        print(f"    person_name_1/")
        print(f"      photo1.jpg")
        print(f"      photo2.jpg")
        print(f"    person_name_2/")
        print(f"      photo1.jpg")
        return None
    
    print("=" * 60)
    print("Building Known Faces Database")
    print("=" * 60)
    
    embeddings_db = {}
    total_processed = 0
    total_failed = 0
    
    # Scan directory for person folders
    for person_name in os.listdir(known_faces_dir):
        person_path = os.path.join(known_faces_dir, person_name)
        
        # Skip if not a directory
        if not os.path.isdir(person_path):
            continue
        
        print(f"\n📁 Processing: {person_name}")
        print("-" * 60)
        
        person_embeddings = []
        
        # Process each photo for this person
        for image_file in os.listdir(person_path):
            # Check if it's an image file
            if not image_file.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
                continue
            
            image_path = os.path.join(person_path, image_file)
            
            try:
                print(f"  Processing: {image_file}... ", end="")
                
                # Extract embedding using DeepFace
                embedding_objs = DeepFace.represent(
                    img_path=image_path,
                    model_name="Facenet",
                    detector_backend="mtcnn",
                    enforce_detection=True
                )
                
                # Get the embedding (first face detected)
                embedding = embedding_objs[0]["embedding"]
                person_embeddings.append({
                    'embedding': embedding,
                    'image': image_file,
                    'path': image_path
                })
                
                print("✅")
                total_processed += 1
                
            except Exception as e:
                print(f"❌")
                print(f"    Error: {str(e)[:100]}")
                total_failed += 1
        
        # Store embeddings for this person
        if person_embeddings:
            embeddings_db[person_name] = person_embeddings
            print(f"  ✓ Added {len(person_embeddings)} embeddings for {person_name}")
        else:
            print(f"  ⚠ No valid embeddings found for {person_name}")
    
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"People in database: {len(embeddings_db)}")
    print(f"Total images processed: {total_processed}")
    print(f"Total images failed: {total_failed}")
    
    # Show database contents
    print("\n📊 Database Contents:")
    for person_name, embeddings in embeddings_db.items():
        print(f"  • {person_name}: {len(embeddings)} photos")
    
    # Save to pickle file
    if embeddings_db:
        print(f"\n💾 Saving database to: {output_file}")
        with open(output_file, 'wb') as f:
            pickle.dump(embeddings_db, f)
        print("✅ Database saved successfully!")
        
        # Show file size
        file_size = os.path.getsize(output_file) / 1024
        print(f"   File size: {file_size:.1f} KB")
    else:
        print("\n⚠️ No embeddings to save!")
    
    print("=" * 60)
    
    return embeddings_db


def load_embeddings_database(database_file="embeddings.pkl"):
    """Load embeddings database from file"""
    try:
        with open(database_file, 'rb') as f:
            embeddings_db = pickle.load(f)
        print(f"✅ Loaded database with {len(embeddings_db)} people")
        return embeddings_db
    except FileNotFoundError:
        print(f"❌ Database file not found: {database_file}")
        return None
    except Exception as e:
        print(f"❌ Error loading database: {e}")
        return None


if __name__ == "__main__":
    import sys
    
    # Check command line arguments
    if len(sys.argv) > 1:
        known_faces_dir = sys.argv[1]
    else:
        known_faces_dir = "known_faces"
    
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    else:
        output_file = "embeddings.pkl"
    
    # Build the database
    print("\n🚀 Starting database build...\n")
    db = build_embeddings_database(known_faces_dir, output_file)
    
    if db:
        print("\n✅ Database build complete!")
        print("\nNext steps:")
        print("  1. Test identification with: python identify_face.py <test_image.jpg>")
        print("  2. Add more photos to known_faces/ and rebuild if needed")
    else:
        print("\n❌ Database build failed!")
        print("\nSetup instructions:")
        print(f"  1. Create folder: {known_faces_dir}/")
        print(f"  2. Create subfolder for each person: {known_faces_dir}/person_name/")
        print(f"  3. Add 3-5 photos per person")
        print(f"  4. Run again: python build_embeddings.py")
