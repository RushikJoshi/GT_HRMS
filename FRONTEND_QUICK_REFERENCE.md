# Frontend Document Management - Quick Reference

## 📁 Files Created

```
frontend/
├── services/DocumentManagementService.js
├── hooks/useDocumentManagement.js
└── components/
    ├── DocumentManagementPanel.jsx
    ├── DocumentManagementPanel.css
    ├── DocumentAuditTrail.jsx
    └── DocumentAuditTrail.css
```

## 🚀 Quick Start (3 Steps)

### Step 1: Import
```javascript
import DocumentManagementPanel from './components/DocumentManagementPanel';
```

### Step 2: Use
```javascript
<DocumentManagementPanel 
  letter={letterData}
  userRole="hr"
/>
```

### Step 3: Run
```javascript
// That's it! The component handles everything
```

## 📊 API Methods

### Service Methods
```javascript
import DocumentManagementService from '../services/DocumentManagementService';

// Get document status
await DocumentManagementService.getDocumentStatus(documentId);

// Revoke a letter
await DocumentManagementService.revokeLetter(documentId, reason, details);

// Reinstate a letter (super-admin only)
await DocumentManagementService.reinstateLetter(revocationId, reason);

// Get audit trail
await DocumentManagementService.getAuditTrail(documentId, filters);

// Get revocation history
await DocumentManagementService.getRevocationHistory(documentId);

// Check user access
await DocumentManagementService.checkDocumentAccess(documentId);
```

### Hook Methods
```javascript
import { useDocumentManagement } from '../hooks/useDocumentManagement';

const {
  // State
  status, auditTrail, revocationHistory, loading, error, hasAccess,
  
  // Methods
  fetchStatus, fetchAuditTrail, fetchRevocationHistory,
  revoke, reinstate, checkAccess, clearError,
  
  // Computed
  isRevoked, canRevoke, canReinstate
} = useDocumentManagement(documentId);
```

## 🎨 Component Props

| Component | Required Props | Optional Props |
|-----------|-----------------|-----------------|
| DocumentManagementPanel | letter, userRole | onLetterUpdated, showAuditTrail |
| LetterStatusBadge | status | size |
| RevokeLetterModal | onConfirm, onCancel | - |
| DocumentAuditTrail | documentId, auditTrail | loading, onRefresh |

## 🔐 Authentication

```javascript
// Set token before using components
localStorage.setItem('authToken', token);

// Service automatically includes: Authorization: Bearer {token}
```

## 👥 Roles & Permissions

| Role | Revoke | Reinstate | View Audit |
|------|--------|-----------|-----------|
| employee | ❌ | ❌ | ❌ |
| hr | ✅ | ❌ | ✅ |
| admin | ✅ | ❌ | ✅ |
| super-admin | ✅ | ✅ | ✅ |

## 🎯 Common Tasks

### Display Letter with Management Panel
```javascript
function LetterView({ letterId }) {
  const [letter, setLetter] = useState(null);
  
  useEffect(() => {
    // Fetch letter from your API
    getLetter(letterId).then(setLetter);
  }, [letterId]);
  
  return (
    <DocumentManagementPanel 
      letter={letter}
      userRole={localStorage.getItem('userRole')}
    />
  );
}
```

### Revoke a Letter (Using Hook)
```javascript
function RevokeButton({ letterId }) {
  const { revoke, loading } = useDocumentManagement(letterId);
  
  const handleClick = async () => {
    await revoke('Business reason', { details: 'Additional info' });
  };
  
  return <button onClick={handleClick} disabled={loading}>Revoke</button>;
}
```

### Display Audit Trail
```javascript
function AuditView({ documentId }) {
  const { auditTrail, loading, fetchAuditTrail } = useDocumentManagement(documentId);
  
  return (
    <DocumentAuditTrail 
      documentId={documentId}
      auditTrail={auditTrail}
      loading={loading}
      onRefresh={fetchAuditTrail}
    />
  );
}
```

## 🐛 Debugging

### Check Auth Token
```javascript
console.log('Token:', localStorage.getItem('authToken'));
```

### Check User Role
```javascript
console.log('Role:', localStorage.getItem('userRole'));
```

### View Hook State
```javascript
const state = useDocumentManagement(documentId);
console.log('State:', state);
```

### Check Errors
```javascript
const { error, clearError } = useDocumentManagement(documentId);
if (error) console.error('Error:', error);
```

## 📱 Features

- ✅ Status display with professional badges
- ✅ Revocation workflow with modal
- ✅ Reinstatement (super-admin)
- ✅ Audit trail with filtering
- ✅ Revocation history
- ✅ Role-based access control
- ✅ Error handling and loading states
- ✅ Dark mode support
- ✅ Mobile responsive
- ✅ Accessibility compliant

## 📚 Documentation

- `FRONTEND_INTEGRATION_GUIDE.md` - Full integration guide with examples
- `FRONTEND_IMPLEMENTATION_COMPLETE.md` - Complete system overview

## 🔗 Backend API Endpoints

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/documents/{id}/status` | Public |
| POST | `/api/documents/{id}/revoke` | HR/Admin |
| POST | `/api/revocations/{id}/reinstate` | Super-Admin |
| GET | `/api/documents/{id}/audit-trail` | HR/Admin |
| GET | `/api/documents/{id}/revocation-history` | HR/Admin |
| GET | `/api/documents/{id}/enforce-access` | Auth'd |

## ⚙️ Configuration

### Token Storage
```javascript
// Default: localStorage.getItem('authToken')
// Modify DocumentManagementService.getAuthToken() for alternatives
```

### Base URL
```javascript
// Update baseURL in DocumentManagementService constructor
const baseURL = 'http://your-api.com';
```

## 🧪 Testing Snippet

```javascript
import { render, screen } from '@testing-library/react';
import DocumentManagementPanel from './DocumentManagementPanel';

test('renders panel', () => {
  render(
    <DocumentManagementPanel 
      letter={{ _id: '1', candidateName: 'John', status: 'active' }}
      userRole="hr"
    />
  );
  expect(screen.getByText('John')).toBeInTheDocument();
});
```

## ❌ Common Errors & Fixes

| Error | Fix |
|-------|-----|
| Cannot find module | Check file paths and imports |
| 401 Unauthorized | Set authToken in localStorage |
| 403 Forbidden | Check user role and permissions |
| Styling not working | Ensure CSS files in same directory |
| Dark mode not working | Browser must support prefers-color-scheme |

## 💡 Best Practices

1. Always set auth token before rendering
2. Handle errors with try/catch
3. Show loading states to users
4. Check user role before sensitive operations
5. Clear errors when dismissing error messages
6. Test with real backend API before deploy
7. Verify dark mode on target devices
8. Test responsive design on mobile

## 📞 Support

For detailed help:
- See `FRONTEND_INTEGRATION_GUIDE.md` for integration examples
- See `FRONTEND_IMPLEMENTATION_COMPLETE.md` for system overview
- Check component source files for JSDoc comments

---

**System Status: ✅ Production Ready**

All files are created, tested, and ready for integration.
