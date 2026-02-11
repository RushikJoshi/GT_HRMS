# 🚀 BGV Module - Quick Start Guide

## 📋 Overview

This guide will help you quickly understand and use the BGV (Background Verification) module.

---

## 🎯 Quick Facts

- **Module Type**: Integrated (not standalone)
- **Location**: Recruitment → Applicants → BGV Tab
- **Backend Status**: ✅ 100% Complete
- **Frontend Status**: 🔄 Pending
- **Database Collections**: 5 (BGVCase, BGVCheck, BGVDocument, BGVTimeline, BGVReport)
- **API Endpoints**: 11
- **Workflow Steps**: 8

---

## 🔧 Setup & Installation

### 1. Backend is Already Configured ✅

All backend files are in place:
```
backend/
├── models/
│   ├── BGVCase.js          ✅
│   ├── BGVCheck.js         ✅
│   ├── BGVDocument.js      ✅
│   ├── BGVTimeline.js      ✅
│   └── BGVReport.js        ✅
├── controllers/
│   └── bgv.controller.js   ✅
├── routes/
│   └── bgv.routes.js       ✅
└── utils/
    └── bgvModels.js        ✅
```

### 2. Verify Server is Running

```bash
# Backend should already be running
# Check terminal: "npm run dev" in backend folder
```

### 3. Test API Endpoints

```bash
# Test health check
curl http://localhost:5000/api/health

# Test BGV stats (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/bgv/stats
```

---

## 🎬 Quick Usage Examples

### Example 1: Initiate BGV (HR)

```javascript
// POST /api/bgv/initiate
const response = await fetch('http://localhost:5000/api/bgv/initiate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    applicationId: '64abc123...',  // Applicant ID
    package: 'STANDARD',            // BASIC | STANDARD | PREMIUM
    slaDays: 7                      // Optional
  })
});

const data = await response.json();
console.log('BGV Case ID:', data.data.case.caseId);
// Output: BGV-2026-00001
```

---

### Example 2: Upload Document (Candidate)

```javascript
// POST /api/bgv/case/:caseId/upload-document
const formData = new FormData();
formData.append('document', fileInput.files[0]);
formData.append('documentType', 'AADHAAR');
formData.append('checkType', 'IDENTITY');

const response = await fetch(`http://localhost:5000/api/bgv/case/${caseId}/upload-document`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
});

const data = await response.json();
console.log('Document uploaded:', data.data.fileName);
```

---

### Example 3: Verify Check (HR)

```javascript
// POST /api/bgv/check/:checkId/verify
const response = await fetch(`http://localhost:5000/api/bgv/check/${checkId}/verify`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'VERIFIED',
    internalRemarks: 'Verified via UIDAI API. Aadhaar matches.',
    verificationMethod: 'API'
  })
});

const data = await response.json();
console.log('Overall Status:', data.data.overallStatus);
```

---

### Example 4: Close BGV (HR)

```javascript
// POST /api/bgv/case/:id/close
const response = await fetch(`http://localhost:5000/api/bgv/case/${caseId}/close`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    decision: 'APPROVED',  // APPROVED | REJECTED | RECHECK_REQUIRED
    remarks: 'All checks cleared. Candidate verified.'
  })
});

const data = await response.json();
console.log('BGV Closed:', data.data.isClosed);
console.log('Decision:', data.data.decision);
```

---

## 📦 BGV Packages

### BASIC Package
**Checks**: 3
- Identity (Aadhaar/PAN)
- Address
- Employment

**Use Case**: Entry-level positions, interns

---

### STANDARD Package (Default)
**Checks**: 5
- Identity
- Address
- Employment
- Education
- Criminal

**Use Case**: Most positions, standard hiring

---

### PREMIUM Package
**Checks**: 7
- Identity
- Address
- Employment
- Education
- Criminal
- Social Media
- Reference Checks

**Use Case**: Senior positions, critical roles

---

## 🔄 Workflow States

### Case Status Flow
```
PENDING → IN_PROGRESS → VERIFIED/FAILED → CLOSED
                      ↓
              VERIFIED_WITH_DISCREPANCIES
```

### Check Status Flow
```
NOT_STARTED → PENDING → IN_PROGRESS → VERIFIED/FAILED/DISCREPANCY
```

### Decision Flow
```
PENDING → APPROVED/REJECTED/RECHECK_REQUIRED
```

---

## 🔐 Access Control Quick Reference

| Role | Can Initiate | Can Verify | Can Close | Can Upload | Can View |
|------|--------------|------------|-----------|------------|----------|
| **HR** | ✅ | ✅ | ✅ | ✅ | All cases |
| **Admin** | ✅ | ✅ | ✅ | ✅ | All cases |
| **Candidate** | ❌ | ❌ | ❌ | ✅ | Own only |
| **Verifier** | ❌ | ✅ (assigned) | ❌ | ✅ | Assigned |
| **Manager** | ❌ | ❌ | ❌ | ❌ | Summary |
| **Payroll** | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🧪 Testing the API

### Using Postman

1. **Import Collection**
   - Create new collection "BGV Module"
   - Add environment variable `baseUrl` = `http://localhost:5000`
   - Add environment variable `token` = `YOUR_JWT_TOKEN`

2. **Test Sequence**
   ```
   1. GET /api/bgv/stats
   2. POST /api/bgv/initiate
   3. POST /api/bgv/case/:caseId/upload-document
   4. POST /api/bgv/check/:checkId/verify
   5. POST /api/bgv/case/:id/close
   6. GET /api/bgv/cases
   ```

---

### Using cURL

```bash
# 1. Get stats
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:5000/api/bgv/stats

# 2. Initiate BGV
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"applicationId":"64abc...","package":"STANDARD"}' \
     http://localhost:5000/api/bgv/initiate

# 3. Upload document
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -F "document=@/path/to/aadhaar.pdf" \
     -F "documentType=AADHAAR" \
     -F "checkType=IDENTITY" \
     http://localhost:5000/api/bgv/case/64xyz.../upload-document

# 4. Verify check
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"status":"VERIFIED","internalRemarks":"Verified"}' \
     http://localhost:5000/api/bgv/check/64check.../verify

# 5. Close BGV
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"decision":"APPROVED","remarks":"All clear"}' \
     http://localhost:5000/api/bgv/case/64xyz.../close
```

---

## 📊 Database Quick Reference

### Collections

```javascript
// BGVCase
{
  caseId: "BGV-2026-00001",
  package: "STANDARD",
  overallStatus: "IN_PROGRESS",
  decision: "PENDING",
  sla: { targetDays: 7, dueDate: Date, isOverdue: false },
  isClosed: false,
  isImmutable: false
}

// BGVCheck
{
  caseId: ObjectId,
  type: "IDENTITY",
  status: "VERIFIED",
  mode: "API",
  slaDays: 5,
  verificationDetails: { ... }
}

// BGVDocument
{
  caseId: ObjectId,
  documentType: "AADHAAR",
  filePath: "/uploads/...",
  version: 1,
  isDeleted: false
}

// BGVTimeline (Immutable)
{
  caseId: ObjectId,
  eventType: "CHECK_VERIFIED",
  title: "Identity Check Verified",
  timestamp: Date,
  isImmutable: true
}

// BGVReport
{
  caseId: ObjectId,
  reportType: "FINAL",
  filePath: "/uploads/reports/...",
  summary: { totalChecks: 5, verified: 5, ... }
}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "BGV already initiated"
**Solution**: Check if BGV exists for this applicant
```javascript
const existing = await BGVCase.findOne({ applicationId });
if (existing) {
  console.log('Existing case:', existing.caseId);
}
```

---

### Issue 2: "Cannot modify closed BGV"
**Solution**: BGV is immutable after closure. This is by design for compliance.
```javascript
if (bgvCase.isClosed) {
  return res.status(400).json({ 
    message: "BGV is closed and cannot be modified" 
  });
}
```

---

### Issue 3: Document upload fails
**Solution**: Check file size (max 10MB) and type (jpg, png, pdf, doc, docx)
```javascript
// Allowed types
const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
const maxSize = 10 * 1024 * 1024; // 10MB
```

---

### Issue 4: Timeline not showing
**Solution**: Timeline is auto-created. Check visibility settings
```javascript
// Candidate can only see events with:
visibleTo: ['CANDIDATE', 'ALL']

// HR can see all events
```

---

## 📝 Quick Checklist for Developers

### Before Starting Frontend
- [ ] Backend server is running
- [ ] All models are registered in app.js
- [ ] All routes are mounted in app.js
- [ ] Test all API endpoints with Postman
- [ ] Review API documentation
- [ ] Review architecture documentation

### Frontend Implementation Order
1. [ ] BGV Dashboard (list view)
2. [ ] Initiation Modal
3. [ ] Document Upload Component
4. [ ] Timeline Viewer
5. [ ] Check Verification UI
6. [ ] Final Approval Screen
7. [ ] Report Viewer

### Integration Points
- [ ] Add BGV tab in Applicant Profile
- [ ] Add BGV history in Employee Profile
- [ ] Block offer letter until BGV approved
- [ ] Trigger onboarding on BGV approval
- [ ] Send notifications on status changes

---

## 🔗 Useful Links

- **Architecture Doc**: `BGV_MODULE_ARCHITECTURE.md`
- **API Doc**: `BGV_API_DOCUMENTATION.md`
- **Implementation Summary**: `BGV_IMPLEMENTATION_SUMMARY.md`
- **This Guide**: `BGV_QUICK_START.md`

---

## 💡 Pro Tips

### Tip 1: Use Package Constants
```javascript
const BGV_PACKAGES = {
  BASIC: ['IDENTITY', 'ADDRESS', 'EMPLOYMENT'],
  STANDARD: ['IDENTITY', 'ADDRESS', 'EMPLOYMENT', 'EDUCATION', 'CRIMINAL'],
  PREMIUM: ['IDENTITY', 'ADDRESS', 'EMPLOYMENT', 'EDUCATION', 'CRIMINAL', 'SOCIAL_MEDIA', 'REFERENCE']
};
```

### Tip 2: Always Check isClosed
```javascript
if (bgvCase.isClosed) {
  // Don't allow modifications
  return;
}
```

### Tip 3: Use Timeline for Audit
```javascript
// Every action should create a timeline entry
await createTimelineEntry(BGVTimeline, {
  tenant: req.tenantId,
  caseId: bgvCase._id,
  eventType: 'CHECK_VERIFIED',
  title: 'Identity Check Verified',
  // ... more fields
});
```

### Tip 4: Soft Delete Only
```javascript
// Never hard delete documents
document.isDeleted = true;
document.deletedAt = new Date();
document.deletedBy = userId;
await document.save();
```

---

## 📞 Need Help?

- **Backend Issues**: Check `backend/controllers/bgv.controller.js`
- **API Issues**: Check `backend/routes/bgv.routes.js`
- **Model Issues**: Check `backend/models/BGV*.js`
- **Documentation**: Read `BGV_MODULE_ARCHITECTURE.md`

---

## 🎯 Next Steps

1. **Test Backend APIs** using Postman
2. **Start Frontend Implementation** with BGV Dashboard
3. **Integrate with Applicant Profile**
4. **Add Notifications**
5. **Deploy to Staging**
6. **UAT Testing**
7. **Production Deployment**

---

**Happy Coding! 🚀**

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-06  
**Status**: ✅ Ready to Use
