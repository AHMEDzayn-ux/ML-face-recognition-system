"""
Check what students are in embeddings.pkl
"""
import pickle

# Load embeddings
with open('embeddings.pkl', 'rb') as f:
    data = pickle.load(f)

print("=" * 60)
print("Students in embeddings.pkl:")
print("=" * 60)

for i, name in enumerate(data.keys(), 1):
    count = len(data[name])
    print(f"{i}. {name} ({count} photos)")

print(f"\nTotal: {len(data)} students")
print("=" * 60)
