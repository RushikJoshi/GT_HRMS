# Frontend Document Management Integration Guide

This guide shows how to integrate the new document management functionality into existing pages and components.

## Architecture Overview

```
Frontend Service Layer
├─ DocumentManagementService (API Client)
│  └─ 6 methods for all document operations
├─ useDocumentManagement Hook (State Management)
│  └─ Manages all document-related state
└─ Components
   ├─ DocumentManagementPanel (Main UI)
   ├─ DocumentAuditTrail (Audit History)
   ├─ LetterStatusBadge (Status Display)
   └─ RevokeLetterModal (Revocation UI)
```

## Quick Start - 3 Steps

### Step 1: Import the Component

```javascript
import DocumentManagementPanel from '../components/DocumentManagementPanel';
```

### Step 2: Render with a Letter Object

```javascript
<DocumentManagementPanel 
  letter={letterData}
  userRole="hr"
  onLetterUpdated={handleLetterUpdate}
/>
```

### Step 3: Provide Letter Data

```javascript
const letterData = {
  _id: '507f1f77bcf86cd799439011',
  candidateName: 'John Doe',
  position: 'Software Engineer',
  department: 'Engineering',
  salary: 50000,
  status: 'active' // or 'revoked'
};
```

---

## Implementation Examples

### Example 1: Letter View Page

```javascript
import React, { useState, useEffect } from 'react';
import DocumentManagementPanel from './components/DocumentManagementPanel';
import { getLetter } from '../services/letterService';

function LetterViewPage({ letterId }) {
  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem('userRole'); // 'hr', 'admin', 'employee'

  useEffect(() => {
    const fetchLetter = async () => {
      try {
        const data = await getLetter(letterId);
        setLetter(data);
      } catch (error) {
        console.error('Failed to load letter:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLetter();
  }, [letterId]);

  if (loading) return <div>Loading...</div>;
  if (!letter) return <div>Letter not found</div>;

  const handleLetterUpdated = (updatedLetter) => {
    setLetter(updatedLetter);
    // Optionally show a success toast/notification
    console.log('Letter updated:', updatedLetter);
  };

  return (
    <div className="letter-view-page">
      <h1>Letter Details</h1>
      <DocumentManagementPanel 
        letter={letter}
        userRole={userRole}
        onLetterUpdated={handleLetterUpdated}
        showAuditTrail={true}
      />
    </div>
  );
}

export default LetterViewPage;
```

### Example 2: Letter List with Inline Management

```javascript
import React, { useState, useEffect } from 'react';
import DocumentManagementPanel from './components/DocumentManagementPanel';
import LetterStatusBadge from './components/LetterStatusBadge';
import { getLetters } from '../services/letterService';

function LetterListPage() {
  const [letters, setLetters] = useState([]);
  const [selectedLetterId, setSelectedLetterId] = useState(null);
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    const fetchLetters = async () => {
      try {
        const data = await getLetters();
        setLetters(data);
      } catch (error) {
        console.error('Failed to load letters:', error);
      }
    };

    fetchLetters();
  }, []);

  const handleLetterUpdated = (updatedLetter) => {
    setLetters(letters.map(letter => 
      letter._id === updatedLetter._id ? updatedLetter : letter
    ));
  };

  return (
    <div className="letter-list-page">
      <h1>Letters</h1>
      
      <table className="letters-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Position</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {letters.map(letter => (
            <tr key={letter._id}>
              <td>{letter.candidateName}</td>
              <td>{letter.position}</td>
              <td>
                <LetterStatusBadge status={letter.status} />
              </td>
              <td>
                <button onClick={() => setSelectedLetterId(letter._id)}>
                  Manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedLetterId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={() => setSelectedLetterId(null)}>✕</button>
            <DocumentManagementPanel 
              letter={letters.find(l => l._id === selectedLetterId)}
              userRole={userRole}
              onLetterUpdated={handleLetterUpdated}
              showAuditTrail={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LetterListPage;
```

### Example 3: Using the Hook Directly (Advanced)

```javascript
import React, { useState } from 'react';
import { useDocumentManagement } from '../hooks/useDocumentManagement';
import DocumentAuditTrail from './components/DocumentAuditTrail';
import RevokeLetterModal from './components/RevokeLetterModal';

function AdvancedLetterManager({ letterId, userRole }) {
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  
  const {
    status,
    auditTrail,
    loading,
    error,
    isRevoked,
    canRevoke,
    fetchAuditTrail,
    revoke,
    clearError
  } = useDocumentManagement(letterId);

  const handleRevokeClick = async () => {
    setShowRevokeModal(true);
  };

  const handleRevokeConfirm = async (reason, details) => {
    try {
      await revoke(reason, details);
      setShowRevokeModal(false);
      // Refresh audit trail
      await fetchAuditTrail();
      // Show success message
      console.log('Letter revoked successfully');
    } catch (err) {
      console.error('Revocation failed:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!canRevoke) return <div>You don't have permission to manage this letter</div>;

  return (
    <div className="advanced-manager">
      <div className="status-section">
        <h2>Letter Status</h2>
        <p>Status: {status?.status}</p>
        <p>Created: {new Date(status?.createdAt).toLocaleDateString()}</p>
        
        {!isRevoked && (
          <button onClick={handleRevokeClick} className="btn-revoke">
            Revoke Letter
          </button>
        )}
      </div>

      <DocumentAuditTrail 
        documentId={letterId}
        auditTrail={auditTrail}
        loading={loading}
        onRefresh={fetchAuditTrail}
      />

      {showRevokeModal && (
        <RevokeLetterModal 
          onConfirm={handleRevokeConfirm}
          onCancel={() => setShowRevokeModal(false)}
        />
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

export default AdvancedLetterManager;
```

### Example 4: Bulk Operations Dashboard

```javascript
import React, { useState, useEffect } from 'react';
import DocumentManagementPanel from './components/DocumentManagementPanel';
import LetterStatusBadge from './components/LetterStatusBadge';
import { getLetters } from '../services/letterService';

function BulkOperationsDashboard() {
  const [letters, setLetters] = useState([]);
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [view, setView] = useState('list'); // 'list' or 'detail'
  const [selectedLetterForDetail, setSelectedLetterForDetail] = useState(null);
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    const fetchLetters = async () => {
      const data = await getLetters();
      setLetters(data);
    };
    fetchLetters();
  }, []);

  const handleSelectLetter = (letterId) => {
    if (selectedLetters.includes(letterId)) {
      setSelectedLetters(selectedLetters.filter(id => id !== letterId));
    } else {
      setSelectedLetters([...selectedLetters, letterId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedLetters.length === letters.length) {
      setSelectedLetters([]);
    } else {
      setSelectedLetters(letters.map(l => l._id));
    }
  };

  const handleLetterUpdated = (updatedLetter) => {
    setLetters(letters.map(letter => 
      letter._id === updatedLetter._id ? updatedLetter : letter
    ));
  };

  if (view === 'detail') {
    return (
      <div>
        <button onClick={() => setView('list')}>← Back to List</button>
        <DocumentManagementPanel 
          letter={selectedLetterForDetail}
          userRole={userRole}
          onLetterUpdated={handleLetterUpdated}
          showAuditTrail={true}
        />
      </div>
    );
  }

  return (
    <div className="bulk-operations">
      <h1>Letter Management Dashboard</h1>

      <div className="toolbar">
        <label>
          <input 
            type="checkbox"
            checked={selectedLetters.length === letters.length}
            onChange={handleSelectAll}
          />
          Select All
        </label>
        <span>{selectedLetters.length} selected</span>
      </div>

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" /></th>
            <th>Candidate</th>
            <th>Position</th>
            <th>Status</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {letters.map(letter => (
            <tr key={letter._id}>
              <td>
                <input 
                  type="checkbox"
                  checked={selectedLetters.includes(letter._id)}
                  onChange={() => handleSelectLetter(letter._id)}
                />
              </td>
              <td>{letter.candidateName}</td>
              <td>{letter.position}</td>
              <td>
                <LetterStatusBadge status={letter.status} />
              </td>
              <td>{new Date(letter.createdAt).toLocaleDateString()}</td>
              <td>
                <button 
                  onClick={() => {
                    setSelectedLetterForDetail(letter);
                    setView('detail');
                  }}
                >
                  View/Manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BulkOperationsDashboard;
```

---

## Component Props Reference

### DocumentManagementPanel

```typescript
interface DocumentManagementPanelProps {
  letter: Letter;                          // Required: Letter object
  userRole: string;                        // Required: 'employee', 'hr', 'admin', 'super-admin'
  onLetterUpdated?: (letter: Letter) => void;  // Optional: Callback on update
  showAuditTrail?: boolean;               // Optional: Show audit trail section (default: true)
}
```

### LetterStatusBadge

```typescript
interface LetterStatusBadgeProps {
  status: 'active' | 'revoked' | 'expired' | 'pending';
  size?: 'small' | 'medium' | 'large';  // Optional: default 'medium'
}
```

### RevokeLetterModal

```typescript
interface RevokeLetterModalProps {
  onConfirm: (reason: string, details: object) => Promise<void>;
  onCancel: () => void;
}
```

### DocumentAuditTrail

```typescript
interface DocumentAuditTrailProps {
  documentId: string;                     // Required: Document ID
  auditTrail: AuditEvent[];             // Required: Array of audit events
  loading?: boolean;                      // Optional: Loading state
  onRefresh?: () => Promise<void>;       // Optional: Refresh callback
}
```

---

## Hook Usage Reference

### useDocumentManagement

```javascript
const {
  // State
  status,                  // Current document status
  auditTrail,             // Array of audit events
  revocationHistory,      // Array of revocation records
  loading,                // Boolean: loading state
  error,                  // String: error message or null
  hasAccess,              // Boolean: user has access to document

  // Methods
  fetchStatus,            // () => Promise<void>
  fetchAuditTrail,        // (filters?) => Promise<void>
  fetchRevocationHistory, // () => Promise<void>
  revoke,                 // (reason, details) => Promise<void>
  reinstate,              // (reason) => Promise<void> (super-admin only)
  checkAccess,            // () => Promise<void>
  clearError,             // () => void

  // Computed Properties
  isRevoked,              // Boolean: is document revoked?
  canRevoke,              // Boolean: can current user revoke?
  canReinstate            // Boolean: can current user reinstate?
} = useDocumentManagement(documentId);
```

---

## API Endpoints Used

All requests include Bearer token authentication:

```javascript
Authorization: Bearer {authToken}
```

| Method | Endpoint | Role Required | Purpose |
|--------|----------|---------------|---------|
| GET | `/api/documents/{id}/status` | Public | Get document status |
| POST | `/api/documents/{id}/revoke` | HR/Admin | Revoke a letter |
| POST | `/api/revocations/{id}/reinstate` | Super-Admin | Reinstate a revoked letter |
| GET | `/api/documents/{id}/audit-trail` | HR/Admin | Get audit trail |
| GET | `/api/documents/{id}/revocation-history` | HR/Admin | Get revocation history |
| GET | `/api/documents/{id}/enforce-access` | Authenticated | Check document access |

---

## Authentication Setup

The service expects authentication tokens in localStorage or sessionStorage:

```javascript
// Option 1: Store in localStorage (default)
localStorage.setItem('authToken', 'your-jwt-token');

// Option 2: Store in sessionStorage
sessionStorage.setItem('authToken', 'your-jwt-token');

// Option 3: Custom implementation - modify DocumentManagementService.getAuthToken()
```

---

## Error Handling

The service and hook handle errors gracefully:

```javascript
import { useDocumentManagement } from '../hooks/useDocumentManagement';

function MyComponent({ documentId }) {
  const { error, clearError, loading } = useDocumentManagement(documentId);

  if (loading) return <div>Loading...</div>;

  if (error) {
    return (
      <div className="error-container">
        <p>An error occurred: {error}</p>
        <button onClick={clearError}>Dismiss</button>
      </div>
    );
  }

  return <div>Content here</div>;
}
```

---

## Styling & Dark Mode

All components support:
- ✅ Professional light mode styling
- ✅ Full dark mode support via `prefers-color-scheme`
- ✅ Responsive mobile design
- ✅ WCAG accessibility compliance
- ✅ Reduced motion support

No additional CSS imports needed - all styling is included in component CSS files.

---

## Testing Integration

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentManagementPanel from './DocumentManagementPanel';

describe('DocumentManagementPanel', () => {
  const mockLetter = {
    _id: 'test-123',
    candidateName: 'John Doe',
    position: 'Engineer',
    department: 'Tech',
    salary: 100000,
    status: 'active'
  };

  it('renders letter information', () => {
    render(
      <DocumentManagementPanel 
        letter={mockLetter}
        userRole="hr"
      />
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
  });

  it('shows revoke button for hr users', () => {
    render(
      <DocumentManagementPanel 
        letter={mockLetter}
        userRole="hr"
      />
    );
    
    expect(screen.getByText('Revoke Letter')).toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### Issue: Authentication Errors

**Solution:** Ensure authToken is set in storage before rendering components:

```javascript
// In your auth/login flow
const token = await login(credentials);
localStorage.setItem('authToken', token);
```

### Issue: "Access Denied" Message

**Solution:** Verify user role and backend permissions:

```javascript
// Check role in component
console.log('User role:', localStorage.getItem('userRole'));

// Available roles: 'employee', 'hr', 'admin', 'super-admin'
```

### Issue: Components Not Styling Correctly

**Solution:** Ensure CSS files are in the same directory as components:

```
frontend/components/
├── DocumentManagementPanel.jsx
├── DocumentManagementPanel.css     ← Must be present
├── DocumentAuditTrail.jsx
├── DocumentAuditTrail.css          ← Must be present
├── LetterStatusBadge.jsx
├── LetterStatusBadge.css           ← Must be present
└── RevokeLetterModal.jsx
    └── RevokeLetterModal.css       ← Must be present
```

### Issue: Token Expiration

**Solution:** Implement token refresh in service:

```javascript
// Modify DocumentManagementService.getAuthToken()
getAuthToken() {
  let token = localStorage.getItem('authToken');
  if (!token) token = sessionStorage.getItem('authToken');
  
  // Add refresh logic here if needed
  if (this.isTokenExpired(token)) {
    token = this.refreshToken();
  }
  
  return token;
}
```

---

## Next Steps

1. Copy component files to your `frontend/components/` directory
2. Copy hook to `frontend/hooks/`
3. Copy service to `frontend/services/`
4. Import and use in your pages following the examples above
5. Set up authentication token in your login flow
6. Test with your backend API

All components are production-ready and can be deployed immediately.
