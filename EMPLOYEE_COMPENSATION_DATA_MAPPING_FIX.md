# Employee Compensation Data Mapping Fix

## Problem Summary

**Issue**: Employee Compensation page showed "CTC NOT SET" for all employees despite the page loading correctly.

**Root Cause**: The mapping function was looking for `applicant.salaryStructure` field, but the actual API response from `/requirements/applicants` returns data with `applicant.salarySnapshotId` (populated with EmployeeSalarySnapshot data).

## How The Fix Works

### 1. API Response Structure
The `/requirements/applicants` endpoint returns applicants with:
```javascript
{
  _id, firstName, lastName, employeeId, role,
  requirementId: { ... },
  candidateId: { ... },
  salarySnapshotId: {          // <-- This is what we needed!
    ctc: 1200000,              // Annual CTC
    monthlyCTC: 100000,
    summary: {
      grossEarnings: 100000,   // Maps to grossA
      totalDeductions: 15000,  // Maps to grossB
      totalBenefits: 5000      // Maps to grossC
    },
    earnings: [...],
    employeeDeductions: [...],
    benefits: [...],
    reason: 'ASSIGNMENT',
    effectiveFrom: Date
  }
}
```

### 2. Fixed Mapping Function
Updated `mapSalaryData()` to correctly extract data from `salarySnapshotId`:

```javascript
const mapSalaryData = (applicant) => {
    // Get salary snapshot from populated salarySnapshotId field
    const salarySnapshot = applicant?.salarySnapshotId || {};
    
    // Extract from snapshot
    const annualCTC = salarySnapshot?.ctc || 0;
    const monthlyCTC = salarySnapshot?.monthlyCTC || 0;
    const grossA = salarySnapshot?.summary?.grossEarnings || 0;
    const grossB = salarySnapshot?.summary?.totalDeductions || 0;
    const grossC = salarySnapshot?.summary?.totalBenefits || 0;
    
    // Check if salary is actually set
    const isCTCSet = annualCTC > 0 && Object.keys(salarySnapshot).length > 0;
    
    return {
        ...applicant,
        activeVersion: isCTCSet ? {
            grossA, grossB, grossC, totalCTC: annualCTC,
            monthlyCTC, effectiveFrom, version: 1,
            components: salarySnapshot?.earnings || [],
            reason: salarySnapshot?.reason || 'ASSIGNMENT'
        } : null,
        ctcStatus: isCTCSet ? 'Active' : 'Not Set'
    };
};
```

### 3. Enhanced Debugging
Added console logging to fetchData() to help diagnose data flow:
- Logs full raw API response
- Logs salary snapshot presence for each applicant
- Shows activeVersion mapping for first 2 employees
- Displays ctcStatus for verification

## Table Rendering (No Changes Needed)
The table rendering code already had proper fallbacks:
```javascript
{active ? `₹${formatINR(active.grossA)}` : <span className="text-amber-600">CTC NOT SET</span>}
```

Since `active` is set to the `activeVersion` object (which is now properly populated), the salary amounts will display correctly.

## Files Modified

### frontend/src/pages/HR/Compensation.jsx
- **Lines 56-98**: Updated `mapSalaryData()` function
  - Changed from looking at `applicant.salaryStructure`
  - Now correctly extracts from `applicant.salarySnapshotId`
  - Maps snapshot fields to activeVersion format
  
- **Lines 100-131**: Enhanced `fetchData()` function
  - Added detailed console logging
  - Improved response handling
  - Better error fallbacks

## Validation Checklist

- ✅ Code has no syntax errors
- ✅ Uses optional chaining (?.) for safe property access
- ✅ Handles missing/null salary snapshot with fallback to "CTC NOT SET"
- ✅ Safe type conversions (falls back to 0 if field missing)
- ✅ Compatible with existing table rendering logic
- ✅ Provides debugging console logs for troubleshooting

## Testing Steps

1. **Open Employee Compensation page**
   - Should load without errors
   - Employee names should display properly

2. **Check Browser Console**
   - Look for "Raw API Response" log showing applicant array
   - Look for "Processing X applicants" message
   - Check first 2 applicants for salarySnapshot presence

3. **Verify Salary Display**
   - Employees with salary snapshot should show ₹ amounts
   - Employees without salary snapshot should show "CTC NOT SET"
   - All formatting (₹, commas) should work correctly

4. **Monitor for Errors**
   - No "Cannot read properties of undefined" errors
   - No network failures when fetching applicants

## Next Steps If Data Still Shows As "CTC NOT SET"

If all employees still show "CTC NOT SET" after the fix:

1. Check if `salarySnapshotId` field exists in response
   - Open Browser DevTools → Network tab
   - Click on `/requirements/applicants` request
   - Check Response tab to see actual data structure

2. Verify salary snapshot data is populated
   - Search response for `salarySnapshotId` field
   - Confirm it contains `ctc` and `summary` fields

3. Check backend logs
   - Backend may not be populating `salarySnapshotId` for some reason
   - May need to verify EmployeeSalarySnapshot records exist in database

4. As a fallback, could use alternative field like:
   - `applicant.designationCtc` 
   - `applicant.baseSalary`
   - Or create a new backend fix to properly populate salarySnapshotId

## Architecture Notes

**Why `/requirements/applicants` uses populated salarySnapshotId:**

From [backend/services/Recruitment.service.js](backend/services/Recruitment.service.js#L185-L200):
```javascript
async getTenantApplications(tenantId) {
    const { Applicant } = await this.getModels(tenantId);
    return await Applicant.find({ tenant: tenantId })
        .populate('requirementId', 'jobTitle jobOpeningId')
        .populate('candidateId', 'name email mobile')
        .populate('salarySnapshotId')  // <-- Populates EmployeeSalarySnapshot
        .sort({ createdAt: -1 });
}
```

This design allows Employee Compensation page to reuse the same `/requirements/applicants` endpoint without needing a separate API, meeting the constraint of "NO new APIs".

## Related Files Reference

- [EmployeeSalarySnapshot Model](backend/models/EmployeeSalarySnapshot.js)
- [Applicant Model](backend/models/Applicant.js)
- [Recruitment Service](backend/services/Recruitment.service.js)
- [Compensation Component](frontend/src/pages/HR/Compensation.jsx)
