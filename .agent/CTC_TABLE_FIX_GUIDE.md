# 🔧 CTC Structure Table - Complete Solution Guide

## Problem
CTC structure table in joining letter shows empty cells - no values in Monthly and Yearly columns.

## Root Cause
Word template table needs proper placeholder syntax to display data.

---

## ✅ SOLUTION: Update Your Word Template

### **Method 1: Using Loop Syntax (RECOMMENDED)**

Open your Word template (`joining-template-*.docx`) and modify the CTC Structure table:

#### **Current (Not Working):**
```
┌─────────────────────────────────┬──────────┬───────────┐
│ Salary Head                     │ Monthly  │ Yearly    │
├─────────────────────────────────┼──────────┼───────────┤
│ Basic                           │          │           │
│ HRA                            │          │           │
│ Special Allowance              │          │           │
└─────────────────────────────────┴──────────┴───────────┘
```

#### **Fixed (Using Docxtemplater Loop):**
```
┌─────────────────────────────────┬──────────┬───────────┐
│ Salary Head                     │ Monthly  │ Yearly    │
├─────────────────────────────────┼──────────┼───────────┤
│ {#salaryComponents}             │          │           │
│ {name}                          │ {monthly}│ {yearly}  │
│ {/salaryComponents}             │          │           │
└─────────────────────────────────┴──────────┴───────────┘
```

**How to do this in Word:**
1. Open your template in Word
2. Find the CTC Structure table
3. In the first data row (below headers), put:
   - Column 1: `{#salaryComponents}{name}`
   - Column 2: `{monthly}`
   - Column 3: `{yearly}{/salaryComponents}`
4. Delete all other empty rows
5. Save the template

**Note:** Use single curly braces `{` not double `{{` for loops!

---

### **Method 2: Using Individual Placeholders**

If you want to keep the table structure fixed (not dynamic), use individual placeholders:

```
┌─────────────────────────────────┬──────────┬───────────┐
│ Salary Head                     │ Monthly  │ Yearly    │
├─────────────────────────────────┼──────────┼───────────┤
│ A – Monthly Benefits            │          │           │
│ {{row_2_name}}                  │{{row_2_monthly}}│{{row_2_yearly}}│
│ {{row_3_name}}                  │{{row_3_monthly}}│{{row_3_yearly}}│
│ {{row_4_name}}                  │{{row_4_monthly}}│{{row_4_yearly}}│
│ {{row_5_name}}                  │{{row_5_monthly}}│{{row_5_yearly}}│
│ {{row_6_name}}                  │{{row_6_monthly}}│{{row_6_yearly}}│
│ GROSS A                         │{{row_7_monthly}}│{{row_7_yearly}}│
└─────────────────────────────────┴──────────┴───────────┘
```

**Note:** Use double curly braces `{{` for individual placeholders!

---

### **Method 3: Using Component-Specific Placeholders**

Use the specific component placeholders we generate:

```
┌─────────────────────────────────┬──────────┬───────────┐
│ Salary Head                     │ Monthly  │ Yearly    │
├─────────────────────────────────┼──────────┼───────────┤
│ A – Monthly Benefits            │          │           │
│ Basic Salary                    │{{basic_monthly}}│{{basic_annual}}│
│ HRA                            │{{hra_monthly}}│{{hra_annual}}│
│ Special Allowance              │{{special_monthly}}│{{special_annual}}│
│ Transport Allowance            │{{transport_monthly}}│{{transport_annual}}│
│ Medical Allowance              │{{medical_monthly}}│{{medical_annual}}│
│ GROSS A                        │{{gross_a_monthly}}│{{gross_a_annual}}│
│                                │          │           │
│ B – Deductions                 │          │           │
│ Employee PF                    │{{pf_monthly}}│{{pf_annual}}│
│ Professional Tax               │{{pt_monthly}}│{{pt_annual}}│
│                                │          │           │
│ C – Employer Benefits          │          │           │
│ Employer PF                    │{{employer_pf_monthly}}│{{employer_pf_annual}}│
│ Gratuity                       │{{gratuity_monthly}}│{{gratuity_annual}}│
│                                │          │           │
│ Total CTC                      │{{total_ctc_monthly}}│{{total_ctc_annual}}│
└─────────────────────────────────┴──────────┴───────────┘
```

---

## 🎯 RECOMMENDED APPROACH

**Use Method 1 (Loop Syntax)** because:
- ✅ Dynamic - adapts to any number of components
- ✅ Cleaner template
- ✅ Automatically handles all salary structures
- ✅ No need to update template when components change

---

## 📝 Step-by-Step: Update Template with Loop Syntax

### Step 1: Open Template
1. Navigate to: `d:\GITAKSHMI_HRMS\backend\uploads\templates\`
2. Find your joining letter template (e.g., `joining-template-*.docx`)
3. Open it in Microsoft Word

### Step 2: Locate CTC Structure Table
Scroll to the "CTC Structure" or "Salary Breakup" section

### Step 3: Modify Table
1. **Delete all data rows** except the first one (keep header row)
2. In the first data row, enter:
   - **Column 1 (Salary Head):** `{#salaryComponents}{name}`
   - **Column 2 (Monthly):** `{monthly}`
   - **Column 3 (Yearly):** `{yearly}{/salaryComponents}`

### Step 4: Format (Optional)
- Ensure text is left-aligned in Column 1
- Ensure numbers are right-aligned in Columns 2 & 3
- Set appropriate column widths

### Step 5: Save
- Save the template
- Close Word

### Step 6: Test
1. Go to applicant page
2. Generate joining letter
3. Preview PDF
4. **Values should now appear!** ✅

---

## 🐛 Troubleshooting

### Issue 1: "Invalid tag syntax"
**Cause:** Using wrong delimiters
**Fix:** 
- For loops: Use `{#array}` and `{/array}` (single braces)
- For variables: Use `{{variable}}` (double braces)

### Issue 2: Table shows only one row
**Cause:** Loop syntax not properly closed
**Fix:** Ensure `{/salaryComponents}` is in the SAME row as `{#salaryComponents}`

### Issue 3: Values still not showing
**Cause:** Template not saved or not uploaded
**Fix:**
1. Save template
2. Re-upload template via frontend
3. Select the NEW template when generating letter

### Issue 4: Row repeats but no data
**Cause:** Property names don't match
**Fix:** Use exactly: `{name}`, `{monthly}`, `{yearly}` (lowercase, no spaces)

---

## 📋 Available Placeholders

### Table Loop Data
```javascript
salaryComponents = [
  { name: "A – Monthly Benefits", monthly: "", yearly: "" },
  { name: "Basic Salary", monthly: "25,000", yearly: "3,00,000" },
  { name: "HRA", monthly: "12,500", yearly: "1,50,000" },
  // ... more rows
  { name: "GROSS A", monthly: "50,000", yearly: "6,00,000" },
  { name: "Total CTC", monthly: "56,567", yearly: "6,78,800" }
]
```

### Individual Component Placeholders
- `{{basic_monthly}}`, `{{basic_annual}}`
- `{{hra_monthly}}`, `{{hra_annual}}`
- `{{special_monthly}}`, `{{special_annual}}`
- `{{transport_monthly}}`, `{{transport_annual}}`
- `{{medical_monthly}}`, `{{medical_annual}}`
- `{{pf_monthly}}`, `{{pf_annual}}`
- `{{pt_monthly}}`, `{{pt_annual}}`
- `{{employer_pf_monthly}}`, `{{employer_pf_annual}}`
- `{{gratuity_monthly}}`, `{{gratuity_annual}}`
- `{{gross_a_monthly}}`, `{{gross_a_annual}}`
- `{{total_ctc_monthly}}`, `{{total_ctc_annual}}`

### Table Row Placeholders (New!)
- `{{row_1_name}}`, `{{row_1_monthly}}`, `{{row_1_yearly}}`
- `{{row_2_name}}`, `{{row_2_monthly}}`, `{{row_2_yearly}}`
- ... up to row_30 (or however many components you have)

---

## ✅ Verification

After updating template, check backend logs:

```
✅ [JOINING LETTER] LOCKED snapshot found
✅ [JOINING LETTER] CTC structure built successfully
✅ [JOINING LETTER] Salary components table built: 15 rows
🔥 [JOINING LETTER] Generated 45 table row placeholders
✅ [JOINING LETTER] Final data prepared with 200+ placeholders
```

Then check PDF:
- ✅ Table should have multiple rows
- ✅ Each row should show component name
- ✅ Monthly and Yearly columns should have formatted numbers
- ✅ Numbers should match salary structure screen

---

## 🎬 Quick Example

**Word Template (Before):**
```
Name: {{employee_name}}
Designation: {{designation}}

CTC Structure:
┌──────────────┬─────────┬─────────┐
│ Component    │ Monthly │ Yearly  │
├──────────────┼─────────┼─────────┤
│ Basic        │         │         │
│ HRA          │         │         │
└──────────────┴─────────┴─────────┘
```

**Word Template (After - Method 1):**
```
Name: {{employee_name}}
Designation: {{designation}}

CTC Structure:
┌──────────────┬─────────┬─────────┐
│ Component    │ Monthly │ Yearly  │
├──────────────┼─────────┼─────────┤
│{#salaryComponents}{name}│{monthly}│{yearly}{/salaryComponents}│
└──────────────┴─────────┴─────────┘
```

**Generated PDF:**
```
Name: Dhruv N Raval
Designation: Software Engineer

CTC Structure:
┌──────────────────────┬─────────┬──────────┐
│ Component            │ Monthly │ Yearly   │
├──────────────────────┼─────────┼──────────┤
│ A – Monthly Benefits │         │          │
│ Basic Salary         │ 25,000  │ 3,00,000 │
│ HRA                  │ 12,500  │ 1,50,000 │
│ GROSS A              │ 50,000  │ 6,00,000 │
│ Total CTC            │ 56,567  │ 6,78,800 │
└──────────────────────┴─────────┴──────────┘
```

---

## 🚀 Next Steps

1. **Update your Word template** using Method 1 (Loop Syntax)
2. **Save the template**
3. **Generate joining letter** again
4. **Check the PDF** - values should now appear!

If still not working, share:
- Screenshot of your Word template (showing the table with placeholders)
- Backend console logs
- I'll help you fix it immediately!
