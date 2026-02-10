# 🔌 BGV Module - Complete API Documentation

## Base URL
```
Production: https://your-domain.com/api/bgv
Development: http://localhost:5000/api/bgv
```

## Authentication
All endpoints require JWT authentication via Bearer token:
```http
Authorization: Bearer <your_jwt_token>
```

---

## 📊 Dashboard & Statistics

### Get BGV Statistics
Get overview statistics for BGV dashboard.

**Endpoint**: `GET /stats`

**Authorization**: HR, Admin, Company Admin

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 150,
    "pending": 25,
    "verified": 100,
    "failed": 15,
    "overdue": 5,
    "breakdown": [
      { "_id": "PENDING", "count": 25 },
      { "_id": "IN_PROGRESS", "count": 10 },
      { "_id": "VERIFIED", "count": 100 },
      { "_id": "FAILED", "count": 15 }
    ]
  }
}
```

---

## 🎬 Case Management

### 1. Initiate BGV
Start background verification for a candidate.

**Endpoint**: `POST /initiate`

**Authorization**: HR, Admin, User, Company Admin

**Request Body**:
```json
{
  "applicationId": "64abc123def456...",
  "candidateId": "64def456abc789...",  // Optional
  "package": "STANDARD",                // BASIC | STANDARD | PREMIUM
  "slaDays": 7                          // Optional, default: 7
}
```

**Response**:
```json
{
  "success": true,
  "message": "BGV initiated successfully",
  "data": {
    "case": {
      "_id": "64xyz...",
      "caseId": "BGV-2026-00001",
      "tenant": "64abc...",
      "applicationId": "64abc123...",
      "candidateId": "64def456...",
      "package": "STANDARD",
      "overallStatus": "PENDING",
      "sla": {
        "targetDays": 7,
        "dueDate": "2026-02-13T10:30:00.000Z",
        "isOverdue": false
      },
      "initiatedBy": "64user...",
      "initiatedAt": "2026-02-06T10:30:00.000Z",
      "isClosed": false,
      "isImmutable": false
    },
    "checks": [
      {
        "_id": "64check1...",
        "caseId": "64xyz...",
        "type": "IDENTITY",
        "status": "NOT_STARTED",
        "slaDays": 5
      },
      {
        "_id": "64check2...",
        "caseId": "64xyz...",
        "type": "ADDRESS",
        "status": "NOT_STARTED",
        "slaDays": 5
      }
      // ... more checks based on package
    ],
    "checksCount": 5
  }
}
```

**Error Responses**:
```json
// 400 - Missing applicationId
{
  "success": false,
  "message": "applicationId is required"
}

// 400 - Invalid package
{
  "success": false,
  "message": "Valid package (BASIC/STANDARD/PREMIUM) is required"
}

// 400 - Duplicate BGV
{
  "success": false,
  "message": "BGV already initiated for this application",
  "caseId": "BGV-2026-00001"
}

// 404 - Applicant not found
{
  "success": false,
  "message": "Applicant not found"
}
```

---

### 2. Get All BGV Cases
Retrieve all BGV cases with filtering and pagination.

**Endpoint**: `GET /cases`

**Authorization**: HR, Admin, User, Company Admin

**Query Parameters**:
- `status` (optional): Filter by status (PENDING, IN_PROGRESS, VERIFIED, FAILED, CLOSED)
- `package` (optional): Filter by package (BASIC, STANDARD, PREMIUM)
- `search` (optional): Search by case ID or candidate name
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Request**:
```http
GET /cases?status=IN_PROGRESS&page=1&limit=20
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "64xyz...",
      "caseId": "BGV-2026-00001",
      "package": "STANDARD",
      "overallStatus": "IN_PROGRESS",
      "candidateName": "John Doe",
      "candidateEmail": "john@example.com",
      "jobTitle": "Senior Developer",
      "initiatedAt": "2026-02-06T10:30:00.000Z",
      "sla": {
        "targetDays": 7,
        "dueDate": "2026-02-13T10:30:00.000Z",
        "isOverdue": false
      },
      "checks": [
        { "type": "IDENTITY", "status": "VERIFIED" },
        { "type": "ADDRESS", "status": "IN_PROGRESS" },
        { "type": "EMPLOYMENT", "status": "PENDING" }
      ],
      "checksProgress": {
        "total": 5,
        "verified": 1,
        "failed": 0,
        "pending": 4,
        "percentage": 20
      }
    }
    // ... more cases
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

### 3. Get Case Detail
Get detailed information about a specific BGV case.

**Endpoint**: `GET /case/:id`

**Authorization**: HR, Admin, User, Company Admin

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "64xyz...",
    "caseId": "BGV-2026-00001",
    "tenant": "64abc...",
    "applicationId": {
      "_id": "64app...",
      "name": "John Doe",
      "email": "john@example.com",
      "mobile": "+91 9876543210",
      "requirementId": {
        "jobOpeningId": "JOB-001",
        "jobTitle": "Senior Developer"
      }
    },
    "candidateId": {
      "_id": "64cand...",
      "name": "John Doe",
      "email": "john@example.com",
      "mobile": "+91 9876543210",
      "dob": "1990-01-15",
      "address": "123 Main St, City"
    },
    "package": "STANDARD",
    "overallStatus": "IN_PROGRESS",
    "decision": "PENDING",
    "sla": {
      "targetDays": 7,
      "dueDate": "2026-02-13T10:30:00.000Z",
      "isOverdue": false
    },
    "initiatedBy": {
      "_id": "64user...",
      "name": "HR Manager",
      "email": "hr@company.com"
    },
    "initiatedAt": "2026-02-06T10:30:00.000Z",
    "checks": [
      {
        "_id": "64check1...",
        "type": "IDENTITY",
        "status": "VERIFIED",
        "mode": "API",
        "assignedTo": {
          "name": "System",
          "email": "system@company.com"
        },
        "verificationDetails": {
          "verifiedBy": "64user...",
          "verifiedAt": "2026-02-07T14:20:00.000Z",
          "verificationMethod": "UIDAI_API"
        },
        "internalRemarks": "Verified via UIDAI API. Aadhaar number matches.",
        "documents": [
          {
            "name": "Aadhaar Card",
            "path": "/uploads/tenant/bgv/case/aadhaar.pdf",
            "version": 1,
            "uploadedAt": "2026-02-06T11:00:00.000Z"
          }
        ]
      }
      // ... more checks
    ],
    "timeline": [
      {
        "_id": "64time1...",
        "eventType": "CASE_INITIATED",
        "title": "BGV Process Initiated",
        "description": "Background verification initiated with STANDARD package (5 checks)",
        "performedBy": {
          "userName": "HR Manager",
          "userRole": "HR"
        },
        "timestamp": "2026-02-06T10:30:00.000Z",
        "visibleTo": ["ALL"]
      },
      {
        "_id": "64time2...",
        "eventType": "DOCUMENT_UPLOADED",
        "title": "Document Uploaded",
        "description": "AADHAAR document uploaded (aadhaar.pdf)",
        "performedBy": {
          "userName": "John Doe",
          "userRole": "CANDIDATE"
        },
        "timestamp": "2026-02-06T11:00:00.000Z",
        "visibleTo": ["ALL"]
      }
      // ... more timeline events
    ],
    "documents": [
      {
        "_id": "64doc1...",
        "documentType": "AADHAAR",
        "fileName": "AADHAAR_1707217200000.pdf",
        "originalName": "aadhaar.pdf",
        "filePath": "/uploads/tenant/bgv/case/AADHAAR_1707217200000.pdf",
        "fileSize": 245678,
        "version": 1,
        "status": "VERIFIED",
        "uploadedBy": {
          "userName": "John Doe",
          "userRole": "CANDIDATE"
        },
        "uploadedAt": "2026-02-06T11:00:00.000Z",
        "verifiedBy": {
          "userName": "HR Manager"
        },
        "verifiedAt": "2026-02-07T14:20:00.000Z"
      }
      // ... more documents
    ],
    "logs": [
      {
        "action": "CASE_INITIATED",
        "performedBy": "HR Manager",
        "newStatus": "PENDING",
        "remarks": "BGV STANDARD package initiated",
        "timestamp": "2026-02-06T10:30:00.000Z",
        "ip": "192.168.1.100"
      }
      // ... more logs
    ]
  }
}
```

---

### 4. Close BGV Case
Close and finalize a BGV case with decision.

**Endpoint**: `POST /case/:id/close`

**Authorization**: HR, Admin, Company Admin

**Request Body**:
```json
{
  "decision": "APPROVED",  // APPROVED | REJECTED | RECHECK_REQUIRED
  "remarks": "All checks cleared. Candidate verified and approved for onboarding."
}
```

**Response**:
```json
{
  "success": true,
  "message": "BGV case approved successfully",
  "data": {
    "_id": "64xyz...",
    "caseId": "BGV-2026-00001",
    "overallStatus": "CLOSED",
    "decision": "APPROVED",
    "decisionBy": "64user...",
    "decisionAt": "2026-02-10T16:45:00.000Z",
    "decisionRemarks": "All checks cleared. Candidate verified and approved for onboarding.",
    "isClosed": true,
    "closedAt": "2026-02-10T16:45:00.000Z",
    "closedBy": "64user...",
    "isImmutable": true
  }
}
```

**Error Responses**:
```json
// 400 - Already closed
{
  "success": false,
  "message": "BGV Case is already closed"
}

// 400 - Invalid decision
{
  "success": false,
  "message": "Invalid decision. Must be APPROVED, REJECTED, or RECHECK_REQUIRED"
}

// 404 - Case not found
{
  "success": false,
  "message": "BGV Case not found"
}
```

---

## ✅ Check Verification

### Verify Individual Check
Update the status of a specific verification check.

**Endpoint**: `POST /check/:checkId/verify`

**Authorization**: HR, Admin, User, Company Admin

**Request Body**:
```json
{
  "status": "VERIFIED",  // VERIFIED | FAILED | DISCREPANCY | IN_PROGRESS
  "internalRemarks": "Verified via UIDAI API. Aadhaar number matches with provided details.",
  "verificationMethod": "API"  // Optional: API | MANUAL | FIELD_VISIT | PHONE
}
```

**Response**:
```json
{
  "success": true,
  "message": "Check verified successfully",
  "data": {
    "check": {
      "_id": "64check1...",
      "type": "IDENTITY",
      "status": "VERIFIED",
      "internalRemarks": "Verified via UIDAI API. Aadhaar number matches with provided details.",
      "verificationDetails": {
        "verifiedBy": "64user...",
        "verifiedAt": "2026-02-07T14:20:00.000Z",
        "verificationMethod": "API"
      },
      "completedAt": "2026-02-07T14:20:00.000Z"
    },
    "overallStatus": "IN_PROGRESS",
    "statusChanged": false
  }
}
```

**Auto-Rejection**:
If all checks are verified and overall status becomes "FAILED", the applicant is automatically rejected.

---

## 📄 Document Management

### Upload Document
Upload a document for BGV verification.

**Endpoint**: `POST /case/:caseId/upload-document`

**Authorization**: Any authenticated user (Candidate or HR)

**Content-Type**: `multipart/form-data`

**Form Data**:
- `document`: File (required) - Max 10MB, allowed: jpg, png, pdf, doc, docx
- `documentType`: String (required) - AADHAAR | PAN | PASSPORT | DEGREE_CERTIFICATE | MARKSHEET | EXPERIENCE_LETTER | PAYSLIP | ADDRESS_PROOF | etc.
- `checkType`: String (optional) - IDENTITY | ADDRESS | EDUCATION | EMPLOYMENT | etc.

**Example Request** (using curl):
```bash
curl -X POST \
  http://localhost:5000/api/bgv/case/64xyz.../upload-document \
  -H 'Authorization: Bearer <token>' \
  -F 'document=@/path/to/aadhaar.pdf' \
  -F 'documentType=AADHAAR' \
  -F 'checkType=IDENTITY'
```

**Response**:
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "_id": "64doc1...",
    "tenant": "64abc...",
    "caseId": "64xyz...",
    "checkId": "64check1...",
    "candidateId": "64cand...",
    "documentType": "AADHAAR",
    "fileName": "AADHAAR_1707217200000.pdf",
    "originalName": "aadhaar.pdf",
    "filePath": "/uploads/tenant/bgv/case/AADHAAR_1707217200000.pdf",
    "fileSize": 245678,
    "mimeType": "application/pdf",
    "version": 1,
    "status": "UPLOADED",
    "uploadedBy": {
      "userId": "64user...",
      "userName": "John Doe",
      "userRole": "CANDIDATE"
    },
    "uploadedAt": "2026-02-06T11:00:00.000Z",
    "isDeleted": false
  }
}
```

**Error Responses**:
```json
// 400 - No file
{
  "success": false,
  "message": "No file uploaded"
}

// 400 - Case closed
{
  "success": false,
  "message": "Cannot upload documents to a closed BGV case"
}

// 404 - Case not found
{
  "success": false,
  "message": "BGV Case not found"
}

// 400 - Invalid file type
{
  "success": false,
  "message": "Only images, PDFs, and Word documents are allowed"
}
```

---

## 📊 Reports

### Generate BGV Report
Generate a comprehensive BGV report (PDF).

**Endpoint**: `POST /case/:id/generate-report`

**Authorization**: HR, Admin, Company Admin

**Response**:
```json
{
  "success": true,
  "message": "Report generated successfully",
  "data": {
    "_id": "64report...",
    "tenant": "64abc...",
    "caseId": "64xyz...",
    "reportType": "FINAL",
    "fileName": "BGV_Report_BGV-2026-00001.pdf",
    "filePath": "/uploads/tenant/bgv/reports/BGV-2026-00001.pdf",
    "fileFormat": "PDF",
    "summary": {
      "totalChecks": 5,
      "verifiedChecks": 5,
      "failedChecks": 0,
      "discrepancyChecks": 0,
      "overallDecision": "APPROVED",
      "riskLevel": "LOW"
    },
    "generatedBy": {
      "userId": "64user...",
      "userName": "HR Manager"
    },
    "generatedAt": "2026-02-10T17:00:00.000Z",
    "version": 1,
    "isImmutable": true
  }
}
```

---

## 👤 Candidate Access

### Get Candidate BGV Status
Get BGV status for a specific candidate (limited view).

**Endpoint**: `GET /candidate/:candidateId`

**Authorization**: Any authenticated user

**Response** (Candidate View - Internal remarks hidden):
```json
{
  "success": true,
  "data": {
    "_id": "64xyz...",
    "caseId": "BGV-2026-00001",
    "package": "STANDARD",
    "overallStatus": "IN_PROGRESS",
    "decision": "PENDING",
    "sla": {
      "targetDays": 7,
      "dueDate": "2026-02-13T10:30:00.000Z",
      "isOverdue": false
    },
    "initiatedAt": "2026-02-06T10:30:00.000Z",
    "checks": [
      {
        "_id": "64check1...",
        "type": "IDENTITY",
        "status": "VERIFIED",
        "candidateRemarks": "Your identity has been verified successfully.",
        "documents": [...]
        // internalRemarks and verificationDetails are hidden
      },
      {
        "_id": "64check2...",
        "type": "ADDRESS",
        "status": "IN_PROGRESS",
        "candidateRemarks": "Address verification is in progress. Field agent will visit soon."
      }
      // ... more checks
    ],
    "timeline": [
      // Only events with visibleTo: ['CANDIDATE', 'ALL']
      {
        "eventType": "CASE_INITIATED",
        "title": "BGV Process Initiated",
        "description": "Background verification initiated",
        "timestamp": "2026-02-06T10:30:00.000Z"
      },
      {
        "eventType": "DOCUMENT_UPLOADED",
        "title": "Document Uploaded",
        "description": "AADHAAR document uploaded",
        "timestamp": "2026-02-06T11:00:00.000Z"
      }
      // Internal events are hidden
    ]
    // logs and decisionRemarks are removed
  }
}
```

**Error Response**:
```json
// 404 - No BGV case
{
  "success": false,
  "message": "No BGV case found for this candidate"
}
```

---

## 📋 Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 500 | Internal server error |

---

## 🔒 Security Headers

All API responses include security headers:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 📝 Rate Limiting

- **Standard endpoints**: 100 requests per 15 minutes
- **Upload endpoints**: 20 requests per 15 minutes
- **Report generation**: 10 requests per 15 minutes

---

## 🧪 Testing

### Example: Complete BGV Flow

```javascript
// 1. Initiate BGV
const initiateResponse = await fetch('/api/bgv/initiate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    applicationId: '64abc...',
    package: 'STANDARD',
    slaDays: 7
  })
});

const { data: { case: bgvCase } } = await initiateResponse.json();
console.log('BGV Case ID:', bgvCase.caseId);

// 2. Upload document
const formData = new FormData();
formData.append('document', fileInput.files[0]);
formData.append('documentType', 'AADHAAR');
formData.append('checkType', 'IDENTITY');

await fetch(`/api/bgv/case/${bgvCase._id}/upload-document`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>'
  },
  body: formData
});

// 3. Verify check
const checkId = bgvCase.checks[0]._id;
await fetch(`/api/bgv/check/${checkId}/verify`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'VERIFIED',
    internalRemarks: 'Verified via UIDAI API',
    verificationMethod: 'API'
  })
});

// 4. Close BGV
await fetch(`/api/bgv/case/${bgvCase._id}/close`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    decision: 'APPROVED',
    remarks: 'All checks cleared'
  })
});

// 5. Generate report
await fetch(`/api/bgv/case/${bgvCase._id}/generate-report`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>'
  }
});
```

---

## 📞 Support

For API issues or questions:
- **Email**: api-support@company.com
- **Slack**: #bgv-api-support
- **Documentation**: https://docs.company.com/bgv-api

---

**API Version**: 1.0  
**Last Updated**: 2026-02-06  
**Status**: ✅ Production Ready
