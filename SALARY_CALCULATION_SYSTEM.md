# Salary Calculation System - Architecture Documentation

## Overview

This document describes the refactored salary calculation system that provides a **single source of truth** for all salary-related calculations in the HRMS.

## Core Principles

1. **Backend-Only Calculations**: Frontend NEVER calculates salary. All calculations happen on the backend.
2. **Single Source of Truth**: `SalaryCalculationEngine` is the ONLY place where salary formulas are defined.
3. **Immutable Snapshots**: Once locked, salary snapshots cannot be modified.
4. **Consistent Data**: Joining letters, payslips, and payroll all use the same snapshot data.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (UI Only)                        │
│  - Collects CTC input                                        │
│  - Selects components                                        │
│  - Renders backend response                                  │
│  - NO CALCULATIONS                                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ POST /api/salary/preview
                 │ { ctcAnnual, selectedEarnings, ... }
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              SALARY CONTROLLER (API Layer)                   │
│  - Validates input                                           │
│  - Calls SalaryCalculationEngine                             │
│  - Returns breakdown                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ SalaryCalculationEngine.calculateSalary()
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│        SALARY CALCULATION ENGINE (Business Logic)            │
│                                                              │
│  FORMULAS (Indian Payroll Rules):                            │
│  ✓ Basic = CTC × 0.40                                        │
│  ✓ HRA = Basic × 0.40                                        │
│  ✓ Employee PF = min(Basic × 0.12, ₹1,800)                  │
│  ✓ Employer PF = min(Basic × 0.12, ₹1,800)                  │
│  ✓ Gratuity = Basic × 0.0481                                │
│  ✓ Special Allowance = CTC - (Earnings + Benefits)          │
│                                                              │
│  OUTPUT:                                                     │
│  - earnings[]                                                │
│  - deductions[]                                              │
│  - employerBenefits[]                                        │
│  - grossMonthly / grossAnnual                                │
│  - totalDeductionsMonthly / totalDeductionsAnnual            │
│  - netTakeHomeMonthly / netTakeHomeAnnual                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Returns breakdown object
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           SALARY SNAPSHOT (Database - Immutable)             │
│  - Stored in EmployeeSalarySnapshot collection               │
│  - Used by: Joining Letter, Payslip, Payroll                │
│  - Once locked, cannot be modified                           │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### 1. Preview Salary (Calculate Only)

**Endpoint**: `POST /api/salary/preview`

**Purpose**: Calculate salary breakdown without saving to database. Used for real-time preview in UI.

**Request Body**:
```json
{
  "ctcAnnual": 600000,
  "selectedEarnings": [
    { "code": "HRA", "name": "House Rent Allowance" }
  ],
  "selectedDeductions": [
    { "code": "EMPLOYEE_PF", "name": "Employee PF" }
  ],
  "selectedBenefits": [
    { "code": "EMPLOYER_PF", "name": "Employer PF" },
    { "code": "GRATUITY", "name": "Gratuity" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Salary breakdown calculated successfully",
  "data": {
    "annualCTC": 600000,
    "monthlyCTC": 50000,
    "earnings": [
      {
        "code": "BASIC",
        "name": "Basic Salary",
        "monthlyAmount": 20000,
        "annualAmount": 240000,
        "formula": "CTC * 0.40"
      },
      {
        "code": "HRA",
        "name": "House Rent Allowance",
        "monthlyAmount": 8000,
        "annualAmount": 96000,
        "formula": "Basic * 0.40"
      },
      {
        "code": "SPECIAL_ALLOWANCE",
        "name": "Special Allowance",
        "monthlyAmount": 19038,
        "annualAmount": 228456,
        "formula": "CTC - (Earnings + Benefits)",
        "isBalancer": true
      }
    ],
    "deductions": [
      {
        "code": "EMPLOYEE_PF",
        "name": "Employee PF",
        "monthlyAmount": 1800,
        "annualAmount": 21600,
        "formula": "min(Basic * 0.12, 1800)"
      }
    ],
    "employerBenefits": [
      {
        "code": "EMPLOYER_PF",
        "name": "Employer PF",
        "monthlyAmount": 1800,
        "annualAmount": 21600,
        "formula": "min(Basic * 0.12, 1800)"
      },
      {
        "code": "GRATUITY",
        "name": "Gratuity",
        "monthlyAmount": 962,
        "annualAmount": 11544,
        "formula": "Basic * 0.0481"
      }
    ],
    "grossMonthly": 47038,
    "grossAnnual": 564456,
    "totalDeductionsMonthly": 1800,
    "totalDeductionsAnnual": 21600,
    "totalBenefitsMonthly": 2762,
    "totalBenefitsAnnual": 33144,
    "netTakeHomeMonthly": 45238,
    "netTakeHomeAnnual": 542856
  }
}
```

### 2. Assign Salary (Save Snapshot)

**Endpoint**: `POST /api/salary/assign`

**Purpose**: Calculate and save salary snapshot to database (unlocked state).

**Request Body**:
```json
{
  "applicantId": "507f1f77bcf86cd799439011",
  "ctcAnnual": 600000,
  "selectedEarnings": [...],
  "selectedDeductions": [...],
  "selectedBenefits": [...]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Salary assigned successfully. Call /confirm to lock it.",
  "data": {
    "snapshot": { ... },
    "breakdown": { ... }
  }
}
```

### 3. Confirm & Lock Salary

**Endpoint**: `POST /api/salary/confirm`

**Purpose**: Lock the salary snapshot, making it immutable.

**Request Body**:
```json
{
  "applicantId": "507f1f77bcf86cd799439011",
  "reason": "JOINING"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Salary confirmed and locked successfully. Snapshot is now immutable.",
  "data": { ... }
}
```

## Frontend Integration

### Salary Configuration UI Flow

```javascript
// 1. User enters CTC
const [ctcAnnual, setCtcAnnual] = useState('');

// 2. User selects components (earnings, deductions, benefits)
const [selectedEarnings, setSelectedEarnings] = useState([]);
const [selectedDeductions, setSelectedDeductions] = useState([]);
const [selectedBenefits, setSelectedBenefits] = useState([]);

// 3. Click "Calculate" - Call backend
const handleCalculate = async () => {
    const response = await api.post('/salary/preview', {
        ctcAnnual: Number(ctcAnnual),
        selectedEarnings,
        selectedDeductions,
        selectedBenefits
    });
    
    // 4. Render backend response (NO frontend calculation)
    setSalaryPreview(response.data.data);
};

// 5. Click "Assign & Lock" - Save to database
const handleAssign = async () => {
    await api.post('/salary/assign', {
        applicantId: applicant._id,
        ctcAnnual: Number(ctcAnnual),
        selectedEarnings,
        selectedDeductions,
        selectedBenefits
    });
    
    await api.post('/salary/confirm', {
        applicantId: applicant._id,
        reason: 'JOINING'
    });
};
```

### Rendering Salary Snapshot

```javascript
// ALWAYS render from backend data
{salaryPreview && (
    <div>
        <h3>Gross Earnings: ₹{salaryPreview.grossMonthly.toLocaleString()}</h3>
        <h3>Total Deductions: ₹{salaryPreview.totalDeductionsMonthly.toLocaleString()}</h3>
        <h3>Net Take-Home: ₹{salaryPreview.netTakeHomeMonthly.toLocaleString()}</h3>
        
        <h4>Earnings:</h4>
        {salaryPreview.earnings.map(e => (
            <div key={e.code}>
                {e.name}: ₹{e.monthlyAmount.toLocaleString()}
            </div>
        ))}
        
        <h4>Deductions:</h4>
        {salaryPreview.deductions.map(d => (
            <div key={d.code}>
                {d.name}: -₹{d.monthlyAmount.toLocaleString()}
            </div>
        ))}
    </div>
)}
```

## Business Rules

### Indian Payroll Formulas

| Component | Formula | Cap |
|-----------|---------|-----|
| Basic | CTC × 0.40 | None |
| HRA | Basic × 0.40 | None |
| Employee PF | Basic × 0.12 | ₹1,800/month |
| Employer PF | Basic × 0.12 | ₹1,800/month |
| Gratuity | Basic × 0.0481 | None |
| Professional Tax | Fixed | ₹200/month |
| Special Allowance | CTC - (Earnings + Benefits) | Auto-calculated |

### CTC Calculation

```
CTC = Gross Earnings + Employer Benefits
    = (Basic + HRA + Other Allowances + Special Allowance) + (Employer PF + Gratuity)
```

### Net Pay Calculation

```
Net Pay = Gross Earnings - Employee Deductions
        = (Basic + HRA + Other Allowances + Special Allowance) - (Employee PF + PT)
```

### Special Allowance (Auto-Balancing)

Special Allowance is automatically calculated to ensure CTC matches the input:

```
Special Allowance = CTC - (Sum of all other Earnings + Sum of Employer Benefits)
```

This ensures:
- CTC is always accurate
- No manual adjustment needed
- Excel parity maintained

## Usage in Other Modules

### Joining Letter Generation

```javascript
// Read from applicant.salarySnapshot (immutable)
const snapshot = applicant.salarySnapshot;

// Use snapshot data directly
const data = {
    BASIC_MONTHLY: snapshot.earnings.find(e => e.code === 'BASIC').monthlyAmount,
    HRA_MONTHLY: snapshot.earnings.find(e => e.code === 'HRA').monthlyAmount,
    GROSS_MONTHLY: snapshot.grossMonthly,
    NET_MONTHLY: snapshot.netTakeHomeMonthly,
    CTC_YEARLY: snapshot.annualCTC
};
```

### Payroll Processing

```javascript
// Fetch locked snapshot
const snapshot = await EmployeeSalarySnapshot.findOne({
    employee: employeeId,
    locked: true
}).sort({ effectiveFrom: -1 });

// Use snapshot for payroll calculation
const payslip = {
    earnings: snapshot.earnings,
    deductions: snapshot.employeeDeductions,
    grossPay: snapshot.grossMonthly,
    netPay: snapshot.netTakeHomeMonthly
};
```

### Payslip Generation

```javascript
// Read from payroll record (which uses snapshot)
const payslip = await Payslip.findById(payslipId);

// Render payslip using snapshot data
renderPDF({
    earnings: payslip.earnings,
    deductions: payslip.deductions,
    netPay: payslip.netPay
});
```

## Validation

The system validates:

1. **CTC must be positive**: `ctcAnnual > 0`
2. **Earnings must exist**: At least Basic must be present
3. **Net pay cannot be negative**: `netTakeHomeMonthly > 0`
4. **CTC accuracy**: Calculated CTC must match input CTC (±₹1 rounding tolerance)

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Valid Annual CTC is required" | CTC is 0, negative, or not a number | Enter valid positive number |
| "Salary calculation validation failed" | Calculation resulted in invalid state | Check component selection |
| "Net take-home cannot be zero or negative" | Deductions exceed earnings | Reduce deductions or increase CTC |
| "CTC mismatch" | Rounding error > ₹1 | Internal error - report to dev team |

## Testing

### Test Case 1: Basic Salary Calculation

**Input**:
- CTC: ₹600,000
- Components: Basic, HRA, Employee PF, Employer PF, Gratuity

**Expected Output**:
- Basic: ₹20,000/month (₹240,000/year)
- HRA: ₹8,000/month (₹96,000/year)
- Employee PF: ₹1,800/month (₹21,600/year)
- Employer PF: ₹1,800/month (₹21,600/year)
- Gratuity: ₹962/month (₹11,544/year)
- Special Allowance: Auto-calculated to balance CTC
- Net Take-Home: ₹45,238/month

### Test Case 2: High Salary (PF Cap Test)

**Input**:
- CTC: ₹2,400,000
- Components: Basic, HRA, Employee PF, Employer PF, Gratuity

**Expected Output**:
- Basic: ₹80,000/month (₹960,000/year)
- Employee PF: ₹1,800/month (capped, not ₹9,600)
- Employer PF: ₹1,800/month (capped, not ₹9,600)

## Migration Guide

If migrating from old system:

1. **Stop using frontend calculations**: Remove all salary calculation logic from React components
2. **Update API calls**: Change to use new `/salary/preview` and `/salary/assign` endpoints
3. **Update data structure**: Ensure all modules read from `salarySnapshot` object
4. **Test thoroughly**: Verify CTC accuracy, deductions, and net pay calculations

## Troubleshooting

### Deductions not showing

**Problem**: Deductions array is empty in response

**Solution**: Ensure `selectedDeductions` array is passed in request body

### Salary Snapshot shows ₹0

**Problem**: All amounts are zero

**Solution**: Check that `ctcAnnual` is a valid number and components are selected

### CTC mismatch error

**Problem**: Validation fails with CTC mismatch

**Solution**: This is rare. Check for floating-point precision issues. Report if persistent.

## Future Enhancements

1. **Template Support**: Load component configuration from salary templates
2. **Custom Formulas**: Allow HR to define custom component formulas
3. **Multi-Currency**: Support salary in different currencies
4. **Tax Calculation**: Integrate income tax calculation
5. **Statutory Compliance**: Auto-calculate ESI, LWF, etc.

---

**Last Updated**: January 19, 2026
**Version**: 2.0
**Author**: HRMS Development Team
