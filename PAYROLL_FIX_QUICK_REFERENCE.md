# 🚀 Payroll Data Flow Fix - Quick Reference

**TL;DR**: Register models in tenant DB + run migration + restart backend ✅

---

## Files Changed

### ✏️ Modified (1 file)
- **[backend/config/dbManager.js](backend/config/dbManager.js)**
  - Added: `EmployeeCompensationSchema` import (Line ~104)
  - Added: `EmployeeCtcVersionSchema` import (Line ~105)
  - Added: Registration calls for both models (Lines ~160-161)

### ✨ Created (1 file)
- **[backend/migrations/migrate_employee_ctc.js](backend/migrations/migrate_employee_ctc.js)**
  - Syncs all active EmployeeCompensation → EmployeeCtcVersion
  - Works across all tenant databases
  - Skips if EmployeeCtcVersion already exists
  - Includes error handling and detailed logging

---

## 5-Minute Deployment

### 1️⃣ Verify changes (1 min)
```bash
# Check dbManager.js was updated
grep -n "EmployeeCompensation\|EmployeeCtcVersion" backend/config/dbManager.js
```

### 2️⃣ Run migration (2 min)
```bash
cd backend
node migrations/migrate_employee_ctc.js
```

### 3️⃣ Restart backend (1 min)
```bash
npm run dev
```

### 4️⃣ Test payroll (1 min)
- Go to Payroll → Process Payroll
- Select employee with compensation
- Click Preview
- ✅ Should show Gross > 0

---

## What Now Works

| Scenario | Before | After |
|----------|--------|-------|
| Process payroll | ❌ Error: "Schema not registered" | ✅ Works |
| Employee with compensation | ❌ "No ACTIVE EmployeeCtcVersion" | ✅ Auto-syncs |
| Preview payroll | ❌ Fails | ✅ Shows gross & net |
| Run payroll | ❌ Fails | ✅ Generates payslips |

---

## Data Flow

```
EmployeeCompensation (UI created)
     ↓
[Migration Creates]
     ↓
EmployeeCtcVersion (Database)
     ↓
Payroll Service (reads)
     ↓
Payslip (generated with correct amounts)
```

---

## Expected Logs

### After modification to dbManager.js
```
✅ [DB_MANAGER] Models registered/refreshed for tenant: TENANT_ID
   - EmployeeCompensation ✅
   - EmployeeCtcVersion ✅
```

### After migration runs
```
✅ Connected to MongoDB
📊 Found X tenant databases
✅ Created Y EmployeeCtcVersion records
⏭️  Skipped Z (already existed)
🎉 Migration completed successfully!
```

### After payroll processes
```
🔍 [PAYROLL-DEBUG] All CTC versions for EMPLOYEE_ID: [...]
✅ [PAYROLL] CTC auto-synced from EmployeeCompensation to EmployeeCtcVersion
📋 [PAYROLL] Payslip generated for EMPLOYEE
   Gross: 25000, Net: 18000
```

---

## Verification Checklist

Quick checks to ensure everything works:

```javascript
// MongoDB Console - Replace TENANT_ID with actual tenant
use company_TENANT_ID;

// Check 1: Compensation exists
db.employeecompensations.find({ isActive: true }).count()
// Expected: > 0

// Check 2: CTC Version exists
db.employeectcversions.find({ status: "ACTIVE" }).count()
// Expected: > 0

// Check 3: Migration marked records
db.employeectcversions.find({ "_syncSource": "EMPLOYEE_COMPENSATION" }).count()
// Expected: > 0

// Check 4: Sample record
db.employeectcversions.findOne()
// Should have fields: totalCTC, components, status: "ACTIVE"
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Schema not registered" | Run migration, restart backend |
| "No ACTIVE EmployeeCtcVersion" | Migration didn't run or 0 records found |
| 0 records created by migration | No EmployeeCompensation records with isActive: true |
| Payroll still fails | Check backend logs for ERROR messages |

---

## No Breaking Changes ✅

- ✅ Existing salary templates still work
- ✅ Legacy applicants.salaryStructure still works
- ✅ Current payroll logic unchanged
- ✅ Backward compatible with all employees
- ✅ Optional: useCompensation flag defaults to false

---

## What Changed Under the Hood

### Before
```javascript
// dbManager.js
// ❌ EmployeeCompensation and EmployeeCtcVersion NOT registered
// Result: Payroll fails with "Schema not registered"
```

### After
```javascript
// dbManager.js
const EmployeeCompensationSchema = require("../models/EmployeeCompensation");
const EmployeeCtcVersionSchema = require("../models/EmployeeCtcVersion");

// ✅ Both models registered on tenant DB connection
register("EmployeeCompensation", EmployeeCompensationSchema, true);
register("EmployeeCtcVersion", EmployeeCtcVersionSchema, true);

// Result: Auto-sync works, payroll processes successfully
```

---

## Next Steps

1. ✅ Deploy these changes
2. ✅ Run migration script
3. ✅ Verify in MongoDB (see checklist above)
4. ✅ Test payroll processing
5. ✅ Monitor logs for 3-5 days
6. ✅ Done!

---

**Status**: Ready for Production  
**Risk**: 🟢 LOW (registration only, no logic changes)  
**Time to Deploy**: ~5 minutes  
**Rollback Time**: <1 minute (delete migration results, no permanent changes)

---

📖 Full guide: [PAYROLL_DEPLOYMENT_COMPLETE.md](PAYROLL_DEPLOYMENT_COMPLETE.md)
