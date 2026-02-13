# BGV Enterprise System - API Testing Guide

## 🧪 Complete API Testing Checklist

### Prerequisites
- Backend server running on `http://localhost:5000`
- Valid JWT token from login
- At least one BGV case created

---

## 1️⃣ CONSENT MANAGEMENT TESTS

### Test 1.1: Capture Digital Consent
```http
POST http://localhost:5000/api/bgv/case/{caseId}/consent
Content-Type: application/json
Authorization: Bearer {token}

{
  "consentGiven": true,
  "signatureType": "TYPED_NAME",
  "signatureData": "John Doe",
  "scopeAgreed": [
    {
      "checkType": "IDENTITY",
      "agreedAt": "2026-02-11T14:30:00Z"
    },
    {
      "checkType": "EMPLOYMENT",
      "agreedAt": "2026-02-11T14:30:00Z"
    }
  ],
  "location": {
    "city": "Mumbai",
    "country": "India"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Consent captured successfully",
  "data": {
    "consentId": "...",
    "consentGiven": true,
    "consentTimestamp": "2026-02-11T14:30:00Z"
  }
}
```

### Test 1.2: Get Consent Details
```http
GET http://localhost:5000/api/bgv/case/{caseId}/consent
Authorization: Bearer {token}
```

### Test 1.3: Validate Consent
```http
GET http://localhost:5000/api/bgv/case/{caseId}/consent/validate
Authorization: Bearer {token}
```

### Test 1.4: Withdraw Consent
```http
POST http://localhost:5000/api/bgv/case/{caseId}/consent/withdraw
Content-Type: application/json
Authorization: Bearer {token}

{
  "withdrawalReason": "Candidate requested withdrawal"
}
```

---

## 2️⃣ RISK SCORING TESTS

### Test 2.1: Get Available Discrepancy Types
```http
GET http://localhost:5000/api/bgv/discrepancy-types
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "MINOR_DATE_MISMATCH",
      "points": 5,
      "severity": "LOW"
    },
    {
      "type": "FAKE_EMPLOYER",
      "points": 50,
      "severity": "CRITICAL"
    }
    // ... more types
  ]
}
```

### Test 2.2: Add Discrepancy to Check
```http
POST http://localhost:5000/api/bgv/check/{checkId}/add-discrepancy
Content-Type: application/json
Authorization: Bearer {token}

{
  "type": "SALARY_MISMATCH_MINOR",
  "description": "Candidate claimed 50,000 but payslip shows 45,000"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Discrepancy added successfully",
  "data": {
    "discrepancyType": "SALARY_MISMATCH_MINOR",
    "points": 10,
    "totalRiskScore": 10,
    "riskLevel": "LOW_RISK"
  }
}
```

### Test 2.3: Add Red Flag
```http
POST http://localhost:5000/api/bgv/case/{caseId}/add-red-flag
Content-Type: application/json
Authorization: Bearer {token}

{
  "category": "Employment Verification",
  "description": "Employer does not exist at claimed address",
  "type": "FAKE_EMPLOYER",
  "source": "EMPLOYMENT"
}
```

### Test 2.4: Add Green Flag
```http
POST http://localhost:5000/api/bgv/case/{caseId}/add-green-flag
Content-Type: application/json
Authorization: Bearer {token}

{
  "category": "Education Verification",
  "description": "University confirmed degree authenticity",
  "source": "EDUCATION"
}
```

### Test 2.5: Get Risk Score
```http
GET http://localhost:5000/api/bgv/case/{caseId}/risk-score
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "riskScore": {
      "totalRiskScore": 25,
      "riskLevel": "MODERATE_RISK",
      "checkRisks": [...],
      "redFlags": [...],
      "greenFlags": [...]
    },
    "assessment": {
      "totalRiskScore": 25,
      "riskLevel": "MODERATE_RISK",
      "totalDiscrepancies": 3,
      "criticalIssuesCount": 0,
      "recommendation": "APPROVE_WITH_CONDITIONS"
    }
  }
}
```

### Test 2.6: Get Risk Assessment
```http
GET http://localhost:5000/api/bgv/case/{caseId}/risk-assessment
Authorization: Bearer {token}
```

### Test 2.7: Get Risk Dashboard
```http
GET http://localhost:5000/api/bgv/risk-dashboard
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "CLEAR": 5,
      "LOW_RISK": 3,
      "MODERATE_RISK": 2,
      "HIGH_RISK": 1,
      "CRITICAL": 0
    },
    "totalCases": 11,
    "highRiskCases": [
      {
        "caseId": "BGV-2026-00001",
        "riskLevel": "HIGH_RISK",
        "totalRiskScore": 45,
        "redFlagsCount": 2
      }
    ],
    "averageRiskScore": 12.5
  }
}
```

---

## 3️⃣ TASK MANAGEMENT TESTS

### Test 3.1: Assign Task to User
```http
POST http://localhost:5000/api/bgv/check/{checkId}/assign-task
Content-Type: application/json
Authorization: Bearer {token}

{
  "taskType": "VERIFICATION",
  "assignToUserId": "user_id_here",
  "userType": "VERIFIER",
  "priority": "HIGH",
  "instructions": "Verify employment details with previous employer",
  "slaDays": 3
}
```

### Test 3.2: Get My Tasks
```http
GET http://localhost:5000/api/bgv/tasks/my-tasks
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "_id": "...",
        "taskType": "VERIFICATION",
        "taskStatus": "ASSIGNED",
        "priority": "HIGH",
        "caseId": {...},
        "checkId": {...},
        "sla": {
          "expectedCompletionDate": "2026-02-14T14:30:00Z",
          "isOverdue": false
        }
      }
    ],
    "totalTasks": 5,
    "overdueTasks": 1
  }
}
```

### Test 3.3: Complete Task (as Maker)
```http
POST http://localhost:5000/api/bgv/task/{taskId}/complete
Content-Type: application/json
Authorization: Bearer {maker_token}

{
  "remarks": "Employment verified. All details match.",
  "checklistItems": [
    {
      "item": "Contacted employer",
      "isCompleted": true,
      "completedAt": "2026-02-11T14:30:00Z"
    },
    {
      "item": "Verified employment dates",
      "isCompleted": true,
      "completedAt": "2026-02-11T14:35:00Z"
    }
  ]
}
```

### Test 3.4: Approve Task (as Checker - DIFFERENT USER)
```http
POST http://localhost:5000/api/bgv/task/{taskId}/approve
Content-Type: application/json
Authorization: Bearer {checker_token}

{
  "decision": "APPROVED",
  "remarks": "Verification looks good. Approved."
}
```

**⚠️ IMPORTANT:** Use a different user token than the one who completed the task!

### Test 3.5: Test Self-Approval Prevention
```http
POST http://localhost:5000/api/bgv/task/{taskId}/approve
Content-Type: application/json
Authorization: Bearer {maker_token}

{
  "decision": "APPROVED",
  "remarks": "Trying to approve my own task"
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Self-approval is not allowed. Maker and Checker must be different users."
}
```

### Test 3.6: Escalate Task
```http
POST http://localhost:5000/api/bgv/task/{taskId}/escalate
Content-Type: application/json
Authorization: Bearer {token}

{
  "escalationReason": "Unable to contact employer after 3 attempts",
  "escalateTo": "senior_verifier_id"
}
```

### Test 3.7: Get Case Tasks
```http
GET http://localhost:5000/api/bgv/case/{caseId}/tasks
Authorization: Bearer {token}
```

---

## 4️⃣ STATUS VALIDATION TESTS

### Test 4.1: Try to Verify Without Evidence
```http
POST http://localhost:5000/api/bgv/check/{checkId}/verify
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "VERIFIED",
  "internalRemarks": "Trying to verify without uploading documents"
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Cannot change status to VERIFIED: Evidence is required. Please upload supporting documents before verification.",
  "error": "STATUS_VALIDATION_FAILED"
}
```

### Test 4.2: Try Invalid Status Transition
```http
POST http://localhost:5000/api/bgv/check/{checkId}/verify
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "VERIFIED",
  "internalRemarks": "Trying to jump from NOT_STARTED to VERIFIED"
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid status transition: Cannot change from NOT_STARTED to VERIFIED. Allowed transitions: ASSIGNED, DOCUMENTS_PENDING",
  "error": "STATUS_VALIDATION_FAILED"
}
```

### Test 4.3: Try to Close Case with Incomplete Checks
```http
POST http://localhost:5000/api/bgv/case/{caseId}/close
Content-Type: application/json
Authorization: Bearer {token}

{
  "finalStatus": "CLEAR",
  "closureRemarks": "Trying to close with incomplete checks"
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Cannot close BGV case: 3 check(s) are still incomplete. All checks must be VERIFIED or FAILED before closing the case.",
  "error": "CASE_CLOSURE_VALIDATION_FAILED"
}
```

---

## 5️⃣ INTEGRATION TESTS

### Test 5.1: Complete BGV Flow
1. Initiate BGV → Risk score auto-created
2. Capture consent → Consent recorded
3. Upload document → Evidence added
4. Assign task → Task created
5. Complete task (Maker) → Task completed
6. Approve task (Checker) → Check verified
7. Add discrepancy → Risk score updated
8. Close case → All validations pass

### Test 5.2: Risk Score Auto-Initialization
```http
POST http://localhost:5000/api/bgv/initiate
Content-Type: application/json
Authorization: Bearer {token}

{
  "employeeId": "employee_id_here",
  "selectedPackage": "PREMIUM",
  "slaDays": 7
}
```

Then immediately check:
```http
GET http://localhost:5000/api/bgv/case/{new_case_id}/risk-score
Authorization: Bearer {token}
```

**Expected:** Risk score should exist with 0 points, CLEAR level

---

## 🎯 Success Criteria

### ✅ All Tests Should Pass:
- [ ] Consent captured successfully
- [ ] Risk score calculated correctly
- [ ] Discrepancies add points
- [ ] Risk level changes based on score
- [ ] Tasks assigned successfully
- [ ] Maker-checker workflow enforced
- [ ] Self-approval blocked
- [ ] Status validation prevents illegal transitions
- [ ] Evidence requirement enforced
- [ ] Case closure validates all checks

### ⚠️ Expected Failures (These are GOOD):
- [ ] Self-approval attempt → Blocked
- [ ] Verify without evidence → Blocked
- [ ] Invalid status transition → Blocked
- [ ] Close incomplete case → Blocked

---

## 📊 Testing Metrics

**Total Endpoints to Test:** 18
**Critical Validations:** 4
**Expected Failures:** 4
**Integration Flows:** 2

---

## 🔧 Troubleshooting

### Issue: "Model not found"
**Solution:** Restart backend server to load new models

### Issue: "Self-approval not blocked"
**Solution:** Ensure you're using different user tokens for maker and checker

### Issue: "Risk score not initialized"
**Solution:** Check backend logs for `[BGV_RISK_INITIALIZED]`

### Issue: "Status validation not working"
**Solution:** Verify middleware is applied to routes

---

## 📝 Test Results Template

```
Test Date: ___________
Tester: ___________

Consent Management:
[ ] Capture Consent - PASS/FAIL
[ ] Get Consent - PASS/FAIL
[ ] Validate Consent - PASS/FAIL
[ ] Withdraw Consent - PASS/FAIL

Risk Scoring:
[ ] Get Discrepancy Types - PASS/FAIL
[ ] Add Discrepancy - PASS/FAIL
[ ] Add Red Flag - PASS/FAIL
[ ] Add Green Flag - PASS/FAIL
[ ] Get Risk Score - PASS/FAIL
[ ] Get Risk Dashboard - PASS/FAIL

Task Management:
[ ] Assign Task - PASS/FAIL
[ ] Get My Tasks - PASS/FAIL
[ ] Complete Task - PASS/FAIL
[ ] Approve Task - PASS/FAIL
[ ] Self-Approval Blocked - PASS/FAIL
[ ] Escalate Task - PASS/FAIL

Status Validation:
[ ] Verify Without Evidence Blocked - PASS/FAIL
[ ] Invalid Transition Blocked - PASS/FAIL
[ ] Close Incomplete Case Blocked - PASS/FAIL

Overall Status: PASS/FAIL
Notes: ___________
```

---

**Last Updated:** 2026-02-11
**Version:** 1.0
**Status:** Ready for Testing
