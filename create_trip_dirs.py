import os

# Create trip directories
base_path = r"F:\My projects\attendance-system\pwa-dashboard\app\trips"

dirs_to_create = [
    base_path,
    os.path.join(base_path, "new"),
    os.path.join(base_path, "[id]"),
    os.path.join(base_path, "[id]", "camera"),
]

for dir_path in dirs_to_create:
    os.makedirs(dir_path, exist_ok=True)
    print(f"✓ Created: {dir_path}")

print("\n✅ All directories created successfully!")
