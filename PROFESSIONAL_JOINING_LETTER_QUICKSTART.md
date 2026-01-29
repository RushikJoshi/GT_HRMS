# Professional Joining Letter - Quick Start Guide

## 🎯 What's New?

I've created a **professional joining letter generator** that produces beautifully formatted documents with comprehensive CTC breakdown tables, exactly matching the Gitalakshmi Technologies format you showed me.

## ✅ What Was Created

### 1. Backend Components

#### **File: `backend/utils/joiningLetterTemplateGenerator.js`**
- Professional DOCX generator using the `docx` library
- Creates formatted CTC breakdown table with:
  - Section A: Monthly Benefits (Earnings)
  - Section B: Deductions
  - Section C: Other Benefits
  - Total CTC calculation
- Company branding (Gitalakshmi logo and colors)
- Proper formatting with borders, shading, and alignment

#### **File: `backend/controllers/letter.controller.js`** (Updated)
- Added `generateProfessionalJoiningLetter` function
- Fetches salary snapshot from database
- Validates prerequisites (locked salary, offer letter)
- Generates DOCX and converts to PDF
- Saves to database and updates timeline

#### **File: `backend/routes/letter.routes.js`** (Updated)
- Added route: `POST /api/letters/generate-professional-joining`
- Protected with authentication and HR role requirement

### 2. Documentation

#### **File: `PROFESSIONAL_JOINING_LETTER_GUIDE.md`**
- Complete API documentation
- Frontend integration examples
- Troubleshooting guide
- Best practices

#### **File: `backend/test_professional_joining_letter.js`**
- Test script to verify the functionality
- Example usage of the API

## 🚀 How to Use

### Option 1: API Call (Recommended)

```javascript
// Frontend code
const response = await api.post('/letters/generate-professional-joining', {
  applicantId: 'YOUR_APPLICANT_ID'
});

// Open the generated PDF
window.open(response.data.downloadUrl, '_blank');
```

### Option 2: Test Script

```bash
cd backend
node test_professional_joining_letter.js
```

## 📋 Prerequisites

Before generating a joining letter:

1. ✅ **Salary must be assigned** to the applicant/employee
2. ✅ **Salary must be locked** (`salaryLocked = true`)
3. ✅ **Offer letter must exist** (for applicants only)

## 🎨 What the Generated Letter Looks Like

The generated joining letter includes:

### Header
```
Gitalakshmi
TECHNOLOGIES

Reference No: OFFER/2026/001
Date: 20th Jan. 2026

Name: John Doe
Designation: Software Engineer
Location: Mumbai
```

### CTC Breakdown Table

| Component | Monthly | Yearly |
|-----------|---------|--------|
| **A – Monthly Benefits** | | |
| Basic Salary | ₹20,000 | ₹2,40,000 |
| HRA | ₹8,000 | ₹96,000 |
| Special Allowance | ₹19,238 | ₹2,30,856 |
| **Gross A (Total)** | **₹47,238** | **₹5,66,856** |
| | | |
| **B – Deductions** | | |
| Employee PF | ₹1,800 | ₹21,600 |
| **Total Deductions (B)** | **₹1,800** | **₹21,600** |
| **Net Salary Payable (A-B)** | **₹45,438** | **₹5,45,256** |
| | | |
| **C – Other Benefits** | | |
| Employer PF | ₹1,800 | ₹21,600 |
| Gratuity | ₹962 | ₹11,544 |
| **TOTAL CTC (A+C)** | **₹50,000** | **₹6,00,000** |

### Footer
```
Best Regards,
Gitalakshmi Technologies Private Limited
Address: [Company Address]
```

## 🔄 Integration Steps

### Step 1: Update Your Frontend Component

Find where you currently generate joining letters and add a new button:

```jsx
<button onClick={handleGenerateProfessionalJoiningLetter}>
  Generate Professional Joining Letter
</button>
```

### Step 2: Add the Handler Function

```javascript
const handleGenerateProfessionalJoiningLetter = async () => {
  try {
    setLoading(true);
    
    const response = await api.post('/letters/generate-professional-joining', {
      applicantId: applicant._id
    });
    
    // Open PDF in new tab
    window.open(response.data.downloadUrl, '_blank');
    
    toast.success('Joining letter generated successfully!');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to generate joining letter');
  } finally {
    setLoading(false);
  }
};
```

## 🎯 Key Differences from Old System

| Aspect | Old System | New Professional System |
|--------|-----------|------------------------|
| **Design** | Template-dependent | Programmatically generated |
| **CTC Table** | Manual placeholders | Auto-generated from salary data |
| **Formatting** | Basic | Professional with borders, shading |
| **Maintenance** | Edit Word templates | Edit code (easier version control) |
| **Consistency** | Varies by template | Always consistent |
| **Branding** | Template-based | Code-based (easy to update) |

## 🐛 Troubleshooting

### "Salary must be confirmed and locked"
**Fix:** Lock the salary first:
```javascript
await api.post('/salary/confirm', {
  applicantId: applicantId,
  reason: 'JOINING'
});
```

### "Salary snapshot not found"
**Fix:** Assign salary first:
```javascript
await api.post('/salary/assign', {
  applicantId: applicantId,
  ctcAnnual: 600000,
  selectedEarnings: [...],
  selectedDeductions: [...],
  selectedBenefits: [...]
});
```

## 📁 Files Modified/Created

### Created:
1. ✅ `backend/utils/joiningLetterTemplateGenerator.js`
2. ✅ `backend/test_professional_joining_letter.js`
3. ✅ `PROFESSIONAL_JOINING_LETTER_GUIDE.md`
4. ✅ `PROFESSIONAL_JOINING_LETTER_QUICKSTART.md` (this file)

### Modified:
1. ✅ `backend/controllers/letter.controller.js` - Added new endpoint
2. ✅ `backend/routes/letter.routes.js` - Added new route

## 🎉 Next Steps

1. **Test the endpoint** using the test script or Postman
2. **Update your frontend** to use the new endpoint
3. **Customize branding** if needed (edit `joiningLetterTemplateGenerator.js`)
4. **Deploy** and enjoy professional joining letters!

## 💡 Customization

### Change Company Name/Colors

Edit `backend/utils/joiningLetterTemplateGenerator.js`:

```javascript
// Line ~85
new TextRun({
    text: "Your Company Name",  // Change this
    bold: true,
    size: 32,
    color: "E91E63",  // Change color (hex without #)
    font: "Arial"
})
```

### Add Custom Fields

Add to the document generation:

```javascript
new Paragraph({
    children: [
        new TextRun({
            text: `Employee ID: ${employeeData.employeeId}`,
            size: 20
        })
    ]
})
```

## 📞 Need Help?

- Check `PROFESSIONAL_JOINING_LETTER_GUIDE.md` for detailed documentation
- Review backend logs for error messages
- Verify salary snapshot exists and is locked
- Test with the provided test script first

---

**Status:** ✅ Ready to Use  
**Backend:** Running on port 5000  
**Endpoint:** `POST /api/letters/generate-professional-joining`  
**Authentication:** Required (HR role)
