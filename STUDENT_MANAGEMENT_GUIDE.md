# Quick Start: Using Student Management

## 🎯 Start the System

### Option 1: Start Everything (Recommended)

```bash
# From project root
START_ALL.bat
```

This opens two windows:

- Backend API (port 8000)
- PWA Dashboard (port 3000)

### Option 2: Start Manually

```bash
# Terminal 1 - Backend
cd backend
start_api.bat

# Terminal 2 - Frontend
cd pwa-dashboard
npm run dev
```

## 📝 Add Your First Student

1. **Open the PWA Dashboard**
   - Navigate to http://localhost:3000/students
   - Click the blue "Add Student" button

2. **Fill in Student Details**
   - **Roll Number**: Unique ID (e.g., 2024001) ⭐ Required
   - **Name**: Full name (e.g., John Doe) ⭐ Required
   - **Class**: Grade/Level (e.g., 10th Grade)
   - **Section**: Division (e.g., A)
   - **Email**: Contact email
   - **Phone**: Contact number

3. **Upload Face Photos** ⭐ Required (3-10 photos)
   - **Drag & drop** photos onto the upload zone, OR
   - **Click** to browse and select files
   - Upload 3-10 clear photos of the student's face
   - **Tips for best results:**
     - Use different angles (front, slight left, slight right)
     - Good lighting
     - Clear, not blurry
     - Face clearly visible
4. **Submit**
   - Click "Add Student"
   - Wait for success notification
   - **Important**: Wait 30-60 seconds for face embeddings to rebuild
   - Student now appears in the list!

## 🗑️ Delete a Student

1. **Navigate to Students Page**
   - http://localhost:3000/students

2. **Find the Student**
   - Use search bar to filter by name or roll number
   - Hover over the student card

3. **Delete**
   - Click the trash icon (appears on hover)
   - Read the warning carefully
   - Click "Delete Student" to confirm
   - Success notification appears
   - Student and all attendance records removed

## ✅ Test Face Recognition

After adding a student:

1. **Wait for Embeddings Rebuild**
   - Check backend console for: `✅ Embeddings rebuilt successfully!`
   - Usually takes 30-60 seconds

2. **Go to Camera Page**
   - http://localhost:3000/camera

3. **Capture Photo**
   - Click "Capture Photo" button
   - System identifies the student
   - Attendance is marked

## 🔍 What Files to Check

### After Adding a Student:

```
backend/
  known_faces/
    {Student Name}/      ← New folder created
      photo_1.jpg        ← Face photos saved here
      photo_2.jpg
      photo_3.jpg
  embeddings.pkl         ← Updated with new face data
```

### After Deleting a Student:

- Folder `known_faces/{Student Name}/` removed
- Student row deleted from Supabase `students` table
- All attendance records deleted (CASCADE)
- `embeddings.pkl` rebuilt without that student

## 🐛 Troubleshooting

### "Student already exists" error

- The roll number must be unique
- Use a different roll number

### "Minimum 3 photos required"

- Upload at least 3 photos
- All photos must have a detectable face

### "No face detected in image"

- Photo quality too low
- Face not clearly visible
- Try a different photo

### Face recognition not working after adding student

- Wait for embeddings rebuild to complete
- Check backend console for completion message
- Rebuild takes 30-60 seconds

### Delete button not appearing

- Make sure you're hovering over the student card
- Delete button shows on hover (top-right corner)

## 📊 Backend Console Messages

**During Add:**

```
✅ Created student: John Doe (Roll: 2024001)
✅ Saved photo 1 for John Doe
✅ Saved photo 2 for John Doe
✅ Saved photo 3 for John Doe
🔄 Starting embeddings rebuild...
✅ Embeddings rebuilt successfully! 5 students loaded.
```

**During Delete:**

```
✅ Deleted student from database: John Doe
✅ Removed face photos folder: known_faces/John Doe
🔄 Starting embeddings rebuild...
✅ Embeddings rebuilt successfully! 4 students loaded.
```

## 🎨 UI Features

- **Search Bar**: Filter students by name or roll number
- **Active Indicator**: Green checkmark = active, Red X = inactive
- **Toast Notifications**: Auto-dismiss success/error messages
- **Loading States**: Buttons disabled during operations
- **Hover Effects**: Delete button only visible on hover
- **Photo Previews**: See thumbnails before uploading
- **Drag & Drop**: Easy photo upload interface

## 💡 Pro Tips

1. **Photo Quality Matters**: Use clear, well-lit photos for best recognition
2. **Multiple Angles**: Upload photos from different angles for better accuracy
3. **Wait for Rebuild**: Always wait for embeddings rebuild before testing recognition
4. **Search Function**: Use search to quickly find students in large lists
5. **Confirmation Dialogs**: Always read warnings before confirming deletions

---

**Ready to go!** Start by adding your first student and test the face recognition. 🚀
