# 🛡️ BGV Module - Complete Architecture Documentation

## 📍 Module Location

### Primary Access Point
**Recruitment → Applicants → Candidate Profile → BGV Tab**

### Secondary Access (Read-Only)
**Employees → Employee Profile → Compliance → BGV History**

> ⚠️ **IMPORTANT**: BGV is NOT a standalone sidebar module. It is integrated within the recruitment workflow.

---

## 🔄 Complete BGV Workflow (8 Steps)

### STEP 1: Candidate Uploads Documents
**Location**: Candidate Portal → My Profile → BGV Documents

**Actions**:
- Candidate uploads requested documents:
  - Aadhaar / PAN
  - Degree certificates & marksheets
  - Experience letters & payslips
  - Address proof

**Rules**:
- ✅ Can only upload requested documents
- ❌ Cannot delete after submission (versioning enabled)
- ❌ Cannot see internal verification notes
- ✅ Document versioning automatically managed

---

### STEP 2: HR Initiates BGV
**Location**: HR Dashboard → BGV Section → Initiate Verification

**API**: `POST /api/bgv/initiate`

**Request Body**:
```json
{
  "applicationId": "64abc123...",
  "candidateId": "64def456...",  // Optional - auto-fetched from applicant
  "package": "STANDARD",          // BASIC | STANDARD | PREMIUM
  "slaDays": 7                    // Optional, default: 7
}
```

**Actions**:
1. HR selects candidate from applicants list
2. HR selects BGV package (BASIC/STANDARD/PREMIUM)
3. HR clicks "Initiate BGV"

**System Generates**:
- Unique `bgv_case_id` (Format: BGV-2026-00001)
- SLA due date (default: 7 days)
- Auto-assigned verifiers (based on check type)

---

### STEP 3: System Auto-Generates BGV Checklist

Based on selected package, system creates verification checks:

#### 📦 Verification Packages

| Package | Checks Included |
|---------|----------------|
| **BASIC** | Identity, Address, Employment |
| **STANDARD** | Basic + Education, Criminal |
| **PREMIUM** | Standard + Social Media, Reference Checks |

**Check Types**:
- `IDENTITY` - Aadhaar/PAN verification
- `ADDRESS` - Address proof verification
- `EMPLOYMENT` - Previous employment verification
- `EDUCATION` - Degree/certificate verification
- `CRIMINAL` - Police verification / Court records
- `REFERENCE` - Reference check calls
- `SOCIAL_MEDIA` - Social media background check

---

### STEP 4: Verification Begins

System auto-assigns checks based on type:

| Check Type | Assigned To | Verification Method |
|-----------|-------------|-------------------|
| Identity | Internal / API | Aadhaar/PAN API |
| Address | Field Agent | Physical verification |
| Employment | HR | Previous employer contact |
| Education | University / Vendor | Certificate authentication |
| Criminal | API Provider | Court records API |
| Reference | HR | Phone verification |

**Status Flow**:
```
NOT_STARTED → PENDING → IN_PROGRESS → VERIFIED / FAILED / DISCREPANCY
```

---

### STEP 5: Timeline Updates (Real-Time)

Every action creates an immutable timeline event:

**Timeline Entry Structure**:
```javascript
{
  timestamp: Date,
  eventType: "CHECK_VERIFIED",
  title: "Identity Check Verified",
  description: "Aadhaar verified via UIDAI API",
  performedBy: {
    userId: "...",
    userName: "John Doe",
    userRole: "HR"
  },
  oldStatus: "IN_PROGRESS",
  newStatus: "VERIFIED",
  visibleTo: ["ALL"], // or ["HR", "ADMIN"]
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0..."
}
```

**Visibility Control**:
- **HR**: Full timeline
- **Candidate**: Limited timeline (no internal remarks)

---

### STEP 6: BGV Result Compilation

System auto-calculates overall status:

**Overall Status Logic**:
```javascript
if (anyCheckFailed) {
  overallStatus = "FAILED"
} else if (allChecksVerified && hasDiscrepancies) {
  overallStatus = "VERIFIED_WITH_DISCREPANCIES"
} else if (allChecksVerified) {
  overallStatus = "VERIFIED"
} else {
  overallStatus = "IN_PROGRESS"
}
```

**BGV Summary Report Contains**:
- Candidate details
- Verification summary
- Check-by-check results
- Supporting documents
- Verification logs
- Final decision

---

### STEP 7: HR Approves & Closes BGV

**API**: `POST /api/bgv/case/:id/close`

**Request Body**:
```json
{
  "decision": "APPROVED",  // APPROVED | REJECTED | RECHECK_REQUIRED
  "remarks": "All checks cleared. Candidate verified."
}
```

**Decision Logic**:

| Decision | Action |
|----------|--------|
| **APPROVED** | Move candidate to Onboarding |
| **REJECTED** | Auto-reject applicant |
| **RECHECK_REQUIRED** | Reopen specific checks |

**Final Status**:
- `VERIFIED` - All clear
- `VERIFIED_WITH_DISCREPANCIES` - Minor issues noted
- `FAILED` - Critical issues found
- `CLOSED` - Decision made

**Immutability**:
- ✅ Case becomes **immutable** after closure
- ❌ No edits allowed (audit compliance)
- ✅ Logs remain accessible

---

### STEP 8: Candidate Notification

**Notification Sent**:
```
Subject: Background Verification Completed

Dear [Candidate Name],

Your background verification has been completed.

Status: VERIFIED / FAILED / DISCREPANCY
Decision: APPROVED / REJECTED

[Details based on decision]

Note: Documents cannot be modified after BGV closure.

Best regards,
HR Team
```

**Candidate Restrictions**:
- ❌ Cannot modify documents after closure
- ✅ Can view final status
- ❌ Cannot see internal remarks

---

## 🗄️ Database Schema

### BGVCase Collection
```javascript
{
  _id: ObjectId,
  caseId: "BGV-2026-00001",
  tenant: ObjectId,
  applicationId: ObjectId,
  candidateId: ObjectId,
  employeeId: ObjectId,
  
  package: "STANDARD",
  overallStatus: "VERIFIED",
  decision: "APPROVED",
  decisionBy: ObjectId,
  decisionAt: Date,
  decisionRemarks: String,
  
  sla: {
    targetDays: 7,
    dueDate: Date,
    isOverdue: false
  },
  
  initiatedBy: ObjectId,
  initiatedAt: Date,
  completedAt: Date,
  closedAt: Date,
  closedBy: ObjectId,
  
  finalReport: {
    path: String,
    generatedAt: Date,
    generatedBy: ObjectId
  },
  
  isImmutable: true,
  isClosed: true,
  
  logs: [AuditLog],
  meta: Object,
  
  createdAt: Date,
  updatedAt: Date
}
```

### BGVCheck Collection
```javascript
{
  _id: ObjectId,
  caseId: ObjectId,
  tenant: ObjectId,
  type: "IDENTITY",
  status: "VERIFIED",
  mode: "API",
  
  slaDays: 5,
  dueDate: Date,
  isOverdue: false,
  
  assignedTo: ObjectId,
  assignedAt: Date,
  
  documents: [Document],
  
  internalRemarks: String,  // HR only
  candidateRemarks: String, // Visible to candidate
  
  verificationDetails: {
    verifiedBy: ObjectId,
    verifiedAt: Date,
    verificationMethod: "UIDAI_API",
    evidencePath: String,
    crossCheckData: Object
  },
  
  timeline: [TimelineEvent],
  
  startedAt: Date,
  completedAt: Date,
  
  createdAt: Date,
  updatedAt: Date
}
```

### BGVDocument Collection
```javascript
{
  _id: ObjectId,
  tenant: ObjectId,
  caseId: ObjectId,
  checkId: ObjectId,
  candidateId: ObjectId,
  
  documentType: "AADHAAR",
  fileName: String,
  originalName: String,
  filePath: String,
  fileSize: Number,
  mimeType: String,
  
  version: 1,
  previousVersionId: ObjectId,
  
  status: "VERIFIED",
  
  uploadedBy: {
    userId: ObjectId,
    userName: String,
    userRole: String
  },
  uploadedAt: Date,
  
  verifiedBy: {
    userId: ObjectId,
    userName: String
  },
  verifiedAt: Date,
  verificationRemarks: String,
  
  isDeleted: false,  // Soft delete only
  deletedBy: Object,
  deletedAt: Date,
  deletionReason: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### BGVTimeline Collection (Immutable)
```javascript
{
  _id: ObjectId,
  tenant: ObjectId,
  caseId: ObjectId,
  checkId: ObjectId,
  
  eventType: "CHECK_VERIFIED",
  title: String,
  description: String,
  
  performedBy: {
    userId: ObjectId,
    userName: String,
    userRole: String,
    userEmail: String
  },
  
  oldStatus: String,
  newStatus: String,
  
  visibleTo: ["ALL"],
  remarks: String,
  metadata: Object,
  
  timestamp: Date,
  ipAddress: String,
  userAgent: String,
  
  isImmutable: true
}
```

### BGVReport Collection
```javascript
{
  _id: ObjectId,
  tenant: ObjectId,
  caseId: ObjectId,
  
  reportType: "FINAL",
  fileName: String,
  filePath: String,
  fileFormat: "PDF",
  fileSize: Number,
  
  summary: {
    totalChecks: 5,
    verifiedChecks: 5,
    failedChecks: 0,
    discrepancyChecks: 0,
    overallDecision: "APPROVED",
    riskLevel: "LOW"
  },
  
  generatedBy: {
    userId: ObjectId,
    userName: String
  },
  generatedAt: Date,
  
  version: 1,
  isImmutable: true,
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 Access Control (RBAC)

| Role | Permissions |
|------|------------|
| **Candidate** | Upload documents, View own status (limited) |
| **HR** | Full control - Initiate, Verify, Close, View all |
| **Verifier** | Verify assigned checks only |
| **Field Agent** | Address verification only |
| **Manager** | View summary reports |
| **Payroll** | ❌ No access |
| **Admin** | Full access + System configuration |

---

## 🧾 Audit & Compliance

### Immutability Rules
✅ **Every update stored with**:
- Timestamp
- User who made the change
- IP address
- User agent
- Old value → New value
- Remarks

❌ **No hard deletes**:
- All deletes are soft deletes
- Original data retained
- Deletion reason logged

✅ **BGV data retained after candidate deletion**:
- Compliance requirement
- Legal retention period: 7 years
- Immutable after closure

---

## 🔌 API Reference

### Initiate BGV
```http
POST /api/bgv/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "applicationId": "64abc...",
  "package": "STANDARD",
  "slaDays": 7
}
```

### Get All Cases
```http
GET /api/bgv/cases?status=IN_PROGRESS&page=1&limit=20
Authorization: Bearer <token>
```

### Get Case Detail
```http
GET /api/bgv/case/:id
Authorization: Bearer <token>
```

### Upload Document
```http
POST /api/bgv/case/:caseId/upload-document
Authorization: Bearer <token>
Content-Type: multipart/form-data

document: <file>
documentType: AADHAAR
checkType: IDENTITY
```

### Verify Check
```http
POST /api/bgv/check/:checkId/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "VERIFIED",
  "internalRemarks": "Verified via UIDAI API",
  "verificationMethod": "API"
}
```

### Close BGV
```http
POST /api/bgv/case/:id/close
Authorization: Bearer <token>
Content-Type: application/json

{
  "decision": "APPROVED",
  "remarks": "All checks cleared"
}
```

### Generate Report
```http
POST /api/bgv/case/:id/generate-report
Authorization: Bearer <token>
```

### Get Statistics
```http
GET /api/bgv/stats
Authorization: Bearer <token>
```

### Get Candidate Status
```http
GET /api/bgv/candidate/:candidateId
Authorization: Bearer <token>
```

---

## 🚫 Constraints & Business Rules

### Hard Constraints
1. ❌ BGV cannot be edited after closure
2. ❌ Offer letter blocked until BGV approval
3. ❌ Payroll has no access to BGV data
4. ❌ Candidate cannot see internal remarks
5. ❌ No hard deletes allowed
6. ❌ Cannot modify immutable cases
7. ❌ Timeline entries cannot be deleted

### Soft Constraints
1. ⚠️ SLA warnings when approaching due date
2. ⚠️ Auto-rejection on BGV failure
3. ⚠️ Notification sent on status changes

---

## 📊 Frontend Screens Required

### 1. HR BGV Dashboard
- **Path**: `/hr/bgv`
- **Features**:
  - List all BGV cases
  - Filter by status, package
  - Search by candidate name, case ID
  - Statistics cards
  - Quick actions

### 2. BGV Request Form
- **Path**: `/hr/applicants/:id/initiate-bgv`
- **Features**:
  - Select package
  - Set SLA
  - Preview checks
  - Confirm initiation

### 3. Candidate Document Upload Screen
- **Path**: `/candidate/bgv/upload`
- **Features**:
  - Upload documents
  - View upload history
  - Document versioning
  - Upload status

### 4. BGV Timeline Screen
- **Path**: `/hr/bgv/:id/timeline`
- **Features**:
  - Real-time timeline
  - Event filtering
  - Audit trail
  - Export timeline

### 5. Review & Final Approval Screen
- **Path**: `/hr/bgv/:id/review`
- **Features**:
  - Check-by-check review
  - Approve/Reject/Recheck
  - Add remarks
  - Generate report

### 6. BGV Report Viewer
- **Path**: `/hr/bgv/:id/report`
- **Features**:
  - View generated report
  - Download PDF
  - Print report
  - Share report

---

## 🎯 Edge Cases Handled

1. **Candidate ID missing**: Auto-fetch from applicant
2. **Duplicate BGV initiation**: Prevent with validation
3. **Document upload after closure**: Block with error
4. **SLA overdue**: Flag and notify
5. **Partial verification**: Allow VERIFIED_WITH_DISCREPANCIES
6. **Recheck required**: Reopen specific checks
7. **Vendor API failure**: Fallback to manual verification
8. **Concurrent updates**: Optimistic locking
9. **Large file uploads**: Chunked upload support
10. **Network interruption**: Resume upload capability

---

## 🔧 Configuration

### Environment Variables
```env
BGV_SLA_DEFAULT_DAYS=7
BGV_DOCUMENT_MAX_SIZE=10485760  # 10MB
BGV_REPORT_RETENTION_DAYS=2555  # 7 years
BGV_AUTO_REJECT_ON_FAIL=true
BGV_VENDOR_API_TIMEOUT=30000    # 30 seconds
```

### Package Configuration
```javascript
// Can be configured per tenant
const BGV_PACKAGES = {
  BASIC: ['IDENTITY', 'ADDRESS', 'EMPLOYMENT'],
  STANDARD: ['IDENTITY', 'ADDRESS', 'EMPLOYMENT', 'EDUCATION', 'CRIMINAL'],
  PREMIUM: ['IDENTITY', 'ADDRESS', 'EMPLOYMENT', 'EDUCATION', 'CRIMINAL', 'SOCIAL_MEDIA', 'REFERENCE']
};
```

---

## 📝 Implementation Checklist

### Backend ✅
- [x] BGVCase model with packages, SLA, decision workflow
- [x] BGVCheck model with timeline, verification details
- [x] BGVDocument model with versioning, soft-delete
- [x] BGVTimeline model (immutable audit log)
- [x] BGVReport model
- [x] Complete controller with all 8 workflow steps
- [x] API routes with RBAC
- [x] Model registration in app.js
- [x] Utility functions for model loading

### Frontend 🔄
- [ ] HR BGV Dashboard
- [ ] BGV Initiation Modal
- [ ] Document Upload Component
- [ ] Timeline Viewer
- [ ] Check Verification UI
- [ ] Final Approval Screen
- [ ] Report Generator & Viewer

### Integration 🔄
- [ ] Link BGV tab in Applicant Profile
- [ ] Add BGV status in Employee Profile
- [ ] Block offer letter until BGV cleared
- [ ] Auto-reject applicant on BGV failure
- [ ] Notification system integration
- [ ] Report generation (PDF)

---

## 🚀 Deployment Notes

1. **Database Migration**: Run migration to create indexes
2. **File Storage**: Ensure uploads directory has proper permissions
3. **API Keys**: Configure vendor API keys if using external verification
4. **Notifications**: Set up email/SMS templates
5. **RBAC**: Verify role permissions in production
6. **Monitoring**: Set up alerts for SLA breaches
7. **Backup**: Ensure BGV data is included in backups

---

## 📞 Support & Maintenance

- **Module Owner**: HR Tech Team
- **Compliance Officer**: Legal Team
- **Data Retention**: 7 years (configurable)
- **Audit Frequency**: Quarterly
- **Security Review**: Annual

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-06  
**Status**: ✅ Backend Complete | 🔄 Frontend In Progress
