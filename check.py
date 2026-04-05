import pickle

with open('backend/embeddings.pkl', 'rb') as f:
    embeddings_db = pickle.load(f)

print(f"Students in embeddings: {len(embeddings_db)}")
for name in embeddings_db.keys():
    print(f"  • {name}")