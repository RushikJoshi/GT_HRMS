# 🧪 Joining Letter CTC Structure - Testing Flow

## Prerequisites
✅ Backend running on port 5173
✅ Frontend running on port 5174 (or your configured port)
✅ Logged in as HR user

---

## 📋 **STEP-BY-STEP TESTING FLOW**

### **Step 1: Prepare Test Applicant**

#### 1.1 Navigate to Applicants Page
1. Open browser: `http://localhost:5173/hr/applicants` (or your frontend URL)
2. You should see the list of applicants

#### 1.2 Select an Applicant
- Choose an applicant who has been offered a job
- Click on the applicant to view details
- **Note the applicant's name** for verification later

---

### **Step 2: Verify/Assign Salary Structure**

#### 2.1 Check if Salary is Assigned
1. Look for "Salary Structure" or "CTC" section in applicant details
2. Check if salary components are visible

#### 2.2 If Salary NOT Assigned:
1. Go to **Salary Structure** page
2. Assign salary to the applicant:
   - Select the applicant
   - Choose a salary template OR enter custom CTC
   - Click "Assign Salary"

#### 2.3 **CRITICAL: Lock the Salary**
1. After assigning, find the **"Finalize & Lock"** button
2. Click it to lock the salary
3. **Verify**: You should see `locked: true` status
4. **This is mandatory** - joining letter won't generate without locked salary

---

### **Step 3: Generate Joining Letter**

#### 3.1 Navigate to Joining Letter Section
1. Go back to the applicant details page
2. Find the **"Generate Joining Letter"** button
3. Click it

#### 3.2 Select Template (if prompted)
1. Choose your Word template (.docx)
2. The template should have placeholders like:
   - `{{basic_monthly}}`
   - `{{hra_monthly}}`
   - `{{total_ctc_annual}}`
   - etc.

#### 3.3 Click "Generate"
- Wait for the generation process
- You should see a success message

---

### **Step 4: Verify Backend Logs** 🔍

Open your backend terminal and look for these logs:

#### ✅ **Success Logs (What You Should See)**
```
✅ [JOINING LETTER] LOCKED snapshot found: {
  id: '...',
  ctc: 600000,
  locked: true,
  lockedAt: '2026-01-21T...',
  earningsCount: 5,
  deductionsCount: 2,
  benefitsCount: 2
}

✅ [JOINING LETTER] CTC structure built successfully

🔥 [JOINING LETTER] Sample values: {
  basic_monthly: '25,000',
  hra_monthly: '12,500',
  total_ctc_annual: '6,00,000',
  gross_a_monthly: '50,000'
}

✅ [JOINING LETTER] Salary components table built: 15 rows

✅ [JOINING LETTER] Final data prepared with 150 placeholders

🔥 [JOINING LETTER] ===== FINAL PLACEHOLDER VALUES =====
🔥 [JOINING LETTER] basic_monthly: 25,000
🔥 [JOINING LETTER] hra_monthly: 12,500
🔥 [JOINING LETTER] total_ctc_annual: 6,00,000
🔥 [JOINING LETTER] gross_a_monthly: 50,000
🔥 [JOINING LETTER] ===== END PLACEHOLDER VALUES =====

✅ [JOINING LETTER] PDF Ready: /uploads/offers/Joining_Letter_...pdf
```

#### ❌ **Error Logs (What Might Go Wrong)**

**Error 1: Salary Not Locked**
```
❌ [JOINING LETTER] No LOCKED salary snapshot found
```
**Solution**: Go to Step 2.3 and lock the salary

**Error 2: Snapshot Not Found**
```
❌ [JOINING LETTER] EmployeeSalarySnapshot not found
```
**Solution**: Assign salary to the applicant (Step 2.2)

**Error 3: Template Not Found**
```
❌ [JOINING LETTER] Template file NOT FOUND
```
**Solution**: Upload a Word template first

---

### **Step 5: Preview/Download the PDF** 📄

#### 5.1 Preview the Letter
1. After generation, click **"Preview"** button
2. A modal/new tab should open showing the PDF

#### 5.2 Verify CTC Structure Values
Check that the PDF shows **actual values** instead of placeholders:

**❌ WRONG (Before Fix):**
```
Basic Salary: {{basic_monthly}}
HRA: {{hra_monthly}}
Total CTC: {{total_ctc_annual}}
```

**✅ CORRECT (After Fix):**
```
Basic Salary: 25,000
HRA: 12,500
Total CTC: 6,00,000
```

#### 5.3 Verify Formatting
- Numbers should have Indian comma formatting: `50,000` (not `50000`)
- Monthly and annual values should both be present
- All components should show values (0 for components not in salary structure)

---

### **Step 6: Cross-Verify with Salary Structure** 🔄

#### 6.1 Open Salary Structure Page
1. Navigate to the salary structure/assignment page
2. View the same applicant's salary

#### 6.2 Compare Values
The joining letter should **exactly match** the salary structure screen:

| Component | Salary Screen | Joining Letter | Match? |
|-----------|---------------|----------------|--------|
| Basic (Monthly) | 25,000 | 25,000 | ✅ |
| HRA (Monthly) | 12,500 | 12,500 | ✅ |
| Total CTC (Annual) | 6,00,000 | 6,00,000 | ✅ |

---

## 🐛 **Troubleshooting Guide**

### Issue 1: "No locked salary snapshot found"
**Cause**: Salary not locked
**Fix**: 
1. Go to Salary Structure page
2. Find the applicant
3. Click "Finalize & Lock" button
4. Retry generating letter

### Issue 2: Placeholders still showing ({{basic_monthly}})
**Cause**: Template placeholders don't match generated keys
**Fix**:
1. Check backend logs for available placeholders
2. Update Word template to use correct placeholder names
3. Supported formats:
   - `{{basic_monthly}}` ✅
   - `{{BASIC_MONTHLY}}` ✅
   - `{{basic_annual}}` ✅
   - `{{hra_monthly}}` ✅
   - etc.

### Issue 3: Values are 0 or empty
**Cause**: Component not found in salary structure
**Fix**:
1. Check if the component exists in the salary assignment
2. Verify component names match patterns:
   - Basic: "Basic", "Basic Salary"
   - HRA: "HRA", "House Rent Allowance"
   - etc.
3. Check backend logs for "Sample values" to see what was found

### Issue 4: Backend crash or 500 error
**Cause**: Syntax error or missing module
**Fix**:
1. Check backend terminal for error stack trace
2. Verify `ctcStructureBuilder.js` exists
3. Restart backend: `npm run dev`

---

## ✅ **Success Criteria**

Your test is **SUCCESSFUL** if:

1. ✅ Backend logs show "LOCKED snapshot found"
2. ✅ Backend logs show "CTC structure built successfully"
3. ✅ Backend logs show actual values (not 0 or empty)
4. ✅ PDF preview shows actual numbers instead of `{{placeholders}}`
5. ✅ Values in PDF **exactly match** salary structure screen
6. ✅ Numbers are formatted with Indian commas (50,000)
7. ✅ No errors in backend or frontend console

---

## 📸 **What to Check in the PDF**

### CTC Structure Table Should Show:

```
┌─────────────────────────────────┬──────────┬───────────┐
│ Component                       │ Monthly  │ Yearly    │
├─────────────────────────────────┼──────────┼───────────┤
│ A – Monthly Benefits            │          │           │
│ Basic Salary                    │ 25,000   │ 3,00,000  │
│ HRA                            │ 12,500   │ 1,50,000  │
│ Special Allowance              │ 10,000   │ 1,20,000  │
│ Transport Allowance            │  1,600   │   19,200  │
│ Medical Allowance              │  1,250   │   15,000  │
│ GROSS A                        │ 50,350   │ 6,04,200  │
│                                │          │           │
│ B – Annual Benefits            │          │           │
│ Employee PF                    │  1,800   │   21,600  │
│ Professional Tax               │    200   │    2,400  │
│ GROSS B                        │  2,000   │   24,000  │
│                                │          │           │
│ C – Employer Company's Benefits│          │           │
│ Employer PF                    │  1,800   │   21,600  │
│ Gratuity                       │  2,417   │   29,000  │
│ GROSS C                        │  4,217   │   50,600  │
│                                │          │           │
│ Computed CTC (A+B+C)           │ 56,567   │ 6,78,800  │
└─────────────────────────────────┴──────────┴───────────┘
```

**All values should be numbers, not placeholders!**

---

## 🎯 **Quick Test Command**

If you want to test via API directly:

```bash
# 1. Get applicant ID from database or frontend
# 2. Make POST request

curl -X POST http://localhost:5173/api/letters/generate-joining \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "applicantId": "YOUR_APPLICANT_ID",
    "templateId": "YOUR_TEMPLATE_ID"
  }'
```

Check backend logs immediately after running this command.

---

## 📞 **Need Help?**

If you encounter issues:
1. Share the **backend logs** (especially the 🔥 debug sections)
2. Share a **screenshot** of the PDF preview
3. Confirm the **salary is locked** in the database
4. Check if **template has correct placeholders**

---

**Ready to test? Let's go! 🚀**
