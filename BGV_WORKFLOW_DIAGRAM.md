# 🔐 BGV Evidence-Driven Workflow - Visual Guide

## 🔄 COMPLETE WORKFLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BGV EVIDENCE-DRIVEN WORKFLOW                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  HR Initiates   │
│   BGV Case      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ System Creates  │
│ Checks Based on │
│    Package      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EVIDENCE COLLECTION PHASE                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   Candidate     │
│    Uploads      │
│   Documents     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────────────────────┐
│ System Generates│      │ • Generate SHA-256 Hash          │
│ Document Hash   │─────▶│ • Store Hash in Database         │
└────────┬────────┘      │ • Enable Tamper Detection        │
         │               └──────────────────────────────────┘
         ▼
┌─────────────────┐      ┌──────────────────────────────────┐
│ System Validates│      │ • Check Required Documents       │
│    Evidence     │─────▶│ • Calculate Completeness %       │
└────────┬────────┘      │ • Identify Missing Documents     │
         │               └──────────────────────────────────┘
         ▼
┌─────────────────┐
│ Update Check    │
│    Status       │
└────────┬────────┘
         │
         ├─── Evidence Incomplete ──▶ Status: DOCUMENTS_PENDING
         │
         └─── Evidence Complete ────▶ Status: DOCUMENTS_UPLOADED
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MAKER-CHECKER WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────┘

         ┌─────────────────┐
         │ STEP 1: MAKER   │
         │   (Verifier)    │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐      ┌──────────────────────────────────┐
         │ Start           │      │ • Review All Documents           │
         │ Verification    │─────▶│ • Check Evidence Quality         │
         └────────┬────────┘      │ • Add Review Remarks             │
                  │               └──────────────────────────────────┘
                  ▼
         Status: UNDER_VERIFICATION
                  │
                  ▼
         ┌─────────────────┐      ┌──────────────────────────────────┐
         │ Review Each     │      │ • Mark Document as Reviewed      │
         │   Document      │─────▶│ • Accept/Reject Documents        │
         └────────┬────────┘      │ • Add Quality Score              │
                  │               └──────────────────────────────────┘
                  ▼
         ┌─────────────────┐      ┌──────────────────────────────────┐
         │ Submit for      │      │ • Propose Status (VERIFIED/      │
         │   Approval      │─────▶│   FAILED/DISCREPANCY)            │
         └────────┬────────┘      │ • Add Verification Remarks       │
                  │               │ • Submit to Checker              │
                  │               └──────────────────────────────────┘
                  ▼
         Status: PENDING_APPROVAL
                  │
                  ▼
         ┌─────────────────┐
         │ STEP 2: CHECKER │
         │   (Approver)    │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐      ┌──────────────────────────────────┐
         │ System Validates│      │ • Verify Different User          │
         │ Maker-Checker   │─────▶│ • Prevent Same-User Approval     │
         └────────┬────────┘      │ • Enforce Dual Control           │
                  │               └──────────────────────────────────┘
                  ▼
         ┌─────────────────┐      ┌──────────────────────────────────┐
         │ Checker Reviews │      │ • Review Verifier's Work         │
         │ Verifier's Work │─────▶│ • Check Evidence Quality         │
         └────────┬────────┘      │ • Validate Proposed Status       │
                  │               └──────────────────────────────────┘
                  ▼
         ┌─────────────────┐
         │   Decision?     │
         └────────┬────────┘
                  │
         ├────────┼────────┐
         │        │        │
         ▼        ▼        ▼
    APPROVED  REJECTED  SENT_BACK
         │        │        │
         │        │        └──▶ Back to UNDER_VERIFICATION
         │        │
         │        └──▶ Back to UNDER_VERIFICATION
         │
         ▼
┌─────────────────┐      ┌──────────────────────────────────┐
│ Apply Final     │      │ • VERIFIED                       │
│    Status       │─────▶│ • FAILED                         │
└────────┬────────┘      │ • DISCREPANCY                    │
         │               └──────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AUDIT & COMPLIANCE                                │
└─────────────────────────────────────────────────────────────────────┘

         ┌─────────────────┐      ┌──────────────────────────────────┐
         │ System Logs     │      │ • Timestamp                      │
         │ Every Action    │─────▶│ • User ID & Name                 │
         └────────┬────────┘      │ • IP Address                     │
                  │               │ • User Agent                     │
                  │               │ • Document Hashes                │
                  │               │ • Status Changes                 │
                  │               └──────────────────────────────────┘
                  ▼
         ┌─────────────────┐
         │ Update Overall  │
         │   Case Status   │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐      ┌──────────────────────────────────┐
         │ All Checks      │      │ If any FAILED → BGV = FAILED     │
         │   Complete?     │─────▶│ If any DISCREPANCY → BGV = DISC  │
         └────────┬────────┘      │ If all VERIFIED → BGV = VERIFIED │
                  │               └──────────────────────────────────┘
                  ▼
         ┌─────────────────┐
         │ Generate Final  │
         │   BGV Report    │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐      ┌──────────────────────────────────┐
         │ Report Includes │      │ • Evidence List with Hashes      │
         │                 │─────▶│ • Verifier & Approver Names      │
         └─────────────────┘      │ • Complete Timeline              │
                                  │ • Decision Justification         │
                                  │ • Court-Safe Format              │
                                  └──────────────────────────────────┘
```

---

## 🔐 ENFORCEMENT POINTS

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CRITICAL ENFORCEMENT POINTS                       │
└─────────────────────────────────────────────────────────────────────┘

🚫 ENFORCEMENT #1: Evidence Validation
   ┌──────────────────────────────────────────────────────┐
   │ IF hasRequiredEvidence = FALSE                       │
   │ THEN BLOCK verification                              │
   │ SHOW missing documents list                          │
   └──────────────────────────────────────────────────────┘

🚫 ENFORCEMENT #2: Maker-Checker Compliance
   ┌──────────────────────────────────────────────────────┐
   │ IF verifierId = approverId                           │
   │ THEN REJECT approval                                 │
   │ SHOW "Maker-Checker violation" error                 │
   └──────────────────────────────────────────────────────┘

🚫 ENFORCEMENT #3: Mandatory Remarks
   ┌──────────────────────────────────────────────────────┐
   │ IF status IN [FAILED, DISCREPANCY]                   │
   │ AND remarks = NULL                                   │
   │ THEN REJECT submission                               │
   │ SHOW "Remarks are mandatory" error                   │
   └──────────────────────────────────────────────────────┘

🚫 ENFORCEMENT #4: Document Integrity
   ┌──────────────────────────────────────────────────────┐
   │ ON document upload                                   │
   │ GENERATE SHA-256 hash                                │
   │ STORE hash in database                               │
   │ ENABLE tamper detection                              │
   └──────────────────────────────────────────────────────┘

🚫 ENFORCEMENT #5: Status Flow
   ┌──────────────────────────────────────────────────────┐
   │ NOT_STARTED → DOCUMENTS_PENDING                      │
   │            → DOCUMENTS_UPLOADED                      │
   │            → UNDER_VERIFICATION                      │
   │            → PENDING_APPROVAL                        │
   │            → VERIFIED/FAILED/DISCREPANCY             │
   │                                                      │
   │ 🚫 Direct jump to VERIFIED is FORBIDDEN              │
   └──────────────────────────────────────────────────────┘
```

---

## 📊 EVIDENCE COMPLETENESS CALCULATION

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EVIDENCE COMPLETENESS LOGIC                       │
└─────────────────────────────────────────────────────────────────────┘

Example: Employment Check

Required Documents:
  ├── Experience Letter (Mandatory, Min: 1)
  └── Payslips (Mandatory, Min: 2)

Uploaded Documents:
  ├── Experience Letter ✓
  ├── Payslip Jan 2024 ✓
  └── Payslip Feb 2024 ✓

Calculation:
  Total Required Types: 2
  Total Uploaded Types: 2
  Completeness: (2 / 2) × 100 = 100%

Result:
  ✅ hasRequiredEvidence = TRUE
  ✅ evidenceCompleteness = 100%
  ✅ missingDocuments = []
  ✅ Status → DOCUMENTS_UPLOADED
  ✅ Ready for Verification
```

---

## 🔄 STATUS TRANSITIONS

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CHECK STATUS LIFECYCLE                            │
└─────────────────────────────────────────────────────────────────────┘

NOT_STARTED
    │
    │ (Document uploaded)
    ▼
DOCUMENTS_PENDING
    │
    │ (All required documents uploaded)
    ▼
DOCUMENTS_UPLOADED
    │
    │ (Verifier starts review)
    ▼
UNDER_VERIFICATION
    │
    │ (Verifier submits for approval)
    ▼
PENDING_APPROVAL
    │
    ├─── (Checker approves) ───▶ VERIFIED
    │
    ├─── (Checker approves) ───▶ FAILED
    │
    ├─── (Checker approves) ───▶ DISCREPANCY
    │
    └─── (Checker rejects) ────▶ UNDER_VERIFICATION (loop back)
```

---

## 🎯 DECISION MATRIX

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OVERALL BGV STATUS LOGIC                          │
└─────────────────────────────────────────────────────────────────────┘

Check Results:
  ├── Identity: VERIFIED
  ├── Employment: VERIFIED
  ├── Education: VERIFIED
  ├── Address: VERIFIED
  └── Criminal: VERIFIED

Decision: BGV = VERIFIED ✅

───────────────────────────────────────────────────────────────────────

Check Results:
  ├── Identity: VERIFIED
  ├── Employment: VERIFIED
  ├── Education: DISCREPANCY
  ├── Address: VERIFIED
  └── Criminal: VERIFIED

Decision: BGV = VERIFIED_WITH_DISCREPANCIES ⚠️

───────────────────────────────────────────────────────────────────────

Check Results:
  ├── Identity: VERIFIED
  ├── Employment: FAILED
  ├── Education: VERIFIED
  ├── Address: VERIFIED
  └── Criminal: VERIFIED

Decision: BGV = FAILED ❌

───────────────────────────────────────────────────────────────────────

Check Results:
  ├── Identity: VERIFIED
  ├── Employment: PENDING_APPROVAL
  ├── Education: VERIFIED
  ├── Address: VERIFIED
  └── Criminal: VERIFIED

Decision: BGV = IN_PROGRESS ⏳
```

---

*Visual Guide Version*: 1.0  
*Created*: 2026-02-10  
*Purpose*: Quick Reference for BGV Evidence-Driven Workflow
