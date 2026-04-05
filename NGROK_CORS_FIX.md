# Ngrok CORS Fix - Trips Not Loading Issue

## Problem

Trips were successfully saved to Supabase but were not displaying on the trips page in the PWA dashboard deployed on Vercel.

### Error Messages

```
Access to fetch at 'https://unchastisable-winnifred-deadlier.ngrok-free.dev/api/trips'
from origin 'https://ml-face-recognition-system.vercel.app' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.

Error loading trips: SyntaxError: Unexpected token 'O', "Offline" is not valid JSON
```

## Root Cause

**Ngrok's free tier requires a special header** (`ngrok-skip-browser-warning`) to bypass their browser warning page. Without this header:

- Ngrok returns an HTML warning page instead of forwarding the request to your backend
- This HTML page contains the text "Offline" which the frontend tries to parse as JSON
- The CORS error occurs because the HTML response doesn't include proper CORS headers

## Solution

Added the `ngrok-skip-browser-warning: true` header to all API fetch requests in the PWA dashboard.

### Changes Made

**File: `pwa-dashboard/lib/api.ts`**

1. Added helper function:

```typescript
function getHeaders(): HeadersInit {
  return {
    "ngrok-skip-browser-warning": "true",
  };
}
```

2. Updated all GET requests to include the header:
   - `getStudents()`
   - `getTodayAttendance()`
   - `getAllAttendance()`
   - `getTrips()`
   - `getTrip()`
   - `getTripParticipants()`
   - `getRebuildStatus()`

### Example

```typescript
// Before
const response = await fetch(`${API_URL}/api/trips`);

// After
const response = await fetch(`${API_URL}/api/trips`, {
  headers: getHeaders(),
});
```

## Testing

After deploying these changes to Vercel:

1. Visit your PWA dashboard at https://ml-face-recognition-system.vercel.app
2. Navigate to the Trips page
3. Trips should now load successfully from the ngrok backend

## Why This Works

The `ngrok-skip-browser-warning` header tells ngrok to bypass their browser warning page and forward the request directly to your backend API. This allows:

- Proper CORS headers from your FastAPI backend to be received
- Valid JSON responses instead of HTML warning pages
- Trips and other data to load correctly

## Note

This issue only affects ngrok's free tier. If you upgrade to a paid plan or deploy the backend to a permanent hosting solution, this header won't be necessary (though it won't cause any issues if left in place).
