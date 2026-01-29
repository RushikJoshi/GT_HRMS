# Payroll Compensation Source - Test Checklist

**Version**: 1.0  
**Date**: January 22, 2026  
**Scope**: Process Payroll compensation source implementation (toggle + backend support)

---

## Pre-Test Setup

### Database State
- [ ] 5+ employees with Compensation (salarySnapshotId)
- [ ] 3+ employees with only Salary Template
- [ ] 2+ employees with both Compensation and Template
- [ ] 1+ employee with neither (should error)
- [ ] January 2026 payroll run in INITIATED state (for testing reset)

### Test Data Preparation
```
Employee1: ✅ Compensation ✅ Template  → Can use either
Employee2: ✅ Compensation ❌ Template  → Compensation only
Employee3: ❌ Compensation ✅ Template  → Template only
Employee4: ❌ Compensation ❌ Template  → Should error
Employee5: ✅ Compensation (incomplete)  → Graceful degrade
```

---

## PHASE 1: Frontend UI Tests

### Test 1.1: Toggle Component Visibility
**Path**: Process Payroll → Header  
**Expected**: Checkbox "Use Employee Compensation" visible with unchecked state

```
[ ] Checkbox displays on page load
[ ] Label reads "Use Employee Compensation"
[ ] Default state is unchecked (false)
```

### Test 1.2: Toggle OFF → Template Mode
**Action**: Leave toggle OFF, select month

```
[ ] Salary Template column is visible
[ ] Template Select dropdown is enabled
[ ] Status column shows "Missing Template" for employees without template
[ ] Status shows "Ready" for employees with template
[ ] "Calculate Preview" button is enabled
```

### Test 1.3: Toggle ON → Compensation Mode
**Action**: Click toggle to ON

```
[ ] Toast shows "Switched to Employee Compensation source"
[ ] Salary Template column becomes HIDDEN
[ ] All previews are cleared
[ ] Selected employee rows are cleared
[ ] Status column shows "ACTIVE COMPENSATION" for ALL employees
```

### Test 1.4: Toggle ON → Template Dropdown Disabled
**Action**: Keep toggle ON and look at Salary Template column

```
[ ] Column header still visible (test: should this be hidden?)
[ ] Select dropdown is DISABLED (greyed out)
[ ] Cannot click dropdown
[ ] Tooltip shows why it's disabled
```

### Test 1.5: Toggle OFF → Back to Template Mode
**Action**: Click toggle back to OFF

```
[ ] Toast shows "Switched to Salary Template source"
[ ] Salary Template column becomes VISIBLE again
[ ] All previous previews cleared
[ ] Selection cleared
[ ] Status returns to "Missing Template" / "Ready"
```

### Test 1.6: Row Selection State Management
**Action**: Toggle ON with employees selected

```
[ ] Selecting employees works
[ ] Row checkboxes highlight correctly
[ ] "Calculate Preview" button enabled only when employees selected
[ ] "Run Payroll" button enabled only when employees selected
```

---

## PHASE 2: Preview API Tests (Compensation Mode)

### Test 2.1: Preview with All Compensation Available
**Setup**: Toggle ON, select Employee1 (has compensation)  
**Action**: Click "Calculate Preview"

```
API Request:
{
    "month": "2026-01",
    "items": [{ "employeeId": "EMP001", "useCompensation": true }],
    "useCompensation": true
}

Expected Response:
[
    {
        "employeeId": "EMP001",
        "gross": 100000,
        "net": 85000,
        "sourceInfo": {
            "source": "COMPENSATION",
            "applicantId": "APP123",
            "reason": "ASSIGNMENT"
        }
    }
]

Frontend Display:
[ ] Preview shows with ₹100,000 gross and ₹85,000 net
[ ] "Details" button clickable
[ ] Data persists until page refresh
```

### Test 2.2: Preview with Missing Compensation
**Setup**: Toggle ON, select Employee3 (no compensation, has template)  
**Action**: Click "Calculate Preview"

```
Behavior:
[ ] System checks for compensation (not found)
[ ] Falls back to Employee3's template
[ ] sourceInfo.source = "TEMPLATE_FALLBACK"
[ ] Preview calculates and shows correctly
[ ] Frontend doesn't show error to user
[ ] Log shows: "⚠️ Compensation not found, using template fallback"
```

### Test 2.3: Preview with Zero Compensation
**Setup**: Toggle ON, select Employee4 (no compensation, no template)  
**Action**: Click "Calculate Preview"

```
API Response:
{
    "employeeId": "EMP004",
    "error": "CTC NOT SET - No compensation found and no fallback template provided"
}

Frontend Display:
[ ] Error icon shown (red)
[ ] Tooltip shows error message
[ ] Row status unchanged
[ ] Other employees still show previews
```

### Test 2.4: Bulk Preview with Mixed Sources
**Setup**: Toggle ON, select Employee1, Employee2, Employee3, Employee4  
**Action**: Click "Calculate Preview"

```
Expected Results:
- Employee1 (has compensation) → SUCCESS (COMPENSATION)
- Employee2 (has compensation, no template) → SUCCESS (COMPENSATION)
- Employee3 (no compensation, has template) → SUCCESS (TEMPLATE_FALLBACK)
- Employee4 (nothing) → ERROR

Frontend Display:
[ ] 3 rows show green preview boxes
[ ] 1 row shows red error badge
[ ] Message shows "Calculated successfully for 3 employee(s)"
[ ] Errors are NOT blocking
```

### Test 2.5: Preview with Incomplete Compensation Data
**Setup**: Toggle ON, select Employee5 (compensation with missing fields)  
**Action**: Click "Calculate Preview"

```
Compensation Data:
{
    "ctc": 1200000,
    "monthlyCTC": 100000,
    "earnings": [{ "name": "Basic", "amount": 50000 }],
    "employeeDeductions": [],    ← EMPTY
    "benefits": []                ← EMPTY
}

Expected Behavior:
[ ] Payroll calculates using available data
[ ] Console shows warnings about missing components
[ ] Preview displays with available figures
[ ] No error thrown
[ ] sourceInfo.source = "COMPENSATION"
[ ] Status: Success (with warnings)
```

### Test 2.6: Individual Row Preview Button
**Setup**: Toggle ON, don't select any employees  
**Action**: Click "Details" button on any row

```
[ ] Details button should be disabled or show error
[ ] Clicking shows tooltip: "Select this employee and click Calculate..."
[ ] Clicking "Details" on preview row opens drawer with full breakdown
```

---

## PHASE 3: Preview API Tests (Template Mode - Regression)

### Test 3.1: Template Mode Preview Still Works
**Setup**: Toggle OFF, select Employee3 (template only)  
**Action**: Click "Calculate Preview"

```
[ ] Template dropdown required and can be selected
[ ] Preview calculates using template
[ ] Preview displays correctly
[ ] No mention of compensation in response
```

### Test 3.2: Missing Template Blocks Preview
**Setup**: Toggle OFF, select Employee1 without changing template  
**Action**: Click "Calculate Preview"

```
[ ] Warning toast: "Select employees with templates assigned"
[ ] No API call made
[ ] No preview shown
```

---

## PHASE 4: Run Payroll Tests (Compensation Mode)

### Test 4.1: Run with All Compensation
**Setup**: Toggle ON, select Employee1, Employee2  
**Action**: Click "Run Payroll" → Confirm dialog

```
API Request:
{
    "month": "2026-01",
    "items": [
        { "employeeId": "EMP001", "useCompensation": true },
        { "employeeId": "EMP002", "useCompensation": true }
    ],
    "useCompensation": true
}

Dialog Text:
[ ] Confirms: "process payroll for 2 employees using Employee Compensation..."

Expected:
[ ] Confirmation dialog shows "Employee Compensation" source
[ ] API called with useCompensation: true
[ ] Payroll processing starts
[ ] Success modal shows "Payroll processed (COMPENSATION): 2 successful..."
```

### Test 4.2: Run with Mixed Sources
**Setup**: Toggle ON, select Employee1, Employee3  
**Action**: Click "Run Payroll" → Confirm

```
Expected Processing:
- Employee1: COMPENSATION source
- Employee3: TEMPLATE_FALLBACK source

Result Modal Should Show:
[ ] "Payroll processed (COMPENSATION): 2 successful, 0 failed"
[ ] Both employees in processedList
[ ] Source field = "COMPENSATION" (primary mode)
[ ] Database: PayrollRunItem records sourceInfo for each
```

### Test 4.3: Run with Some Missing Compensation
**Setup**: Toggle ON, select Employee1 (has comp), Employee4 (no comp, no template)  
**Action**: Click "Run Payroll" → Confirm

```
Expected Results Modal:
{
    "processedEmployees": 1,
    "failedEmployees": 0,
    "skippedEmployees": 1,
    "skippedList": [{
        "employeeId": "EMP004",
        "reason": "CTC NOT SET - No compensation and no template fallback"
    }]
}

[ ] Modal shows correct counts
[ ] Employee4 in skippedList
[ ] Employee1 processed successfully
[ ] No payslip created for Employee4
```

### Test 4.4: Run with Fallback to Template
**Setup**: Toggle ON, select Employee1 (comp), Employee3 (no comp, has template)  
**Action**: Click "Run Payroll" → Confirm

```
Expected:
[ ] Employee1 uses COMPENSATION
[ ] Employee3 uses TEMPLATE_FALLBACK
[ ] Both are processed successfully
[ ] sourceInfo captured differently for each
[ ] Success message: "2 successful"

Database Check (PayrollRunItem):
[ ] Employee1 record: sourceInfo.source = "COMPENSATION"
[ ] Employee3 record: sourceInfo.source = "TEMPLATE_FALLBACK"
```

### Test 4.5: Run with Zero Attendance
**Setup**: Toggle ON, Employee with compensation but 0 attendance  
**Action**: Click "Run Payroll" → Confirm

```
Expected:
[ ] Employee skipped
[ ] Reason: "NO_PAYABLE_ATTENDANCE"
[ ] skippedList includes this employee
[ ] No payslip created
```

### Test 4.6: Run Payroll Result Modal
**Setup**: After successful run with compensation  
**Action**: View result modal

```
Result Modal Contains:
[ ] Total Employees processed
[ ] Processed count
[ ] Failed count
[ ] Skipped count
[ ] Total Gross Earnings (aggregate)
[ ] Total Net Payable (aggregate)
[ ] Source field showing "COMPENSATION"
[ ] Error list (if any failures)
```

### Test 4.7: Second Run in Same Month
**Setup**: Run 1 completed with 2 employees (COMPENSATION mode)  
**Action**: Select different 3 employees, click "Run Payroll"

```
Expected:
[ ] System detects existing payroll run for Jan 2026
[ ] Existing run is INITIATED state (can be reset)
[ ] Reset payroll: clear items, reset counts
[ ] Process new 3 employees
[ ] Final result: 3 employees processed
[ ] Previous 2 employees replaced
```

### Test 4.8: Run with Already Approved Payroll
**Setup**: Existing payroll run is in APPROVED state  
**Action**: Try to run payroll again

```
Expected Error:
[ ] "Payroll for this month is already approved or paid"
[ ] No processing happens
[ ] User informed to archive old run
```

---

## PHASE 5: Backend Source Tracking Tests

### Test 5.1: PayrollRun Source Field
**Database Check**: After compensation mode payroll run

```
PayrollRun document should contain:
{
    "_id": "PAYROLL123",
    "month": 1,
    "year": 2026,
    "source": "COMPENSATION",  ← ✅ Tracked
    "processedEmployees": 5,
    "totalGross": 500000
}

[ ] source field = "COMPENSATION"
[ ] Correctly set in create and update
```

### Test 5.2: PayrollRunItem Source Tracking
**Database Check**: After compensation mode payroll run

```
PayrollRunItem documents should contain:
[
    {
        "payrollRunId": "PAYROLL123",
        "employeeId": "EMP001",
        "sourceInfo": {
            "source": "COMPENSATION",
            "applicantId": "APP123",
            "reason": "ASSIGNMENT"
        },
        "status": "Processed"
    },
    {
        "payrollRunId": "PAYROLL123",
        "employeeId": "EMP003",
        "sourceInfo": {
            "source": "TEMPLATE_FALLBACK"
        },
        "status": "Processed"
    },
    {
        "payrollRunId": "PAYROLL123",
        "employeeId": "EMP004",
        "sourceInfo": {
            "source": "ERROR"
        },
        "status": "Skipped"
    }
]

[ ] COMPENSATION tracked correctly
[ ] TEMPLATE_FALLBACK tracked correctly
[ ] ERROR cases tracked with source
[ ] Each source has correct employeeId link
```

### Test 5.3: Execution Errors Captured
**Setup**: Run payroll with Employee5 (missing critical field)  
**Action**: Run payroll and check database

```
PayrollRun.executionErrors should contain:
[
    {
        "employeeId": "EMP005",
        "message": "Cannot read property 'basicSalary' of undefined",
        "stack": "Error: ..."
    }
]

[ ] Error details captured
[ ] Payroll run completed (not crashed)
[ ] Other employees still processed
[ ] executionErrors array populated
```

---

## PHASE 6: Backward Compatibility Tests

### Test 6.1: Old Frontend (No Toggle)
**Setup**: Old frontend sends preview without useCompensation flag  
**Action**: Send request without useCompensation field

```
API Request:
{
    "month": "2026-01",
    "items": [{ "employeeId": "EMP001", "salaryTemplateId": "TMPL001" }]
    // ← No useCompensation field
}

Expected:
[ ] Backend treats as template mode (useCompensation = false)
[ ] Uses salaryTemplateId for calculation
[ ] Works exactly as before
[ ] No errors
```

### Test 6.2: Old Backend (No Compensation Service)
**Setup**: Compatibility mode if service missing  
**Action**: Try to run compensation mode without service

```
Expected:
[ ] Graceful error message
[ ] Clear instruction to deploy service
[ ] No partial payroll processing
```

### Test 6.3: Mixed Mode Payroll Run
**Setup**: January run has:
- Employee1-3: using templates
- Employee4-6: using compensation

**Action**: Process all 6 employees in one run

```
Expected:
[ ] All 6 employees processed successfully
[ ] Each has correct sourceInfo
[ ] No conflicts between sources
[ ] Single PayrollRun covers all
[ ] Aggregate totals correct
```

---

## PHASE 7: Error Handling Tests

### Test 7.1: Compensation Service Failure
**Setup**: Database connection drops when fetching compensation  
**Action**: Click "Calculate Preview"

```
Expected:
[ ] Catch error from compensationService
[ ] Fallback to template (if available)
[ ] Show preview with fallback source
[ ] Log error to console
[ ] User sees working preview (not blank)
```

### Test 7.2: Invalid Employee ID
**Setup**: item.employeeId doesn't exist in database  
**Action**: Run payroll with invalid ID

```
Expected:
[ ] Employee skipped with reason "EMPLOYEE_NOT_FOUND"
[ ] Payroll continues with other employees
[ ] skippedList shows invalid ID
[ ] No payslip created
```

### Test 7.3: Missing Month Parameter
**Setup**: Send preview request without month  
**Action**: API call without month

```
Expected:
[ ] Backend returns 400 error
[ ] Message: "Month is required"
[ ] No calculation happens
```

### Test 7.4: Malformed Items Array
**Setup**: Send items as object instead of array  
**Action**: API call with malformed data

```
Expected:
[ ] Backend handles gracefully
[ ] Returns error message
[ ] No partial processing
```

---

## PHASE 8: UI/UX Edge Cases

### Test 8.1: Rapid Toggle Clicking
**Setup**: Toggle ON/OFF/ON rapidly  
**Action**: Click toggle 5 times quickly

```
Expected:
[ ] State settles to final state
[ ] No duplicated messages
[ ] No preview data corruption
[ ] UI responsive (no freezing)
```

### Test 8.2: Long Employee List
**Setup**: 500+ employees loaded  
**Action**: Toggle ON/OFF, select employees

```
Expected:
[ ] Toggle still responsive
[ ] Column hiding works smoothly
[ ] No performance lag
[ ] Selection works correctly
```

### Test 8.3: Mobile Responsiveness
**Setup**: Test on mobile device or responsive mode  
**Action**: Use toggle, preview, run payroll

```
[ ] Toggle checkbox visible
[ ] Table scrollable
[ ] Buttons accessible
[ ] Modal displays correctly
```

---

## PHASE 9: Payslip Display Tests

### Test 9.1: Payslip Generated with Compensation Source
**Setup**: After running payroll with compensation  
**Action**: View generated payslip

```
Expected:
[ ] Payslip shows compensation-derived amounts
[ ] earningsSnapshot reflects compensation earnings
[ ] deductionsSnapshot reflects compensation deductions
[ ] Gross and Net match preview calculation
[ ] sourceInfo visible (if implemented in payslip)
```

### Test 9.2: Payslip with Fallback Template
**Setup**: After running with TEMPLATE_FALLBACK  
**Action**: View payslip for fallback employee

```
Expected:
[ ] Payslip shows template-derived amounts
[ ] Components match template specification
[ ] Clear indication of source (in sourceInfo)
```

---

## PHASE 10: Integration Tests

### Test 10.1: Complete Flow: Toggle ON → Preview → Run
**Scenario**: Process entire month with compensation

```
Step 1: User clicks toggle ON
[ ] UI switches to compensation mode
[ ] Template column hidden
[ ] All statuses show "ACTIVE COMPENSATION"

Step 2: User selects 5 employees
[ ] Checkboxes highlight
[ ] "Calculate Preview" enabled

Step 3: User clicks "Calculate Preview"
[ ] API called with useCompensation: true
[ ] Previews appear in 2-3 seconds
[ ] Source info shows COMPENSATION/FALLBACK/ERROR

Step 4: User clicks "Run Payroll"
[ ] Confirmation dialog shows compensation source
[ ] Processing occurs
[ ] Result modal shows success

Step 5: User checks payroll run in database
[ ] PayrollRun.source = "COMPENSATION"
[ ] All PayrollRunItem records have sourceInfo
[ ] Payslips exist and are linkable
```

### Test 10.2: Complete Flow: Template Mode (Regression)
**Scenario**: Process month with traditional templates

```
Step 1: Toggle OFF (or load page)
[ ] Template dropdown visible
[ ] "Missing Template" warnings show

Step 2: Select employees and templates
[ ] Can select multiple templates
[ ] Status updates to "Ready"

Step 3: "Calculate Preview"
[ ] Works as before
[ ] No mention of compensation

Step 4: "Run Payroll"
[ ] Processes with templates
[ ] sourceInfo.source = "TEMPLATE"

Step 5: Payslips
[ ] Generated from template data
[ ] Amounts match template specification
```

---

## Test Execution Matrix

| Phase | Test Cases | Time | Priority |
|-------|-----------|------|----------|
| 1: Frontend UI | 6 tests | 20 min | CRITICAL |
| 2: Preview Comp | 6 tests | 30 min | CRITICAL |
| 3: Preview Template | 2 tests | 10 min | HIGH |
| 4: Run Payroll | 8 tests | 45 min | CRITICAL |
| 5: Source Tracking | 3 tests | 15 min | HIGH |
| 6: Backward Compat | 3 tests | 20 min | HIGH |
| 7: Error Handling | 4 tests | 25 min | MEDIUM |
| 8: UI Edge Cases | 3 tests | 20 min | MEDIUM |
| 9: Payslip Display | 2 tests | 15 min | HIGH |
| 10: Integration | 2 tests | 30 min | CRITICAL |

**Total Estimated Time**: 4-5 hours (full suite)

---

## Pass/Fail Criteria

### MUST PASS (Critical)
- [ ] All Phase 1 tests (UI toggle works)
- [ ] All Phase 2 tests (Compensation preview works)
- [ ] All Phase 4 tests (Compensation payroll works)
- [ ] All Phase 10 tests (End-to-end flows)

### SHOULD PASS (High Priority)
- [ ] All Phase 3 tests (Regression - template still works)
- [ ] All Phase 5 tests (Source tracking)
- [ ] All Phase 6 tests (Backward compatibility)
- [ ] Phase 9.1 test (Payslip display)

### NICE TO PASS (Medium Priority)
- [ ] Phase 7 tests (Error handling)
- [ ] Phase 8 tests (Edge cases)
- [ ] Phase 9.2 test (Fallback payslips)

---

## Sign-Off

**Tested By**: ________________  
**Date**: ________________  
**Environment**: ☐ Dev ☐ Staging ☐ Prod  
**Result**: ☐ ALL PASS ☐ PASS WITH NOTES ☐ FAILED  

**Notes**:
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

**Approved By**: ________________  
**Date**: ________________

---

## Regression Test (Future Runs)

**Minimum Checklist for Each Deploy**:
- [ ] Phase 1: Toggle works (5 min)
- [ ] Phase 2: Compensation preview works (10 min)
- [ ] Phase 4: Compensation run works (10 min)
- [ ] Phase 6: Template mode still works (10 min)
- [ ] Phase 10.1: Full compensation flow (15 min)

**Time**: 50 minutes per regression cycle
