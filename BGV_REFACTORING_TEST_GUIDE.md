# 🧪 BGV Refactoring - Quick Testing Guide

## 🎯 Test Objective
Verify that the BGV flow is now **package-driven** and works correctly from both entry points.

---

## ✅ Test Scenario 1: Job-Based BGV Initiation

### Prerequisites:
- At least 1 job opening with applicants
- At least 1 applicant in "Selected" or "HR Round" status
- User logged in as HR

### Steps:

1. **Navigate to Job Applicants**
   ```
   Recruitment → Jobs → [Select a Job] → Candidates Tab
   ```

2. **Initiate BGV**
   - Find an applicant in the table
   - Click the "Initiate BGV" button (or action menu)
   - **Expected**: Package-driven modal opens

3. **Verify Modal Content**
   - ✅ Modal title: "Initiate Background Verification"
   - ✅ Read-only section shows:
     - Candidate name
     - Candidate email
     - Job title/position
   - ✅ Package selection cards visible (BASIC, STANDARD, PREMIUM)
   - ✅ Default package: STANDARD (selected)
   - ✅ SLA field shows: 7 days
   - ✅ Included checks are listed (read-only)

4. **Test Package Selection**
   - Click on **BASIC** package
   - **Expected**:
     - BASIC card is highlighted
     - Shows 3 checks: Identity, Address, Employment
     - SLA updates to 5 days
     - Summary shows "BASIC" package
   
   - Click on **PREMIUM** package
   - **Expected**:
     - PREMIUM card is highlighted
     - Shows 7 checks: Identity, Address, Employment, Education, Criminal, Social Media, Reference
     - SLA updates to 10 days
     - Summary shows "PREMIUM" package

5. **Test SLA Configuration**
   - Change SLA to 14 days manually
   - **Expected**: Due date updates
   - Click "7 days" preset button
   - **Expected**: SLA resets to 7 days

6. **Submit BGV**
   - Select **STANDARD** package
   - Keep SLA at 7 days
   - Click "Initiate BGV (STANDARD)" button
   - **Expected**:
     - Button shows loading state: "Initiating..."
     - Success toast appears: "BGV initiated successfully"
     - Modal closes
     - Applicants table refreshes

7. **Verify API Call**
   - Open browser DevTools → Network tab
   - Check the POST request to `/api/bgv/initiate`
   - **Expected Payload**:
     ```json
     {
       "applicationId": "<applicant_id>",
       "package": "STANDARD",
       "slaDays": 7
     }
     ```
   - **Expected Response**: 201 Created
     ```json
     {
       "success": true,
       "message": "BGV initiated successfully",
       "data": {
         "case": { ... },
         "checks": [ ... ],
         "checksCount": 5
       }
     }
     ```

8. **Verify BGV Status**
   - Refresh the applicants page
   - **Expected**: Applicant now shows BGV status (e.g., "IN_PROGRESS")
   - "Initiate BGV" button should be disabled or hidden

---

## ✅ Test Scenario 2: Global BGV Initiation

### Prerequisites:
- User logged in as HR
- At least 1 applicant in the system

### Steps:

1. **Navigate to BGV Management**
   ```
   Sidebar → BGV Management
   ```

2. **Initiate BGV**
   - Click "Initiate BGV" button in dashboard
   - **Expected**: Global BGV modal opens

3. **Select Candidate**
   - Search for a candidate by name or email
   - Select a candidate from the list
   - **Expected**: Candidate is selected

4. **Select Package**
   - Choose **PREMIUM** package
   - **Expected**: 7 checks are listed
   - Set SLA to 10 days

5. **Submit**
   - Click "Initiate BGV"
   - **Expected**:
     - Success toast
     - Modal closes
     - Dashboard refreshes
     - New BGV case appears in the list

6. **Verify API Call**
   - Same as Scenario 1, step 7

---

## ✅ Test Scenario 3: Error Handling

### Test 3.1: Duplicate BGV
1. Initiate BGV for an applicant
2. Try to initiate BGV again for the same applicant
3. **Expected**: Error message: "BGV already initiated for this application"

### Test 3.2: Invalid Package (Backend Test)
1. Use Postman to send:
   ```json
   {
     "applicationId": "...",
     "package": "INVALID",
     "slaDays": 7
   }
   ```
2. **Expected**: 400 Bad Request
   ```json
   {
     "success": false,
     "message": "Valid package (BASIC/STANDARD/PREMIUM) is required"
   }
   ```

### Test 3.3: Missing Package (Backend Test)
1. Use Postman to send:
   ```json
   {
     "applicationId": "...",
     "slaDays": 7
   }
   ```
2. **Expected**: 400 Bad Request
   ```json
   {
     "success": false,
     "message": "Valid package (BASIC/STANDARD/PREMIUM) is required"
   }
   ```

---

## ✅ Test Scenario 4: UI/UX Validation

### Checklist:
- [ ] Modal is centered on screen
- [ ] Modal is responsive (test on mobile, tablet, desktop)
- [ ] Package cards have hover effects
- [ ] Selected package is visually distinct
- [ ] SLA presets work correctly
- [ ] Summary section updates dynamically
- [ ] Cancel button closes modal without action
- [ ] Submit button is disabled during loading
- [ ] Loading spinner appears during submission
- [ ] Toast notifications are clear and visible
- [ ] No console errors
- [ ] No network errors

---

## ✅ Test Scenario 5: Accessibility

### Checklist:
- [ ] Modal can be closed with Escape key
- [ ] Tab navigation works correctly
- [ ] Focus indicators are visible
- [ ] Screen reader announces modal title
- [ ] Screen reader announces selected package
- [ ] All interactive elements are keyboard accessible

---

## ✅ Test Scenario 6: Package Verification

### BASIC Package:
- [ ] Shows 3 checks: Identity, Address, Employment
- [ ] Default SLA: 5 days
- [ ] Recommended for: Entry-level, Interns

### STANDARD Package:
- [ ] Shows 5 checks: Identity, Address, Employment, Education, Criminal
- [ ] Default SLA: 7 days
- [ ] Recommended for: Most positions, Standard hiring

### PREMIUM Package:
- [ ] Shows 7 checks: Identity, Address, Employment, Education, Criminal, Social Media, Reference
- [ ] Default SLA: 10 days
- [ ] Recommended for: Senior positions, Critical roles

---

## ✅ Test Scenario 7: Backend Verification

### Check Auto-Generated Checks:
1. Initiate BGV with STANDARD package
2. Navigate to BGV Management → View Case
3. Go to "Checks" tab
4. **Expected**: 5 checks are created:
   - Identity (NOT_STARTED)
   - Address (NOT_STARTED)
   - Employment (NOT_STARTED)
   - Education (NOT_STARTED)
   - Criminal (NOT_STARTED)

### Check Audit Log:
1. View BGV case details
2. Go to "Timeline" tab
3. **Expected**: Event logged:
   - "BGV Process Initiated"
   - "Background verification initiated with STANDARD package (5 checks)"
   - Timestamp
   - Performed by: [HR User]

---

## 🐛 Known Issues to Watch For

### ❌ Issues That Should NOT Occur:
- ❌ 400 Bad Request errors
- ❌ Manual check selection UI
- ❌ Payload with `checks[]` array
- ❌ Missing job title in job-based flow
- ❌ Ability to select individual checks

### ✅ Expected Behavior:
- ✅ Package-driven selection only
- ✅ System-generated checks
- ✅ Correct API payload
- ✅ No errors

---

## 📊 Test Results Template

| Test Scenario | Status | Notes |
|---------------|--------|-------|
| Job-Based BGV | ⬜ Pass / ⬜ Fail | |
| Global BGV | ⬜ Pass / ⬜ Fail | |
| Error Handling | ⬜ Pass / ⬜ Fail | |
| UI/UX | ⬜ Pass / ⬜ Fail | |
| Accessibility | ⬜ Pass / ⬜ Fail | |
| Package Verification | ⬜ Pass / ⬜ Fail | |
| Backend Verification | ⬜ Pass / ⬜ Fail | |

---

## 🚀 Quick Smoke Test (2 minutes)

1. ✅ Navigate to job applicants
2. ✅ Click "Initiate BGV"
3. ✅ Verify package-driven modal opens
4. ✅ Select STANDARD package
5. ✅ Click submit
6. ✅ Verify success toast
7. ✅ Check Network tab: payload has `package: "STANDARD"`
8. ✅ Check Network tab: response is 201 Created

**If all 8 steps pass, the refactoring is working correctly!**

---

## 📝 Bug Report Template

If you find an issue, use this template:

```
**Bug Title**: [Brief description]

**Severity**: Critical / High / Medium / Low

**Test Scenario**: [Which scenario from this guide]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Screenshots**:
[If applicable]

**Console Errors**:
[Copy any console errors]

**Network Errors**:
[Copy any network errors]

**Browser**: [e.g., Chrome 90]
**OS**: [e.g., Windows 10]
```

---

## ✅ Sign-Off

**Tested By**: _______________  
**Date**: _______________  
**Status**: ⬜ Pass / ⬜ Fail  

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________

---

**Version**: 1.0  
**Date**: 2026-02-06  
**Status**: ✅ Ready for QA
