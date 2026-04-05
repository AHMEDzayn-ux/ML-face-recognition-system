"""
Build Known Faces Database
Creates embeddings database from organized face photos AND database student photos
Ensures all students added to trips have embeddings available
"""

import os
import pickle
import numpy as np
from deepface import DeepFace
from pathlib import Path
import io
from urllib.request import urlopen

# Supabase integration
try:
    from supabase import create_client, Client
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(env_path)
    SUPABASE_ENABLED = os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY")
    if SUPABASE_ENABLED:
        supabase_client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_KEY")
        )
    else:
        supabase_client = None
except ImportError:
    SUPABASE_ENABLED = False
    supabase_client = None
    print("⚠️  Supabase not installed. Skipping database photo sync.")

def build_embeddings_database(known_faces_dir="known_faces", output_file="embeddings.pkl", include_db_photos=True):
    """
    Build embeddings database from known faces directory AND database student photos
    
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
        include_db_photos: If True, also pull photos from Supabase database for all students
    
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
    
    # PHASE 2: Add embeddings from database student photos (for students added to trips)
    if include_db_photos and SUPABASE_ENABLED and supabase_client:
        print("\n" + "=" * 60)
        print("PHASE 2: Processing Database Student Photos")
        print("=" * 60)
        
        try:
            # Get all students from database
            students_response = supabase_client.table('students').select('*').execute()
            students = students_response.data if students_response.data else []
            
            print(f"\n📊 Found {len(students)} students in database")
            
            db_processed = 0
            db_skipped = 0
            db_failed = 0
            
            for student in students:
                student_id = student['id']
                student_name = student['name']
                photo_url = student.get('photo_url')
                
                # Skip if already have embeddings for this student
                if student_name in embeddings_db:
                    # print(f"  ⊘ {student_name} - already have embeddings from known_faces/")
                    db_skipped += 1
                    continue
                
                # Skip if no photo
                if not photo_url:
                    # print(f"  ⊘ {student_name} - no photo uploaded")
                    db_skipped += 1
                    continue
                
                try:
                    print(f"  📥 {student_name}... ", end="", flush=True)
                    
                    # Download and process photo from Supabase
                    try:
                        from urllib.request import urlopen
                        response = urlopen(photo_url)
                        img_data = response.read()
                        
                        # Save temporarily
                        temp_path = os.path.join("uploads", f"temp_db_{student_id}.jpg")
                        os.makedirs("uploads", exist_ok=True)
                        with open(temp_path, 'wb') as f:
                            f.write(img_data)
                        
                        # Extract embedding
                        embedding_objs = DeepFace.represent(
                            img_path=temp_path,
                            model_name="Facenet",
                            detector_backend="mtcnn",
                            enforce_detection=False  # More lenient for database photos
                        )
                        
                        if embedding_objs and len(embedding_objs) > 0:
                            # Add to embeddings database
                            embedding = embedding_objs[0]["embedding"]
                            embeddings_db[student_name] = [{
                                'embedding': embedding,
                                'image': 'database_photo',
                                'path': photo_url,
                                'source': 'database'
                            }]
                            print("✅")
                            db_processed += 1
                        else:
                            print("❌ (no face)")
                            db_failed += 1
                        
                        # Clean up
                        if os.path.exists(temp_path):
                            os.remove(temp_path)
                    
                    except Exception as download_err:
                        print(f"❌ ({str(download_err)[:40]})")
                        db_failed += 1
                    
                except Exception as e:
                    print(f"❌ Error processing {student_name}: {str(e)[:50]}")
                    db_failed += 1
            
            print(f"\n  Database photos processed: {db_processed}")
            if db_skipped > 0:
                print(f"  Already in embeddings (skipped): {db_skipped}")
            if db_failed > 0:
                print(f"  Failed: {db_failed}")
        
        except Exception as e:
            print(f"\n⚠️  Error accessing database for photos: {str(e)}")
            print("   Continuing with known_faces embeddings only...")
    
    
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total people in database: {len(embeddings_db)}")
    print(f"Total images processed: {total_processed}")
    print(f"Total images failed: {total_failed}")
    
    # Show database contents
    print("\n📊 Database Contents:")
    for person_name, embeddings in embeddings_db.items():
        source = embeddings[0].get('source', 'known_faces')
        print(f"  • {person_name}: {len(embeddings)} embedding(s) [{source}]")
    
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
    
    # Build the database (including database photos by default)
    print("\n🚀 Starting database build...\n")
    print("📌 This will combine photos from:")
    print("   1. known_faces/ folder (local)")
    print("   2. Student database (from uploaded photos)\n")
    
    db = build_embeddings_database(known_faces_dir, output_file, include_db_photos=True)
    
    if db:
        print("\n✅ Database build complete!")
        print("\nNext steps:")
        print("  1. Test identification with: python identify_face.py <test_image.jpg>")
        print("  2. Trip camera recognition should now work for all students with photos!")
    else:
        print("\n❌ Database build failed!")
        print("\nSetup instructions:")
        print(f"  1. Create folder: {known_faces_dir}/")
        print(f"  2. Create subfolder for each person: {known_faces_dir}/person_name/")
        print(f"  3. Add 3-5 photos per person")
        print(f"  4. Run again: python build_embeddings.py")
