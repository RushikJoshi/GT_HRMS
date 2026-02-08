# 🧪 BGV Module - Complete Testing Guide

## 📋 Testing Overview

This guide provides step-by-step instructions to test all features of the BGV module.

---

## 🚀 Pre-Testing Setup

### 1. Verify Services are Running

```bash
# Backend should be running on port 5000
# Frontend should be running on port 3000 (or configured port)
```

### 2. Prepare Test Data

You'll need:
- At least 1 applicant in the system
- HR user credentials
- Candidate user credentials
- Test documents (PDF, JPG, PNG)

---

## 🎯 Test Scenarios

### Scenario 1: Complete BGV Workflow (Happy Path)

#### Step 1: Login as HR
```
1. Navigate to HR login
2. Enter HR credentials
3. Verify successful login
```

#### Step 2: Navigate to BGV Dashboard
```
1. Go to HR → BGV Management
2. Verify dashboard loads
3. Check statistics cards display correctly
4. Verify case list is visible (may be empty initially)
```

**Expected Results**:
- ✅ Dashboard loads without errors
- ✅ Statistics show: Total, Pending, Verified, Failed, Overdue
- ✅ Filters are visible (Search, Status, Package)
- ✅ "Initiate BGV" button is visible

#### Step 3: Initiate BGV
```
1. Click "Initiate BGV" button
2. Modal should open
3. Search for a candidate
4. Select the candidate
5. Choose package: STANDARD
6. Set SLA: 7 days
7. Review summary
8. Click "Initiate BGV"
```

**Expected Results**:
- ✅ Modal opens smoothly
- ✅ Candidate list loads
- ✅ Search works
- ✅ Package selection works
- ✅ SLA presets work
- ✅ Summary shows correct data
- ✅ Success toast appears
- ✅ Modal closes
- ✅ Dashboard refreshes
- ✅ New case appears in list

**API Call**:
```
POST /api/bgv/initiate
{
  "applicationId": "...",
  "package": "STANDARD",
  "slaDays": 7
}
```

#### Step 4: View Case Details
```
1. Click "View" on the newly created case
2. Detail modal should open
3. Navigate through all tabs:
   - Overview
   - Checks
   - Documents
   - Timeline
   - Actions
```

**Expected Results**:
- ✅ Modal opens with case details
- ✅ Overview tab shows candidate info, progress, SLA
- ✅ Checks tab shows all generated checks (5 for STANDARD)
- ✅ Documents tab is empty initially
- ✅ Timeline tab shows "BGV Initiated" event
- ✅ Actions tab shows "Generate Report" and "Close BGV" options

#### Step 5: Logout and Login as Candidate
```
1. Logout from HR account
2. Login as the candidate
3. Navigate to BGV Documents page
```

**Expected Results**:
- ✅ Candidate can access BGV Documents page
- ✅ BGV case information is displayed
- ✅ Upload section is visible
- ✅ Required verifications checklist is shown

#### Step 6: Upload Documents (as Candidate)
```
For each document type:
1. Select document type (e.g., "Aadhaar Card")
2. Drag and drop a test file OR click to browse
3. Wait for upload to complete
4. Verify document appears in list below

Upload at least:
- Aadhaar Card (Identity)
- Degree Certificate (Education)
- Experience Letter (Employment)
```

**Expected Results**:
- ✅ Document type selector works
- ✅ Drag and drop works
- ✅ File upload succeeds
- ✅ Success toast appears
- ✅ Document appears in uploaded list
- ✅ Status shows "PENDING" or "UNDER_REVIEW"
- ✅ Version number is 1
- ✅ File size is displayed

**API Call**:
```
POST /api/bgv/case/:caseId/upload-document
FormData: {
  document: File,
  documentType: "AADHAAR",
  checkType: "IDENTITY"
}
```

#### Step 7: Logout and Login as HR
```
1. Logout from candidate account
2. Login as HR
3. Navigate to BGV Dashboard
4. Click "View" on the case
```

**Expected Results**:
- ✅ Case now shows uploaded documents
- ✅ Documents tab shows all uploaded files

#### Step 8: Verify Checks (as HR)
```
For each check:
1. Go to "Checks" tab
2. Click "Update Status" on a check
3. Add remarks (e.g., "Verified via UIDAI API")
4. Click "Verify" button
5. Wait for success confirmation
6. Repeat for all checks
```

**Expected Results**:
- ✅ Update Status button works
- ✅ Remarks textarea appears
- ✅ Verify/Fail/Discrepancy buttons are visible
- ✅ Success toast appears after verification
- ✅ Check status updates to "VERIFIED"
- ✅ Overall case status updates
- ✅ Progress bar updates

**API Call**:
```
POST /api/bgv/check/:checkId/verify
{
  "status": "VERIFIED",
  "internalRemarks": "Verified via UIDAI API",
  "verificationMethod": "MANUAL"
}
```

#### Step 9: Check Timeline
```
1. Go to "Timeline" tab
2. Verify all events are logged
```

**Expected Results**:
- ✅ Timeline shows all events in chronological order
- ✅ Events include: BGV Initiated, Documents Uploaded, Checks Verified
- ✅ Each event shows timestamp, user, and description

#### Step 10: Generate Report
```
1. Go to "Actions" tab
2. Click "Generate Report" button
3. Wait for confirmation
```

**Expected Results**:
- ✅ Success toast appears
- ✅ Report is generated (check backend logs)

**API Call**:
```
POST /api/bgv/case/:id/generate-report
```

#### Step 11: Close BGV
```
1. Still in "Actions" tab
2. Select decision: "APPROVED"
3. Add remarks: "All checks verified. Candidate approved."
4. Click "Close BGV Case"
5. Wait for confirmation
```

**Expected Results**:
- ✅ Decision radio buttons work
- ✅ Remarks textarea works
- ✅ Success toast appears
- ✅ Case status updates to "CLOSED"
- ✅ Case is marked as immutable
- ✅ Actions tab shows "Case Closed" message
- ✅ No further edits allowed

**API Call**:
```
POST /api/bgv/case/:id/close
{
  "decision": "APPROVED",
  "remarks": "All checks verified. Candidate approved."
}
```

#### Step 12: Verify Immutability
```
1. Try to verify a check again
2. Try to upload a document as candidate
3. Try to close the case again
```

**Expected Results**:
- ✅ All actions are disabled
- ✅ Appropriate messages are shown
- ✅ API returns error if attempted

---

### Scenario 2: BGV with Failed Check

#### Steps:
```
1. Initiate BGV (same as Scenario 1)
2. Upload documents as candidate
3. As HR, verify some checks as "VERIFIED"
4. Verify one check as "FAILED"
5. Observe overall status changes to "FAILED"
6. Close BGV with decision "REJECTED"
```

**Expected Results**:
- ✅ Failed check updates overall status to "FAILED"
- ✅ Progress bar reflects failed check
- ✅ Statistics update
- ✅ Case can be closed with "REJECTED" decision

---

### Scenario 3: BGV with Discrepancy

#### Steps:
```
1. Initiate BGV
2. Upload documents as candidate
3. As HR, verify some checks as "VERIFIED"
4. Verify one check as "DISCREPANCY" with remarks
5. Observe overall status
6. Close BGV with decision "RECHECK_REQUIRED"
```

**Expected Results**:
- ✅ Discrepancy check is marked correctly
- ✅ Overall status shows "VERIFIED_WITH_DISCREPANCIES"
- ✅ Remarks are visible
- ✅ Case can be closed with "RECHECK_REQUIRED"

---

### Scenario 4: Search and Filters

#### Steps:
```
1. Create multiple BGV cases with different statuses
2. Test search by case ID
3. Test search by candidate name
4. Test status filter
5. Test package filter
6. Test pagination (if > 20 cases)
```

**Expected Results**:
- ✅ Search filters cases correctly
- ✅ Status filter works
- ✅ Package filter works
- ✅ Filters can be combined
- ✅ Pagination works
- ✅ Results update in real-time

---

### Scenario 5: SLA Tracking

#### Steps:
```
1. Create a BGV case with SLA of 1 day
2. Wait for SLA to expire (or manually adjust date in DB)
3. Refresh dashboard
4. Check if case is marked as overdue
```

**Expected Results**:
- ✅ Overdue cases are highlighted
- ✅ Overdue count in statistics is correct
- ✅ SLA status shows "Overdue" with warning icon

---

### Scenario 6: Document Versioning

#### Steps:
```
1. Upload a document as candidate
2. Upload the same document type again
3. Verify version number increments
4. Check both versions are preserved
```

**Expected Results**:
- ✅ Version number increments to 2
- ✅ Both versions are visible
- ✅ Latest version is used for verification

---

### Scenario 7: Package Comparison

#### Test all three packages:

**BASIC Package**:
```
1. Initiate BGV with BASIC package
2. Verify 3 checks are generated:
   - Identity
   - Address
   - Employment
```

**STANDARD Package**:
```
1. Initiate BGV with STANDARD package
2. Verify 5 checks are generated:
   - Identity
   - Address
   - Employment
   - Education
   - Criminal
```

**PREMIUM Package**:
```
1. Initiate BGV with PREMIUM package
2. Verify 7 checks are generated:
   - Identity
   - Address
   - Employment
   - Education
   - Criminal
   - Social Media
   - Reference
```

**Expected Results**:
- ✅ Correct number of checks for each package
- ✅ Correct check types for each package

---

### Scenario 8: Error Handling

#### Test error scenarios:

**1. Upload Invalid File**:
```
1. Try to upload a file > 10MB
2. Try to upload unsupported format (.exe, .zip)
```
**Expected**: Error message, upload fails

**2. Initiate BGV without Selecting Candidate**:
```
1. Open Initiate BGV modal
2. Click submit without selecting candidate
```
**Expected**: Validation error

**3. Close BGV without Decision**:
```
1. Open Actions tab
2. Try to close without selecting decision
```
**Expected**: Validation error

**4. Access Closed Case**:
```
1. Try to modify a closed case
```
**Expected**: Immutability error

---

### Scenario 9: Responsive Design

#### Test on different screen sizes:

**Desktop (> 1024px)**:
```
1. Verify all elements are visible
2. Check grid layouts
3. Verify modals are centered
```

**Tablet (768px - 1024px)**:
```
1. Verify columns stack appropriately
2. Check table responsiveness
3. Verify modals fit screen
```

**Mobile (< 768px)**:
```
1. Verify single column layout
2. Check touch targets are large enough
3. Verify modals are scrollable
```

**Expected Results**:
- ✅ All layouts are responsive
- ✅ No horizontal scrolling
- ✅ All elements are accessible

---

### Scenario 10: Accessibility

#### Test keyboard navigation:
```
1. Navigate using Tab key
2. Activate buttons using Enter/Space
3. Close modals using Escape
```

#### Test screen reader:
```
1. Enable screen reader
2. Navigate through dashboard
3. Verify all elements are announced
```

**Expected Results**:
- ✅ All interactive elements are keyboard accessible
- ✅ Focus indicators are visible
- ✅ Screen reader announces all elements
- ✅ ARIA labels are present

---

## 📊 API Testing with Postman

### 1. Get Statistics
```
GET http://localhost:5000/api/bgv/stats
Headers:
  Authorization: Bearer <HR_TOKEN>
```

### 2. Initiate BGV
```
POST http://localhost:5000/api/bgv/initiate
Headers:
  Authorization: Bearer <HR_TOKEN>
  Content-Type: application/json
Body:
{
  "applicationId": "64abc123...",
  "package": "STANDARD",
  "slaDays": 7
}
```

### 3. Get All Cases
```
GET http://localhost:5000/api/bgv/cases?page=1&limit=20&status=PENDING
Headers:
  Authorization: Bearer <HR_TOKEN>
```

### 4. Get Case Details
```
GET http://localhost:5000/api/bgv/case/:id
Headers:
  Authorization: Bearer <HR_TOKEN>
```

### 5. Upload Document
```
POST http://localhost:5000/api/bgv/case/:caseId/upload-document
Headers:
  Authorization: Bearer <CANDIDATE_TOKEN>
  Content-Type: multipart/form-data
Body:
  document: <FILE>
  documentType: AADHAAR
  checkType: IDENTITY
```

### 6. Verify Check
```
POST http://localhost:5000/api/bgv/check/:checkId/verify
Headers:
  Authorization: Bearer <HR_TOKEN>
  Content-Type: application/json
Body:
{
  "status": "VERIFIED",
  "internalRemarks": "Verified successfully",
  "verificationMethod": "MANUAL"
}
```

### 7. Close BGV
```
POST http://localhost:5000/api/bgv/case/:id/close
Headers:
  Authorization: Bearer <HR_TOKEN>
  Content-Type: application/json
Body:
{
  "decision": "APPROVED",
  "remarks": "All checks verified"
}
```

### 8. Get Candidate BGV Status
```
GET http://localhost:5000/api/bgv/candidate/:candidateId
Headers:
  Authorization: Bearer <CANDIDATE_TOKEN>
```

### 9. Generate Report
```
POST http://localhost:5000/api/bgv/case/:id/generate-report
Headers:
  Authorization: Bearer <HR_TOKEN>
```

---

## ✅ Testing Checklist

### Backend API Testing
- [ ] GET /api/bgv/stats returns correct data
- [ ] POST /api/bgv/initiate creates case
- [ ] GET /api/bgv/cases returns paginated list
- [ ] GET /api/bgv/case/:id returns case details
- [ ] POST /api/bgv/check/:checkId/verify updates check
- [ ] POST /api/bgv/case/:caseId/upload-document uploads file
- [ ] POST /api/bgv/case/:id/close closes case
- [ ] GET /api/bgv/candidate/:candidateId returns status
- [ ] POST /api/bgv/case/:id/generate-report generates report
- [ ] RBAC is enforced on all endpoints
- [ ] Validation errors are returned correctly
- [ ] Success responses are formatted correctly

### Frontend Component Testing
- [ ] BGV Dashboard loads without errors
- [ ] Statistics cards display correctly
- [ ] Search works
- [ ] Filters work
- [ ] Pagination works
- [ ] Initiate BGV modal opens
- [ ] Candidate selection works
- [ ] Package selection works
- [ ] SLA configuration works
- [ ] BGV Detail modal opens
- [ ] All tabs load correctly
- [ ] Check verification works
- [ ] Document upload works
- [ ] Timeline displays events
- [ ] Close BGV workflow works
- [ ] Report generation works

### UI/UX Testing
- [ ] All buttons have hover effects
- [ ] All inputs have focus states
- [ ] Loading states are shown
- [ ] Success toasts appear
- [ ] Error toasts appear
- [ ] Modals are centered
- [ ] Modals can be closed
- [ ] Forms validate correctly
- [ ] Responsive design works
- [ ] Accessibility features work

### Integration Testing
- [ ] End-to-end workflow completes successfully
- [ ] Data persists correctly
- [ ] Real-time updates work
- [ ] File uploads work
- [ ] Timeline updates correctly
- [ ] Statistics update correctly
- [ ] Immutability is enforced
- [ ] SLA tracking works

---

## 🐛 Bug Reporting Template

If you find a bug, use this template:

```
**Bug Title**: [Brief description]

**Severity**: Critical / High / Medium / Low

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

**Environment**:
- Browser: [e.g., Chrome 90]
- OS: [e.g., Windows 10]
- Screen Size: [e.g., 1920x1080]

**Console Errors**:
[Copy any console errors]

**Network Errors**:
[Copy any network errors from Network tab]
```

---

## 📈 Performance Testing

### Metrics to Track
- [ ] Dashboard load time < 2s
- [ ] Modal open time < 500ms
- [ ] API response time < 1s
- [ ] File upload time (depends on size)
- [ ] Search response time < 500ms
- [ ] Filter response time < 500ms

### Tools
- Chrome DevTools Performance tab
- Network tab for API calls
- Lighthouse for overall performance

---

## ✅ Final Testing Sign-off

### Tested By: _______________
### Date: _______________
### Status: _______________

### Summary:
- Total Tests: ___
- Passed: ___
- Failed: ___
- Blocked: ___

### Notes:
[Any additional notes or observations]

---

**Happy Testing! 🧪**
