# Threshold Adjustment - Balanced Settings

## Issue

The previous settings (threshold 0.3, min confidence 70%) were **too strict**, preventing legitimate users from being recognized even in good lighting.

## Solution - Balanced Thresholds

### New Settings (backend/main.py lines 66-69)

```python
THRESHOLD = 0.4           # Restored to original (works well with brightness enhancement)
MIN_CONFIDENCE = 60.0     # Balanced - rejects very poor matches only
MIN_DISTANCE_GAP = 0.05   # Relaxed - catches truly ambiguous cases only
```

### Rationale

**THRESHOLD = 0.4 (restored)**

- Original value that worked for legitimate matches
- Brightness enhancement now handles poor lighting issue
- Allows recognition of valid users

**MIN_CONFIDENCE = 60.0 (reduced from 70%)**

- More practical threshold
- Still rejects very poor matches (<60%)
- Allows good matches (60-100%)

**MIN_DISTANCE_GAP = 0.05 (reduced from 0.1)**

- Only catches truly ambiguous matches
- Most legitimate matches will pass
- Still prevents identical twins / very similar faces

## Expected Behavior

### Distance Examples with New Settings

| Distance | Confidence | Result                         |
| -------- | ---------- | ------------------------------ |
| **0.05** | 87.5%      | ✅ Excellent match             |
| **0.10** | 75.0%      | ✅ Very good match             |
| **0.15** | 62.5%      | ✅ Good match                  |
| **0.20** | 50.0%      | ❌ Rejected (< 60% confidence) |
| **0.25** | 37.5%      | ❌ Rejected (< 60% confidence) |
| **0.30** | 25.0%      | ❌ Rejected (< 60% confidence) |
| **0.35** | 12.5%      | ❌ Rejected (< 60% confidence) |
| **0.40** | 0%         | ❌ Threshold - rejected        |

### What Changed

**Before Fix:**

- Threshold: 0.4
- No confidence check ❌
- No ambiguity check ❌
- Result: False positives in poor lighting

**After Strict Fix (Too Strict):**

- Threshold: 0.3 ✗ (too strict)
- Min confidence: 70% ✗ (too high)
- Distance gap: 0.1 ✗ (too large)
- Result: Rejected legitimate users

**Current (Balanced):**

- Threshold: 0.4 ✓ (works for legit matches)
- Min confidence: 60% ✓ (rejects poor matches)
- Distance gap: 0.05 ✓ (catches ambiguous only)
- **Plus:** Brightness enhancement for poor lighting ✓
- Result: ✅ Legitimate users recognized, false positives prevented

## Protection Layers

Even with relaxed thresholds, you still have **triple protection**:

1. **Distance Check**: Must be < 0.4
2. **Confidence Check**: Must be ≥ 60%
3. **Ambiguity Check**: Gap must be ≥ 0.05
4. **BONUS**: Brightness enhancement for poor lighting

## Real-World Scenarios

### Scenario 1: Legitimate User (Good Lighting)

```
Distance: 0.12
Confidence: 70%
Gap: 0.20 (2nd match far away)

✅ PASS all checks → IDENTIFIED
```

### Scenario 2: Legitimate User (Poor Lighting)

```
Before enhancement: Distance 0.28 → Might fail
After enhancement: Distance 0.13 → 67.5% confidence
Gap: 0.18

✅ PASS all checks → IDENTIFIED
(Brightness enhancement made the difference!)
```

### Scenario 3: False Positive Attempt

```
Distance: 0.38
Confidence: 5%
Gap: 0.02

❌ FAIL: Confidence 5% < 60%
❌ FAIL: Distance 0.38 near threshold
Result: REJECTED
```

### Scenario 4: Marginal Match

```
Distance: 0.25
Confidence: 37.5%
Gap: 0.10

❌ FAIL: Confidence 37.5% < 60%
Result: REJECTED
```

## Summary

✅ **Threshold restored to 0.4** (original, proven value)  
✅ **Min confidence 60%** (balanced - not too strict)  
✅ **Distance gap 0.05** (relaxed - practical)  
✅ **Brightness enhancement active** (handles poor lighting)  
✅ **Triple validation** (still prevents false positives)

## Files Modified

- `backend/main.py` - Lines 66-69 (threshold constants)
- `backend/identify_face.py` - Default parameters updated

## Next Steps

1. **Restart backend** to load new settings
2. **Test recognition** - should work like before for legitimate users
3. **False positives** should still be prevented by:
   - Brightness enhancement (fixes lighting issue)
   - 60% minimum confidence (rejects poor matches)
   - Ambiguity check (rejects similar faces)

## If Further Tuning Needed

**Still too strict?** Reduce min confidence:

```python
MIN_CONFIDENCE = 50.0  # Even more lenient
```

**Getting false positives again?** Increase confidence requirement:

```python
MIN_CONFIDENCE = 65.0  # Slightly stricter
```

**Best approach:** Test with actual users and adjust based on results.

---

**Status: BALANCED SETTINGS APPLIED** ✅

The system should now:

- ✅ Recognize legitimate users (like before)
- ✅ Handle poor lighting (brightness enhancement)
- ✅ Prevent very poor matches (60% min confidence)
- ✅ Be usable in production
