# Payroll Compensation Source Integration
## Complete Implementation & Test Guide

---

## 📋 OVERVIEW

This feature adds a **toggle in Process Payroll** to read salary data from **Employee Compensation** instead of **Salary Templates**.

### Key Features:
- ✅ Reads from `EmployeeSalarySnapshot` (populated via `/requirements/applicants`)
- ✅ Uses compensation data: `ctc`, `monthlyCTC`, `earnings`, `deductions`, `benefits`
- ✅ Falls back to Salary Template if compensation unavailable
- ✅ Payslip tracks which source was used
- ✅ **ZERO breaking changes** - old templates still work perfectly
- ✅ Supports mixed employees (some using compensation, some using templates)

---

## 🏗️ BACKEND IMPLEMENTATION

### 1. New Service: Compensation Source
**File:** `backend/services/payrollCompensationSource.service.js`

**Functions:**
- `getEmployeeCompensation()` - Fetch salary snapshot for employee
- `selectPayrollSource()` - GUARD: Choose between compensation/template
- `validateCompensationSource()` - Check if compensation is valid
- `convertCompensationToTemplate()` - Convert compensation to template format
- `extractCompensationBreakdown()` - Get detailed breakdown for payslip

**Key Logic:**
```javascript
// Usage in payroll calculation:
const source = await selectPayrollSource(db, tenantId, empId, useCompensationSource);

if (source.source === 'COMPENSATION') {
    // Use source.template (converted from compensation)
} else {
    // Use traditional salary template
}
```

### 2. New Controller: Compensation Support
**File:** `backend/controllers/payrollCompensationSource.controller.js`

**Endpoints:**
- `previewPayrollWithCompensationSupport()` - Preview with source selection
- `runPayrollWithCompensationSupport()` - Run payroll with source selection

**Request Changes:**
```javascript
// OLD (still works):
POST /payroll/process/preview
{ month: "2026-01", items: [...] }

// NEW (supports compensation):
POST /payroll/process/preview
{
    month: "2026-01",
    useCompensationSource: true,  // NEW
    items: [...]
}
```

**Response Changes:**
```javascript
// Returns source info for audit:
{
    employeeId: "xxx",
    source: "COMPENSATION",  // or "TEMPLATE"
    useCompensation: true,
    fallback: false,
    gross: 50000,
    netPay: 42000,
    compensationBreakdown: {...}  // NEW: Detailed breakdown
}
```

### 3. Integration Steps

#### Step 1: Register Routes
In your payroll routes file (`backend/routes/payroll.routes.js`):

```javascript
const compensationController = require('../controllers/payrollCompensationSource.controller');

// Add new endpoints alongside existing ones:
router.post('/payroll/process/preview-v2', compensationController.previewPayrollWithCompensationSupport);
router.post('/payroll/process/run-v2', compensationController.runPayrollWithCompensationSupport);

// OR patch existing endpoints to support new flag:
// The flag defaults to false, so old requests still work
```

#### Step 2: Update Payroll Service
In `backend/services/payroll.service.js`, update `calculateEmployeePayroll` to accept source info:

```javascript
// Add parameter to track source
async function calculateEmployeePayroll(
    db,
    tenantId,
    employee,
    month,
    year,
    startDate,
    endDate,
    daysInMonth,
    holidayDates,
    payrollRunId,
    explicitTemplateId = null,
    dryRun = false,
    sourceInfo = null  // NEW: Track which source was used
) {
    // ... existing calculation logic ...
    
    // Store in payslip for audit
    payslipData.sourceInfo = sourceInfo || {
        source: 'TEMPLATE',
        useCompensation: false
    };
}
```

#### Step 3: Update Payslip Schema
Ensure Payslip model includes source tracking:

```javascript
// In backend/models/Payslip.js, add:
sourceInfo: {
    source: { type: String, enum: ['TEMPLATE', 'COMPENSATION'], default: 'TEMPLATE' },
    useCompensation: { type: Boolean, default: false },
    fallback: { type: Boolean, default: false },
    fallbackReason: String
}
```

---

## 🎨 FRONTEND IMPLEMENTATION

### 1. Update ProcessPayroll.jsx

#### Add State:
```javascript
const [useCompensationSource, setUseCompensationSource] = useState(false);
const [sourceWarnings, setSourceWarnings] = useState({});
```

#### Add UI Toggle:
```javascript
import { PayrollSourceToggle } from './PayrollSourceToggle';

// In render (after month picker):
<PayrollSourceToggle 
    useCompensationSource={useCompensationSource}
    onToggle={setUseCompensationSource}
    loading={loading}
/>
```

#### Update Preview Call:
```javascript
const calculatePreview = async () => {
    const itemsToPreview = employees
        .filter(e => selectedRowKeys.includes(e._id))
        .filter(e => e.selectedTemplateId)
        .map(e => ({ employeeId: e._id, salaryTemplateId: e.selectedTemplateId }));

    setCalculating(true);
    try {
        const res = await api.post('/payroll/process/preview', {
            month: month.format('YYYY-MM'),
            useCompensationSource,  // NEW
            items: itemsToPreview
        });

        const newPreviews = {};
        const warnings = {};
        
        res.data.data.forEach(p => {
            newPreviews[p.employeeId] = p;
            if (p.fallback) {
                warnings[p.employeeId] = { type: 'fallback', message: p.fallbackReason };
            }
        });
        
        setPreviews(newPreviews);
        setSourceWarnings(warnings);
        messageApi.success(`Calculated for ${itemsToPreview.length} employee(s)`);
    } catch (err) {
        messageApi.error(err.response?.data?.message || "Calculation failed");
    } finally {
        setCalculating(false);
    }
};
```

#### Update Run Payroll Call:
```javascript
const runPayroll = async () => {
    const itemsToProcess = employees
        .filter(e => selectedRowKeys.includes(e._id))
        .filter(e => e.selectedTemplateId)
        .map(e => ({ employeeId: e._id, salaryTemplateId: e.selectedTemplateId }));

    if (!window.confirm(
        `Process payroll for ${itemsToProcess.length} employees using ${
            useCompensationSource ? 'Compensation' : 'Templates'
        }?`
    )) return;

    setPayrollRunning(true);
    try {
        const response = await api.post('/payroll/process/run', {
            month: month.format('YYYY-MM'),
            useCompensationSource,  // NEW
            items: itemsToProcess
        });

        const result = response.data.data;
        setPayrollResult(result);
        
        // Log source audit trail
        console.log('Payroll Sources Used:', result.sourceMap);
        
        messageApi.success(`Payroll processed for ${result.processedEmployees} employees`);
        await fetchEmployees();
    } catch (err) {
        messageApi.error(err.response?.data?.message || "Payroll run failed");
    } finally {
        setPayrollRunning(false);
    }
};
```

### 2. Create PayrollSourceToggle Component
**File:** `frontend/src/components/PayrollSourceToggle.jsx`

```javascript
export const PayrollSourceToggle = ({ 
    useCompensationSource, 
    onToggle, 
    loading = false 
}) => {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Zap className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Payroll Data Source</h3>
                        <p className="text-xs text-slate-500">
                            {useCompensationSource 
                                ? '✓ Using Employee Compensation (with fallback)'
                                : '→ Using Salary Templates'}
                        </p>
                    </div>
                </div>
                
                <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-sm font-medium text-slate-700">
                        {useCompensationSource ? 'ON' : 'OFF'}
                    </span>
                    <div className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        useCompensationSource ? 'bg-green-500' : 'bg-slate-300'
                    }`}>
                        <input
                            type="checkbox"
                            checked={useCompensationSource}
                            onChange={(e) => onToggle(e.target.checked)}
                            disabled={loading}
                            className="sr-only"
                        />
                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            useCompensationSource ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                    </div>
                </label>
            </div>
            
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                <p className="font-medium mb-1">💡 Payroll Sources:</p>
                <ul className="space-y-1 ml-3 list-disc">
                    <li><strong>OFF:</strong> Traditional Salary Templates</li>
                    <li><strong>ON:</strong> Employee Compensation records with template fallback</li>
                </ul>
            </div>
        </div>
    );
};
```

---

## 🧪 COMPREHENSIVE TEST CHECKLIST

### Test 1: Basic Toggle Functionality
- [ ] Toggle appears in Process Payroll screen
- [ ] Toggle starts in OFF position
- [ ] Toggle can be switched ON/OFF
- [ ] Toggle state persists during preview calculations
- [ ] Toggle state is passed to backend API

### Test 2: Compensation Source Reading
- [ ] With toggle ON, backend calls `selectPayrollSource()`
- [ ] For employees WITH compensation records:
  - [ ] Compensation snapshot is fetched correctly
  - [ ] Data is converted to template format
  - [ ] `source: 'COMPENSATION'` is returned in preview
  - [ ] Salary values match compensation record
  
- [ ] For employees WITHOUT compensation records:
  - [ ] Fallback to template is triggered
  - [ ] `fallback: true` is returned in preview
  - [ ] Fallback reason explains why
  - [ ] Payroll uses template instead

### Test 3: Backward Compatibility
- [ ] With toggle OFF, behavior is identical to current system
- [ ] Existing salary templates work unchanged
- [ ] Old payslips still generate correctly
- [ ] No impact on payroll history

### Test 4: Mixed Employee Scenarios
**Setup:** Create test employees:
- Employee A: Has compensation record + template
- Employee B: Has template only, no compensation
- Employee C: Both templates and compensation exist

**Tests:**
- [ ] With toggle ON:
  - [ ] Employee A uses compensation
  - [ ] Employee B falls back to template
  - [ ] Employee C uses compensation (prefers it)
  - [ ] Payroll processes all three correctly
  
- [ ] Preview shows source for each:
  - [ ] A: `source: 'COMPENSATION'`
  - [ ] B: `source: 'TEMPLATE', fallback: true`
  - [ ] C: `source: 'COMPENSATION'`

### Test 5: Attendance Adjustment
- [ ] With compensation source and attendance adjustment:
  - [ ] Monthly CTC is correctly divided by working days
  - [ ] LOP (Loss of Pay) is deducted correctly
  - [ ] Final net pay matches expected amount
  
- [ ] Compare with template source:
  - [ ] Net pay calculations match (when using same salary)

### Test 6: Deductions & Tax Calculation
- [ ] Pre-tax deductions apply correctly
- [ ] Taxable income calculated properly
- [ ] Income tax (TDS) computed correctly
- [ ] Post-tax deductions applied
- [ ] Final net pay = Gross - Pre-tax - Tax - Post-tax

### Test 7: Payslip Generation
- [ ] Payslip shows source used:
  - [ ] "Source: Employee Compensation" OR
  - [ ] "Source: Salary Template (Fallback)"
  
- [ ] Compensation payslips show:
  - [ ] Component breakdown from compensation
  - [ ] Compensation effective date
  - [ ] Reason (e.g., "ASSIGNMENT")
  
- [ ] Template payslips show:
  - [ ] Traditional template breakdown
  - [ ] No compensation-specific fields

### Test 8: Error Handling
Test scenarios where compensation is invalid:

- [ ] Employee has null CTC:
  - [ ] Fallback to template triggered
  - [ ] Warning message shown
  - [ ] Payroll completes successfully
  
- [ ] Employee has 0 CTC:
  - [ ] Validation fails
  - [ ] Falls back to template
  - [ ] Error logged for audit
  
- [ ] Missing earnings components:
  - [ ] Validation detects issue
  - [ ] Falls back to template
  - [ ] Clear error message provided

### Test 9: Audit Trail
- [ ] Each payslip records:
  - [ ] Which source was used
  - [ ] Whether it was a fallback
  - [ ] Fallback reason if applicable
  
- [ ] Payroll run result includes:
  - [ ] sourceMap showing all employees
  - [ ] Number using compensation
  - [ ] Number using templates
  - [ ] Number with fallbacks

### Test 10: Performance
- [ ] Preview with 100 employees:
  - [ ] Completes in < 10 seconds
  - [ ] No database connection issues
  - [ ] Proper error handling if any fail
  
- [ ] Payroll run with 100 employees:
  - [ ] Completes without timeout
  - [ ] All payslips generated
  - [ ] No memory issues

### Test 11: Data Validation
- [ ] Negative CTC is rejected
- [ ] Non-numeric salary values rejected
- [ ] Missing required fields handled gracefully
- [ ] Monthly CTC = Annual CTC / 12 validated

### Test 12: Toggle OFF Behavior
With toggle explicitly OFF:
- [ ] Only salary templates are used
- [ ] No compensation records fetched
- [ ] Performance same as before
- [ ] Response format identical to current

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All test cases pass
- [ ] No console errors in browser
- [ ] Backend logs show proper source selection
- [ ] Payslips generate without errors
- [ ] Data consistency verified across payroll runs

### Deployment Steps
1. [ ] Deploy `payrollCompensationSource.service.js`
2. [ ] Deploy `payrollCompensationSource.controller.js`
3. [ ] Update payroll routes to register new endpoints
4. [ ] Deploy `PayrollSourceToggle.jsx` component
5. [ ] Update `ProcessPayroll.jsx` with toggle UI
6. [ ] Update Payslip schema to include `sourceInfo`
7. [ ] Run database migration (if needed)
8. [ ] Update API documentation

### Post-Deployment
- [ ] Monitor error logs for first week
- [ ] Verify payroll runs complete successfully
- [ ] Check payslip accuracy for sample employees
- [ ] Confirm audit trail populated correctly
- [ ] Get user feedback on toggle UI

---

## 📊 DATA FLOW DIAGRAM

```
ProcessPayroll UI
    ↓
[useCompensationSource = true/false]
    ↓
API: POST /payroll/process/preview
    {
        month: "YYYY-MM",
        useCompensationSource: boolean,
        items: [...]
    }
    ↓
Backend: selectPayrollSource()
    ├→ If true & compensation valid → Use Compensation
    ├→ If true & compensation invalid → Fallback to Template
    └→ If false → Use Template
    ↓
payroll.service.calculateEmployeePayroll()
    ↓ (uses template, regardless of source)
    ↓
Payslip generated with sourceInfo
    ↓
Response includes:
    - source: 'COMPENSATION' | 'TEMPLATE'
    - fallback: true | false
    - compensationBreakdown (if compensation used)
```

---

## 🔒 SAFETY GUARDS

### Guard 1: Source Validation
```javascript
if (!compensationData.compensation?.ctc || compensationData.compensation.ctc <= 0) {
    // Fallback to template
}
```

### Guard 2: Graceful Degradation
```javascript
try {
    const source = await selectPayrollSource(...);
    // Use source
} catch (err) {
    // Fallback to template if any error
}
```

### Guard 3: Audit Trail
```javascript
payslip.sourceInfo = {
    source: selectedSource,
    useCompensation: flag,
    fallback: didFallback,
    fallbackReason: whyFallback
};
```

### Guard 4: Request Validation
```javascript
if (!month || !items?.length) {
    return res.status(400).json({ error: 'Invalid request' });
}
```

---

## 📝 CONFIGURATION

### Optional: Environment Variable
```bash
# .env (optional, defaults to false)
PAYROLL_USE_COMPENSATION_SOURCE=false
```

### Optional: Feature Flag
```javascript
// backend/config/features.js
module.exports = {
    payrollCompensationSource: process.env.PAYROLL_USE_COMPENSATION_SOURCE !== 'false',
    // ... other flags
};
```

---

## 📚 DOCUMENTATION UPDATES

Update API documentation:
- `/payroll/process/preview` now accepts `useCompensationSource` flag
- `/payroll/process/run` now accepts `useCompensationSource` flag
- Payslip response includes `sourceInfo` object
- Add examples showing both paths

---

## ✅ SIGN-OFF

- [ ] Backend implementation complete
- [ ] Frontend implementation complete
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Ready for deployment

---

## 🎯 SUCCESS CRITERIA

✅ **Payroll processes successfully using Employee Compensation**
✅ **Falls back to Salary Template when compensation unavailable**
✅ **Audit trail shows which source each employee used**
✅ **Zero breaking changes to existing functionality**
✅ **Old and new payroll methods coexist safely**
✅ **Users can toggle between sources with single click**

