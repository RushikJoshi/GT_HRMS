# 🚀 Salary Increment System - Quick Reference Card

## ⚡ Quick Start

### Create Increment (Frontend)
1. Go to **Compensation** page
2. Click **Increment** button
3. Fill modal → Confirm → Done! ✅

### Create Increment (API)
```bash
curl -X POST http://localhost:5000/api/compensation/increment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "employeeId": "64abc123...",
    "effectiveFrom": "2026-04-01",
    "totalCTC": 1200000,
    "grossA": 70000,
    "grossB": 240000,
    "grossC": 120000,
    "incrementType": "INCREMENT",
    "reason": "Annual increment"
  }'
```

---

## 📊 Status Reference

| Status | Meaning | When |
|--------|---------|------|
| **SCHEDULED** | Future salary | `effectiveFrom > today` |
| **ACTIVE** | Current salary | `effectiveFrom <= today` AND `isActive = true` |
| **EXPIRED** | Historical salary | Replaced by newer ACTIVE version |
| **CANCELLED** | Cancelled before activation | Manually cancelled |

---

## 🔢 Salary Breakup Formula

```
Total CTC = (Gross A × 12) + Gross B + Gross C

Where:
- Gross A = Monthly earnings (salary, allowances)
- Gross B = Annual benefits (bonus, insurance)
- Gross C = Annual retention (gratuity, PF)
```

**Example:**
```
Gross A: ₹70,000/month
Gross B: ₹2,40,000/year
Gross C: ₹1,20,000/year

Total CTC = (70,000 × 12) + 2,40,000 + 1,20,000
          = 8,40,000 + 2,40,000 + 1,20,000
          = ₹12,00,000 ✅
```

---

## 🎯 Key Files

### Backend
```
backend/
├── models/
│   ├── EmployeeCtcVersion.js      (Salary versions)
│   └── SalaryIncrement.js         (Audit trail)
├── services/
│   └── salaryIncrement.service.js (Business logic)
├── controllers/
│   ├── compensation.controller.js (Enhanced)
│   └── salaryIncrement.controller.js (New endpoints)
└── routes/
    └── salaryIncrement.routes.js  (API routes)
```

### Frontend
```
frontend/src/
├── components/Compensation/
│   └── SalaryIncrementModal.jsx   (Increment UI)
└── pages/HR/
    └── Compensation.jsx            (Main page)
```

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/compensation/increment` | Create increment |
| GET | `/api/compensation/increment/history/:id` | Get history |
| GET | `/api/compensation/increment/preview` | Preview changes |
| POST | `/api/compensation/increment/:id/cancel` | Cancel scheduled |
| POST | `/api/compensation/increment/activate-scheduled` | Manual activation |

---

## ✅ Validation Rules

### Required Fields
- ✅ `employeeId` - Must exist in database
- ✅ `effectiveFrom` - Valid date
- ✅ `totalCTC` - Must be > 0

### Breakup Validation
```javascript
const sum = (grossA * 12) + grossB + grossC;
const isValid = Math.abs(sum - totalCTC) <= 1; // ±₹1 tolerance
```

### Business Rules
- ✅ Employee must have existing salary
- ✅ Cannot modify existing versions
- ✅ Can only cancel SCHEDULED increments

---

## 🔒 Safety Checklist

- [x] ❌ Never modifies existing salary records
- [x] ❌ Never deletes historical data
- [x] ❌ Never changes payroll logic
- [x] ✅ Only creates new versions
- [x] ✅ Preserves complete history
- [x] ✅ Full audit trail

---

## 🧪 Testing Commands

### Run Test Script
```bash
cd backend
node test_salary_increment.js
```

### Manual API Test
```bash
# Create increment
curl -X POST http://localhost:5000/api/compensation/increment \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"xxx","effectiveFrom":"2026-04-01","totalCTC":1200000}'

# Get history
curl http://localhost:5000/api/compensation/increment/history/EMPLOYEE_ID

# Activate scheduled
curl -X POST http://localhost:5000/api/compensation/increment/activate-scheduled
```

---

## 🚨 Common Issues & Fixes

### Issue: "Employee has no existing salary"
**Fix:** Create initial salary first
```javascript
POST /api/compensation/increment
{
  "employeeId": "xxx",
  "effectiveFrom": "2025-01-01",
  "totalCTC": 1000000,
  ...
}
```

### Issue: "Breakup validation failed"
**Fix:** Adjust values to match formula
```
(Gross A × 12) + Gross B + Gross C = Total CTC
```

### Issue: Increment not activating
**Fix:** Trigger manual activation
```bash
POST /api/compensation/increment/activate-scheduled
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `SALARY_INCREMENT_SUMMARY.md` | Implementation summary |
| `SALARY_INCREMENT_GUIDE.md` | Complete guide |
| `SALARY_INCREMENT_ARCHITECTURE.md` | Visual diagrams |
| `SALARY_INCREMENT_QUICK_REF.md` | This file |

---

## 🎓 Best Practices

### 1. Use First Day of Month
```javascript
// ✅ Good
effectiveFrom: "2026-04-01"

// ❌ Avoid
effectiveFrom: "2026-04-15" // Mid-month complicates payroll
```

### 2. Document Reasons
```javascript
// ✅ Good
reason: "Annual increment - Performance rating: Exceeds Expectations"

// ❌ Avoid
reason: "Increment"
```

### 3. Preview Before Submit
```javascript
// Always preview first
GET /api/compensation/increment/preview?employeeId=xxx&newCTC=1200000

// Then create
POST /api/compensation/increment
```

### 4. Verify After Creation
```javascript
// Check history
GET /api/compensation/increment/history/:employeeId

// Verify active version
GET /api/compensation/list
```

---

## 🔄 Typical Workflow

```
1. User opens Compensation page
   ↓
2. Clicks "Increment" button for employee
   ↓
3. SalaryIncrementModal opens
   ↓
4. User fills:
   - Effective date: 2026-04-01
   - New CTC: ₹12,00,000
   - Auto-calculated breakup (or manual)
   - Reason: "Annual increment"
   ↓
5. System validates:
   - Employee exists ✅
   - Breakup matches ✅
   - All required fields ✅
   ↓
6. User confirms in dialog
   ↓
7. Backend creates:
   - New EmployeeCtcVersion (v2)
   - SalaryIncrement audit record
   ↓
8. Status determined:
   - Future date → SCHEDULED
   - Today/past → ACTIVE
   ↓
9. If ACTIVE:
   - New version: isActive = true
   - Old version: isActive = false
   ↓
10. Success message shown
    ↓
11. Data refreshed
    ↓
12. Done! ✅
```

---

## 💡 Pro Tips

### Tip 1: Auto-Calculate Breakup
Enable "Auto-calculate" checkbox for standard 70/20/10 split:
- Gross A: 70% of CTC (monthly)
- Gross B: 20% of CTC (annual)
- Gross C: 10% of CTC (annual)

### Tip 2: Schedule Future Increments
Set `effectiveFrom` to future date for automatic activation:
```javascript
effectiveFrom: "2026-04-01" // Will auto-activate on April 1
```

### Tip 3: Bulk Increments
Use API to create multiple increments:
```bash
for employee in employees:
  POST /api/compensation/increment
  { employeeId: employee.id, ... }
```

### Tip 4: Audit Trail
Always check increment history:
```bash
GET /api/compensation/increment/history/:employeeId
```

---

## 📞 Need Help?

1. **Check Documentation**
   - `SALARY_INCREMENT_GUIDE.md` - Complete guide
   - `SALARY_INCREMENT_ARCHITECTURE.md` - Visual diagrams

2. **Run Tests**
   ```bash
   node backend/test_salary_increment.js
   ```

3. **Check Logs**
   - Backend console for errors
   - Browser console for frontend issues

4. **Verify Database**
   ```javascript
   // Check versions
   db.employee_ctc_versions.find({ employeeId: "xxx" })
   
   // Check increments
   db.salary_increments.find({ employeeId: "xxx" })
   ```

---

## ✅ Pre-Launch Checklist

- [ ] Backend files deployed
- [ ] Frontend files deployed
- [ ] Database models registered
- [ ] API routes configured
- [ ] Test script runs successfully
- [ ] Sample increment created
- [ ] Payroll still works
- [ ] History view works
- [ ] Validation works
- [ ] Auto-activation tested (optional)

---

## 🎉 You're Ready!

**The salary increment system is production-ready.**

**Quick links:**
- 📖 Full Guide: `SALARY_INCREMENT_GUIDE.md`
- 🏗️ Architecture: `SALARY_INCREMENT_ARCHITECTURE.md`
- 📝 Summary: `SALARY_INCREMENT_SUMMARY.md`
- ⚡ This Card: `SALARY_INCREMENT_QUICK_REF.md`

**Happy incrementing! 🚀**
