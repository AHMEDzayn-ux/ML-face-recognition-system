# Quick Import Fix

## ✅ Fixed: UserPlus is not defined

**Error:**

```
UserPlus is not defined
```

**Cause:**
Missing `UserPlus` icon import from `lucide-react` in the trip dashboard page.

**Fix:**
Added two missing imports to `app/trips/[id]/page.tsx`:

```typescript
import AddParticipantsDialog from "@/components/AddParticipantsDialog";
import {
  // ... other icons
  UserPlus, // ✅ Added this
} from "lucide-react";
```

**Status:**
✅ Fixed! Just refresh your browser.

The "Add Participants" button will now work correctly.
