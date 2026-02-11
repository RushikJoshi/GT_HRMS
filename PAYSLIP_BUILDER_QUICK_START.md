# ⚡ Custom Payslip Builder - Quick Setup Guide

## 3-Minute Setup

### Step 1: Copy Frontend Files
```bash
# Create directory
mkdir -p frontend/src/pages/HR/PayslipBuilder/utils

# Copy these 7 files:
frontend/src/pages/HR/PayslipBuilder/
├── PayslipBuilder.jsx
├── PayslipDesigner.jsx
├── PayslipPreview.jsx
├── PayslipLayerPanel.jsx
└── utils/
    └── payslipUtils.js

# Update this file:
frontend/src/pages/HR/Payroll/PayslipTemplates.jsx
```

### Step 2: Update Backend Files
```bash
# Update 2 files:
backend/models/PayslipTemplate.js
backend/controllers/payslipTemplate.controller.js
```

### Step 3: Restart Services
```bash
# Frontend
npm run dev          # or your dev command

# Backend
npm start            # or your start command
```

### Step 4: Test
1. Go to HR → Payroll → Payslip Templates
2. Click "Create Template"
3. Click "Visual Builder" (3rd option)
4. Design your payslip!
5. Click "Save Template"

## Installation Checklist

- [ ] All 5 files copied to `frontend/src/pages/HR/PayslipBuilder/`
- [ ] `PayslipTemplates.jsx` updated with PayslipBuilder import
- [ ] `PayslipTemplate.js` model updated (templateType enum)
- [ ] `payslipTemplate.controller.js` updated (handles CUSTOM type)
- [ ] Frontend server restarted
- [ ] Backend server restarted
- [ ] No errors in browser console
- [ ] No errors in backend logs

## Usage Quick Start

### For Users: Design a Payslip in 5 Steps

1. **Click Create Template**
   - Go to Payslip Templates page
   - Click "Create Template" button

2. **Select Visual Builder**
   - Choose the 3rd option with the Palette icon
   - Opens full-screen builder

3. **Design Your Payslip**
   - Left panel: See all sections
   - Center panel: Edit section properties
   - Right panel: Watch live preview

4. **Add Your Content**
   - Select sections and edit them
   - Add {{PLACEHOLDERS}} like {{BASIC}}, {{GROSS}}, {{NET_PAY}}
   - Change colors, fonts, alignment as you prefer

5. **Save Template**
   - Enter template name
   - Click "Save Template"
   - Use it for payslip generation!

### For Developers: Extend the Builder in 2 Steps

#### Add a New Placeholder
1. Edit `payslipUtils.js`
   ```javascript
   export const PAYSLIP_PLACEHOLDERS = [
       // ... existing
       { 
           name: '{{MY_NEW_FIELD}}', 
           description: 'My new field',
           category: 'Custom'
       }
   ];
   ```

2. Run frontend dev server - done! ✅

#### Add a New Section Type
1. Edit `payslipUtils.js`
   ```javascript
   // In getDefaultPayslipDesign()
   {
       id: 'my-section-' + Date.now(),
       type: 'my-section',
       order: 7,
       content: { title: 'My Section' }
   }
   
   // In renderSectionHTML()
   case 'my-section':
       html = `<div class="my-section">...</div>`;
       break;
   ```

2. Edit `PayslipDesigner.jsx`
   ```javascript
   const sectionTypeConfig = {
       'my-section': [
           { label: 'Title', key: 'title', type: 'text' }
       ]
   };
   ```

3. Restart frontend - done! ✅

## Troubleshooting

### Issue: PayslipBuilder not showing
**Solution:**
- Verify `PayslipTemplates.jsx` has: `import PayslipBuilder from '../PayslipBuilder/PayslipBuilder';`
- Check browser console for errors
- Clear browser cache

### Issue: Styles not loading
**Solution:**
- Ensure Tailwind CSS is properly imported in your app
- Check that no CSS conflicts exist
- Verify `tailwindcss` is in `node_modules`

### Issue: Preview showing placeholders
**Solution:**
- This is expected! Placeholders only replace with real data during payslip PDF/print generation
- They show as `{{PLACEHOLDER}}` in preview (which is correct)

### Issue: Save button not working
**Solution:**
- Check that template name is filled
- Check browser console for JS errors
- Check network tab to see if API call is failing
- Verify backend is running

### Issue: Placeholder not appearing in preview
**Solution:**
- Ensure exact format: `{{UPPERCASE_WITH_UNDERSCORE}}`
- Check spelling matches the list in left panel
- Verify it's being used inside a text block

## API Testing

### Test Creating Template via Postman
```bash
POST http://localhost:5000/payslip-templates
Headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_TOKEN"
}
Body: {
    "name": "Test Payslip",
    "templateType": "CUSTOM",
    "htmlContent": "<h1>Test</h1>",
    "isActive": true,
    "isDefault": false
}
```

### Expected Response
```json
{
    "success": true,
    "data": {
        "_id": "...",
        "name": "Test Payslip",
        "templateType": "CUSTOM",
        "htmlContent": "<h1>Test</h1>",
        "placeholders": [],
        "isActive": true,
        "isDefault": false,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
    }
}
```

## File Location Reference

```
GT_HRMS/
├── frontend/
│   └── src/pages/HR/
│       ├── PayslipBuilder/                     ← NEW FOLDER
│       │   ├── PayslipBuilder.jsx
│       │   ├── PayslipDesigner.jsx
│       │   ├── PayslipPreview.jsx
│       │   ├── PayslipLayerPanel.jsx
│       │   └── utils/
│       │       └── payslipUtils.js
│       └── Payroll/
│           └── PayslipTemplates.jsx            ← UPDATED
│
└── backend/
    ├── models/
    │   └── PayslipTemplate.js                  ← UPDATED
    └── controllers/
        └── payslipTemplate.controller.js       ← UPDATED
```

## Features Summary

✅ Drag & Drop Sections  
✅ Real-time Live Preview  
✅ 22+ Placeholders  
✅ Professional Default Design  
✅ Color & Font Customization  
✅ Item Management (Add/Remove)  
✅ Section Reordering  
✅ Placeholder Validation  
✅ Auto-save Detection  
✅ Restore Defaults  
✅ HTML Export  
✅ Database Integration  
✅ No Code Changes to Payroll Logic  

## Need Help?

### Documentation Files:
1. **CUSTOM_PAYSLIP_BUILDER_GUIDE.md** - Complete overview & features
2. **PAYSLIP_BUILDER_DEVELOPER_GUIDE.md** - Developer reference & extensions
3. **PAYSLIP_BUILDER_ARCHITECTURE.md** - Technical architecture & diagrams

### Key Components:
- `PayslipBuilder.jsx` - Main orchestrator (350 lines)
- `payslipUtils.js` - All utilities & configurations (450 lines)
- `PayslipLayerPanel.jsx` - Section manager (200 lines)
- `PayslipDesigner.jsx` - Property editor (250 lines)
- `PayslipPreview.jsx` - Live preview (85 lines)

## Success Criteria Checklist

After setup, verify:
- [ ] Can navigate to Payslip Templates
- [ ] "Create Template" button shows selection modal with 3 options
- [ ] "Visual Builder" option opens full-screen builder
- [ ] Left panel shows default sections
- [ ] Right panel shows live A4 preview
- [ ] Can edit section properties in center panel
- [ ] Can add/remove/reorder sections
- [ ] Preview updates in real-time
- [ ] Can save template (stored in DB as CUSTOM type)
- [ ] Saved template can be retrieved

## Support Contacts

For issues or questions:
1. Check the 3 documentation files (listed above)
2. Review error messages in browser console (F12)
3. Check backend logs for API errors
4. Verify file paths match your project structure

---

**That's it! You're ready to use the Custom Payslip Builder!** 🎉

For detailed information, see:
- [CUSTOM_PAYSLIP_BUILDER_GUIDE.md](./CUSTOM_PAYSLIP_BUILDER_GUIDE.md)
- [PAYSLIP_BUILDER_DEVELOPER_GUIDE.md](./PAYSLIP_BUILDER_DEVELOPER_GUIDE.md)
- [PAYSLIP_BUILDER_ARCHITECTURE.md](./PAYSLIP_BUILDER_ARCHITECTURE.md)
