# Employee Compensation Auto-Sync - Visual Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HRMS Application                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                        Frontend Layer                         │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  Employee Compensation UI  │  Payroll Processing UI          │   │
│  │  (Setup: CTC, Components)  │  (Calculate, View Payslips)    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                   ↓                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                       Backend Layer                           │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  payroll.service.js → calculateEmployeePayroll()            │   │
│  │                                                               │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ Query 1: EmployeeCtcVersion                          │   │   │
│  │  │ Filter: { employeeId, isActive: true, status: CTC } │   │   │
│  │  │ Result: [record] ✅ USE IT                           │   │   │
│  │  │         [] ❌ Continue                                │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                         ↓                                    │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ Query 2: EmployeeCtcVersion (Fallback 1)            │   │   │
│  │  │ Filter: { employeeId, isActive: true }              │   │   │
│  │  │ Result: [record] ✅ USE IT                           │   │   │
│  │  │         [] ❌ Continue                                │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                         ↓                                    │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ 🆕 AUTO-SYNC: EmployeeCompensation (Fallback 2)    │   │   │
│  │  │ Filter: { employeeId, isActive|status: ACTIVE }     │   │   │
│  │  │ Result: [record] ✅                                  │   │   │
│  │  │         └→ CREATE EmployeeCtcVersion                │   │   │
│  │  │            ├─ totalCTC, grossA/B/C, components      │   │   │
│  │  │            ├─ isActive: true, status: ACTIVE        │   │   │
│  │  │            └─ _syncSource: EMPLOYEE_COMPENSATION    │   │   │
│  │  │         [] ❌ Continue to legacy                      │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                         ↓                                    │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ Query 4: applicants.salaryStructure (Fallback 3)     │   │   │
│  │  │ Result: [record] ✅ USE IT (LEGACY)                 │   │   │
│  │  │         [] ❌ ERROR                                   │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                         ↓                                    │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ Calculate Payroll                                    │   │   │
│  │  │ ├─ Earnings (with pro-rata)                          │   │   │
│  │  │ ├─ Pre-tax Deductions (EPF, ESI, PT)                 │   │   │
│  │  │ ├─ Taxable Income                                    │   │   │
│  │  │ ├─ Income Tax (TDS)                                  │   │   │
│  │  │ ├─ Post-tax Deductions (LOP, Loans)                  │   │   │
│  │  │ └─ Net Pay = Gross - All Deductions - Tax            │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                         ↓                                    │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ Create Payslip (Immutable Snapshot)                  │   │   │
│  │  │ ├─ Employee Info                                     │   │   │
│  │  │ ├─ Earnings Breakdown                                │   │   │
│  │  │ ├─ Deductions Breakdown                              │   │   │
│  │  │ ├─ Tax Details                                       │   │   │
│  │  │ ├─ compensationSource: EMPLOYEE_COMPENSATION_SYNCED │   │   │
│  │  │ ├─ isLegacyFallback: false                           │   │   │
│  │  │ └─ Gross & Net Pay                                   │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                   ↓                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      Database Layer                           │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  EmployeeCompensation         EmployeeCtcVersion             │   │
│  │  ┌────────────────────────┐   ┌────────────────────────┐     │   │
│  │  │ _id: ObjectId          │   │ _id: ObjectId          │     │   │
│  │  │ employeeId: ObjectId   │   │ employeeId: ObjectId   │     │   │
│  │  │ totalCTC: 600000       │   │ totalCTC: 600000       │     │   │
│  │  │ grossA: 200000         │→→→│ grossA: 200000         │     │   │
│  │  │ grossB: 200000         │   │ grossB: 200000         │     │   │
│  │  │ grossC: 200000         │   │ grossC: 200000         │     │   │
│  │  │ components: [...]      │   │ components: [...]      │     │   │
│  │  │ isActive: true         │   │ isActive: true         │     │   │
│  │  │ status: "ACTIVE"       │   │ status: "ACTIVE"       │     │   │
│  │  │                        │   │ _syncSource: "EMPL...  │     │   │
│  │  │ (SOURCE UI)            │   │ (SYNCED BY AUTO-SYNC)  │     │   │
│  │  └────────────────────────┘   └────────────────────────┘     │   │
│  │                                                               │   │
│  │  applicants                    payslips                       │   │
│  │  ┌────────────────────────┐   ┌────────────────────────┐     │   │
│  │  │ salaryStructure: {...}  │   │ employeeId: ObjectId   │     │   │
│  │  │ (LEGACY)               │   │ grossEarnings: 50000   │     │   │
│  │  └────────────────────────┘   │ netPay: 45000          │     │   │
│  │                                │ compensationSource:    │     │   │
│  │  (FALLBACK 3)                 │  "EMPLOYEE_COMP..."    │     │   │
│  │                                │ isLegacyFallback: false│     │   │
│  │                                └────────────────────────┘     │   │
│  │                                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Query Decision Tree

```
                              ┌─────────────────┐
                              │  Start Payroll  │
                              └────────┬────────┘
                                       │
                     ┌─────────────────┴──────────────────┐
                     │  For each employee                 │
                     └──────┬──────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │  Query EmployeeCtcVersion     │
            │  Filter 1: Full (status+act) │
            └──────┬─────────────────────────┘
                   │
          ✅ FOUND │ ❌ NOT FOUND
          │        └────────────┬────────────┐
          │                     │            │
          │        Query EmpCtcVersion       │
          │        Filter 2: Active only    │
          │                  │              │
          │         ✅ FOUND  │ ❌ NOT FOUND
          │         │         └─────┬───────┐
          │         │               │       │
          │         └────┐  🆕 AUTO-SYNC   │
          │              │  EmployeeComp   │
          │              │  Filter: Active │
          │              │         │       │
          │              │  ✅ FOUND │ ❌ NOT FOUND
          │              │  │         │       │
          │              │  CREATE   LEGACY  │
          │              │  CTCV     FALLBACK│
          │              │  │         │       │
          │              └──┴─────┬───┴───────┘
          │                       │
          └───────────┬───────────┘
                      │
            ┌─────────┴──────────┐
            │  Use Compensation  │
            │  Data for Payroll  │
            └────────┬───────────┘
                     │
            ┌────────┴────────┐
            │  Calculate      │
            │  Gross, Tax,    │
            │  Deductions,    │
            │  Net Pay        │
            └────────┬────────┘
                     │
            ┌────────┴────────────┐
            │  Create & Store     │
            │  Payslip Snapshot   │
            │  (Immutable)        │
            └────────┬────────────┘
                     │
            ┌────────┴─────────┐
            │  Next Employee   │
            │  or Complete     │
            └──────────────────┘
```

## Data Flow: Sync Moment

```
Timeline: First Payroll Run with Missing EmployeeCtcVersion

T0: Initialize Payroll
    ├─ Check EmployeeCtcVersion for emp_123
    └─ Result: [] (EMPTY)

T1: Trigger Auto-Sync
    ├─ Log: "No EmployeeCtcVersion found, attempting auto-sync..."
    └─ Query EmployeeCompensation

T2: Find Compensation
    ├─ EmployeeCompensation.findOne(emp_123)
    └─ Found: { totalCTC: 600000, components: [...], isActive: true }

T3: Create EmployeeCtcVersion
    ├─ New record created:
    │  ├─ employeeId: emp_123
    │  ├─ totalCTC: 600000
    │  ├─ components: [...] (copied)
    │  ├─ isActive: true
    │  ├─ status: "ACTIVE"
    │  └─ _syncSource: "EMPLOYEE_COMPENSATION"
    └─ Result: CREATED

T4: Continue Payroll
    ├─ Use synced EmployeeCtcVersion
    ├─ Calculate earnings: 50,000
    ├─ Calculate deductions: 5,000
    ├─ Calculate tax: 3,200
    └─ Calculate net: 41,800

T5: Create Payslip
    ├─ Store immutable snapshot:
    │  ├─ grossEarnings: 50,000
    │  ├─ deductions: 8,200
    │  ├─ netPay: 41,800
    │  ├─ compensationSource: "EMPLOYEE_COMPENSATION_SYNCED"
    │  └─ isLegacyFallback: false
    └─ Result: PAYSLIP CREATED

T6: Success
    └─ Payroll: 150 employees processed ✅
```

## Console Output Timeline

```
START PAYROLL RUN
│
├─ 🔍 [PAYROLL-DEBUG] All CTC versions for emp_123: []
│
├─ ⚠️  [PAYROLL] No ACTIVE EmployeeCtcVersion found with filters...
│
├─ ⚠️  [PAYROLL] No EmployeeCtcVersion for emp_123, attempting auto-sync...
│
├─ 📋 [PAYROLL] Found EmployeeCompensation record for emp_123. Creating...
│  
├─ ✅ [PAYROLL] CTC auto-synced from EmployeeCompensation to 
│                EmployeeCtcVersion for emp_123
│
├─ [CALCULATE EARNINGS] Basic: 30,000 | HRA: 15,000 | Convey: 5,000
│
├─ [PRE-TAX DEDUCTIONS] EPF: 3,200 | ESI: 375
│
├─ [INCOME TAX] TDS: 3,200
│
├─ [POST-TAX DEDUCTIONS] LOP: 1,000
│
├─ [PAYSLIP] Gross: 50,000 | Deductions: 7,775 | Net: 42,225
│
├─ [PAYSLIP SAVED] ID: slip_123 | Source: EMPLOYEE_COMPENSATION_SYNCED
│
├─ ... (repeat for other 149 employees)
│
├─ ✅ PAYROLL COMPLETE
│
└─ Summary: 150 processed | 0 failed | Gross: ₹7,500,000 | Net: ₹6,333,750
```

## Database State Changes

### Before Payroll
```
MONGODB: hrms_default

Collections:
├─ employee_ctc_versions
│  └─ find({ employeeId: emp_123 })
│     → { } (EMPTY - 0 records)
│
├─ employeecompensations
│  └─ find({ employeeId: emp_123 })
│     → {
│         _id: comp_456,
│         employeeId: emp_123,
│         totalCTC: 600000,
│         grossA: 200000,
│         grossB: 200000,
│         grossC: 200000,
│         components: [...],
│         isActive: true,
│         status: "ACTIVE"
│       }
│
└─ payslips
   └─ find({ employeeId: emp_123 })
      → { } (EMPTY - no payslips yet)
```

### After Payroll (Auto-Sync Triggered)
```
MONGODB: hrms_default

Collections:
├─ employee_ctc_versions
│  └─ find({ employeeId: emp_123 })
│     → {
│         _id: ctc_789,
│         employeeId: emp_123,
│         version: 1,
│         totalCTC: 600000,
│         grossA: 200000,
│         grossB: 200000,
│         grossC: 200000,
│         components: [...],
│         isActive: true,
│         status: "ACTIVE",
│         createdBy: emp_123,
│         _syncSource: "EMPLOYEE_COMPENSATION",  ← NEW!
│         effectiveFrom: 2026-01-22T...
│       }
│
├─ employeecompensations
│  └─ [UNCHANGED - No modifications]
│
└─ payslips
   └─ find({ employeeId: emp_123 })
      → {
          _id: slip_123,
          employeeId: emp_123,
          grossEarnings: 50000,
          netPay: 42225,
          compensationSource: "EMPLOYEE_COMPENSATION_SYNCED",  ← NEW!
          isLegacyFallback: false,
          ...
        }
```

## Error Handling Flow

```
AUTO-SYNC ERROR HANDLING

┌─ Try EmployeeCompensation.findOne()
│
├─ Query Error? (connection, syntax)
│  └─ Catch Error
│     ├─ Log: "Auto-sync failed: [error]"
│     └─ Continue to Legacy Fallback
│
├─ Result Empty? (no record found)
│  ├─ Log: No EmployeeCompensation found
│  └─ Continue to Legacy Fallback
│
├─ EmployeeCtcVersion.create() fails
│  ├─ Log: "Auto-sync creation failed"
│  └─ Continue to Legacy Fallback
│
└─ Success? ✅
   ├─ Log: "CTC auto-synced"
   └─ Use synced EmployeeCtcVersion

All Fallback Options Exhausted?
├─ No data from any source
└─ Throw Error: "No active compensation record"
   (User sees: Process Payroll API returned error)
```

## Multi-Tenant Data Isolation

```
HRMS MULTI-TENANT ARCHITECTURE

┌────────────────────────────────────────────┐
│  MongoDB Shared Instance                   │
├────────────────────────────────────────────┤
│                                             │
│  Tenant A Database (hrms_tenant_a)         │
│  ├─ employeecompensations                  │
│  │  └─ [Tenant A's compensation records]   │
│  ├─ employee_ctc_versions                  │
│  │  └─ [Tenant A's CTC versions]           │
│  └─ payslips                               │
│     └─ [Tenant A's payslips]               │
│                                             │
│  Tenant B Database (hrms_tenant_b)         │
│  ├─ employeecompensations                  │
│  │  └─ [Tenant B's compensation records]   │
│  ├─ employee_ctc_versions                  │
│  │  └─ [Tenant B's CTC versions]           │
│  └─ payslips                               │
│     └─ [Tenant B's payslips]               │
│                                             │
└────────────────────────────────────────────┘

AUTO-SYNC IN MULTI-TENANT CONTEXT:

Request: Process Payroll for Tenant A
│
├─ Get Tenant A Database: const db = getTenantDB(tenantId)
│
├─ Query EmployeeCompensation
│  └─ db.model('EmployeeCompensation').findOne(...)
│     ├─ Queries Tenant A collection only
│     └─ Cannot access Tenant B data
│
├─ If Found, Create EmployeeCtcVersion
│  └─ db.model('EmployeeCtcVersion').create(...)
│     ├─ Creates in Tenant A collection
│     └─ Includes companyId: tenantId
│
└─ Result: Tenant isolation maintained ✅
```

---

**This visual architecture helps understand:**
- When auto-sync is triggered
- What data flows where
- How errors are handled
- Multi-tenant data isolation
- Complete payroll calculation chain
