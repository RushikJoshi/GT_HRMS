# 📋 Production-Grade Document Management System with Offer Revocation

## Overview

This implementation adds enterprise-ready document lifecycle management to the HRMS system with:

- ✅ **Offer Revocation** - Professional, non-destructive revocation workflow
- ✅ **Audit Trail** - Immutable logs of all document interactions
- ✅ **Access Control** - Tokenized URLs and permission validation
- ✅ **Email Notifications** - Professional, legally-safe templates
- ✅ **Role-Based Security** - HR, Admin, Super-Admin permissions
- ✅ **Zero Regression** - Existing functionality untouched

## Architecture

### New Models

#### 1. **DocumentAudit** (`backend/models/DocumentAudit.js`)
Immutable audit trail of all document actions:
- Who performed action (userId, role)
- What action (created, viewed, downloaded, revoked, etc.)
- When it happened (timestamp, timezone)
- IP address for security tracking
- Custom metadata for context

**Key Features:**
- Indexed by tenant, document, action, and timestamp
- Pre-query hooks for consistency
- Immutable records (timestamps cannot be changed)

#### 2. **DocumentAccess** (`backend/models/DocumentAccess.js`)
Secure tokenized access management:
- Generate unique access tokens for sharing
- Track who has access to what documents
- Support time-limited access (expiration)
- Revoke access without deleting documents
- Monitor access counts and frequency

**Key Features:**
- Crypto-secure token generation
- Automatic token generation on save
- Virtual getters for expiration checks
- Sparse indices for optional fields

#### 3. **LetterRevocation** (`backend/models/LetterRevocation.js`)
Complete revocation event tracking:
- Track who revoked and when
- Store revocation reason (enum: duplicate_offer, candidate_rejected, etc.)
- Support reinstatement by super-admin only
- Document snapshot for recovery
- Notification tracking

**Key Features:**
- Supports reinstatement workflow
- Stores document state snapshot
- Email notification tracking
- Soft-delete capability

### New Services

#### 1. **DocumentManagementService** (`backend/services/DocumentManagementService.js`)

Core business logic for document lifecycle:

```javascript
// Create audit log
await docService.logAuditAction({
    tenantId,
    documentId,
    action: 'revoked',
    performedBy: userId,
    reason: 'Position cancelled'
});

// Revoke letter
const revocation = await docService.revokeLetter({
    generatedLetterId,
    revokedBy: userId,
    reason: 'business_decision',
    reasonDetails: 'Position eliminated'
});

// Reinstate (super-admin only)
await docService.reinstateLetter(revocationId, {
    reinstatedBy: superAdminId,
    reinstatedByRole: 'super_admin'
});

// Check status
const status = await docService.getDocumentStatus(documentId, tenantId);
// Returns: { letterStatus, isRevoked, revokedAt, revokedBy, ... }

// Enforce access
try {
    const result = await docService.enforceAccessControl(documentId, userId, tenantId);
    // Document is accessible
} catch (err) {
    // Document revoked or expired
}
```

#### 2. **EmailNotificationService** (`backend/services/EmailNotificationService.js`)

Professional email templates and delivery:

```javascript
// Send offer assignment email
await emailService.sendOfferAssignmentEmail({
    email: 'candidate@example.com',
    name: 'John Doe',
    positionTitle: 'Software Engineer',
    companyName: 'Tech Corp',
    ctcAmount: '10,00,000',
    joiningDate: '15th Feb, 2026',
    offerLink: 'https://...',
    hrContactEmail: 'hr@company.com'
});

// Send revocation email (legally safe wording)
await emailService.sendOfferRevocationEmail({
    email: 'candidate@example.com',
    name: 'Jane Doe',
    positionTitle: 'Manager',
    revocationReason: 'position_cancelled',
    revocationDetails: 'Position has been cancelled due to...'
});

// Send status update
await emailService.sendStatusUpdateEmail({
    email: 'user@example.com',
    name: 'User',
    letterType: 'Joining Letter',
    oldStatus: 'draft',
    newStatus: 'sent',
    updateReason: 'Generated and assigned'
});
```

**Features:**
- HTML templated emails
- Professional formatting
- Retry logic with exponential backoff
- Dynamic placeholder substitution
- No-reply sender configuration

### New Controller Methods

Added to `backend/controllers/letter.controller.js`:

```javascript
// Get document status
GET /api/letters/documents/:documentId/status

// Revoke letter (HR/Admin)
POST /api/letters/documents/:documentId/revoke
Body: { reason, reasonDetails }

// Reinstate letter (Super-Admin only)
POST /api/letters/revocations/:revocationId/reinstate
Body: { reinstatedReason }

// Get audit trail (HR/Admin)
GET /api/letters/documents/:documentId/audit-trail?limit=100

// Get revocation history (HR/Admin)
GET /api/letters/documents/:documentId/revocation-history

// Enforce access (Before serving document)
GET /api/letters/documents/:documentId/enforce-access
```

### Routes

New routes file: `backend/routes/letter.revocation.routes.js`

```javascript
// In app.js or routes/index.js, add:
const letterRevocationRoutes = require('./routes/letter.revocation.routes');
app.use('/api/letters', letterRevocationRoutes);
```

## Workflow Examples

### Offer Revocation Workflow

```
1. HR receives notice to revoke offer for John Doe
   ↓
2. HR goes to dashboard, finds offer letter
   ↓
3. HR clicks "Revoke Offer" button
   ↓
4. System shows confirmation modal with reason selection
   ↓
5. HR selects "position_cancelled" and enters details
   ↓
6. System:
   - Marks document as REVOKED in DB
   - Disables all access tokens
   - Logs audit event
   - Sends email to John
   - Records revocation event
   ↓
7. Email arrives: "Important Update - Your Offer Letter"
   - Professional, non-accusatory wording
   - HR contact information
   - Option to appeal
   ↓
8. John sees revoked status on his dashboard
   - Cannot download anymore
   - Views reason
   ↓
9. HR admin can pull full audit trail:
   - When revoked
   - Who revoked it
   - Why
   - Who received notification
```

### Reinstatement Workflow

```
1. Super-admin receives appeal from candidate
   ↓
2. Super-admin verifies situation changed
   ↓
3. Super-admin goes to document history
   ↓
4. Clicks "Reinstate" on revocation event
   ↓
5. System:
   - Marks revocation as "reinstated"
   - Restores document status
   - Logs reinstatement event
   - Creates new access tokens
   ↓
6. Candidate can now access offer again
   ↓
7. Full audit trail preserved:
   - Original creation
   - Revocation + reason
   - Reinstatement + reason
   - All timestamps and users
```

## Permission Model

| Role       | Revoke Letter | Reinstate | View Audit Trail | Access Documents |
|-----------|--------------|-----------|-----------------|------------------|
| Employee  | ❌           | ❌        | ❌              | ✅ (Own only)    |
| Intern    | ❌           | ❌        | ❌              | ✅ (Own only)    |
| Manager   | ❌           | ❌        | ❌              | ✅ (Team)        |
| HR        | ✅           | ❌        | ✅              | ✅ (All)         |
| Admin     | ✅           | ❌        | ✅              | ✅ (All)         |
| Super-Admin | ✅         | ✅        | ✅              | ✅ (All)         |

## Database Migration

**Non-breaking migration script:** `backend/migrations/001-document-management.js`

Run migration:
```bash
node backend/migrations/001-document-management.js
```

What it does:
1. ✅ Creates new collections (`document_audits`, `document_access`, `letter_revocations`)
2. ✅ Creates optimized indices
3. ✅ Extends `GeneratedLetter` with status tracking fields
4. ✅ Records migration in `_migrations` collection
5. ✅ Idempotent - safe to run multiple times
6. ✅ Zero data loss

## Email Templates

### Offer Assignment Email
```
Subject: Your Offer Letter - Action Required

Dear [Name],

Congratulations! We're pleased to extend you an offer for [Position] at [Company].

Position: Software Engineer
CTC: ₹10,00,000
Joining Date: 15th Feb, 2026
Validity: As specified

[Action Button: View Offer Letter]

Please review and confirm acceptance.
```

### Offer Revocation Email
```
Subject: Important Update - Your Offer Letter

Dear [Name],

We are writing to inform you of an important update regarding your offer for [Position].

Unfortunately, we are unable to proceed with the previously extended offer due to:
[Reason]: Position has been cancelled

This decision reflects business circumstances, not your qualifications.

For questions: [HR Contact]
```

### Status Update Email
```
Subject: Letter Status Update

Dear [Name],

Status has been updated:
- Previous: Draft
- Current: Sent
- Updated: [Date]
- Reason: [Reason]
```

## Implementation Checklist

- [x] Models created (DocumentAudit, DocumentAccess, LetterRevocation)
- [x] Services implemented (DocumentManagementService, EmailNotificationService)
- [x] Controller methods added (6 new endpoints)
- [x] Routes created (letter.revocation.routes.js)
- [x] Database migration script (non-breaking, idempotent)
- [x] Email templates (professional, legally-safe)
- [x] Unit tests framework
- [x] Full backward compatibility
- [ ] UI Components (React/Vue components for status badges, revocation modal)
- [ ] Frontend integration
- [ ] Production testing
- [ ] Deployment

## Usage Examples

### Backend API Usage

```javascript
// In controller or service
const DocumentManagementService = require('./services/DocumentManagementService');
const service = new DocumentManagementService(req.tenantDB);

// Log an action
await service.logAuditAction({
    tenantId: req.user.tenantId,
    documentId: letter._id,
    action: 'downloaded',
    performedBy: req.user.id,
    performedByRole: req.user.role
});

// Revoke a document
const revocation = await service.revokeLetter({
    tenantId: req.user.tenantId,
    generatedLetterId: letter._id,
    applicantId: applicant._id,
    revokedBy: req.user.id,
    revokedByRole: req.user.role,
    reason: 'duplicate_offer',
    reasonDetails: 'Candidate accepted another offer'
});

// Get audit trail
const trail = await service.getAuditTrail(letter._id, req.user.tenantId);
trail.forEach(entry => {
    console.log(`${entry.action} by ${entry.performedBy} at ${entry.timestamp}`);
});
```

### Frontend Integration

```javascript
// Check if document is accessible
async function canAccessDocument(documentId) {
    try {
        const response = await fetch(`/api/letters/documents/${documentId}/status`);
        const status = await response.json();
        
        if (status.data.isRevoked) {
            showError(`Document was revoked: ${status.data.revocationReason}`);
            return false;
        }
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

// Revoke offer (admin only)
async function revokeOffer(documentId, reason, details) {
    const response = await fetch(`/api/letters/documents/${documentId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            reason,
            reasonDetails: details
        })
    });
    
    const result = await response.json();
    if (result.success) {
        showSuccess('Offer revoked and notification sent');
        reloadPage();
    }
}

// View audit trail (HR only)
async function viewAuditTrail(documentId) {
    const response = await fetch(`/api/letters/documents/${documentId}/audit-trail`);
    const data = await response.json();
    
    displayTable(data.data.auditTrail, [
        'action', 'performedBy', 'timestamp', 'ipAddress'
    ]);
}
```

## Testing

Run tests:
```bash
npm test

# Or specific test file
mocha backend/tests/document-management.test.js
```

Test coverage includes:
- ✅ Service logic
- ✅ Permission validation
- ✅ Email generation
- ✅ Audit logging
- ✅ Access control
- ✅ Revocation workflow
- ✅ Reinstatement workflow

## Security Considerations

### 1. Permission Verification
- Only HR/Admin can revoke
- Only Super-Admin can reinstate
- All actions tied to user identity and role

### 2. Audit Trail
- Immutable records (timestamps set at creation, cannot change)
- IP address logged for forensics
- User agent captured for device tracking
- Complete action history maintained

### 3. Access Control
- Revoked documents instantly inaccessible
- All access tokens disabled on revocation
- Soft-delete support for recovery
- No permanent data loss

### 4. Data Protection
- Tenant isolation enforced
- Sensitive data (revision reasons) logged securely
- Email notifications sent through official channels
- Revision records available only to HR+

## Maintenance & Support

### Monitoring

Monitor audit trail for suspicious patterns:
```javascript
// Get all revocations by a user
db.collection('letter_revocations')
  .find({ revokedBy: userId, isActive: true })
  .sort({ revokedAt: -1 })
```

### Cleanup

Soft-deleted records can be cleaned up:
```javascript
// Archive old inactive revocations (after 1 year)
db.collection('letter_revocations').deleteMany({
    isActive: false,
    revokedAt: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
});
```

### Scaling

The system is designed for scale:
- Compound indices for fast queries
- Tenant isolation
- Immutable audit trail (no write conflicts)
- Suitable for multi-tenant deployments

## Known Limitations

1. Email delivery retry uses simple exponential backoff (not queued)
2. Reinstatement requires super-admin role (cannot be delegated)
3. Audit trail is immutable (only super-admin can archive old records)
4. Revocation reason is limited to predefined enum values

## Future Enhancements

- [ ] Email queue system (RabbitMQ/Redis)
- [ ] Revocation reason customization
- [ ] Bulk revocation operations
- [ ] Audit trail export (CSV/PDF)
- [ ] Dashboard analytics (revocation trends)
- [ ] Webhook notifications for integrations
- [ ] Document versioning system

## Support

For issues or questions:
1. Check audit trail for error details
2. Review email service logs
3. Verify user permissions
4. Check tenant database configuration
5. Review migration status
