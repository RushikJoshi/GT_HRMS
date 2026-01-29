/**
 * MERN HRMS - COMPLETE SEPARATION GUIDE
 * =====================================
 * 
 * This document explains the complete separation between:
 * 1. HRMS Panel (SuperAdmin / HR / Employee / Manager)
 * 2. Job Portal (Candidate Signup / Login / Job Apply)
 */

/* ═══════════════════════════════════════════════════════════════════════════
   FRONTEND FOLDER STRUCTURE
═══════════════════════════════════════════════════════════════════════════ */

frontend/src/
├── context/
│   ├── AuthContext.jsx                 // HRMS Auth (SuperAdmin, HR, Employee)
│   └── JobPortalAuthContext.jsx        // Job Portal Auth (Candidates ONLY)
│
├── router/
│   ├── RootRouter.jsx                  // Master router - separates both systems
│   ├── HrmsRoutes.jsx                  // All HRMS routes (/hrms/*)
│   └── JobPortalRoutes.jsx             // All Job Portal routes (/jobs/*)
│
├── layouts/
│   ├── PsaLayout.jsx                   // SuperAdmin layout
│   ├── HrLayout.jsx                    // HR Admin layout
│   ├── EssLayout.jsx                   // Employee layout
│   └── JobPortalLayout.jsx             // Job Portal layout (NEW)
│
├── pages/
│   ├── Auth/
│   │   ├── Login.jsx                   // HRMS SuperAdmin login
│   │   ├── HRLogin.jsx                 // HRMS HR login
│   │   └── EmployeeLogin.jsx           // HRMS Employee login
│   │
│   ├── Candidate/
│   │   ├── CandidateLogin.jsx          // Job Portal login
│   │   ├── CandidateRegister.jsx       // Job Portal signup
│   │   ├── CandidateDashboard.jsx      // Job Portal dashboard
│   │   ├── CandidateOpenPositions.jsx  // Job Portal jobs list
│   │   ├── CandidateApplications.jsx   // Job Portal my applications
│   │   └── CandidateProfile.jsx        // Job Portal candidate profile
│   │
│   └── (HRMS pages continue as-is)

/* ═══════════════════════════════════════════════════════════════════════════
   BACKEND FOLDER STRUCTURE
═══════════════════════════════════════════════════════════════════════════ */

backend/
├── middleware/
│   ├── hrmsAuthMiddleware.js           // Auth for HRMS system
│   └── jobPortalAuthMiddleware.js      // Auth for Job Portal (NEW)
│
├── routes/
│   ├── auth.routes.js                  // HRMS authentication
│   ├── candidate.routes.js             // DEPRECATED - use jobPortal.routes.js
│   ├── jobPortal.routes.js             // Job Portal routes (NEW)
│   ├── hr.routes.js                    // HRMS HR routes
│   ├── psa.hr.routes.js                // HRMS PSA routes
│   ├── employee.routes.js              // HRMS Employee routes
│   └── (other HRMS routes)

/* ═══════════════════════════════════════════════════════════════════════════
   ROUTING ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════ */

ROOT ROUTER (RootRouter.jsx)
│
├── /           → AutoRedirect based on user role
│
├── /hrms/*     → HrmsRoutes (HRMS SYSTEM)
│   │
│   ├── /hrms/login                     → Login page
│   ├── /hrms/login/hr                  → HR login
│   ├── /hrms/login/employee            → Employee login
│   │
│   ├── /hrms/psa/*                     → SuperAdmin routes (with AuthContext)
│   │   ├── /hrms/psa                   → Dashboard
│   │   ├── /hrms/psa/companies         → Company management
│   │   └── ... (other PSA routes)
│   │
│   ├── /hrms/hr/*                      → HR Admin routes (with AuthContext)
│   │   ├── /hrms/hr                    → HR Dashboard
│   │   ├── /hrms/hr/employees          → Employee management
│   │   ├── /hrms/hr/payroll/*          → Payroll management
│   │   └── ... (other HR routes)
│   │
│   └── /hrms/employee/*                → Employee routes (with AuthContext)
│       ├── /hrms/employee              → Employee dashboard
│       ├── /hrms/employee/my-requests  → Leave/Attendance requests
│       └── ... (other employee routes)
│
└── /jobs/*     → JobPortalRoutes (JOB PORTAL SYSTEM)
    │
    ├── /jobs/login                     → Candidate login (with JobPortalAuthContext)
    ├── /jobs/signup                    → Candidate signup (with JobPortalAuthContext)
    ├── /jobs/:companyId                → Browse jobs (public)
    │
    └── /jobs/ (Protected with JobPortalAuthContext)
        ├── /jobs/dashboard             → Candidate dashboard
        ├── /jobs/open-positions        → Available job positions
        ├── /jobs/applications          → My applications
        ├── /jobs/profile               → My profile
        └── /jobs/apply-job/:requirementId → Apply for job

/* ═══════════════════════════════════════════════════════════════════════════
   FRONTEND API ENDPOINTS
═══════════════════════════════════════════════════════════════════════════ */

HRMS API ENDPOINTS (Use AuthContext)
├── POST   /api/auth/login              → HRMS login
├── GET    /api/auth/me                 → Get HRMS user
├── GET    /api/hrms/hr/*               → HR routes
├── GET    /api/hrms/psa/*              → PSA routes
├── GET    /api/hrms/employee/*         → Employee routes
└── (All tenant-aware routes)

JOB PORTAL API ENDPOINTS (Use JobPortalAuthContext)
├── POST   /api/jobs/candidate/register → Candidate signup
├── POST   /api/jobs/candidate/login    → Candidate login
├── GET    /api/jobs/jobs/:companyId    → Browse jobs
├── POST   /api/jobs/jobs/apply/:requirementId → Apply for job
├── GET    /api/jobs/candidate/profile  → Get candidate profile
└── PUT    /api/jobs/candidate/profile  → Update candidate profile

/* ═══════════════════════════════════════════════════════════════════════════
   AUTHENTICATION FLOW
═══════════════════════════════════════════════════════════════════════════ */

HRMS AUTHENTICATION:
1. User visits /hrms/login
2. Enters credentials (email + password for SuperAdmin)
3. Backend validates against Tenant collection
4. Returns JWT token with role: 'psa' | 'hr' | 'employee' | 'manager'
5. Token stored in localStorage.getItem('token')
6. AuthContext manages HRMS session
7. Protected routes check token via ProtectedRoute component

JOB PORTAL AUTHENTICATION:
1. Candidate visits /jobs/login OR /jobs/signup
2. Enters credentials
3. Backend validates against Candidate collection in tenant DB
4. Returns JWT token with role: 'candidate' + tenantId
5. Token stored in localStorage.getItem('jobPortalToken')
6. JobPortalAuthContext manages Job Portal session
7. Protected routes check token via JobPortalProtectedRoute component

KEY DIFFERENCE:
- HRMS tokens use 'psa', 'hr', 'admin', 'employee', 'manager' roles
- Job Portal tokens use 'candidate' role
- Storage keys are COMPLETELY SEPARATE

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE KEYS SEPARATION
═══════════════════════════════════════════════════════════════════════════ */

HRMS System Storage Keys:
├── token                  → JWT token for HRMS users
├── tenantId              → Current tenant ID
├── companyId             → Current company ID
├── user                  → User profile data
└── companyCode           → Company code

JOB PORTAL Storage Keys:
├── jobPortalToken        → JWT token for candidates
├── jobPortalCandidate    → Candidate profile data
└── jobPortalTenantId     → Candidate's tenant ID

IMPORTANT: They NEVER mix!

/* ═══════════════════════════════════════════════════════════════════════════
   MIDDLEWARE FLOW
═══════════════════════════════════════════════════════════════════════════ */

HRMS Request Flow:
GET /api/hrms/hr/employees
  ↓
Express app.js routes request to /api/hrms/*
  ↓
Tenant Middleware (tenant.middleware.js)
  - Extracts tenantId from user token
  - Creates tenant DB connection
  - Attaches tenantDB to req
  ↓
HRMS Route Handler (hrRoutes)
  - Uses hrmsAuthMiddleware.authenticateHrms
  - Validates HRMS token
  - Checks role permissions
  ↓
Handler executes with tenant context

JOB PORTAL Request Flow:
POST /api/jobs/jobs/apply/:requirementId
  ↓
Express app.js routes request to /api/jobs/*
  ↓
NO Tenant Middleware! (Skipped intentionally)
  ↓
Job Portal Route Handler (jobPortal.routes.js)
  - Uses jobPortalAuthMiddleware.authenticateCandidate
  - Validates candidate token
  - Manually calls getTenantDB with tenantId from token
  ↓
Handler executes with tenant context (manual)

KEY: Job Portal does NOT use global tenant middleware

/* ═══════════════════════════════════════════════════════════════════════════
   DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════════════════════════ */

Frontend:
✓ Update main.jsx to use RootRouter
✓ Verify JobPortalAuthContext.jsx exists
✓ Verify JobPortalRoutes.jsx exists
✓ Verify JobPortalLayout.jsx exists
✓ Verify HrmsRoutes.jsx exists
✓ Verify RootRouter.jsx exists
✓ Update all API calls to use /api/hrms/* or /api/jobs/*
✓ Clear localStorage (old keys might conflict)
✓ Test HRMS login (/hrms/login)
✓ Test Job Portal login (/jobs/login)
✓ Verify no cross-system navigation

Backend:
✓ Create hrmsAuthMiddleware.js
✓ Create jobPortalAuthMiddleware.js
✓ Create jobPortal.routes.js
✓ Update app.js to separate routes
✓ Rename candidate.routes.js → DEPRECATED (use jobPortal.routes.js)
✓ Test HRMS endpoints: /api/hrms/*
✓ Test Job Portal endpoints: /api/jobs/*
✓ Verify tenant middleware only applies to /api/hrms/*
✓ Test cross-domain requests (if applicable)

/* ═══════════════════════════════════════════════════════════════════════════
   TESTING SCENARIOS
═══════════════════════════════════════════════════════════════════════════ */

Scenario 1: HRMS User Session
1. Open /hrms/login
2. Login as HR admin
3. Navigate to /hrms/hr/employees
4. Check: HRMS layout visible, not Job Portal
5. Open /jobs/login in new tab
6. Verify: Different layout, different auth
7. Go back to HRMS tab
8. Verify: Still in HRMS, not refreshed

Scenario 2: Job Portal User Session
1. Open /jobs/login
2. Signup as candidate
3. Auto-login and redirect to /jobs/dashboard
4. Browse /jobs/:companyId
5. Apply for job
6. Check: Job Portal layout visible, not HRMS
7. Open /hrms/login in new tab
8. Verify: Different system, different auth
9. Go back to Jobs tab
10. Verify: Still in Job Portal, not refreshed

Scenario 3: Token Expiry
1. Login to HRMS
2. Wait for token expiry (or manually delete token)
3. Try to access /hrms/hr/employees
4. Verify: Redirected to /hrms/login
5. SEPARATE: Do same for Job Portal
6. Verify: Redirected to /jobs/login

Scenario 4: Role Validation
1. Login as HRMS Employee
2. Try to access /hrms/psa
3. Verify: 403 Forbidden or redirected
4. SEPARATE: Job Portal candidate cannot access HRMS routes

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCTION BEST PRACTICES
═══════════════════════════════════════════════════════════════════════════ */

1. NEVER import AuthContext in Job Portal components
2. NEVER import JobPortalAuthContext in HRMS components
3. ALWAYS use isolated API instances per system
4. ALWAYS use separate storage keys
5. NEVER share middleware between HRMS and Job Portal
6. ALWAYS validate tokens on backend before processing
7. Use separate JWT secrets if high security required
8. Monitor error logs for token validation failures
9. Implement rate limiting per system separately
10. Log API calls separately for HRMS vs Job Portal

/* ═══════════════════════════════════════════════════════════════════════════
   MIGRATION PATH FROM OLD SYSTEM
═══════════════════════════════════════════════════════════════════════════ */

Old Structure:
/                       → AutoHome
├── /login              → Login page
├── /candidate/login    → Candidate login
├── /candidate/signup   → Candidate signup
├── /candidate/*        → Protected routes
├── /psa                → PSA routes
├── /hr                 → HR routes
└── /employee           → Employee routes

New Structure:
/                       → RootRouter (redirects to /hrms or /jobs)
├── /hrms/login         → HRMS login
├── /hrms/psa           → PSA routes
├── /hrms/hr            → HR routes
├── /hrms/employee      → Employee routes
└── /jobs/              → Job Portal
    ├── /jobs/login     → Candidate login
    ├── /jobs/signup    → Candidate signup
    └── /jobs/*         → Candidate protected routes

Old Candidate routes → Move to /jobs/*
Old Auth routes → Move to /hrms/login

END OF DOCUMENTATION
═══════════════════════════════════════════════════════════════════════════
*/

module.exports = {
  frontendStructure: {
    authContexts: ['AuthContext.jsx', 'JobPortalAuthContext.jsx'],
    routers: ['RootRouter.jsx', 'HrmsRoutes.jsx', 'JobPortalRoutes.jsx'],
    layouts: ['PsaLayout.jsx', 'HrLayout.jsx', 'EssLayout.jsx', 'JobPortalLayout.jsx']
  },
  backendStructure: {
    middleware: ['hrmsAuthMiddleware.js', 'jobPortalAuthMiddleware.js'],
    routes: ['hrmsRoutes', 'jobPortalRoutes'],
    routePrefixes: ['/api/hrms', '/api/jobs']
  },
  storageKeys: {
    hrms: ['token', 'tenantId', 'companyId', 'user'],
    jobPortal: ['jobPortalToken', 'jobPortalCandidate', 'jobPortalTenantId']
  }
};
