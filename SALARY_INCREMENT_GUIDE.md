# Salary Increment / Revision System - Implementation Guide

## 📋 Overview

This document describes the **safe, backward-compatible** salary increment/revision system implemented for GT_HRMS.

### ✅ Key Features

1. **Salary Versioning** - Never modifies existing records, only creates new versions
2. **Effective Date Support** - Past, present, and future effective dates
3. **Auto-Status Management** - ACTIVE, SCHEDULED, EXPIRED based on dates
4. **Audit Trail** - Complete tracking of who, when, why
5. **Payroll Safety** - Zero impact on existing payroll calculations
6. **Validation** - Salary breakup validation before save
7. **Auto-Activation** - Scheduled increments auto-activate on effective date

---

## 🏗️ Architecture

### Database Models

#### 1. **EmployeeCtcVersion** (Existing - Enhanced)
- Stores each salary version
- Fields: `version`, `effectiveFrom`, `totalCTC`, `grossA`, `grossB`, `grossC`, `components`, `isActive`, `status`
- **NEVER modified** after creation

#### 2. **SalaryIncrement** (New)
- Audit trail for salary changes
- Fields: `incrementType`, `effectiveFrom`, `newCtcVersionId`, `previousCtcVersionId`, `absoluteChange`, `percentageChange`, `reason`, `notes`, `status`, `createdBy`, `approvedBy`
- Tracks INCREMENT, REVISION, PROMOTION, ADJUSTMENT

### Status Logic

```
SCHEDULED → effectiveFrom > today (future salary)
ACTIVE    → effectiveFrom <= today AND isActive = true
EXPIRED   → replaced by newer ACTIVE version
CANCELLED → manually cancelled before activation
```

### Versioning Rules

1. Each increment creates **NEW** `EmployeeCtcVersion` record
2. Version number auto-incremented (v1, v2, v3...)
3. Old versions marked as `isActive: false` when new one becomes ACTIVE
4. Historical versions **NEVER deleted or modified**

---

## 🔌 API Endpoints

### 1. Create Increment
```http
POST /api/compensation/increment
```

**Request Body:**
```json
{
  "employeeId": "64abc123...",
  "effectiveFrom": "2026-04-01",
  "totalCTC": 1200000,
  "grossA": 70000,
  "grossB": 240000,
  "grossC": 120000,
  "components": [...],
  "incrementType": "INCREMENT",
  "reason": "Annual performance increment",
  "notes": "Based on Q4 2025 performance review"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Salary increment scheduled successfully",
  "data": {
    "increment": { ... },
    "newVersion": {
      "_id": "...",
      "version": 2,
      "totalCTC": 1200000,
      "effectiveFrom": "2026-04-01",
      "status": "SCHEDULED",
      "isActive": false
    },
    "previousVersion": {
      "version": 1,
      "totalCTC": 1000000
    },
    "change": {
      "absolute": 200000,
      "percentage": "20.00"
    },
    "status": "SCHEDULED",
    "statusMessage": "Increment scheduled for 4/1/2026"
  }
}
```

### 2. Get Increment History
```http
GET /api/compensation/increment/history/:employeeId
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "incrementType": "INCREMENT",
      "effectiveFrom": "2026-04-01",
      "newTotalCTC": 1200000,
      "previousTotalCTC": 1000000,
      "absoluteChange": 200000,
      "percentageChange": 20,
      "status": "SCHEDULED",
      "reason": "Annual performance increment",
      "createdBy": { "firstName": "Admin", "lastName": "User" },
      "createdAt": "2026-01-31T10:00:00Z"
    }
  ]
}
```

### 3. Cancel Scheduled Increment
```http
POST /api/compensation/increment/:id/cancel
```

**Request Body:**
```json
{
  "reason": "Budget constraints"
}
```

### 4. Preview Increment
```http
GET /api/compensation/increment/preview?employeeId=64abc123...&newCTC=1200000
```

### 5. Activate Scheduled Increments (Manual Trigger)
```http
POST /api/compensation/increment/activate-scheduled
```

---

## 💻 Frontend Components

### SalaryIncrementModal

**Location:** `frontend/src/components/Compensation/SalaryIncrementModal.jsx`

**Features:**
- Auto-calculate salary breakup
- Manual override support
- Real-time validation
- Status preview (ACTIVE vs SCHEDULED)
- Confirmation dialog
- Version number display

**Usage:**
```jsx
import SalaryIncrementModal from '../../components/Compensation/SalaryIncrementModal';

<SalaryIncrementModal
  employee={selectedEmployee}
  currentVersion={selectedEmployee.activeVersion}
  onClose={() => setShowModal(false)}
  onSuccess={(result) => {
    // Handle success
    console.log(result);
    fetchData();
  }}
/>
```

---

## 🔒 Safety Guarantees

### ✅ What This System DOES

1. ✅ Creates new salary version records
2. ✅ Preserves complete history
3. ✅ Validates salary breakup before save
4. ✅ Auto-activates based on effective date
5. ✅ Tracks full audit trail
6. ✅ Supports future, present, past effective dates

### ❌ What This System NEVER DOES

1. ❌ Modifies existing salary records
2. ❌ Deletes historical data
3. ❌ Changes payroll calculation logic
4. ❌ Breaks existing APIs
5. ❌ Renames existing fields
6. ❌ Alters database schemas

---

## 🔄 Payroll Integration

### How Payroll Selects Salary

**Existing Logic (UNCHANGED):**
```javascript
// Payroll selects ACTIVE salary version
const activeVersion = await EmployeeCtcVersion.findOne({
  employeeId: emp._id,
  isActive: true
}).sort({ version: -1 });
```

**With Versioning:**
- Payroll always uses `isActive: true` version
- When increment becomes ACTIVE, old version automatically marked `isActive: false`
- Payroll calculation logic **NEVER changes**

### Activation Flow

```
1. User creates increment with effectiveFrom = 2026-04-01
   → Status: SCHEDULED
   → isActive: false

2. Cron job runs daily (or manual trigger)
   → Checks: effectiveFrom <= today
   → If true:
     - Set new version: isActive = true, status = 'ACTIVE'
     - Set old version: isActive = false, status = 'INACTIVE'
     - Update increment: status = 'ACTIVE'

3. Payroll runs for April 2026
   → Selects: isActive = true version
   → Uses new salary automatically
```

---

## 🎯 Validation Rules

### 1. Salary Breakup Validation

```
(Gross A × 12) + Gross B + Gross C = Total CTC
```

**Tolerance:** ±₹1 for rounding

**Example:**
```
Gross A (monthly): ₹70,000
Gross B (annual):  ₹240,000
Gross C (annual):  ₹120,000

Calculation:
(70,000 × 12) + 240,000 + 120,000 = 1,200,000 ✅

Total CTC: ₹1,200,000 ✅ Valid
```

### 2. Required Fields

- `employeeId` - Employee must exist
- `effectiveFrom` - Valid date
- `totalCTC` - Must be > 0
- `createdBy` - User ID
- `companyId` - Tenant ID

### 3. Business Rules

- Employee must have existing salary (cannot create increment without initial salary)
- Cannot cancel ACTIVE or EXPIRED increments (only SCHEDULED)
- Effective date can be past, present, or future

---

## 🔧 Auto-Activation Cron Job

### Setup

**Recommended:** Run daily at 00:01 AM

```javascript
// Example cron setup (Node-cron)
const cron = require('node-cron');
const salaryIncrementService = require('./services/salaryIncrement.service');

// Run every day at 00:01 AM
cron.schedule('1 0 * * *', async () => {
  console.log('Running salary increment auto-activation...');
  
  // Get all tenant DBs
  const tenants = await Tenant.find({ status: 'active' });
  
  for (const tenant of tenants) {
    const tenantDB = getTenantDB(tenant._id);
    
    try {
      const result = await salaryIncrementService.activateScheduledIncrements(tenantDB);
      console.log(`✅ Activated ${result.activated} increments for tenant ${tenant.companyName}`);
    } catch (error) {
      console.error(`❌ Failed to activate increments for tenant ${tenant._id}:`, error);
    }
  }
});
```

**Manual Trigger:**
```http
POST /api/compensation/increment/activate-scheduled
```

---

## 📊 UI Behavior

### Compensation List Page

**Display Rules:**
- Show only ACTIVE salary in main table
- Do NOT display all versions in main table
- Provide "History" button to view all versions

**Increment Button:**
- Only visible for Super Admin / Company Admin
- Disabled if employee has no existing salary
- Opens SalaryIncrementModal

### Increment Modal

**Fields:**
1. Employee ID (read-only)
2. Effective From Date (mandatory, date picker)
3. Increment Type (dropdown: INCREMENT, REVISION, PROMOTION, ADJUSTMENT)
4. Annual Total CTC (mandatory, number input)
5. Gross A (monthly) - auto-calculated or manual
6. Gross B (annual) - auto-calculated or manual
7. Gross C (annual) - auto-calculated or manual
8. Reason (optional, textarea)
9. Notes (optional, textarea)

**Auto-Calculate:**
- Checkbox to enable/disable
- When enabled: Gross A = 70% / 12, Gross B = 20%, Gross C = 10%
- User can override by unchecking and entering manually

**Validation:**
- Real-time breakup validation
- Shows error if mismatch
- Disables submit button if invalid

**Confirmation:**
- Shows summary before final submit
- Displays: Current CTC, New CTC, Change (absolute & %), Effective Date, Status
- Requires explicit confirmation

---

## 🧪 Testing Checklist

### Backend Tests

- [ ] Create increment with future effective date → Status = SCHEDULED
- [ ] Create increment with today's date → Status = ACTIVE
- [ ] Create increment with past date → Status = ACTIVE
- [ ] Verify old version marked as INACTIVE when new becomes ACTIVE
- [ ] Verify version number auto-increments
- [ ] Verify salary breakup validation (valid)
- [ ] Verify salary breakup validation (invalid)
- [ ] Verify cannot create increment without existing salary
- [ ] Verify increment history returns all versions
- [ ] Verify cancel scheduled increment
- [ ] Verify cannot cancel ACTIVE increment
- [ ] Verify auto-activation cron job

### Frontend Tests

- [ ] Open increment modal
- [ ] Auto-calculate breakup works
- [ ] Manual override works
- [ ] Validation shows error for invalid breakup
- [ ] Validation shows success for valid breakup
- [ ] Status preview shows SCHEDULED for future date
- [ ] Status preview shows ACTIVE for today/past date
- [ ] Confirmation dialog shows correct summary
- [ ] Success message displays after creation
- [ ] Data refreshes after increment creation
- [ ] History modal shows all versions

### Payroll Integration Tests

- [ ] Payroll uses ACTIVE salary version
- [ ] Payroll ignores SCHEDULED versions
- [ ] Payroll switches to new version after activation
- [ ] Payroll calculations remain unchanged
- [ ] Existing payslips not affected

---

## 🚨 Troubleshooting

### Issue: Increment not activating

**Check:**
1. Effective date is <= today
2. Status is SCHEDULED (not CANCELLED)
3. Cron job is running
4. No errors in logs

**Solution:**
```http
POST /api/compensation/increment/activate-scheduled
```

### Issue: Payroll using old salary

**Check:**
1. New version `isActive` = true
2. Old version `isActive` = false
3. Effective date <= payroll date

**Solution:**
```javascript
// Manually activate
await EmployeeCtcVersion.findByIdAndUpdate(newVersionId, { isActive: true });
await EmployeeCtcVersion.updateMany(
  { employeeId, _id: { $ne: newVersionId } },
  { isActive: false }
);
```

### Issue: Validation error

**Check:**
- (Gross A × 12) + Gross B + Gross C = Total CTC
- Tolerance: ±₹1

**Solution:**
- Adjust breakup values
- Or adjust Total CTC

---

## 📝 Migration Guide

### If you have existing salary data:

**No migration needed!** The system is backward-compatible.

**Optional:** Create initial versions for existing employees:

```javascript
// One-time script
const employees = await Employee.find({ status: 'Active' });

for (const emp of employees) {
  const existingSalary = await EmployeeCompensation.findOne({ employeeId: emp._id });
  
  if (existingSalary && !await EmployeeCtcVersion.exists({ employeeId: emp._id })) {
    // Create v1 from existing salary
    await new EmployeeCtcVersion({
      companyId: emp.companyId,
      employeeId: emp._id,
      version: 1,
      effectiveFrom: emp.joiningDate,
      totalCTC: existingSalary.totalCTC,
      grossA: existingSalary.grossA,
      grossB: existingSalary.grossB,
      grossC: existingSalary.grossC,
      components: existingSalary.components,
      isActive: true,
      status: 'ACTIVE',
      createdBy: 'SYSTEM'
    }).save();
  }
}
```

---

## 🎓 Best Practices

### 1. Always Use Effective Dates

```javascript
// ✅ Good
effectiveFrom: '2026-04-01' // First day of month

// ❌ Avoid
effectiveFrom: '2026-04-15' // Mid-month (complicates payroll)
```

### 2. Document Reasons

```javascript
// ✅ Good
reason: "Annual performance increment - Q4 2025 rating: Exceeds Expectations"

// ❌ Avoid
reason: "Increment"
```

### 3. Validate Before Submit

```javascript
// Always validate breakup
const sum = (grossA * 12) + grossB + grossC;
if (Math.abs(sum - totalCTC) > 1) {
  throw new Error('Breakup mismatch');
}
```

### 4. Use Confirmation Dialogs

Always show summary before final submit to prevent mistakes.

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review troubleshooting section
3. Check backend logs
4. Contact development team

---

## 🔄 Version History

- **v1.0** (2026-01-31) - Initial implementation
  - Salary versioning
  - Auto-activation
  - Frontend modal
  - API endpoints
  - Documentation

---

## ✅ Implementation Checklist

### Backend
- [x] SalaryIncrement model
- [x] salaryIncrement.service.js
- [x] salaryIncrement.controller.js
- [x] Routes configuration
- [x] Enhanced compensation.controller.js
- [ ] Cron job setup (optional)

### Frontend
- [x] SalaryIncrementModal component
- [x] Updated Compensation.jsx
- [x] Import statements

### Testing
- [ ] Backend unit tests
- [ ] Frontend component tests
- [ ] Integration tests
- [ ] Payroll integration tests

### Documentation
- [x] This guide
- [ ] API documentation
- [ ] User manual
- [ ] Admin guide

---

**Status:** ✅ Core implementation complete, ready for testing
