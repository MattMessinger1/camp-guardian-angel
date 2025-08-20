# UI-Backend Sync Verification Checklist

## For Newbies: Step-by-Step Verification

### 1. **Backend First - Check What's Actually Happening**
- [ ] Open Dev Mode (toggle in top-left)
- [ ] Go to Network tab
- [ ] Refresh the signup page
- [ ] Look for the `discover-session-requirements` request
- [ ] Click on it and check the response - does it contain `medical_info` fields?
- [ ] Expected: Should NOT contain medical fields for "Active" platform

### 2. **Frontend Response Handling - Verify UI Matches Backend**
- [ ] On the signup page, do you see "Medical Conditions" or "Allergies" fields?
- [ ] Do you see a blue notice about HIPAA compliance instead?
- [ ] Expected: Should show compliance notice, NOT medical fields

### 3. **Test Edge Cases**
- [ ] Try refreshing the page multiple times
- [ ] Check Console tab for any errors
- [ ] Verify the form still has other fields (name, email, etc.)

### 4. **Capability Detection**
- [ ] The UI should automatically adapt based on backend response
- [ ] No manual configuration should be needed
- [ ] Fields should appear/disappear based on what backend sends

### 5. **Error Handling Check**
- [ ] If something breaks, does the UI show a helpful message?
- [ ] Does the page still load if the backend is slow?

## Quick Debug Commands
```
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "discover-session"
4. Refresh page
5. Check response data
```

## What Should You See Right Now?
- ✅ Blue compliance notice instead of medical fields
- ✅ Other registration fields still present
- ✅ No console errors
- ✅ Backend response contains `hipaa_avoidance: true`

## If Something's Wrong:
1. Check the edge function logs in Supabase
2. Verify the migration was applied
3. Check browser console for errors
4. Ask me to check the specific issue!