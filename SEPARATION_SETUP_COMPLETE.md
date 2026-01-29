# HRMS + Job Portal Separation - Implementation Checklist

## ✅ COMPLETED FILES

### Frontend (New/Modified)
- [x] `src/context/JobPortalAuthContext.jsx` - Separate auth for candidates
- [x] `src/router/RootRouter.jsx` - Master router separating both systems  
- [x] `src/router/HrmsRoutes.jsx` - HRMS-only routing
- [x] `src/router/JobPortalRoutes.jsx` - Job Portal-only routing
- [x] `src/layouts/JobPortalLayout.jsx` - Separate Job Portal layout
- [x] `src/main.jsx` - Updated to use RootRouter

### Backend (New/Modified)
- [x] `middleware/hrmsAuthMiddleware.js` - HRMS authentication
- [x] `middleware/jobPortalAuthMiddleware.js` - Job Portal auth
- [x] `routes/jobPortal.routes.js` - Separate Job Portal routes
- [x] `app.js` - Updated to separate /api/hrms and /api/jobs

### Documentation
- [x] `SYSTEM_SEPARATION_GUIDE.md` - Complete implementation guide

---

## 📋 NEXT STEPS: COMPONENT UPDATES

### 1. Update Candidate Components to Use JobPortalAuthContext

In these files (replace AuthContext with JobPortalAuthContext):
- `frontend/src/pages/Candidate/CandidateLogin.jsx`
- `frontend/src/pages/Candidate/CandidateRegister.jsx`
- `frontend/src/pages/Candidate/CandidateDashboard.jsx`
- `frontend/src/pages/Candidate/CandidateOpenPositions.jsx`
- `frontend/src/pages/Candidate/CandidateApplications.jsx`
- `frontend/src/pages/Candidate/CandidateProfile.jsx`
- `frontend/src/pages/ApplicationTrack.jsx`

**Pattern:**
```javascript
// ❌ REMOVE
import { useAuth } from '../context/AuthContext';

// ✅ ADD
import { useJobPortalAuth } from '../context/JobPortalAuthContext';

// ❌ REPLACE
const { candidate, loginCandidate } = useAuth();

// ✅ WITH
const { candidate, loginCandidate } = useJobPortalAuth();
```

### 2. Update API Calls in All Components

**For HRMS Components (HR, PSA, Employee pages):**
- Add `/hrms` prefix to all API calls
- Example: `/api/hr/employees` → `/api/hrms/hr/employees`

**For Job Portal Components (Candidate pages):**
- Add `/jobs` prefix to all API calls  
- Example: `/api/candidate/login` → `/api/jobs/candidate/login`

### 3. Test the System

After making these updates:

```bash
# Backend should be running
# Frontend should be running

# Test HRMS
curl http://localhost:5173/hrms/login

# Test Job Portal
curl http://localhost:5173/jobs/login
```

---

## 🎯 Current Status

**Backend:** ✅ Complete - Routes separated
**Frontend Routing:** ✅ Complete - RootRouter, HrmsRoutes, JobPortalRoutes created
**Frontend Auth:** ✅ Complete - JobPortalAuthContext created
**Frontend Layout:** ✅ Complete - JobPortalLayout created

**PENDING - Frontend Component Updates:**
⏳ Update 6 Candidate components
⏳ Update API calls in all components
⏳ Test both systems

---

## 📁 File Locations

- Backend Middleware: `backend/middleware/hrmsAuthMiddleware.js`
- Backend Middleware: `backend/middleware/jobPortalAuthMiddleware.js`
- Backend Routes: `backend/routes/jobPortal.routes.js`
- Frontend Auth: `frontend/src/context/JobPortalAuthContext.jsx`
- Frontend Routing: `frontend/src/router/RootRouter.jsx`
- Frontend Routing: `frontend/src/router/HrmsRoutes.jsx`
- Frontend Routing: `frontend/src/router/JobPortalRoutes.jsx`
- Frontend Layout: `frontend/src/layouts/JobPortalLayout.jsx`

---

## ⚡ Quick Reference

| System | Prefix | Auth Context | Storage Key | Route Prefix |
|--------|--------|--------------|------------|--------------|
| HRMS | /hrms/ | AuthContext | `token` | /api/hrms/ |
| Job Portal | /jobs/ | JobPortalAuthContext | `jobPortalToken` | /api/jobs/ |

---

Status: **READY FOR COMPONENT UPDATES**
