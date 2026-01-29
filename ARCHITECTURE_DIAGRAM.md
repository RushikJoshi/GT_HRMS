# HRMS + Job Portal - System Architecture Diagram

## 🎯 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MERN HRMS + JOB PORTAL                          │
│                     Complete System Separation v2.0                      │
└─────────────────────────────────────────────────────────────────────────┘

                              BROWSER
                    ┌─────────────────────────┐
                    │   React Router (v6)     │
                    │   @location.pathname    │
                    └──────────┬──────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
        ┌───────▼────────────┐      ┌────────▼──────────┐
        │  /hrms/*           │      │  /jobs/*          │
        │  HRMS Routes       │      │  Job Portal Routes│
        │  (HrmsRoutes.jsx)  │      │ (JobPortalRoutes) │
        └───────┬────────────┘      └────────┬──────────┘
                │                             │
        ┌───────▼────────────┐      ┌────────▼──────────┐
        │ AuthProvider       │      │ JobPortalProvider │
        │ (Context API)      │      │ (Context API)     │
        └───────┬────────────┘      └────────┬──────────┘
                │                             │
    ┌───────────┴────────────┬───────┬─────────┴──────────────┐
    │                        │       │                        │
┌──▼───────┐  ┌────────────▼─┐  ┌──▼──────┐  ┌───────────────▼─┐
│  PSA     │  │  HR / Emp    │  │ Layouts │  │ Candidate Pages │
│ Layouts  │  │  Layouts     │  │ Job     │  │ (Login/Signup/  │
│          │  │              │  │ Portal  │  │  Dashboard)     │
│Protected │  │  Protected   │  │         │  │                 │
│by HRMS   │  │  by HRMS     │  │Protected│  │ Protected by    │
│Auth      │  │  Auth        │  │ by Job  │  │ Job Portal Auth │
└──────────┘  └──────────────┘  │ Portal  │  │                 │
              Protected Pages     │ Auth   │  │ Protected Pages │
              /hrms/psa/*        └────────┘  │ /jobs/*         │
              /hrms/hr/*         Job Portal  │                 │
              /hrms/employee/*   Layout      │ /jobs/dashboard │
                                            │ /jobs/profile   │
                                            └─────────────────┘
```

## 📊 Storage Separation

```
┌──────────────────────────────────────────────────────────────────┐
│                      localStorage (Browser)                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │    HRMS Storage Keys    │  │  Job Portal Storage Keys     │  │
│  ├─────────────────────────┤  ├──────────────────────────────┤  │
│  │ token                   │  │ jobPortalToken               │  │
│  │ tenantId                │  │ jobPortalCandidate           │  │
│  │ companyId               │  │ jobPortalTenantId            │  │
│  │ user                    │  │                              │  │
│  │ companyCode             │  │                              │  │
│  │                         │  │                              │  │
│  │ NEVER MIX! ✓            │  │ NEVER MIX! ✓                 │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## 🔐 Authentication Flow

### HRMS Authentication

```
User navigates to /hrms/login
         │
         ▼
    ┌──────────────────┐
    │  Login Form      │
    │  Email + Pass    │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ POST /api/auth/login         │
    │ (HRMS Backend)               │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Validate in Tenant table     │
    │ Check role: PSA/HR/Admin/Emp │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Generate JWT Token           │
    │ role: 'psa'/'hr'/'admin'/... │
    │ tenantId: ObjectId           │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Store in localStorage.token  │
    │ Set AuthContext.user         │
    │ Update API headers           │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Redirect to /hrms/psa        │
    │ or /hrms/hr (based on role)  │
    └──────────────────────────────┘
```

### Job Portal Authentication

```
User navigates to /jobs/signup
         │
         ▼
    ┌──────────────────┐
    │  Signup Form     │
    │  Name/Email/Pass │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ POST /api/jobs/candidate/... │
    │ register (Job Portal Backend) │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Validate in Candidate table  │
    │ (Tenant-specific DB)         │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Hash password with bcrypt    │
    │ Save candidate              │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Auto-login: Generate JWT     │
    │ role: 'candidate'            │
    │ tenantId: ObjectId           │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Store in:                    │
    │ localStorage.jobPortalToken  │
    │ Set JobPortalAuthContext     │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Redirect to /jobs/dashboard  │
    │ Show Job Portal Layout       │
    └──────────────────────────────┘
```

## 🛣️ Routing Tree

```
ROOT: /
│
├─ /hrms/
│  │
│  ├─ /hrms/login                    [Public]
│  ├─ /hrms/login/hr                 [Public]
│  ├─ /hrms/login/employee           [Public]
│  │
│  ├─ /hrms/psa/                     [HRMS Auth + Role=psa]
│  │  ├─ dashboard
│  │  ├─ companies
│  │  ├─ modules
│  │  └─ activities
│  │
│  ├─ /hrms/hr/                      [HRMS Auth + Role=hr/admin]
│  │  ├─ dashboard
│  │  ├─ employees
│  │  ├─ payroll/
│  │  ├─ requirements
│  │  └─ ...
│  │
│  └─ /hrms/employee/                [HRMS Auth + Role=employee]
│     ├─ dashboard
│     ├─ my-requests
│     └─ face-attendance
│
└─ /jobs/
   │
   ├─ /jobs/login                    [Public]
   ├─ /jobs/signup                   [Public]
   ├─ /jobs/:companyId               [Public]
   │
   ├─ /jobs/dashboard/               [Job Portal Auth]
   ├─ /jobs/open-positions/          [Job Portal Auth]
   ├─ /jobs/applications/            [Job Portal Auth]
   ├─ /jobs/profile/                 [Job Portal Auth]
   └─ /jobs/apply-job/:requirementId [Job Portal Auth]
```

## 🔌 API Endpoint Structure

```
Backend API Routes
├─ /api/public/              (No Auth)
│  └─ GET /public/tenant/:id
│
├─ /api/auth/                (Public Auth Routes)
│  ├─ POST /login
│  ├─ POST /login/hr
│  └─ POST /login/employee
│
├─ /api/jobs/                (Job Portal System)
│  │
│  ├─ POST /candidate/register
│  ├─ POST /candidate/login
│  ├─ GET  /jobs/:companyId
│  ├─ POST /jobs/apply/:requirementId    [Auth Required]
│  ├─ GET  /candidate/profile            [Auth Required]
│  ├─ PUT  /candidate/profile            [Auth Required]
│  └─ GET  /candidate/dashboard          [Auth Required]
│
└─ /api/hrms/                (HRMS System - Tenant Middleware)
   │
   ├─ /psa/                  [Auth + Role=psa]
   │  ├─ GET  /companies
   │  ├─ POST /companies
   │  └─ ...
   │
   ├─ /hr/                   [Auth + Role=hr/admin + Tenant]
   │  ├─ GET  /employees
   │  ├─ POST /employees
   │  ├─ GET  /payroll/dashboard
   │  └─ ...
   │
   ├─ /employee/             [Auth + Role=employee + Tenant]
   │  ├─ GET  /dashboard
   │  └─ ...
   │
   └─ /requirements/         [Auth + Tenant]
      ├─ GET  /
      ├─ POST /
      └─ ...
```

## ⚙️ Middleware Processing

### HRMS Request Processing

```
Request: GET /api/hrms/hr/employees
  │
  ├─ Match /api/hrms/* route
  │
  ├─ Apply Tenant Middleware
  │  └─ Extract tenantId from JWT
  │  └─ Create tenantDB connection
  │  └─ Attach req.tenantDB
  │
  ├─ Apply hrmsAuthMiddleware
  │  └─ Validate JWT token
  │  └─ Check role (must be hr/admin)
  │  └─ Attach req.user
  │
  ├─ Call Route Handler
  │  └─ Handler uses req.tenantDB
  │  └─ Handler uses req.user
  │
  └─ Return Response
```

### Job Portal Request Processing

```
Request: POST /api/jobs/candidate/login
  │
  ├─ Match /api/jobs/* route
  │
  ├─ NO Tenant Middleware! (Skipped)
  │
  ├─ Apply jobPortalAuthMiddleware (if protected)
  │  └─ Validate JWT token
  │  └─ Check role (must be candidate)
  │  └─ Attach req.candidate
  │
  ├─ Call Route Handler
  │  └─ Handler manually calls getTenantDB()
  │  └─ Handler uses req.candidate.tenantId
  │
  └─ Return Response
```

## 🔄 Data Flow

### Complete Login Flow - HRMS

```
Frontend                          Backend                  Database
    │                              │                          │
    ├─ User enters credentials     │                          │
    │                              │                          │
    ├─ POST /api/auth/login ───────┤                          │
    │  {email, password}           │                          │
    │                              ├─ Find tenant ───────────▶ Tenant
    │                              │                          │
    │                              ├─ Compare password        │
    │                              │                          │
    │◀─ JWT token ─────────────────┤ Generate JWT             │
    │  {role, tenantId, userId}    │ with JWT_SECRET          │
    │                              │                          │
    ├─ localStorage.setItem(       │                          │
    │    'token', token)           │                          │
    │                              │                          │
    ├─ AuthContext.setUser()       │                          │
    │                              │                          │
    └─ Redirect to /hrms/psa       │                          │
       or /hrms/hr                 │                          │
```

### Complete Job Application Flow - Job Portal

```
Frontend                          Backend                  Database
    │                              │                          │
    ├─ Candidate clicks "Apply"    │                          │
    │                              │                          │
    ├─ POST /api/jobs/jobs/apply   │                          │
    │  {requirementId, tenantId}   │                          │
    │  + Authorization Header      │                          │
    │                              │                          │
    │                              ├─ Validate JWT (candidate)│
    │                              │                          │
    │                              ├─ getTenantDB(tenantId)   │
    │                              │                          │
    │                              ├─ Check Requirement ──────▶ Requirement
    │                              │                          │
    │                              ├─ Create Applicant ───────▶ Applicant
    │                              │  {candidateId, req, status}
    │                              │                          │
    │◀─ Success Response ───────────┤ applicationId            │
    │                              │                          │
    └─ Show confirmation           │                          │
```

## 📈 Security Levels

```
┌────────────────────────────────────────────┐
│  Public Routes (No Auth Required)          │
│  /hrms/login                               │
│  /hrms/login/hr                            │
│  /jobs/login                               │
│  /jobs/signup                              │
│  /jobs/:companyId (browse jobs)            │
│  /api/public/*                             │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│  HRMS Protected Routes                     │
│  Requires: Valid JWT + HRMS Role           │
│  /hrms/psa/*       (role=psa)              │
│  /hrms/hr/*        (role=hr/admin)         │
│  /hrms/employee/*  (role=employee)         │
│  /api/hrms/*                               │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│  Job Portal Protected Routes               │
│  Requires: Valid JWT + role=candidate      │
│  /jobs/dashboard                           │
│  /jobs/profile                             │
│  /jobs/applications                        │
│  /api/jobs/candidate/*                     │
└────────────────────────────────────────────┘
```

## ✅ Key Benefits of This Architecture

```
✓ NO Cross-System Data Leakage
  └─ Separate auth contexts
  └─ Separate storage keys
  └─ Separate middleware

✓ Independent Session Management
  └─ Can logout from HRMS without affecting Job Portal
  └─ Can login to both systems simultaneously
  └─ Different expiry times possible

✓ Scalable & Maintainable
  └─ Easy to add new HRMS modules
  └─ Easy to enhance Job Portal
  └─ Clear separation of concerns

✓ Security
  └─ Role-based access control per system
  └─ Tenant isolation maintained
  └─ Token validation per system

✓ Future-Proof
  └─ Can deploy to different servers
  └─ Can use microservices architecture
  └─ Can implement separate databases
```

---

**Created:** 2026-01-21  
**Status:** Production Ready  
**Version:** 2.0 - Complete Separation
