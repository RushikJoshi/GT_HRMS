# Payroll Compensation Source - Quick Integration Guide

## 🔧 Fast Integration (Copy-Paste Ready)

---

## 1️⃣ BACKEND: Add Route Handler

**File:** `backend/routes/payroll.routes.js`

```javascript
const compensationSourceController = require('../controllers/payrollCompensationSource.controller');

// Option A: Use existing endpoints (add flag support)
router.post('/payroll/process/preview', compensationSourceController.previewPayrollWithCompensationSupport);
router.post('/payroll/process/run', compensationSourceController.runPayrollWithCompensationSupport);

// Option B: New versioned endpoints (safer for backward compatibility)
router.post('/payroll/process/preview-v2', compensationSourceController.previewPayrollWithCompensationSupport);
router.post('/payroll/process/run-v2', compensationSourceController.runPayrollWithCompensationSupport);
```

---

## 2️⃣ BACKEND: Update Payslip Schema

**File:** `backend/models/Payslip.js`

Add this field to the schema:

```javascript
sourceInfo: {
    source: { 
        type: String, 
        enum: ['TEMPLATE', 'COMPENSATION'], 
        default: 'TEMPLATE' 
    },
    useCompensation: { 
        type: Boolean, 
        default: false 
    },
    fallback: { 
        type: Boolean, 
        default: false 
    },
    fallbackReason: {
        type: String
    }
},
```

---

## 3️⃣ FRONTEND: Add State & Toggle

**File:** `frontend/src/pages/HR/Payroll/ProcessPayroll.jsx`

**At the top of the component:**

```javascript
import React, { useState, useEffect } from 'react';
import { PayrollSourceToggle } from '../../../components/PayrollSourceToggle';

const ProcessPayroll = () => {
    // ... existing state ...
    
    // ADD THESE:
    const [useCompensationSource, setUseCompensationSource] = useState(false);
    const [sourceWarnings, setSourceWarnings] = useState({});
    
    // ... rest of component ...
};
```

**In the render section (after month picker):**

```jsx
{/* Add Compensation Source Toggle */}
<PayrollSourceToggle 
    useCompensationSource={useCompensationSource}
    onToggle={setUseCompensationSource}
    loading={loading}
/>
```

---

## 4️⃣ FRONTEND: Update Preview Function

**File:** `frontend/src/pages/HR/Payroll/ProcessPayroll.jsx`

**Replace the calculatePreview function:**

```javascript
const calculatePreview = async () => {
    const itemsToPreview = employees
        .filter(e => selectedRowKeys.includes(e._id))
        .filter(e => e.selectedTemplateId)
        .map(e => ({ employeeId: e._id, salaryTemplateId: e.selectedTemplateId }));

    if (itemsToPreview.length === 0) {
        messageApi.warning("Select employees to preview");
        return;
    }

    setCalculating(true);
    try {
        const res = await api.post('/payroll/process/preview', {
            month: month.format('YYYY-MM'),
            useCompensationSource,  // ← ADD THIS
            items: itemsToPreview
        });

        console.log('Preview Response:', res.data.data);

        const newPreviews = {};
        const warnings = {};
        
        res.data.data.forEach(p => {
            newPreviews[p.employeeId] = p;
            
            // Track fallbacks
            if (p.fallback) {
                warnings[p.employeeId] = {
                    type: 'fallback',
                    message: p.fallbackReason
                };
            }
        });
        
        setPreviews(newPreviews);
        setSourceWarnings(warnings);  // ← ADD THIS
        messageApi.success(`Calculated successfully for ${itemsToPreview.length} employee(s)`);
    } catch (err) {
        console.error('Calculation Error:', err);
        messageApi.error(err.response?.data?.message || "Calculation failed");
    } finally {
        setCalculating(false);
    }
};
```

---

## 5️⃣ FRONTEND: Update Run Payroll Function

**File:** `frontend/src/pages/HR/Payroll/ProcessPayroll.jsx`

**Replace the runPayroll function:**

```javascript
const runPayroll = async () => {
    const itemsToProcess = employees
        .filter(e => selectedRowKeys.includes(e._id))
        .filter(e => e.selectedTemplateId)
        .map(e => ({
            employeeId: e._id,
            salaryTemplateId: e.selectedTemplateId
        }));

    if (itemsToProcess.length === 0) {
        messageApi.error("No valid employees selected");
        return;
    }

    // ← UPDATE CONFIRMATION MESSAGE
    if (!window.confirm(
        `Are you sure you want to process payroll for ${itemsToProcess.length} employees ` +
        `for ${month.format('MMMM YYYY')} using ${useCompensationSource ? 'Compensation' : 'Templates'}?`
    )) return;

    setPayrollRunning(true);
    try {
        const response = await api.post('/payroll/process/run', {
            month: month.format('YYYY-MM'),
            useCompensationSource,  // ← ADD THIS
            items: itemsToProcess
        });

        const result = response.data.data;
        setPayrollResult(result);
        setSelectedRowKeys([]);
        setPreviews({});

        // ← UPDATE SUCCESS MESSAGE
        messageApi.success(
            `Payroll processed successfully! ${result.processedEmployees} employees processed ` +
            `using ${useCompensationSource ? 'Compensation' : 'Templates'}.`
        );

        // Log audit trail
        if (result.sourceMap) {
            console.log('Payroll Source Audit Trail:', result.sourceMap);
        }

        await fetchEmployees();
    } catch (err) {
        messageApi.error(err.response?.data?.message || "Payroll run failed");
        console.error("Payroll error:", err);
    } finally {
        setPayrollRunning(false);
    }
};
```

---

## 6️⃣ FRONTEND: Create Toggle Component

**File:** `frontend/src/components/PayrollSourceToggle.jsx`

```javascript
import React from 'react';
import { Zap, Info } from 'lucide-react';

export const PayrollSourceToggle = ({ 
    useCompensationSource, 
    onToggle, 
    loading = false 
}) => {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Zap className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Payroll Data Source</h3>
                        <p className="text-xs text-slate-500">
                            {useCompensationSource 
                                ? '✓ Using Employee Compensation (with fallback to templates)'
                                : '→ Using Salary Templates'}
                        </p>
                    </div>
                </div>
                
                {/* Toggle Switch */}
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
            
            {/* Info Box */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800">
                        <p className="font-medium mb-1.5">How it works:</p>
                        <ul className="space-y-1 ml-3 list-disc">
                            <li>
                                <strong>OFF:</strong> Payroll uses traditional Salary Templates
                            </li>
                            <li>
                                <strong>ON:</strong> Payroll reads from Employee Compensation records
                            </li>
                            <li>
                                If an employee has no compensation record, falls back to template automatically
                            </li>
                            <li>
                                Payslips show which source was used for audit purposes
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayrollSourceToggle;
```

---

## 7️⃣ OPTIONAL: Add Source Indicator Column to Table

**In the columns array of ProcessPayroll:**

```javascript
{
    title: 'Payroll Source',
    key: 'source',
    width: 120,
    render: (_, record) => {
        if (!useCompensationSource) {
            return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Template</span>;
        }
        
        const warning = sourceWarnings[record._id];
        if (warning) {
            return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">⚠ {warning.type}</span>;
        }
        return <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">✓ Compensation</span>;
    }
}
```

---

## 8️⃣ Update Payslip Display

**File:** `frontend/src/pages/HR/Payroll/PayslipDetails.jsx` (or wherever payslips are displayed)

Add this section to show source info:

```jsx
{/* Source Information (NEW) */}
{payslip.sourceInfo && (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-xs font-medium text-blue-900">
            📊 Payroll Source: 
            <span className="ml-2 font-bold">
                {payslip.sourceInfo.source === 'COMPENSATION' ? 'Employee Compensation' : 'Salary Template'}
            </span>
        </p>
        {payslip.sourceInfo.fallback && (
            <p className="text-xs text-blue-800 mt-1">
                ⚠ Fallback from Compensation: {payslip.sourceInfo.fallbackReason}
            </p>
        )}
    </div>
)}
```

---

## 🎯 API EXAMPLES

### Preview Request (NEW FORMAT):

```bash
curl -X POST http://localhost:5000/payroll/process/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "month": "2026-01",
    "useCompensationSource": true,
    "items": [
      {
        "employeeId": "65abc123...",
        "salaryTemplateId": "65def456..."
      }
    ]
  }'
```

### Preview Response (NEW FIELDS):

```json
{
  "success": true,
  "data": [
    {
      "employeeId": "65abc123...",
      "source": "COMPENSATION",
      "useCompensation": true,
      "fallback": false,
      "gross": 75000,
      "netPay": 65000,
      "deductions": 10000,
      "compensationBreakdown": {
        "earnings": [...],
        "summary": {
          "grossEarnings": 75000,
          "monthlyCTC": 75000
        }
      }
    }
  ]
}
```

---

## ✅ VERIFICATION CHECKLIST

After integration, verify:

- [ ] Toggle appears in Process Payroll UI
- [ ] Toggle switches between ON/OFF smoothly
- [ ] Preview calculates with toggle ON
- [ ] Preview calculates with toggle OFF
- [ ] Payroll runs with toggle ON
- [ ] Payroll runs with toggle OFF
- [ ] Payslips show source information
- [ ] Fallback works when compensation missing
- [ ] No console errors in browser
- [ ] No backend errors in logs
- [ ] Payslip amounts are correct
- [ ] Compensation source shows in payslip details

---

## 🚨 TROUBLESHOOTING

### Toggle not appearing?
- Check PayrollSourceToggle import in ProcessPayroll.jsx
- Verify component file exists at correct path
- Check console for import errors

### API returns "invalid request"?
- Ensure `useCompensationSource` is boolean (not string)
- Verify `items` array is not empty
- Check month format is "YYYY-MM"

### Payroll falls back to template?
- Check if employee has compensation record
- Verify CTC is > 0
- Check applicant salarySnapshotId is populated
- Review backend logs for validation errors

### Payslips don't show source?
- Verify Payslip schema includes `sourceInfo`
- Check payslip display template includes sourceInfo rendering
- Rebuild database if using migration

---

## 📞 SUPPORT

For issues or questions:
1. Check backend logs: `/payroll/...` endpoint responses
2. Check browser console: API request/response
3. Verify database: Applicant.salarySnapshotId populated
4. Review test checklist in Implementation Guide

