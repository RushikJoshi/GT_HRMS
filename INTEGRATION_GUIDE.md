# Document Management System - Integration Guide

## Quick Start: Integrating New Routes & Components

This guide covers integrating the document management system into your existing application. All code is backward compatible and non-intrusive.

---

## 1. Backend Routes Integration

### Step 1: Register Routes in Main Routes File

Add the following import to your main routes/index.js file:

```javascript
// routes/index.js
const letterRevocationRoutes = require('./letter.revocation.routes');

module.exports = (app, auth, db) => {
    // ... existing routes ...
    
    // Document Management Routes (NEW)
    app.use('/api/documents', letterRevocationRoutes(auth, db));
    
    // ... rest of routes ...
};
```

### Step 2: Models Registration (If Using Model Manager)

If your application uses a centralized model manager, add the following:

```javascript
// In your model registration file
const DocumentAudit = require('./models/DocumentAudit');
const DocumentAccess = require('./models/DocumentAccess');
const LetterRevocation = require('./models/LetterRevocation');

// Register with tenant database
tenantDB.model('DocumentAudit', DocumentAudit);
tenantDB.model('DocumentAccess', DocumentAccess);
tenantDB.model('LetterRevocation', LetterRevocation);
```

### Step 3: Run Migration Script

Execute the migration before deploying:

```bash
# In backend directory
node migrations/001-document-management.js

# Expected output:
# ✅ Migration 001-document-management applied successfully
```

---

## 2. Frontend Components Integration

### Step 1: Import CSS Files

Add the CSS imports to your main stylesheet or component:

```javascript
// App.jsx or main layout component
import '../components/LetterStatusBadge.css';
import '../components/RevokeLetterModal.css';
```

Or directly in your CSS:

```css
@import url('./components/LetterStatusBadge.css');
@import url('./components/RevokeLetterModal.css');
```

### Step 2: Import and Use Components

**Using LetterStatusBadge in Your Letter Display:**

```jsx
import LetterStatusBadge from '../components/LetterStatusBadge';

function LetterCard({ letter }) {
    return (
        <div className="letter-card">
            <h3>{letter.name}</h3>
            
            {/* Add status badge */}
            <LetterStatusBadge 
                status={letter.status}
                revokedReason={letter.revokedReason}
                onStatusClick={() => handleStatusClick(letter._id)}
            />
            
            {/* Rest of letter details */}
            <p>Position: {letter.position}</p>
            <p>Salary: {letter.salary}</p>
        </div>
    );
}
```

**Using RevokeLetterModal in HR Dashboard:**

```jsx
import { useState } from 'react';
import RevokeLetterModal from '../components/RevokeLetterModal';

function LetterManagementPanel({ letter }) {
    const [showRevokeModal, setShowRevokeModal] = useState(false);

    const handleRevoke = async (reason, details) => {
        try {
            const response = await fetch(
                `/api/documents/${letter._id}/revoke`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason, details })
                }
            );
            
            if (response.ok) {
                // Refresh letter data
                fetchLetterData();
                setShowRevokeModal(false);
            } else {
                throw new Error('Failed to revoke letter');
            }
        } catch (error) {
            console.error('Revocation error:', error);
        }
    };

    return (
        <>
            <button onClick={() => setShowRevokeModal(true)}>
                Revoke Letter
            </button>

            {showRevokeModal && (
                <RevokeLetterModal
                    isOpen={showRevokeModal}
                    letterId={letter._id}
                    letterType={letter.letterType}
                    candidateName={letter.candidateName}
                    onConfirm={handleRevoke}
                    onClose={() => setShowRevokeModal(false)}
                />
            )}
        </>
    );
}
```

---

## 3. API Usage Examples

### 3.1 Check Document Status

```javascript
// GET /api/documents/{documentId}/status
const getDocumentStatus = async (documentId) => {
    const response = await fetch(`/api/documents/${documentId}/status`);
    const data = await response.json();
    
    // Returns:
    // {
    //   status: "revoked" | "active" | "expired",
    //   isRevoked: boolean,
    //   revokedAt: ISO string,
    //   revokedBy: userId,
    //   revokedReason: string,
    //   canBeReinstate: boolean
    // }
    
    return data;
};
```

### 3.2 Revoke a Letter

```javascript
// POST /api/documents/{documentId}/revoke
// Required: HR or Admin role

const revokeLetter = async (documentId, reason, details) => {
    const response = await fetch(`/api/documents/${documentId}/revoke`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            reason,           // enum: POLICY_VIOLATION | LEGAL_ISSUE | ECONOMIC_DOWNTURN | etc
            details,          // optional string with additional context
            notifyCandidate: true
        })
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('Revocation failed:', error);
        throw error;
    }

    return await response.json();
};
```

### 3.3 Get Audit Trail

```javascript
// GET /api/documents/{documentId}/audit-trail
// Required: HR or Admin role

const getAuditTrail = async (documentId) => {
    const response = await fetch(
        `/api/documents/${documentId}/audit-trail`,
        {
            headers: { 'Authorization': `Bearer ${authToken}` }
        }
    );

    const data = await response.json();
    
    // Returns array of audit events:
    // [
    //   {
    //     action: "created" | "viewed" | "revoked",
    //     performedBy: "userId",
    //     timestamp: ISO string,
    //     metadata: { ... }
    //   },
    //   ...
    // ]

    return data;
};
```

### 3.4 Reinstate a Revoked Letter

```javascript
// POST /api/revocations/{revocationId}/reinstate
// Required: Super-Admin role ONLY

const reinstateLetterr = async (revocationId, reason) => {
    const response = await fetch(
        `/api/revocations/${revocationId}/reinstate`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ reason })
        }
    );

    if (!response.ok) {
        throw new Error('Only super-admin can reinstate letters');
    }

    return await response.json();
};
```

### 3.5 Generate Secure Access Token

```javascript
// In your backend code, use DocumentManagementService
const DocumentManagementService = require('./services/DocumentManagementService');

const generateShareLink = async (documentId, accessLevel, expiresIn) => {
    const token = await DocumentManagementService.generateAccessToken({
        documentId,
        grantedToUserId: currentUser._id,
        accessLevel: 'VIEW',  // or 'DOWNLOAD'
        expiresIn: '7d'  // Expires in 7 days
    });

    // Create shareable URL
    const shareUrl = `${process.env.FRONTEND_URL}/documents/view?token=${token}`;
    return shareUrl;
};
```

---

## 4. React Custom Hooks (Optional Enhancement)

Create reusable hooks for common operations:

```javascript
// hooks/useDocumentManagement.js
import { useState, useCallback } from 'react';

export function useDocumentManagement(documentId) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/documents/${documentId}/status`
            );
            const data = await response.json();
            setStatus(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    const revoke = useCallback(async (reason, details) => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/documents/${documentId}/revoke`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason, details })
                }
            );
            const data = await response.json();
            setStatus(data);
            setError(null);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    const getAuditTrail = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/documents/${documentId}/audit-trail`
            );
            return await response.json();
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    return { status, loading, error, fetchStatus, revoke, getAuditTrail };
}
```

Usage:

```jsx
function DocumentViewer({ documentId }) {
    const { status, loading, error, fetchStatus, revoke } = 
        useDocumentManagement(documentId);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <LetterStatusBadge status={status.status} />
            {status.isRevoked && (
                <div className="warning">
                    This letter has been revoked: {status.revokedReason}
                </div>
            )}
        </div>
    );
}
```

---

## 5. Deployment Checklist

### Pre-Deployment

- [ ] All models registered in tenant database
- [ ] Routes imported in main routes/index.js
- [ ] CSS files linked in frontend
- [ ] Email service configured (SMTP settings)
- [ ] Database backups created
- [ ] Migration script tested in staging

### Deployment

- [ ] Run migration script: `node migrations/001-document-management.js`
- [ ] Verify migration completed: Check `_migrations` collection
- [ ] Deploy backend code
- [ ] Deploy frontend components
- [ ] Clear browser cache
- [ ] Test revocation workflow end-to-end

### Post-Deployment

- [ ] Monitor error logs for 24 hours
- [ ] Verify email notifications being sent
- [ ] Check audit trails are being logged
- [ ] Confirm revoked letters show correct status
- [ ] Test super-admin reinstatement

### Rollback Procedure

If issues occur:

```javascript
// Revert migration (removes new collections)
db.collection('_migrations').deleteOne({ 
    name: '001-document-management' 
});

// Remove soft-delete fields from GeneratedLetter
db.collection('generatedletters').updateMany(
    { revokedAt: { $exists: true } },
    { 
        $unset: { 
            revokedAt: '', 
            revokedReason: '',
            revokedBy: ''
        }
    }
);
```

---

## 6. Configuration

### Email Service Configuration

Update your `.env` file:

```env
# Email Settings
EMAIL_SERVICE=gmail
EMAIL_USER=your-hr-email@company.com
EMAIL_PASS=your-app-password
EMAIL_FROM_NAME=HR Department
EMAIL_REPLY_TO=hr@company.com

# Document Management
REVOCATION_NOTIFICATION_ENABLED=true
AUDIT_LOG_ENABLED=true
SECURE_ACCESS_TOKEN_EXPIRY=7d
```

### Feature Flags

Optional configuration for gradual rollout:

```javascript
// config/featureFlags.js
module.exports = {
    ENABLE_DOCUMENT_REVOCATION: true,
    ENABLE_AUDIT_LOGGING: true,
    ENABLE_REVOCATION_EMAILS: true,
    REVOCATION_REQUIRES_APPROVAL: false
};
```

---

## 7. Troubleshooting

### Issue: Migration Fails

**Solution:**
```bash
# Check migration status
db.collection('_migrations').findOne({ name: '001-document-management' })

# If stuck, manually remove and retry
db.collection('_migrations').deleteOne({ name: '001-document-management' })
node migrations/001-document-management.js
```

### Issue: Routes Return 404

**Solution:**
- Verify routes file is imported in main routes/index.js
- Check auth middleware is properly initialized
- Verify user has correct roles (HR, Admin, Super-Admin)

### Issue: Revocation Emails Not Sending

**Solution:**
```javascript
// Check email service configuration
console.log('Email Service:', process.env.EMAIL_SERVICE);
console.log('Email User:', process.env.EMAIL_USER);

// Test email delivery
const EmailService = require('./services/EmailNotificationService');
await EmailService.sendTestEmail('test@company.com');
```

### Issue: Audit Trail Not Recording

**Solution:**
- Verify DocumentAudit model is registered
- Check _migrations collection shows migration applied
- Verify tenantId is properly passed in requests

---

## 8. Security Considerations

### Role-Based Access

- **HR Role**: Can revoke, view audit trails
- **Admin Role**: Can revoke, view audit trails, delete users
- **Super-Admin Role**: Can revoke, reinstate, approve, access all tenant data
- **Employee/Candidate**: Can only view own documents

### Data Isolation

- All audit records include tenantId
- Revocation tokens expire after configured period
- IP addresses and user agents logged for suspicious activity
- Immutable audit timestamps prevent tampering

### Compliance

- Non-destructive revocation (data preserved)
- Complete audit trail for legal discovery
- Email notifications for transparency
- Super-admin approval required for reinstatement

---

## 9. Performance Optimization

### Indexing Strategy

Indices automatically created by migration:

```javascript
// DocumentAudit indices
db.documentaudits.createIndex({ tenantId: 1, documentId: 1, timestamp: 1 })
db.documentaudits.createIndex({ tenantId: 1, action: 1, timestamp: -1 })
db.documentaudits.createIndex({ tenantId: 1, applicantId: 1, timestamp: -1 })

// DocumentAccess indices
db.documentaccesses.createIndex({ accessToken: 1 }, { unique: true })
db.documentaccesses.createIndex({ tenantId: 1, isActive: 1, expiresAt: 1 })

// LetterRevocation indices
db.letterrevocations.createIndex({ generatedLetterId: 1, isActive: 1 })
db.letterrevocations.createIndex({ tenantId: 1, status: 1, createdAt: -1 })
```

### Query Optimization

Always include tenantId in queries:

```javascript
// ❌ Slow: No tenant filter
db.documentaudits.find({ documentId })

// ✅ Fast: With tenant filter
db.documentaudits.find({ tenantId, documentId })

// ✅ Best: With indexes
db.documentaudits.find({ tenantId, documentId, timestamp: { $gt: date } })
    .sort({ timestamp: -1 })
    .limit(50)
```

---

## 10. Support & Maintenance

For issues, feature requests, or maintenance:

1. Check DOCUMENT_MANAGEMENT_README.md for detailed reference
2. Review test cases in document-management.test.js
3. Check error logs for detailed error messages
4. Contact DevOps team for database issues

---

**Last Updated:** 2024
**Version:** 1.0
**Maintainers:** HR Tech Team
