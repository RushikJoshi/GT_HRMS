# Document Management System - Quick Reference

## 🚀 Start Here

This is a **quick reference cheat sheet** for the document management system implementation. For detailed info, see the full guides.

---

## Files You Need to Know

### Backend

| File | Purpose | Lines |
|------|---------|-------|
| `models/DocumentAudit.js` | Immutable audit trail | 118 |
| `models/DocumentAccess.js` | Access tokens & permissions | 117 |
| `models/LetterRevocation.js` | Revocation tracking | 136 |
| `services/DocumentManagementService.js` | Core business logic | 366 |
| `services/EmailNotificationService.js` | Email templates + retry | 456 |
| `routes/letter.revocation.routes.js` | API endpoints | 143 |
| `controllers/letter.controller.js` | 6 new methods added | +205 |
| `migrations/001-document-management.js` | Database setup | 412 |

### Frontend

| File | Purpose | Lines |
|------|---------|-------|
| `components/LetterStatusBadge.jsx` | Status indicator component | 78 |
| `components/LetterStatusBadge.css` | Badge styling | 300+ |
| `components/RevokeLetterModal.jsx` | Revocation dialog | 254 |
| `components/RevokeLetterModal.css` | Modal styling | 400+ |

---

## Integration Checklist

```bash
# 1. Run migration
node backend/migrations/001-document-management.js

# 2. Import routes in backend/routes/index.js
const letterRevocationRoutes = require('./letter.revocation.routes');
app.use('/api/documents', letterRevocationRoutes(auth, db));

# 3. Import CSS in frontend
@import url('./components/LetterStatusBadge.css');
@import url('./components/RevokeLetterModal.css');

# 4. Use components in React
import LetterStatusBadge from './components/LetterStatusBadge';
import RevokeLetterModal from './components/RevokeLetterModal';
```

---

## API Endpoints (6 Total)

### 1. Check Status
```javascript
GET /api/documents/{id}/status
→ { status, isRevoked, revokedAt, revokedReason, ... }
```

### 2. Revoke Letter
```javascript
POST /api/documents/{id}/revoke
Roles: HR, Admin
Body: { reason, details, notifyCandidate }
→ { success, revocationId, status, ... }
```

### 3. Reinstate Letter
```javascript
POST /api/revocations/{id}/reinstate
Roles: Super-Admin ONLY
Body: { reason }
→ { success, restoredAt, ... }
```

### 4. Get Audit Trail
```javascript
GET /api/documents/{id}/audit-trail
Roles: HR, Admin
→ [ { action, performedBy, timestamp, ... }, ... ]
```

### 5. Get Revocation History
```javascript
GET /api/documents/{id}/revocation-history
Roles: HR, Admin
→ [ { revokedAt, revokedBy, reason, status, ... }, ... ]
```

### 6. Enforce Access
```javascript
GET /api/documents/{id}/enforce-access
Roles: Authenticated
→ { hasAccess, canView, canDownload, message }
```

---

## Component Usage

### LetterStatusBadge

```jsx
import LetterStatusBadge from './LetterStatusBadge';

<LetterStatusBadge 
  status="revoked"  // draft, generated, assigned, viewed, downloaded, revoked, expired
  revokedReason="POLICY_VIOLATION"
  onStatusClick={() => showDetails()}
/>
```

**Status Values:**
- `draft` - Newly created
- `generated` - Template processed
- `assigned` - Sent to candidate
- `viewed` - Candidate opened
- `downloaded` - Candidate downloaded
- `revoked` - HR revoked
- `expired` - Expired

### RevokeLetterModal

```jsx
import RevokeLetterModal from './RevokeLetterModal';
import { useState } from 'react';

function LetterRow() {
  const [showModal, setShowModal] = useState(false);

  const handleRevoke = async (reason, details) => {
    const response = await fetch(`/api/documents/${letterId}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, details })
    });
    // Handle response...
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>Revoke</button>
      
      {showModal && (
        <RevokeLetterModal
          isOpen={true}
          letterId="letter_123"
          letterType="OFFER"
          candidateName="John Doe"
          onConfirm={handleRevoke}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
```

**Revocation Reasons:**
- `POLICY_VIOLATION` - Policy breach
- `LEGAL_ISSUE` - Legal constraints
- `ECONOMIC_DOWNTURN` - Business reason
- `CANDIDATE_REQUEST` - Candidate declined
- `POSITION_CANCELLED` - Role removed
- `HIRING_FREEZE` - Company freeze
- `OTHER` - Other reason

---

## Service Methods

### DocumentManagementService

```javascript
const DMS = require('./services/DocumentManagementService');

// Log action to audit trail
await DMS.logAuditAction({
  tenantId, documentId, action, performedBy, ...
});

// Revoke document
await DMS.revokeLetter({
  tenantId, documentId, reason, revokedBy, ...
});

// Reinstate document (super-admin)
await DMS.reinstateLetter({
  revocationId, reason, reinstatedBy, ...
});

// Get current status
const status = await DMS.getDocumentStatus({ tenantId, documentId });

// Get audit trail
const trail = await DMS.getAuditTrail({ tenantId, documentId });

// Generate secure token
const token = await DMS.generateAccessToken({
  documentId, grantedToUserId, accessLevel, expiresIn
});

// Verify token valid
const valid = await DMS.validateAccessToken(token);
```

### EmailNotificationService

```javascript
const EMS = require('./services/EmailNotificationService');

// Send revocation email
await EMS.sendOfferRevocationEmail({
  candidateEmail,
  candidateName,
  position,
  revokedReason
});

// Send assignment email
await EMS.sendOfferAssignmentEmail({
  candidateEmail,
  candidateName,
  position,
  salary
});

// Send generic update
await EMS.sendStatusUpdateEmail({
  recipientEmail,
  subject,
  message
});
```

---

## Common Tasks

### Task 1: Display Status for a Letter

```jsx
import LetterStatusBadge from './LetterStatusBadge';

function LetterCard({ letter }) {
  return (
    <div>
      <h3>{letter.candidateName}</h3>
      <LetterStatusBadge 
        status={letter.status}
        revokedReason={letter.revokedReason}
      />
    </div>
  );
}
```

### Task 2: Revoke a Letter

```javascript
async function revokeLetter(letterId) {
  const response = await fetch(`/api/documents/${letterId}/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      reason: 'POLICY_VIOLATION',
      details: 'Applicant requested to withdraw'
    })
  });

  if (response.ok) {
    const result = await response.json();
    console.log('Revoked:', result.revocationId);
    // Refresh UI
  } else {
    console.error('Failed:', await response.text());
  }
}
```

### Task 3: Show Audit Trail

```javascript
async function showAuditTrail(letterId) {
  const response = await fetch(
    `/api/documents/${letterId}/audit-trail`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const events = await response.json();
  console.log('Audit Events:');
  events.forEach(event => {
    console.log(`${event.timestamp}: ${event.action} by ${event.performedBy}`);
  });
}
```

### Task 4: Check if Revoked

```javascript
async function isLetterRevoked(letterId) {
  const response = await fetch(`/api/documents/${letterId}/status`);
  const data = await response.json();
  
  if (data.isRevoked) {
    console.log(`Revoked: ${data.revokedReason}`);
    console.log(`By: ${data.revokedBy}`);
    console.log(`At: ${data.revokedAt}`);
    return true;
  }
  return false;
}
```

---

## Debugging

### Check Migration Applied
```javascript
db._migrations.findOne({ name: '001-document-management' })
// Should return object with appliedAt timestamp
```

### View Recent Audit Events
```javascript
db.documentaudits.find({ tenantId: "..." })
  .sort({ createdAt: -1 })
  .limit(10)
```

### Check Revocation Status
```javascript
db.letterrevocations.findOne({ 
  generatedLetterId: "letter_123",
  isActive: true
})
```

### View Access Tokens
```javascript
db.documentaccesses.find({ 
  tenantId: "...",
  isActive: true,
  expiresAt: { $gt: new Date() }
})
```

---

## Roles & Permissions

| Action | Public | Employee | HR | Admin | Super-Admin |
|--------|--------|----------|-----|-------|------------|
| View Status | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Own Audit | - | ✓ | - | - | - |
| Revoke | - | - | ✓ | ✓ | ✓ |
| View Full Audit | - | - | ✓ | ✓ | ✓ |
| Reinstate | - | - | - | - | ✓ |
| Delete Record | - | - | - | - | ✓ |

---

## Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| 404 Document not found | Letter doesn't exist | Check ID, check tenant |
| 403 Insufficient permissions | User not HR/Admin/Super-Admin | Check user role |
| 400 Already revoked | Can't revoke twice | Check status first |
| 400 Invalid revocation reason | Reason not in enum | Use valid reason |
| 500 Email delivery failed | Email service error | Check email config |
| 409 Reinstatement failed | Letter already active | Check status first |

---

## Environment Variables

```env
# Required for email notifications
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@company.com
EMAIL_PASS=app-password
EMAIL_FROM_NAME=HR Department
EMAIL_REPLY_TO=hr@company.com

# Optional feature flags
REVOCATION_NOTIFICATION_ENABLED=true
AUDIT_LOG_ENABLED=true

# Configuration
SECURE_ACCESS_TOKEN_EXPIRY=7d
EMAIL_RETRY_ATTEMPTS=3
```

---

## Testing

```bash
# Run all tests
npm test

# Run document management tests only
npm test -- document-management.test.js

# Run specific test
npm test -- --grep "revocation"
```

---

## Performance Tips

1. **Always include tenantId** in queries for speed
2. **Batch audit logs** for high-volume operations
3. **Cache user roles** to reduce permission checks
4. **Use pagination** for audit trail views
5. **Archive old audit** entries (see future enhancements)

---

## Common Gotchas

❌ **Don't** revoke the same letter twice
✓ **Do** check status first

❌ **Don't** use invalid revocation reasons
✓ **Do** use enum values from schema

❌ **Don't** reinstate as HR
✓ **Do** use Super-Admin for reinstate

❌ **Don't** expose email credentials in code
✓ **Do** use environment variables

❌ **Don't** modify audit records
✓ **Do** create new audit entries for changes

---

## Documentation Links

| Document | Purpose |
|----------|---------|
| [DOCUMENT_MANAGEMENT_README.md](DOCUMENT_MANAGEMENT_README.md) | Full reference guide |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Step-by-step integration |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Deployment procedures |
| [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) | Project summary |

---

## Quick Deploy

```bash
# 1. Database
node backend/migrations/001-document-management.js

# 2. Backend (add to routes/index.js)
const letterRevocationRoutes = require('./letter.revocation.routes');
app.use('/api/documents', letterRevocationRoutes(auth, db));

# 3. Frontend (add to main CSS)
@import url('./components/LetterStatusBadge.css');
@import url('./components/RevokeLetterModal.css');

# 4. Test
curl http://localhost:5000/api/documents/test/status

# 5. Deploy
npm start
```

---

## Getting Help

1. **Quick answers**: Check this file
2. **How-to guides**: See INTEGRATION_GUIDE.md
3. **Full reference**: See DOCUMENT_MANAGEMENT_README.md
4. **Deployment**: See DEPLOYMENT_CHECKLIST.md
5. **Code examples**: See document-management.test.js

---

**Last Updated**: 2024
**Version**: 1.0 - Quick Reference
**For**: Developers & DevOps Teams
