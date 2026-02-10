# Document Management System - API Documentation

## Overview

Complete REST API documentation for the document management system with revocation functionality. All endpoints are production-ready with full error handling and role-based access control.

---

## Base URL

```
https://hrms.company.com/api
```

## Authentication

All endpoints (except status check) require:
```
Authorization: Bearer {JWT_TOKEN}
```

## Content-Type

All requests and responses use:
```
Content-Type: application/json
```

---

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "data": {
    // endpoint-specific data
  },
  "message": "Operation successful"
}
```

### Error Response (400-500)
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // additional error context
  }
}
```

---

## Endpoints

### 1. Check Document Status

**Endpoint:** `GET /documents/{documentId}/status`

**Authentication:** Optional (public check allowed)

**Role Requirements:** None (public read)

**Purpose:** Check if a document is revoked or active

**Request:**
```bash
GET /api/documents/letter_123/status
```

**Response (200 - Active):**
```json
{
  "success": true,
  "data": {
    "documentId": "letter_123",
    "tenantId": "company_456",
    "status": "active",
    "isRevoked": false,
    "revokedAt": null,
    "revokedBy": null,
    "revokedReason": null,
    "revokedDetails": null,
    "canBeReinstate": false,
    "requestedAt": "2024-01-15T10:30:45Z"
  },
  "message": "Document status retrieved successfully"
}
```

**Response (200 - Revoked):**
```json
{
  "success": true,
  "data": {
    "documentId": "letter_123",
    "tenantId": "company_456",
    "status": "revoked",
    "isRevoked": true,
    "revokedAt": "2024-01-15T10:30:00Z",
    "revokedBy": "hr_user_789",
    "revokedReason": "POLICY_VIOLATION",
    "revokedDetails": "Applicant declined offer after acceptance",
    "canBeReinstate": true,
    "requestedAt": "2024-01-15T10:30:45Z"
  },
  "message": "Document is revoked"
}
```

**Response (404 - Not Found):**
```json
{
  "success": false,
  "error": "DOCUMENT_NOT_FOUND",
  "message": "Document not found",
  "details": {
    "documentId": "letter_123",
    "searchedAt": "2024-01-15T10:30:45Z"
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://hrms.company.com/api/documents/letter_123/status"
```

---

### 2. Revoke Letter

**Endpoint:** `POST /documents/{documentId}/revoke`

**Authentication:** Required

**Role Requirements:** HR, Admin, or Super-Admin

**Purpose:** Revoke an active offer or letter

**Request Body:**
```json
{
  "reason": "POLICY_VIOLATION",
  "details": "Applicant declined our offer",
  "notifyCandidate": true
}
```

**Parameters:**
- `reason` (required, string, enum)
  - `POLICY_VIOLATION` - Policy breach
  - `LEGAL_ISSUE` - Legal constraints
  - `ECONOMIC_DOWNTURN` - Business/economic reason
  - `CANDIDATE_REQUEST` - Candidate requested withdrawal
  - `POSITION_CANCELLED` - Position no longer available
  - `HIRING_FREEZE` - Company hiring freeze
  - `OTHER` - Other reasons

- `details` (optional, string, max 500 chars) - Additional context

- `notifyCandidate` (optional, boolean, default: true) - Send email notification

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "revocationId": "rev_789",
    "documentId": "letter_123",
    "status": "revoked",
    "revokedAt": "2024-01-15T10:35:00Z",
    "revokedBy": "hr_user_456",
    "revokedByRole": "HR",
    "reason": "POLICY_VIOLATION",
    "details": "Applicant declined offer",
    "auditEventId": "audit_012",
    "notificationSent": true,
    "notificationStatus": "delivered"
  },
  "message": "Document revoked successfully"
}
```

**Response (400 - Already Revoked):**
```json
{
  "success": false,
  "error": "ALREADY_REVOKED",
  "message": "Document is already revoked",
  "details": {
    "documentId": "letter_123",
    "revokedAt": "2024-01-14T15:00:00Z",
    "revokedBy": "admin_user_789"
  }
}
```

**Response (403 - Forbidden):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSIONS",
  "message": "Only HR, Admin, and Super-Admin can revoke documents",
  "details": {
    "userRole": "EMPLOYEE",
    "requiredRoles": ["HR", "ADMIN", "SUPER_ADMIN"]
  }
}
```

**Response (400 - Invalid Reason):**
```json
{
  "success": false,
  "error": "INVALID_REVOCATION_REASON",
  "message": "Invalid revocation reason provided",
  "details": {
    "provided": "INVALID_REASON",
    "validReasons": [
      "POLICY_VIOLATION",
      "LEGAL_ISSUE",
      "ECONOMIC_DOWNTURN",
      "CANDIDATE_REQUEST",
      "POSITION_CANCELLED",
      "HIRING_FREEZE",
      "OTHER"
    ]
  }
}
```

**cURL Example:**
```bash
curl -X POST "https://hrms.company.com/api/documents/letter_123/revoke" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "POLICY_VIOLATION",
    "details": "Applicant declined offer",
    "notifyCandidate": true
  }'
```

---

### 3. Reinstate Letter

**Endpoint:** `POST /revocations/{revocationId}/reinstate`

**Authentication:** Required

**Role Requirements:** Super-Admin ONLY

**Purpose:** Restore a revoked offer or letter

**Request Body:**
```json
{
  "reason": "Approval granted - Policy exception"
}
```

**Parameters:**
- `reason` (required, string, max 500 chars) - Reinstatement reason for audit

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "revocationId": "rev_789",
    "documentId": "letter_123",
    "status": "reinstated",
    "revokedAt": "2024-01-15T10:35:00Z",
    "reinstatedAt": "2024-01-15T11:00:00Z",
    "reinstatedBy": "super_admin_123",
    "reinstatedReason": "Approval granted - Policy exception",
    "previousStatus": "revoked",
    "newStatus": "active",
    "auditEventId": "audit_345"
  },
  "message": "Document reinstated successfully"
}
```

**Response (403 - Forbidden):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSIONS",
  "message": "Only Super-Admin can reinstate documents",
  "details": {
    "userRole": "HR",
    "requiredRole": "SUPER_ADMIN"
  }
}
```

**Response (400 - Not Revoked):**
```json
{
  "success": false,
  "error": "DOCUMENT_NOT_REVOKED",
  "message": "Document is not currently revoked",
  "details": {
    "revocationId": "rev_789",
    "currentStatus": "active"
  }
}
```

**Response (404 - Not Found):**
```json
{
  "success": false,
  "error": "REVOCATION_NOT_FOUND",
  "message": "Revocation record not found",
  "details": {
    "revocationId": "rev_789"
  }
}
```

**cURL Example:**
```bash
curl -X POST "https://hrms.company.com/api/revocations/rev_789/reinstate" \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Approval granted - Policy exception"
  }'
```

---

### 4. Get Audit Trail

**Endpoint:** `GET /documents/{documentId}/audit-trail`

**Authentication:** Required

**Role Requirements:** HR, Admin, or Super-Admin

**Query Parameters:**
- `limit` (optional, number, default: 50, max: 200) - Number of records
- `offset` (optional, number, default: 0) - Pagination offset
- `action` (optional, string) - Filter by action type
- `startDate` (optional, ISO date) - Filter from date
- `endDate` (optional, ISO date) - Filter to date

**Purpose:** Retrieve complete audit trail for a document

**Request:**
```bash
GET /api/documents/letter_123/audit-trail?limit=50&offset=0
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documentId": "letter_123",
    "tenantId": "company_456",
    "totalEvents": 12,
    "events": [
      {
        "auditId": "audit_001",
        "action": "revoked",
        "performedBy": "hr_user_789",
        "performedByRole": "HR",
        "performedByName": "John HR",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
        "timestamp": "2024-01-15T10:35:00Z",
        "oldStatus": "active",
        "newStatus": "revoked",
        "metadata": {
          "reason": "POLICY_VIOLATION",
          "details": "Applicant declined",
          "revocationId": "rev_789"
        }
      },
      {
        "auditId": "audit_002",
        "action": "assigned",
        "performedBy": "hr_user_789",
        "performedByRole": "HR",
        "performedByName": "John HR",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2024-01-15T09:00:00Z",
        "oldStatus": "generated",
        "newStatus": "assigned",
        "metadata": {
          "assignedTo": "candidate_456",
          "sentVia": "email"
        }
      },
      {
        "auditId": "audit_003",
        "action": "created",
        "performedBy": "system",
        "performedByRole": "SYSTEM",
        "performedByName": "System",
        "ipAddress": "127.0.0.1",
        "userAgent": "NodeJS/16.0.0",
        "timestamp": "2024-01-15T08:00:00Z",
        "oldStatus": null,
        "newStatus": "draft",
        "metadata": {
          "letterType": "OFFER",
          "position": "Software Engineer"
        }
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "totalPages": 1,
      "currentPage": 1
    }
  },
  "message": "Audit trail retrieved successfully"
}
```

**Response (403 - Forbidden):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSIONS",
  "message": "Only HR and Admin can view audit trails",
  "details": {
    "userRole": "EMPLOYEE"
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://hrms.company.com/api/documents/letter_123/audit-trail?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5. Get Revocation History

**Endpoint:** `GET /documents/{documentId}/revocation-history`

**Authentication:** Required

**Role Requirements:** HR, Admin, or Super-Admin

**Query Parameters:**
- `limit` (optional, number, default: 20) - Number of records
- `offset` (optional, number, default: 0) - Pagination offset

**Purpose:** Get revocation and reinstatement events for a document

**Request:**
```bash
GET /api/documents/letter_123/revocation-history
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documentId": "letter_123",
    "revocationEvents": [
      {
        "revocationId": "rev_789",
        "revokedAt": "2024-01-15T10:35:00Z",
        "revokedBy": "hr_user_456",
        "revokedByName": "Jane HR",
        "revokedByRole": "HR",
        "reason": "POLICY_VIOLATION",
        "details": "Applicant declined offer",
        "status": "reinstated",
        "reinstatedAt": "2024-01-15T11:00:00Z",
        "reinstatedBy": "admin_123",
        "reinstatedByName": "Admin User",
        "reinstatedReason": "Policy exception approved",
        "totalDurationMinutes": 25,
        "letterSnapshot": {
          "position": "Software Engineer",
          "salary": "120000",
          "benefits": "..."
        }
      },
      {
        "revocationId": "rev_790",
        "revokedAt": "2024-01-16T14:00:00Z",
        "revokedBy": "hr_user_456",
        "revokedByName": "Jane HR",
        "revokedByRole": "HR",
        "reason": "CANDIDATE_REQUEST",
        "details": "Candidate withdrew offer",
        "status": "active",
        "reinstatedAt": null,
        "reinstatedBy": null,
        "reinstatedReason": null,
        "totalDurationMinutes": null,
        "letterSnapshot": null
      }
    ],
    "totalRevocations": 2,
    "activelyRevoked": true,
    "currentRevocationId": "rev_790"
  },
  "message": "Revocation history retrieved successfully"
}
```

**cURL Example:**
```bash
curl -X GET "https://hrms.company.com/api/documents/letter_123/revocation-history" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 6. Enforce Document Access

**Endpoint:** `GET /documents/{documentId}/enforce-access`

**Authentication:** Required

**Role Requirements:** Authenticated user

**Purpose:** Check if current user can access a document

**Request:**
```bash
GET /api/documents/letter_123/enforce-access
```

**Response (200 - Allowed):**
```json
{
  "success": true,
  "data": {
    "documentId": "letter_123",
    "userId": "user_456",
    "hasAccess": true,
    "canView": true,
    "canDownload": true,
    "canPrint": true,
    "accessLevel": "FULL",
    "reason": "Document owner",
    "expiresAt": "2025-01-15T10:30:00Z",
    "accessToken": "secure_token_xyz",
    "checkedAt": "2024-01-15T10:35:00Z"
  },
  "message": "Access granted"
}
```

**Response (403 - Denied):**
```json
{
  "success": false,
  "error": "ACCESS_DENIED",
  "message": "You do not have permission to access this document",
  "details": {
    "reason": "Document is revoked",
    "revokedAt": "2024-01-15T10:30:00Z",
    "requestedAt": "2024-01-15T10:35:00Z"
  }
}
```

**Response (410 - Token Expired):**
```json
{
  "success": false,
  "error": "ACCESS_TOKEN_EXPIRED",
  "message": "Access token has expired",
  "details": {
    "expiredAt": "2024-01-22T10:30:00Z",
    "requestedAt": "2024-01-25T10:35:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://hrms.company.com/api/documents/letter_123/enforce-access" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Error Codes Reference

| Code | HTTP | Meaning |
|------|------|---------|
| `DOCUMENT_NOT_FOUND` | 404 | Document doesn't exist |
| `ALREADY_REVOKED` | 400 | Document already revoked |
| `INSUFFICIENT_PERMISSIONS` | 403 | User role not allowed |
| `INVALID_REVOCATION_REASON` | 400 | Invalid reason enum |
| `DOCUMENT_NOT_REVOKED` | 400 | Can't reinstate active doc |
| `REVOCATION_NOT_FOUND` | 404 | Revocation record missing |
| `ACCESS_DENIED` | 403 | User can't access document |
| `ACCESS_TOKEN_EXPIRED` | 410 | Token expired |
| `INVALID_REQUEST` | 400 | Missing required fields |
| `INTERNAL_ERROR` | 500 | Server error |
| `EMAIL_DELIVERY_FAILED` | 500 | Email couldn't be sent |
| `DATABASE_ERROR` | 500 | Database operation failed |

---

## Rate Limiting

All endpoints are rate-limited:
- **Standard**: 100 requests per minute per IP
- **Sensitive** (revoke, reinstate): 10 requests per minute per IP
- **Heavy** (audit-trail): 30 requests per minute per IP

**Response (429 - Rate Limited):**
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later.",
  "details": {
    "rateLimitReset": "2024-01-15T10:36:00Z",
    "retryAfter": 60
  }
}
```

---

## Request Examples by Language

### JavaScript/Node.js
```javascript
async function revokeLetter(letterId, reason) {
  const response = await fetch(
    `https://hrms.company.com/api/documents/${letterId}/revoke`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: reason,
        details: 'Additional context',
        notifyCandidate: true
      })
    }
  );

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return await response.json();
}
```

### Python
```python
import requests
import json

def revoke_letter(letter_id, reason, auth_token):
    url = f"https://hrms.company.com/api/documents/{letter_id}/revoke"
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'reason': reason,
        'details': 'Additional context',
        'notifyCandidate': True
    }
    
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API Error: {response.status_code}")
```

### PHP
```php
<?php
function revokeLetter($letterId, $reason, $authToken) {
    $url = "https://hrms.company.com/api/documents/$letterId/revoke";
    
    $payload = json_encode([
        'reason' => $reason,
        'details' => 'Additional context',
        'notifyCandidate' => true
    ]);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $authToken,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response);
}
?>
```

---

## Webhooks (Future Enhancement)

Coming in v2:
```
POST https://your-domain.com/webhooks/revocation
POST https://your-domain.com/webhooks/audit-event
```

---

## Changelog

### Version 1.0 (Current)
- Initial release
- 6 endpoints
- Document revocation
- Super-admin reinstatement
- Complete audit trail
- Email notifications

### Version 1.1 (Planned)
- Bulk revocation operations
- Scheduled revocations
- Webhook notifications
- Advanced filtering

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: Production Ready
