# 🧪 BGV Evidence-Driven System - Testing Guide

## 🎯 QUICK START TESTING

This guide will help you test the new evidence-driven BGV system.

---

## 📋 PRE-REQUISITES

- ✅ Backend server running (`npm run dev` in backend folder)
- ✅ Database connected
- ✅ At least 2 test users (for maker-checker testing)
- ✅ Test applicant with BGV case

---

## 🧪 TEST SCENARIO 1: Evidence Validation

### **Goal**: Verify that system prevents verification without evidence

### Steps:

1. **Create a BGV Case**
   ```bash
   POST /api/bgv/initiate
   {
     "applicationId": "<applicant_id>",
     "package": "STANDARD",
     "slaDays": 7
   }
   ```

2. **Get Case Details**
   ```bash
   GET /api/bgv/case/<case_id>
   ```
   
   **Expected**: Checks created with status `NOT_STARTED`

3. **Try to Start Verification WITHOUT Documents**
   ```bash
   POST /api/bgv/check/<check_id>/start-verification
   {
     "verificationRemarks": "Starting verification"
   }
   ```
   
   **Expected**: ❌ Error 400
   ```json
   {
     "success": false,
     "message": "Cannot start verification: Required evidence is missing",
     "missingDocuments": ["AADHAAR", "PAN"],
     "evidenceCompleteness": 0
   }
   ```

4. **Upload Required Documents**
   ```bash
   POST /api/bgv/case/<case_id>/upload-document
   Form Data:
   - document: <file>
   - documentType: "AADHAAR"
   - checkType: "IDENTITY"
   ```

5. **Check Evidence Status**
   ```bash
   GET /api/bgv/case/<case_id>
   ```
   
   **Expected**: Check now shows:
   ```json
   {
     "evidenceStatus": {
       "hasRequiredEvidence": true,
       "evidenceCompleteness": 100,
       "uploadedDocumentTypes": ["AADHAAR"],
       "missingDocumentTypes": []
     },
     "status": "DOCUMENTS_UPLOADED"
   }
   ```

6. **Try to Start Verification WITH Documents**
   ```bash
   POST /api/bgv/check/<check_id>/start-verification
   {
     "verificationRemarks": "Starting verification"
   }
   ```
   
   **Expected**: ✅ Success 200
   ```json
   {
     "success": true,
     "message": "Verification started successfully",
     "data": { ... }
   }
   ```

---

## 🧪 TEST SCENARIO 2: Maker-Checker Workflow

### **Goal**: Verify that system enforces dual control

### Steps:

1. **Login as User A (Verifier/Maker)**

2. **Start Verification**
   ```bash
   POST /api/bgv/check/<check_id>/start-verification
   {
     "verificationRemarks": "Reviewing evidence"
   }
   ```

3. **Review Documents**
   ```bash
   POST /api/bgv/document/<document_id>/review
   {
     "reviewStatus": "ACCEPTED",
     "reviewRemarks": "Document is clear and valid",
     "qualityScore": 95
   }
   ```

4. **Submit for Approval**
   ```bash
   POST /api/bgv/check/<check_id>/submit-for-approval
   {
     "status": "VERIFIED",
     "remarks": "All evidence verified successfully"
   }
   ```
   
   **Expected**: ✅ Success, status = `PENDING_APPROVAL`

5. **Try to Approve as Same User (User A)**
   ```bash
   POST /api/bgv/check/<check_id>/approve-verification
   {
     "decision": "APPROVED",
     "approvalRemarks": "Approved"
   }
   ```
   
   **Expected**: ❌ Error 403
   ```json
   {
     "success": false,
     "message": "Maker-Checker violation",
     "errors": ["Approver must be different from verifier (Maker-Checker violation)"]
   }
   ```

6. **Login as User B (Approver/Checker)**

7. **Approve Verification**
   ```bash
   POST /api/bgv/check/<check_id>/approve-verification
   {
     "decision": "APPROVED",
     "approvalRemarks": "Verification approved after review"
   }
   ```
   
   **Expected**: ✅ Success 200
   ```json
   {
     "success": true,
     "message": "Verification approved successfully",
     "data": {
       "status": "VERIFIED",
       "verificationWorkflow": {
         "verifiedBy": "<user_a_id>",
         "approvedBy": "<user_b_id>",
         "approvalDecision": "APPROVED"
       }
     }
   }
   ```

---

## 🧪 TEST SCENARIO 3: Document Integrity

### **Goal**: Verify that system generates and stores document hashes

### Steps:

1. **Upload a Document**
   ```bash
   POST /api/bgv/case/<case_id>/upload-document
   Form Data:
   - document: <file>
   - documentType: "EXPERIENCE_LETTER"
   - checkType: "EMPLOYMENT"
   ```

2. **Check Database for Hash**
   ```javascript
   // In MongoDB or your database client
   db.bgv_documents.findOne({ _id: "<document_id>" })
   ```
   
   **Expected**: Document has:
   ```json
   {
     "documentHash": "a1b2c3d4e5f6...",
     "hashAlgorithm": "SHA256",
     "hashGeneratedAt": "2026-02-10T12:00:00Z"
   }
   ```

3. **Verify Hash in Timeline**
   ```bash
   GET /api/bgv/case/<case_id>
   ```
   
   **Expected**: Timeline entry shows:
   ```json
   {
     "eventType": "DOCUMENT_UPLOADED",
     "description": "EXPERIENCE_LETTER document uploaded (filename.pdf) [Hash: a1b2c3d4...]",
     "metadata": {
       "documentHash": "a1b2c3d4e5f6..."
     }
   }
   ```

---

## 🧪 TEST SCENARIO 4: Mandatory Remarks

### **Goal**: Verify that system requires remarks for FAILED/DISCREPANCY

### Steps:

1. **Try to Submit FAILED Status Without Remarks**
   ```bash
   POST /api/bgv/check/<check_id>/submit-for-approval
   {
     "status": "FAILED"
     // No remarks field
   }
   ```
   
   **Expected**: ❌ Error 400
   ```json
   {
     "success": false,
     "message": "Remarks are mandatory when marking check as FAILED or DISCREPANCY"
   }
   ```

2. **Submit FAILED Status With Remarks**
   ```bash
   POST /api/bgv/check/<check_id>/submit-for-approval
   {
     "status": "FAILED",
     "remarks": "Employment dates do not match with provided documents"
   }
   ```
   
   **Expected**: ✅ Success 200

---

## 🧪 TEST SCENARIO 5: Evidence Completeness

### **Goal**: Verify that system calculates evidence completeness correctly

### Steps:

1. **Create Employment Check** (Requires: 1 Experience Letter + 2 Payslips)

2. **Upload 1 Document**
   ```bash
   POST /api/bgv/case/<case_id>/upload-document
   - documentType: "EXPERIENCE_LETTER"
   - checkType: "EMPLOYMENT"
   ```

3. **Check Evidence Status**
   ```bash
   GET /api/bgv/case/<case_id>
   ```
   
   **Expected**:
   ```json
   {
     "evidenceStatus": {
       "hasRequiredEvidence": false,
       "evidenceCompleteness": 50,
       "requiredDocumentTypes": ["EXPERIENCE_LETTER", "PAYSLIP"],
       "uploadedDocumentTypes": ["EXPERIENCE_LETTER"],
       "missingDocumentTypes": ["PAYSLIP"]
     },
     "status": "DOCUMENTS_PENDING"
   }
   ```

4. **Upload 2 Payslips**
   ```bash
   POST /api/bgv/case/<case_id>/upload-document
   - documentType: "PAYSLIP"
   - checkType: "EMPLOYMENT"
   
   (Upload twice)
   ```

5. **Check Evidence Status Again**
   ```bash
   GET /api/bgv/case/<case_id>
   ```
   
   **Expected**:
   ```json
   {
     "evidenceStatus": {
       "hasRequiredEvidence": true,
       "evidenceCompleteness": 100,
       "uploadedDocumentTypes": ["EXPERIENCE_LETTER", "PAYSLIP"],
       "missingDocumentTypes": []
     },
     "status": "DOCUMENTS_UPLOADED"
   }
   ```

---

## 🧪 TEST SCENARIO 6: Overall Case Status

### **Goal**: Verify that overall BGV status is calculated correctly

### Steps:

1. **Create BGV Case with 3 Checks**
   - Identity
   - Employment
   - Education

2. **Verify Identity Check**
   - Upload documents
   - Complete maker-checker workflow
   - Status: `VERIFIED`

3. **Check Overall Status**
   ```bash
   GET /api/bgv/case/<case_id>
   ```
   
   **Expected**: `overallStatus: "IN_PROGRESS"` (not all checks complete)

4. **Verify Employment Check**
   - Status: `VERIFIED`

5. **Fail Education Check**
   - Status: `FAILED`

6. **Check Overall Status**
   ```bash
   GET /api/bgv/case/<case_id>
   ```
   
   **Expected**: `overallStatus: "FAILED"` (any check failed = overall failed)

---

## 🧪 TEST SCENARIO 7: Audit Trail

### **Goal**: Verify that all actions are logged

### Steps:

1. **Perform a Complete Workflow**
   - Upload documents
   - Start verification
   - Review documents
   - Submit for approval
   - Approve verification

2. **Check Timeline**
   ```bash
   GET /api/bgv/case/<case_id>
   ```

3. **Verify Timeline Entries**
   
   **Expected**: Timeline should contain:
   ```json
   [
     {
       "eventType": "DOCUMENT_UPLOADED",
       "performedBy": { "userId": "...", "userName": "..." },
       "timestamp": "...",
       "ipAddress": "...",
       "userAgent": "..."
     },
     {
       "eventType": "VERIFICATION_STARTED",
       "performedBy": { ... },
       "timestamp": "..."
     },
     {
       "eventType": "DOCUMENT_REVIEWED",
       "performedBy": { ... },
       "timestamp": "..."
     },
     {
       "eventType": "SUBMITTED_FOR_APPROVAL",
       "performedBy": { ... },
       "timestamp": "..."
     },
     {
       "eventType": "VERIFICATION_APPROVED",
       "performedBy": { ... },
       "timestamp": "..."
     }
   ]
   ```

4. **Verify Each Entry Has**:
   - ✅ Timestamp
   - ✅ User ID and name
   - ✅ IP address
   - ✅ User agent
   - ✅ Old and new status
   - ✅ Remarks

---

## 📊 VALIDATION CHECKLIST

After testing, verify:

- [ ] ✅ Cannot verify without required documents
- [ ] ✅ Evidence completeness calculated correctly
- [ ] ✅ Missing documents identified
- [ ] ✅ Document hash generated on upload
- [ ] ✅ Maker-checker enforced (different users)
- [ ] ✅ Same-user approval rejected
- [ ] ✅ Remarks mandatory for FAILED/DISCREPANCY
- [ ] ✅ Status flow enforced (no direct jump to VERIFIED)
- [ ] ✅ Overall case status calculated correctly
- [ ] ✅ Complete audit trail with all details
- [ ] ✅ Timeline entries include hashes
- [ ] ✅ Document review status tracked

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue 1: "Required evidence is missing" but documents uploaded
**Solution**: Check that documents are linked to the correct check (`checkType` matches)

### Issue 2: Evidence completeness stuck at 0%
**Solution**: Trigger evidence update manually:
```bash
POST /api/bgv/check/<check_id>/update-evidence-status
```

### Issue 3: Maker-checker not enforcing
**Solution**: Verify users have different IDs, check authentication

### Issue 4: Document hash not generated
**Solution**: Check file path is accessible, verify file system permissions

---

## 📝 TESTING NOTES

### Test Users Needed:
- **User A**: Verifier (Maker) - Role: `hr` or `user`
- **User B**: Approver (Checker) - Role: `admin` or `company_admin`

### Test Documents Needed:
- Identity: Aadhaar or PAN card (PDF/Image)
- Employment: Experience letter + 2 payslips (PDF)
- Education: Degree + Marksheet (PDF)
- Address: Utility bill or rent agreement (PDF)

### Database Access:
- MongoDB connection for verifying hashes
- Check collections: `bgv_cases`, `bgv_checks`, `bgv_documents`, `bgv_timeline`

---

## 🎯 SUCCESS CRITERIA

The system is working correctly if:

1. ✅ **Evidence Enforcement**: Cannot verify without required documents
2. ✅ **Maker-Checker**: Different users required for verify and approve
3. ✅ **Document Integrity**: SHA-256 hash generated and stored
4. ✅ **Audit Trail**: Complete logging with timestamps, IPs, hashes
5. ✅ **Status Flow**: Proper status transitions enforced
6. ✅ **Validation**: Evidence completeness calculated correctly
7. ✅ **Remarks**: Mandatory for FAILED/DISCREPANCY
8. ✅ **Overall Status**: Calculated based on all checks

---

## 🚀 NEXT STEPS AFTER TESTING

Once backend testing is complete:

1. **Review Test Results**
   - Document any issues found
   - Verify all enforcement points work

2. **Proceed to Frontend**
   - Build evidence upload UI
   - Build maker-checker workflow UI
   - Build evidence review panel

3. **Integration Testing**
   - Test complete flow end-to-end
   - Test with real documents
   - Test with multiple users

4. **User Acceptance Testing**
   - Get HR team to test
   - Gather feedback
   - Make adjustments

5. **Production Deployment**
   - Deploy to staging first
   - Run full test suite
   - Deploy to production

---

*Testing Guide Version*: 1.0  
*Created*: 2026-02-10  
*Purpose*: Comprehensive testing guide for BGV evidence-driven system
