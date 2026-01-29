# Professional Joining Letter Generator

## Overview

This document describes the new **Professional Joining Letter Generator** that creates beautifully formatted joining letters with a comprehensive CTC breakdown table, matching the Gitalakshmi Technologies format.

## Features

✅ **Professional Design** - Clean, corporate layout with company branding  
✅ **Comprehensive CTC Table** - Detailed breakdown of all salary components  
✅ **Dynamic Data** - Automatically populated from salary snapshots  
✅ **PDF Output** - High-quality PDF generation via LibreOffice  
✅ **Multi-tenant Safe** - Fully integrated with tenant isolation  
✅ **Audit Trail** - Tracks all generated letters in the database  

## CTC Table Structure

The generated joining letter includes a professional table with the following sections:

### Section A: Monthly Benefits (Earnings)
- Basic Salary
- HRA (House Rent Allowance)
- Conveyance Allowance
- Medical Allowance
- Special Allowance
- Other allowances as configured
- **Gross A (Total)**

### Section B: Deductions
- Employee PF
- Professional Tax
- ESIC (if applicable)
- Other deductions as configured
- **Total Deductions (B)**
- **Net Salary Payable (A-B)**

### Section C: Other Benefits
- Employer PF
- Gratuity
- Other employer benefits
- **TOTAL CTC (A+C)**

## API Endpoint

### Generate Professional Joining Letter

**Endpoint:** `POST /api/letters/generate-professional-joining`

**Authentication:** Required (HR role)

**Request Body:**
```json
{
  "applicantId": "69673ebe88388fb64f060497"
}
```

OR

```json
{
  "employeeId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "downloadUrl": "/uploads/offers/Joining_Letter_69673ebe88388fb64f060497_1768917113036.pdf",
  "pdfUrl": "/uploads/offers/Joining_Letter_69673ebe88388fb64f060497_1768917113036.pdf",
  "letterId": "507f1f77bcf86cd799439012",
  "message": "Professional joining letter generated successfully"
}
```

**Error Responses:**

- `400` - Salary not locked or offer letter not generated
- `404` - Applicant/Employee not found
- `500` - PDF generation failed

## Prerequisites

Before generating a joining letter, ensure:

1. ✅ **Salary is assigned** - Applicant/Employee must have a salary snapshot
2. ✅ **Salary is locked** - `salaryLocked` must be `true`
3. ✅ **Offer letter exists** (for applicants) - `offerLetterPath` must be set

## Frontend Integration

### Example: React Component

```javascript
import React, { useState } from 'react';
import api from '../services/api';

function JoiningLetterGenerator({ applicantId }) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const generateJoiningLetter = async () => {
    try {
      setLoading(true);
      
      const response = await api.post('/letters/generate-professional-joining', {
        applicantId
      });
      
      setPdfUrl(response.data.downloadUrl);
      
      // Open PDF in new tab
      window.open(response.data.downloadUrl, '_blank');
      
      alert('Joining letter generated successfully!');
    } catch (error) {
      console.error('Failed to generate joining letter:', error);
      alert(error.response?.data?.message || 'Failed to generate joining letter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={generateJoiningLetter}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Professional Joining Letter'}
      </button>
      
      {pdfUrl && (
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
          View Generated Letter
        </a>
      )}
    </div>
  );
}

export default JoiningLetterGenerator;
```

## File Structure

```
backend/
├── controllers/
│   └── letter.controller.js          # Contains generateProfessionalJoiningLetter
├── utils/
│   └── joiningLetterTemplateGenerator.js  # DOCX generation logic
├── routes/
│   └── letter.routes.js              # API route definition
└── uploads/
    └── offers/                       # Generated PDFs stored here
```

## Technical Details

### Document Generation Flow

1. **Fetch Data**
   - Retrieve applicant/employee details
   - Fetch salary snapshot from database
   - Validate prerequisites (locked salary, offer letter)

2. **Generate DOCX**
   - Use `docx` library to create Word document
   - Build CTC table with proper formatting
   - Apply company branding (Gitalakshmi logo, colors)

3. **Convert to PDF**
   - Use LibreOffice service for synchronous conversion
   - Save PDF to `uploads/offers/` directory

4. **Save to Database**
   - Create `GeneratedLetter` record
   - Update applicant/employee timeline
   - Return download URL

### Salary Data Mapping

The generator automatically extracts and formats:

- **Earnings**: All components from `snapshot.earnings`
- **Deductions**: All components from `snapshot.employeeDeductions`
- **Benefits**: All components from `snapshot.benefits`

All amounts are:
- Calculated for both monthly and annual values
- Formatted with Indian number system (₹1,00,000)
- Rounded to nearest rupee

## Customization

### Modify Company Branding

Edit `backend/utils/joiningLetterTemplateGenerator.js`:

```javascript
// Change company name
new TextRun({
    text: "Your Company Name",
    bold: true,
    size: 32,
    color: "E91E63",  // Change color
    font: "Arial"
})
```

### Add Custom Fields

Add to `employeeData` object:

```javascript
const employeeData = {
    name: target.name,
    designation: target.designation,
    // Add your custom fields
    customField: target.customField,
    ...
};
```

Then use in document generation:

```javascript
new Paragraph({
    children: [
        new TextRun({
            text: `Custom Field: ${employeeData.customField}`,
            size: 20
        })
    ]
})
```

## Testing

### Manual Test

1. Ensure backend is running: `npm run dev`
2. Update test script with valid credentials
3. Run: `node test_professional_joining_letter.js`

### Using Postman

```
POST http://localhost:5000/api/letters/generate-professional-joining
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json
Body:
  {
    "applicantId": "69673ebe88388fb64f060497"
  }
```

## Troubleshooting

### Error: "Salary must be confirmed and locked"

**Solution:** Lock the salary first using the salary assignment flow.

```javascript
await api.post('/salary/confirm', {
  applicantId: 'YOUR_APPLICANT_ID',
  reason: 'JOINING'
});
```

### Error: "Offer Letter must be generated before Joining Letter"

**Solution:** Generate the offer letter first.

```javascript
await api.post('/letters/generate-offer', {
  applicantId: 'YOUR_APPLICANT_ID',
  templateId: 'YOUR_TEMPLATE_ID'
});
```

### Error: "PDF Generation Failed"

**Possible Causes:**
- LibreOffice not installed or not in PATH
- Insufficient disk space
- File permissions issue

**Solution:** Check LibreOffice installation and logs.

### Error: "Salary snapshot not found"

**Solution:** Ensure salary has been assigned to the applicant/employee.

```javascript
await api.post('/salary/assign', {
  applicantId: 'YOUR_APPLICANT_ID',
  ctcAnnual: 600000,
  selectedEarnings: [...],
  selectedDeductions: [...],
  selectedBenefits: [...]
});
```

## Comparison: Old vs New

| Feature | Old Generator | New Professional Generator |
|---------|--------------|---------------------------|
| Format | Word template placeholders | Programmatic DOCX generation |
| Design | Basic, template-dependent | Professional, consistent |
| CTC Table | Manual template editing | Auto-generated from data |
| Customization | Limited to template | Full programmatic control |
| Branding | Template-based | Code-based, easy to update |
| Maintenance | Template files | Single code file |

## Best Practices

1. **Always lock salary** before generating joining letters
2. **Generate offer letter first** for applicants
3. **Verify salary snapshot** exists and is correct
4. **Test with sample data** before production use
5. **Keep backups** of generated PDFs
6. **Monitor disk space** in uploads directory

## Future Enhancements

Potential improvements:

- [ ] Add digital signature support
- [ ] Email delivery integration
- [ ] Multiple language support
- [ ] Custom template selection
- [ ] Bulk generation for multiple applicants
- [ ] QR code for verification
- [ ] Watermark support

## Support

For issues or questions:
1. Check backend logs for detailed error messages
2. Verify all prerequisites are met
3. Test with the provided test script
4. Review the SALARY_QUICK_REFERENCE.md for salary system details

---

**Version:** 1.0  
**Last Updated:** January 2026  
**Author:** HRMS Development Team
