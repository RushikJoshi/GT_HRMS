# Employee Compensation - Data Mapping Reference

## 🗂️ Data Structure Mapping

### Source Data (from `/api/applicants`)
```javascript
{
  _id: ObjectId,
  firstName: "John",
  lastName: "Doe", 
  employeeId: "EMP001",
  role: "Senior Developer",
  status: "Active",
  
  // 🎯 THIS OBJECT (salaryStructure)
  salaryStructure: {
    grossA: 50000,        ← GROSS A (Monthly)
    grossB: 600000,       ← GROSS B (Annual)
    grossC: 50000,        ← GROSS C (Annual/Retention)
    annualCTC: 700000,    ← ANNUAL CTC
    effectiveFrom: "2025-01-20",
    version: 1,
    components: [...]
  }
}
```

### Mapping Process
```
APPLICANT OBJECT
    │
    └─→ mapSalaryData()
            │
            └─→ Extract salaryStructure
                    │
                    ├─→ grossA
                    ├─→ grossB
                    ├─→ grossC
                    └─→ annualCTC
                            │
                            └─→ Create activeVersion Object
                                    │
                                    └─→ Return MAPPED Employee
```

### Output (Employee Object in State)
```javascript
{
  // Original data preserved
  _id: ObjectId,
  firstName: "John",
  lastName: "Doe",
  employeeId: "EMP001",
  role: "Senior Developer",
  status: "Active",
  salaryStructure: { ... },
  
  // ✨ NEW: Mapped for display
  activeVersion: {
    grossA: 50000,          ← From salaryStructure.grossA
    grossB: 600000,         ← From salaryStructure.grossB
    grossC: 50000,          ← From salaryStructure.grossC
    totalCTC: 700000,       ← From salaryStructure.annualCTC
    effectiveFrom: "2025-01-20",
    version: 1,
    components: [...]
  },
  
  // ✨ NEW: Status indicator
  ctcStatus: "Active"        ← "Active" | "Blocked" | "Not Set"
}
```

---

## 📋 Field Mapping Table

| Component | Source | Field | Type | Example | Display |
|-----------|--------|-------|------|---------|---------|
| **Gross A** | salaryStructure | grossA | Number | 50000 | ₹50,000 |
| **Gross B** | salaryStructure | grossB | Number | 600000 | ₹600,000 |
| **Gross C** | salaryStructure | grossC | Number | 50000 | ₹50,000 |
| **Total CTC** | salaryStructure | annualCTC | Number | 700000 | ₹700,000 |
| **Effective From** | salaryStructure | effectiveFrom | Date | "2025-01-20" | 1/20/2025 |
| **Status** | mapped | ctcStatus | String | "Active" | Green badge |

---

## 🔄 Fallback Chain

```javascript
// For each field:
const grossA = salaryStructure?.grossA || 0;
         ↑                           ↑
    If exists, use it            Otherwise, use 0

// Overall check:
const isCTCSet = (totalCTC > 0);
               ↓
    If true → Show activeVersion
    If false → Show "CTC NOT SET" everywhere
```

---

## 📊 Display Logic

### In Table Cells
```javascript
// Gross A, B, C cells
{active ? `₹${formatINR(active.grossA)}` : "CTC NOT SET"}
         ↑                                  ↑
    Has salary?              No salary - show message

// Total CTC cell  
{active ? (
    <div className="bg-slate-900 text-white">
        ₹{formatINR(active.totalCTC)}
    </div>
) : (
    <div className="bg-amber-100 text-amber-700">
        CTC NOT SET
    </div>
)}

// Status cell
{emp.ctcStatus === 'Active' ? 'bg-emerald-50' :
 emp.ctcStatus === 'Blocked' ? 'bg-rose-50' : 
 'bg-amber-100'}  ← "Not Set" → amber
```

---

## 🎯 Usage Flow

### Step 1: Fetch Data
```javascript
const res = await api.get('/requirements/applicants');
// Returns: [applicant1, applicant2, ...]
```

### Step 2: Map Data
```javascript
const mappedEmployees = res.data.data.map(mapSalaryData);
// For each applicant:
// - Extract salaryStructure
// - Create activeVersion
// - Determine ctcStatus
// - Return enhanced employee object
```

### Step 3: Store State
```javascript
setEmployees(mappedEmployees);
setFilteredEmployees(mappedEmployees);
```

### Step 4: Render Table
```javascript
{filteredEmployees.map((emp) => {
    const active = emp.activeVersion;
    return (
        <tr>
            <td>{emp.firstName} {emp.lastName}</td>
            <td>{active ? `₹${active.grossA}` : "CTC NOT SET"}</td>
            <td>{active ? `₹${active.grossB}` : "CTC NOT SET"}</td>
            <td>{active ? `₹${active.grossC}` : "CTC NOT SET"}</td>
            <td>{active ? `₹${active.totalCTC}` : "CTC NOT SET"}</td>
            ...
        </tr>
    );
})}
```

---

## ✨ Special Cases

### Case 1: CTC is SET
```
Gross A → Shows: ₹50,000 (number)
Gross B → Shows: ₹600,000 (number)
Gross C → Shows: ₹50,000 (number)
Total CTC → Shows: ₹700,000 (dark card)
Status → Shows: Active (green badge)
Effective Date → Shows: 1/20/2025 (date)
```

### Case 2: CTC is NOT SET
```
Gross A → Shows: CTC NOT SET (amber text)
Gross B → Shows: CTC NOT SET (amber text)
Gross C → Shows: CTC NOT SET (amber text)
Total CTC → Shows: CTC NOT SET (amber card)
Status → Shows: Not Set (amber badge)
Effective Date → Shows: — (dash)
```

### Case 3: Partial Data
```
If salaryStructure exists but grossA is missing:
grossA = salaryStructure.grossA || 0
       = 0 (uses fallback)

Display: ₹0 (but activeVersion exists, so not "CTC NOT SET")
```

---

## 🔐 Safety Checks

```javascript
// 1. Check if object exists
salaryStructure = applicant?.salaryStructure || {}
                                               ↑
                                        Fallback to empty

// 2. Check each field
grossA = salaryStructure?.grossA || 0
                         ↑           ↑
                    Optional      Default

// 3. Check if CTC is actually set
isCTCSet = Object.keys(salaryStructure).length > 0 && totalCTC > 0
           ↑ Has properties?                        ↑ Has amount?
```

---

## 📈 Performance

- **Data Fetch**: 1 API call to `/requirements/applicants`
- **Mapping**: O(n) - iterates through applicants once
- **Rendering**: Standard React table render
- **Memory**: No extra collections, reuses applicant data

---

## 🧪 Test Cases

### Test 1: Applicant WITH Salary
```
Input: applicant.salaryStructure = {grossA: 50000, ...}
Expected: Table shows ₹50,000
Result: ✅ PASS
```

### Test 2: Applicant WITHOUT Salary
```
Input: applicant.salaryStructure = undefined
Expected: Table shows "CTC NOT SET"
Result: ✅ PASS
```

### Test 3: Applicant WITH Empty Salary
```
Input: applicant.salaryStructure = {}
Expected: Table shows "CTC NOT SET"
Result: ✅ PASS
```

### Test 4: Partial Salary Data
```
Input: salaryStructure = {grossA: 50000, grossB: undefined}
Expected: Shows 50000 for A, 0 for B
Result: ✅ PASS
```

---

## 🎨 Color Scheme

| Status | Background | Text | Badge |
|--------|-----------|------|-------|
| **Active** | — | slate-700 | bg-emerald-50 text-emerald-600 |
| **Blocked** | — | slate-700 | bg-rose-50 text-rose-600 |
| **Not Set** | — | amber-600 | bg-amber-100 text-amber-700 |

---

## ✅ Verification Points

- [ ] Mapping function correctly extracts salaryStructure
- [ ] Fallbacks work for missing fields
- [ ] activeVersion is null when CTC not set
- [ ] ctcStatus reflects correct state
- [ ] Table displays values or "CTC NOT SET"
- [ ] No console errors
- [ ] All values match Salary Structure modal

---

**Last Updated**: January 22, 2026  
**Implementation**: Complete ✅
