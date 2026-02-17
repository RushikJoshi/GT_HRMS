# 🧪 Integration Testing Guide

## Quick Test Steps

### ✅ Test 1: Dashboard Loads Correctly

1. Go to `localhost:5176/hr/letters`
2. Verify you see:
   - "DOCUMENT MANAGEMENT" heading
   - 4 stat cards (Total Issued, Pending, Sent, Viewed)
   - "Recent Letters" table
   - If no letters show: "No letters issued yet."

**Expected Result**: ✅ Dashboard displays with all elements

---

### ✅ Test 2: Create Sample Letter

1. Click blue "ISSUE NEW LETTER" button
2. Fill in form to create a sample letter
3. Submit
4. Return to dashboard
5. Verify letter appears in table

**Expected Result**: ✅ Letter appears in recent letters table

---

### ✅ Test 3: Manage Button Appears

1. Hover over any letter row
2. Look for 3 action buttons on the right:
   - 🚀 History icon (NEW - Manage)
   - 👁️ Eye icon (View)
   - ⬇️ Download icon

**Expected Result**: ✅ All 3 buttons appear and are clickable

---

### ✅ Test 4: Open Management Panel

1. Click the 🚀 (History) icon "Manage" button
2. Verify side panel slides in from right
3. Panel should show:
   - Close button (X) in top right
   - "LETTER MANAGEMENT" title
   - Letter details (name, position, salary, etc.)
   - Action buttons

**Expected Result**: ✅ Side panel opens smoothly with all content

---

### ✅ Test 5: Revoke Letter

**Precondition**: You must be logged in as HR/Admin user

1. Open management panel for a letter
2. Click "REVOKE LETTER" button (red)
3. Modal should appear with form
4. Select revocation reason
5. Enter details (optional)
6. Click "CONFIRM"
7. Verify success message appears

**Expected Result**: ✅ Letter status changes to "REVOKED"

---

### ✅ Test 6: Verify Audit Trail Updated

1. In the same panel, scroll down to "AUDIT TRAIL"
2. Verify you see the new revocation entry at the top
3. Entry should show:
   - ⭕ Red circle icon for revoked status
   - Admin name who revoked it
   - Timestamp
   - Revocation reason
   - IP address

**Expected Result**: ✅ Audit trail shows the new action

---

### ✅ Test 7: Dashboard Updates

1. Close the management panel
2. Look at the same letter row in the table
3. Status badge should now show "REVOKED" (red instead of green)

**Expected Result**: ✅ Table updates automatically

---

### ✅ Test 8: View Audit Trail

1. Open management panel again
2. Scroll down to "AUDIT TRAIL" section
3. Verify timeline shows events in reverse chronological order
4. Click filter dropdown (if visible)
5. Try sorting options

**Expected Result**: ✅ Audit trail displays timeline correctly

---

### ✅ Test 9: Close Panel

1. Click the X button in top right
2. OR click outside the panel (on dark background)
3. Panel should slide out smoothly
4. Dashboard should be fully visible

**Expected Result**: ✅ Panel closes and dashboard returns to normal

---

### ✅ Test 10: Reinstate Letter (Super-Admin Only)

**Precondition**: You must be logged in as Super-Admin

1. Open management panel for a revoked letter
2. Look for "REINSTATE LETTER" button (green)
3. Click it
4. Confirm action
5. Verify status changes back to "ACTIVE"

**Expected Result**: ✅ Letter reinstated successfully

---

## Troubleshooting Tests

### Issue: "Manage" button not appearing

**Test**:
```javascript
// Open browser console (F12)
// Try clicking the button area where it should be
// Check console for errors
console.log('Testing manage button')
```

**Fix**: 
- Ensure you're hovering over the row
- Check if CSS loaded correctly
- Clear cache: `Ctrl + Shift + Delete`

---

### Issue: Revoke button not working

**Test**:
```javascript
// Check auth token
console.log(localStorage.getItem('authToken'))

// Check user role
console.log(localStorage.getItem('userRole'))
```

**Fix**:
- Log out and log back in
- Ensure you're logged in as HR/Admin
- Check role is set correctly

---

### Issue: Side panel not appearing

**Test**:
```javascript
// Check if component imported
// Open DevTools → Elements
// Look for panel element
document.querySelector('[class*="panel"]')
```

**Fix**:
- Reload page: `Ctrl + R`
- Clear cache and refresh
- Check browser console for errors

---

### Issue: Audit trail not showing

**Test**:
```javascript
// Check API response
// Network tab → look for /audit-trail request
// Verify status 200 and data returned
```

**Fix**:
- Ensure backend is running
- Check API endpoints are correct
- Verify user has permission to view audit

---

## Comprehensive Test Checklist

### UI Elements
- [ ] Dashboard loads without errors
- [ ] Stats cards display correctly
- [ ] Recent letters table shows data
- [ ] Manage button appears on hover
- [ ] Side panel slides in smoothly
- [ ] Close button works
- [ ] Background click closes panel

### Functionality
- [ ] Revoke letter works
- [ ] Status updates in table
- [ ] Audit trail records action
- [ ] Reinstate button visible (super-admin)
- [ ] Reinstate functionality works (super-admin)
- [ ] Filters work in audit trail
- [ ] Sorting works in audit trail

### Dark Mode
- [ ] Dashboard looks good in dark mode
- [ ] Side panel is readable in dark mode
- [ ] Buttons visible in dark mode
- [ ] Text has good contrast

### Mobile
- [ ] Side panel adapts to mobile width
- [ ] Buttons are touch-friendly
- [ ] Table scrolls horizontally
- [ ] Panel closes on mobile

### Error Handling
- [ ] Network error shows message
- [ ] Permission denied shows message
- [ ] Invalid data shows validation error
- [ ] Success message shows on completion

---

## Performance Test

### Measure Load Time
```javascript
// Open DevTools → Performance
// Record: Start → Click Manage → End
// Should take < 1 second total
```

### Check Network
- Side panel data load: < 500ms
- Audit trail load: < 500ms
- Revoke action: < 1s
- No slow requests

---

## Browser Compatibility Test

Test on:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## Security Test

### Verify Authorization
1. Log in as Employee
2. Try to access "Manage" button → Should not work
3. Log in as HR
4. "Manage" button should work

### Verify Data
1. Open Network tab
2. Click actions
3. Verify API calls include:
   - Bearer token in Authorization header
   - Correct tenant ID
   - Correct user ID

---

## Success Criteria

| Test | Pass | Status |
|------|------|--------|
| Dashboard loads | ✅ | |
| Manage button visible | ✅ | |
| Panel opens | ✅ | |
| Revoke works | ✅ | |
| Audit trail shows | ✅ | |
| Status updates | ✅ | |
| Close panel works | ✅ | |
| Dark mode works | ✅ | |
| Mobile responsive | ✅ | |
| No console errors | ✅ | |

---

## After Tests Pass

✅ **Ready for Production** if:
- All tests pass
- No console errors
- Dashboard responds quickly
- All features work as expected

If any test fails:
1. Check the troubleshooting section
2. Review error messages in console
3. Check backend API is running
4. Verify authentication token is valid

---

**Happy Testing!** 🎉

Report any issues and the system will be adjusted accordingly.
