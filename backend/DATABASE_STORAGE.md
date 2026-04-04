# How the Database is Stored

## File: `embeddings.pkl`

### Format: Python Pickle (Binary)

- Binary serialized Python dictionary
- Not human-readable (binary format)
- Fast to load/save
- Typically 50-200 KB for 10-50 students

---

## Data Structure

```python
{
    "john_doe": [
        {
            'embedding': [0.123, -0.456, 0.789, ..., 0.234],  # 128 numbers
            'image': 'photo1.jpg',
            'path': 'known_faces/john_doe/photo1.jpg'
        }
    ],
    "jane_smith": [
        {
            'embedding': [0.345, -0.678, 0.901, ..., 0.567],  # 128 numbers
            'image': 'photo1.jpg',
            'path': 'known_faces/jane_smith/photo1.jpg'
        }
    ],
    "alex_kumar": [
        {
            'embedding': [0.567, -0.890, 0.123, ..., 0.890],  # 128 numbers
            'image': 'photo1.jpg',
            'path': 'known_faces/alex_kumar/photo1.jpg'
        }
    ]
}
```

---

## What is an Embedding?

### Face → 128 Numbers (FaceNet Model)

**Example:**

```
Original: photo.jpg (512x512 pixels, 786,432 numbers)
↓
FaceNet Neural Network
↓
Embedding: [0.123, -0.456, 0.789, ..., 0.234]  (128 numbers)
```

**The 128 numbers represent:**

- Facial structure
- Eye spacing
- Nose shape
- Jaw line
- Face proportions
- Unique features

**Key Properties:**

- Same person → Similar embeddings (close distance)
- Different people → Different embeddings (far distance)
- Independent of lighting, angle (to some extent)

---

## How Matching Works

### Step 1: Get New Photo

```python
new_photo = "test_image.jpg"
new_embedding = [0.125, -0.453, 0.791, ...]  # 128 numbers
```

### Step 2: Compare to Database

```python
john_doe_embedding = [0.123, -0.456, 0.789, ...]
jane_smith_embedding = [0.345, -0.678, 0.901, ...]
```

### Step 3: Calculate Distance

```python
distance_to_john = cosine_distance(new_embedding, john_doe_embedding)
# → 0.15 (SMALL = MATCH!)

distance_to_jane = cosine_distance(new_embedding, jane_smith_embedding)
# → 0.85 (LARGE = NO MATCH)
```

### Step 4: Find Best Match

```python
if distance_to_john < threshold (0.4):
    return "john_doe" ✅
else:
    return "unknown"
```

---

## Storage Methods Comparison

| Method                | Size   | Speed   | Human Readable | Best For      |
| --------------------- | ------ | ------- | -------------- | ------------- |
| **Pickle (.pkl)**     | Small  | Fast ⚡ | No             | Current setup |
| JSON (.json)          | Medium | Medium  | Yes ✓          | Debugging     |
| NumPy (.npz)          | Small  | Fast ⚡ | No             | ML workflows  |
| Database (SQLite)     | Medium | Fast ⚡ | Query-able     | Production    |
| Database (PostgreSQL) | Medium | Fast ⚡ | Query-able     | Large scale   |

**Current choice (Pickle):** Fast, simple, perfect for local prototyping.

---

## Inspect Your Database

Run this to see the structure:

```batch
python inspect_database.py
```

This shows:

- How many people are stored
- How many photos per person
- The embedding dimensions
- Sample values

---

## Future: Database Options

### For Production (Phase 4):

**Option 1: SQLite**

```sql
CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    name TEXT,
    photo_path TEXT
);

CREATE TABLE embeddings (
    id INTEGER PRIMARY KEY,
    student_id INTEGER,
    embedding BLOB,  -- Store as binary
    FOREIGN KEY (student_id) REFERENCES students(id)
);
```

**Option 2: PostgreSQL with pgvector**

```sql
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name TEXT,
    embedding vector(128)  -- Native vector support!
);

-- Fast similarity search
SELECT name FROM students
ORDER BY embedding <-> query_embedding
LIMIT 1;
```

**Option 3: Vector Databases**

- Pinecone
- Weaviate
- Milvus
- Qdrant

---

## File Size Estimates

- **1 person, 1 photo:** ~1.5 KB
- **10 people, 1 photo each:** ~15 KB
- **100 people, 1 photo each:** ~150 KB
- **100 people, 3 photos each:** ~450 KB

Very compact! 🚀
