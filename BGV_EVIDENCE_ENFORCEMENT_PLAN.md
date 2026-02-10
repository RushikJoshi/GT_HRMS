# 🔐 BGV Evidence-Driven Enforcement - Implementation Plan

## 🎯 OBJECTIVE
Transform the existing BGV system from a weak, button-click verification into a **strict, evidence-driven, enterprise-grade compliance system**.

---

## 🚨 CRITICAL PROBLEMS IDENTIFIED

### Current Weaknesses:
1. ❌ **No Evidence Validation** - Checks can be marked VERIFIED without any documents
2. ❌ **No Document-Check Binding** - Documents exist but aren't linked to specific checks
3. ❌ **No Mandatory Evidence Rules** - No enforcement of required document types
4. ❌ **No Maker-Checker Workflow** - Single user can both verify and approve
5. ❌ **No Proof-Based Enforcement** - Backend doesn't validate evidence before allowing verification

---

## 🧱 ENTERPRISE BGV PRINCIPLES (NON-NEGOTIABLE)

### Core Rule:
> **A check CANNOT be marked VERIFIED unless its required evidence is validated.**

### Evidence Requirements by Check Type:

| Check Type | Mandatory Evidence | Validation Rules |
|-----------|-------------------|------------------|
| **IDENTITY** | Aadhaar OR PAN | OCR extraction + number match |
| **EMPLOYMENT** | Experience Letter + 2 Payslips | Employer name + date validation |
| **EDUCATION** | Degree + Marksheet | University name + year validation |
| **ADDRESS** | Utility Bill OR Rent Agreement | Address match + date validation |
| **CRIMINAL** | Court Search Result OR Police Verification | API response OR official document |
| **REFERENCE** | Reference Letter + Contact Verification | Contact details + response proof |

---

## 🔄 NEW CHECK STATUS FLOW (STRICT)

```
NOT_STARTED
  ↓
DOCUMENTS_PENDING (waiting for candidate upload)
  ↓
DOCUMENTS_UPLOADED (evidence present, ready for review)
  ↓
UNDER_VERIFICATION (verifier reviewing evidence)
  ↓
PENDING_APPROVAL (maker submitted, awaiting checker)
  ↓
VERIFIED | FAILED | DISCREPANCY (final status)
```

**🚫 Direct jump to VERIFIED is FORBIDDEN**

---

## 🔐 IMPLEMENTATION PHASES

### **Phase 1: Backend Evidence Engine** ✅

#### 1.1 Evidence Configuration Schema
- Define mandatory evidence per check type
- Store in database for flexibility
- Support custom evidence rules per tenant

#### 1.2 Document-Check Binding
- Add `checkId` reference to BGVDocument (already exists)
- Add `requiredDocuments` array to BGVCheck
- Add `uploadedDocuments` tracking to BGVCheck

#### 1.3 Evidence Validation Service
- Create `BGVEvidenceValidator` service
- Implement check-specific validation logic
- OCR integration for identity documents
- Date consistency validation
- Duplicate detection

#### 1.4 Maker-Checker Workflow
- Add `verificationStatus` enum: `PENDING_VERIFICATION`, `SUBMITTED_FOR_APPROVAL`, `APPROVED`, `REJECTED`
- Add `verifiedBy` (Maker) and `approvedBy` (Checker) fields
- Add `verificationSubmittedAt` and `approvalCompletedAt` timestamps
- Enforce different users for maker/checker

#### 1.5 Backend Enforcement
- Modify `verifyCheck` controller to validate evidence
- Reject verification requests without required documents
- Implement two-step approval process
- Add comprehensive audit logging

---

### **Phase 2: Frontend Evidence UI** ✅

#### 2.1 Evidence Upload Interface
- Document upload per check
- Required vs optional document indicators
- Document type validation
- File size and format validation
- Preview and review capabilities

#### 2.2 Evidence Review Panel
- Display all documents per check
- Document status badges (Uploaded, Reviewed, Verified, Rejected)
- Inline document viewer
- Evidence completeness indicator

#### 2.3 Verification Workflow UI
- **Step 1: Review Evidence** button (replaces instant verify)
- Evidence checklist modal
- Mandatory remarks for each document
- **Step 2: Submit for Approval** (Maker action)
- **Step 3: Approve/Reject** (Checker action, different user)

#### 2.4 Smart UI Controls
- Disable "Verify" button until evidence complete
- Show missing evidence warnings
- Progress indicators per check
- Evidence completeness percentage

---

### **Phase 3: Audit & Compliance** ✅

#### 3.1 Tamper-Proof Audit Logs
- Log every document upload
- Log every verification action
- Log every approval/rejection
- Store IP address, timestamp, user agent
- Immutable logs (no edits/deletes)

#### 3.2 Evidence Hashing
- Generate SHA-256 hash for each document
- Store hash in database
- Verify integrity on retrieval
- Detect tampering

#### 3.3 Court-Safe Reports
- Include evidence list per check
- Document hashes and metadata
- Verifier and approver details
- Complete timeline with timestamps
- Decision justification
- Digital signature support

---

## 📋 DETAILED IMPLEMENTATION TASKS

### Backend Tasks:

1. ✅ Create `BGVEvidenceConfig` model
2. ✅ Create `BGVEvidenceValidator` service
3. ✅ Update `BGVCheck` model with evidence fields
4. ✅ Update `BGVDocument` model with hash and review status
5. ✅ Modify `verifyCheck` controller with evidence validation
6. ✅ Add `submitForApproval` endpoint (Maker)
7. ✅ Add `approveVerification` endpoint (Checker)
8. ✅ Add evidence validation middleware
9. ✅ Update audit logging for all evidence actions
10. ✅ Add document hash generation on upload

### Frontend Tasks:

1. ✅ Create `EvidenceUploadPanel` component
2. ✅ Create `EvidenceReviewModal` component
3. ✅ Update `BGVDetailModal` with evidence workflow
4. ✅ Add evidence completeness indicators
5. ✅ Implement maker-checker UI flow
6. ✅ Add document viewer/preview
7. ✅ Update check status badges
8. ✅ Add evidence validation warnings
9. ✅ Implement smart button states
10. ✅ Add evidence progress tracking

---

## 🧠 SMART VALIDATION LOGIC

### Identity Check (Aadhaar/PAN):
```javascript
- Extract number via OCR
- Compare with candidate profile
- Validate format (Aadhaar: 12 digits, PAN: 10 chars)
- Check expiry (if applicable)
- Flag mismatch for manual review
```

### Employment Check:
```javascript
- Validate employer name matches resume
- Check employment dates consistency
- Require minimum 2 payslips
- Validate payslip dates within employment period
- Flag gaps or overlaps
```

### Education Check:
```javascript
- Validate degree year vs candidate DOB
- Check university name against approved list
- Detect fake university blacklist
- Validate marksheet consistency
```

### Address Check:
```javascript
- Validate utility bill date (within 3 months)
- Check address match with candidate profile
- Require field visit proof (optional)
- Validate document authenticity
```

---

## 🔐 OVERALL BGV STATUS CALCULATION (SYSTEM-DRIVEN)

```javascript
if (any check === FAILED) → BGV = FAILED
if (any check === DISCREPANCY) → BGV = DISCREPANCY
if (all checks === VERIFIED) → BGV = VERIFIED
if (any check === PENDING_APPROVAL) → BGV = IN_PROGRESS
if (any check === UNDER_VERIFICATION) → BGV = IN_PROGRESS
```

**🚫 Manual override is FORBIDDEN**

---

## 📊 ENTERPRISE REPORT STRUCTURE

### Final BGV Report Must Include:

1. **Executive Summary**
   - Overall decision
   - Risk level
   - Completion date
   - Verifier and approver names

2. **Evidence Per Check**
   - Document list with hashes
   - Upload timestamps
   - Review status
   - Verifier remarks

3. **Audit Trail**
   - Complete timeline
   - User actions with IP addresses
   - Status transitions
   - Decision justifications

4. **Digital Signatures**
   - Verifier signature
   - Approver signature
   - HR signature
   - Timestamp authority

5. **Legal Compliance**
   - Data protection statement
   - Consent records
   - Retention policy
   - Dispute resolution process

---

## 🎯 SUCCESS CRITERIA

### System is COMPLIANT when:

✅ No check can be verified without required evidence
✅ All documents are bound to specific checks
✅ Maker-checker workflow is enforced
✅ Audit logs are complete and immutable
✅ Reports are court-safe and comprehensive
✅ Evidence validation is automated where possible
✅ Manual overrides require admin approval + reason
✅ System rejects invalid verification attempts

---

## 🧠 GUIDING PRINCIPLE

> **If BGV can be completed without documents, it is NOT BGV.**

This implementation will transform the system into a **true enterprise-grade compliance tool**.

---

## 📅 IMPLEMENTATION TIMELINE

- **Phase 1 (Backend)**: 4-6 hours
- **Phase 2 (Frontend)**: 4-6 hours
- **Phase 3 (Audit)**: 2-3 hours
- **Testing & Validation**: 2-3 hours

**Total Estimated Time**: 12-18 hours

---

## 🚀 NEXT STEPS

1. Review and approve this plan
2. Begin Phase 1 implementation
3. Test evidence validation
4. Deploy to staging
5. User acceptance testing
6. Production deployment

---

**Document Version**: 1.0
**Created**: 2026-02-10
**Status**: Ready for Implementation
