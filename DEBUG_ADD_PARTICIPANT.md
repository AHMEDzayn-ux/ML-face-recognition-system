# 🔍 Debug Guide: Add Participant Issue

## Current Issue

Backend receives **both parameters as `None`**:

```
student_id (raw): None
roll_number (raw): None
```

This means FormData is either empty or not being sent properly.

---

## 🧪 Step-by-Step Debugging

### Step 1: Clear Browser Cache

```
1. Press F12 to open DevTools
2. Right-click the refresh button
3. Click "Empty Cache and Hard Reload"
```

**Why?** The old JavaScript might be cached.

---

### Step 2: Try Adding a Participant Again

1. Go to a trip dashboard
2. Click "Add Participants"
3. Search for a student
4. Click the "Add" button
5. **IMMEDIATELY check browser console (F12 → Console tab)**

---

### Step 3: Check Frontend Console Logs

You should see **THREE log blocks** with `====` separators:

#### Block 1: Component Level

```
============================================================
ADD PARTICIPANT - FRONTEND:
  student (full object): {
    "id": "some-uuid-here",    <-- SHOULD BE A VALID UUID
    "roll_number": "CS/2021/001",
    "name": "John Doe",
    ...
  }
  student.id: "some-uuid"      <-- SHOULD HAVE VALUE
  student.id type: string      <-- SHOULD BE "string"
  Has student.id?: true        <-- SHOULD BE true
  student.id === undefined?: false
  student.id === null?: false
============================================================
```

#### Block 2: API Function Level

```
============================================================
API CALL - addParticipantToTrip:
  studentId (raw): "some-uuid"     <-- SHOULD MATCH ABOVE
  studentId type: string
  rollNumber: "CS/2021/001"
  ✅ Appending student_id: some-uuid  <-- SHOULD SEE THIS
  ✅ Appending roll_number: CS/2021/001
  FormData entries:
    student_id: some-uuid           <-- SHOULD SEE THIS
    roll_number: CS/2021/001
  FormData has entries: true        <-- SHOULD BE true
============================================================
🌐 Sending POST to: http://localhost:8000/api/trips/xxx/add-participant
📥 Response status: 400
```

#### Block 3: Error

```
❌ API Error: {detail: "Either student_id or roll_number is required"}
```

---

### Step 4: Diagnose Based on Logs

#### Scenario A: `student.id` is undefined

**You see:**

```
student.id: undefined
student.id type: undefined
Has student.id?: false
```

**Problem:** Students from database don't have `id` field

**Solution:** Check backend `/students` endpoint returns `id`:

```bash
# In backend terminal, add this temporarily to main.py
# Around line 170 (in get_students endpoint)
print("DEBUG: Students returned:", result.data[:1])  # Print first student
```

Restart backend and check if student has `id` field.

---

#### Scenario B: FormData is empty

**You see:**

```
❌ NOT appending student_id (empty or undefined)
FormData entries:
  (nothing here)
FormData has entries: false
```

**Problem:** Student object doesn't have proper data

**Solution:** Check the `getStudents()` API response format

---

#### Scenario C: FormData has data but backend receives None

**You see:**

```
✅ Appending student_id: some-uuid
FormData entries:
  student_id: some-uuid
FormData has entries: true
```

**BUT backend still shows `None`**

**Problem:** FormData not being sent in request, or FastAPI not parsing it

**Solution:** This is a deeper issue. Try switching to JSON:

Edit `pwa-dashboard/lib/api.ts` line ~398:

```typescript
// REPLACE FormData with JSON
const response = await fetch(`${API_URL}/api/trips/${tripId}/add-participant`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    student_id: studentId,
    roll_number: rollNumber,
  }),
});
```

And update backend endpoint to accept JSON instead of Form data.

---

## 🚀 Quick Workaround (If All Else Fails)

The backend now accepts **EITHER** `student_id` OR `roll_number`. The dialog now sends **BOTH**.

If `student_id` keeps failing, modify the backend to only use `roll_number`:

**backend/main.py** around line 1395:

```python
# Find student - try roll_number first as workaround
if roll_number:
    student_result = supabase_client.table("students").select("*").eq("roll_number", roll_number).execute()
    if student_result.data:
        student = student_result.data[0]
    else:
        raise HTTPException(status_code=404, detail=f"Student with roll number {roll_number} not found")
elif student_id:
    # fallback to student_id
    student_result = supabase_client.table("students").select("*").eq("id", student_id).execute()
    # ... rest of code
```

---

## 📋 What to Share If Still Failing

Please copy-paste **ALL THREE** log blocks from browser console:

1. The `ADD PARTICIPANT - FRONTEND` block
2. The `API CALL - addParticipantToTrip` block
3. The error block

This will show exactly where the data is getting lost!

---

## 🔧 Additional Checks

### Check Network Request

1. F12 → Network tab
2. Filter by "add-participant"
3. Click the failed request
4. Go to "Payload" tab
5. Check if Form Data shows `student_id` and `roll_number`

If Payload is empty → FormData construction is broken
If Payload has data → Backend parsing is broken
