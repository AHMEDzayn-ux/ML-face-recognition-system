"""
Inspect Embeddings Database
Shows the structure and contents of the embeddings database
"""

import pickle
import numpy as np
import os

def inspect_database(database_file="embeddings.pkl"):
    """
    Inspect the embeddings database structure
    """
    
    if not os.path.exists(database_file):
        print(f"❌ Database file not found: {database_file}")
        print("   Run: python build_embeddings.py first")
        return
    
    print("=" * 60)
    print("Embeddings Database Inspector")
    print("=" * 60)
    
    # Load database
    with open(database_file, 'rb') as f:
        embeddings_db = pickle.load(f)
    
    # Show file info
    file_size = os.path.getsize(database_file) / 1024
    print(f"\n📄 File: {database_file}")
    print(f"   Size: {file_size:.2f} KB")
    print(f"   Type: Python Pickle (binary)")
    
    # Show database structure
    print(f"\n📊 Database Structure:")
    print(f"   Type: Dictionary")
    print(f"   People: {len(embeddings_db)}")
    
    total_embeddings = sum(len(embeddings) for embeddings in embeddings_db.values())
    print(f"   Total embeddings: {total_embeddings}")
    
    # Show each person's data
    print("\n" + "-" * 60)
    print("People in Database:")
    print("-" * 60)
    
    for person_name, embeddings_list in embeddings_db.items():
        print(f"\n👤 {person_name}")
        print(f"   Photos: {len(embeddings_list)}")
        
        for idx, embedding_data in enumerate(embeddings_list, 1):
            embedding = embedding_data['embedding']
            image_name = embedding_data['image']
            
            print(f"\n   Photo {idx}: {image_name}")
            print(f"     Embedding shape: {np.array(embedding).shape}")
            print(f"     Embedding type: {type(embedding)}")
            print(f"     Dimensions: {len(embedding)}")
            print(f"     Sample values (first 5): {embedding[:5]}")
            print(f"     Range: [{min(embedding):.4f}, {max(embedding):.4f}]")
    
    # Show example data structure
    print("\n" + "=" * 60)
    print("Data Structure Explanation:")
    print("=" * 60)
    print("""
embeddings.pkl contains a Python dictionary:

{
    "person_name_1": [
        {
            'embedding': [0.123, -0.456, 0.789, ...],  # 128 numbers
            'image': 'photo1.jpg',
            'path': 'known_faces/person_name_1/photo1.jpg'
        },
        {
            'embedding': [0.234, -0.567, 0.890, ...],  # 128 numbers
            'image': 'photo2.jpg',
            'path': 'known_faces/person_name_1/photo2.jpg'
        }
    ],
    "person_name_2": [
        {
            'embedding': [0.345, -0.678, 0.901, ...],  # 128 numbers
            'image': 'photo1.jpg',
            'path': 'known_faces/person_name_2/photo1.jpg'
        }
    ]
}

Each embedding is a 128-dimensional vector (FaceNet model).
These numbers represent unique facial features extracted by the neural network.
    """)
    
    print("=" * 60)
    print("How It Works:")
    print("=" * 60)
    print("""
1. Face Detection: MTCNN finds the face in the image
2. Face Extraction: Crops the face region
3. Neural Network: FaceNet converts face → 128 numbers
4. Storage: Save as pickle file (embeddings.pkl)
5. Matching: Compare new photo's embedding vs stored embeddings
   - Calculate distance (cosine similarity or euclidean)
   - If distance < threshold → Same person!
    """)
    
    return embeddings_db


if __name__ == "__main__":
    import sys
    
    database_file = sys.argv[1] if len(sys.argv) > 1 else "embeddings.pkl"
    inspect_database(database_file)
