# 📐 Custom Payslip Builder - Architecture & File Reference

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PAYSLIP TEMPLATES PAGE                           │
│            (frontend/src/pages/HR/Payroll/PayslipTemplates.jsx)     │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
                    Click "Create Template" Button
                                      │
                    ┌─────────────────▼──────────────┐
                    │   SELECTION MODAL              │
                    │  (3 Template Types)            │
                    ├─────────────────────────────────┤
                    │  1. HTML Editor                 │ ──► Traditional HTML editing
                    │  2. Word Template               │ ──► Upload .docx file
                    │  3. ✨ Visual Builder (NEW)     │ ──► 🎨 Custom Payslip Builder
                    └─────────────────┬───────────────┘
                                      │
        ┌─────────────────────────────┤
        │                             │
        ▼                             ▼
    (HTML)                       (WORD)
        
        ╔════════════════════════════════════════════════════════════════╗
        ║        CUSTOM PAYSLIP BUILDER (FULL SCREEN)                    ║
        ║  (frontend/src/pages/HR/PayslipBuilder/PayslipBuilder.jsx)     ║
        ╠════════════════════════════════════════════════════════════════╣
        ║                                                                ║
        ║  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────┐
        ║  │  LEFT PANEL      │   │  CENTER PANEL    │   │ RIGHT PANEL  │
        ║  │                  │   │                  │   │              │
        ║  │ Sections Manager │   │ Property Editor  │   │ Live Preview │
        ║  │                  │   │                  │   │              │
        ║  ├──────────────────┤   ├──────────────────┤   ├──────────────┤
        ║  │                  │   │                  │   │              │
        ║  │ Layer Panel      │   │ Designer Panel   │   │ Preview Pane │
        ║  │ (PayslipLayer    │   │ (PayslipDesigner)   │ (PayslipPrev) │
        ║  │  Panel.jsx)      │   │ (.jsx)           │   │ .jsx)        │
        ║  │                  │   │                  │   │              │
        ║  │ • Sections List  │   │ • Properties     │   │ • A4 Size    │
        ║  │ • Add Section    │   │ • Field Editing  │   │ • Sample Data│
        ║  │ • Reorder        │   │ • Item Manager   │   │ • Real-time  │
        ║  │ • Duplicate      │   │ • Color Picker   │   │ • Validation │
        ║  │ • Delete         │   │ • Font Size      │   │ • Warnings   │
        ║  │ • Placeholder    │   │ • Alignment      │   │              │
        ║  │   Reference      │   │ • Background     │   │ Utilities:   │
        ║  │ • Restore        │   │                  │   │              │
        ║  │   Defaults       │   │                  │   │ • Convert to │
        ║  │                  │   │                  │   │   HTML       │
        ║  │                  │   │                  │   │ • Replace    │
        ║  │                  │   │                  │   │   placeholders │
        ║  │                  │   │                  │   │ • Validate   │
        ║  └──────────────────┘   └──────────────────┘   │              │
        ║                                                 └──────────────┘
        ║
        ║  Shared Utilities:
        ║  • payslipUtils.js (ALL UTILITIES & CONFIGURATIONS)
        ║    - Placeholders list
        ║    - Default design structure
        ║    - HTML generation
        ║    - Placeholder detection
        ║    - Validation functions
        ║    - Sample data
        ║
        ║  Saved Template Flow:
        ║  1. User designs in builder
        ║  2. Converts sections to HTML (convertDesignToHTML)
        ║  3. Extracts placeholders (extractPlaceholders)
        ║  4. Sends to backend API (/payslip-templates)
        ║  5. Stored in MongoDB as CUSTOM type
        ║  6. Used in payslip generation with existing API
        ║
        ╚════════════════════════════════════════════════════════════════╝
```

## Data Flow Diagram

```
User Action → Component Update → State Change → Render → Live Preview
   │              │                  │             │          │
   ▼              ▼                  ▼             ▼          ▼
Select    PayslipBuilder    setSections()    JSX Render  convertDesignToHTML()
Section   → Calls Handler   → Redux/State  → Component  → Display Preview
Add Item    Update Handler   Update          Tree        Replace Sample Data
Edit Font   Delete Handler   sections array  Dom Change  Show Result


DATABASE FLOW:
┌──────────────────────────────────────────────────────────────┐
│  PayslipBuilder Component                                    │
│  (manages sections state)                                    │
└─────────┬────────────────────────────────────────────────────┘
          │ convertDesignToHTML(sections)
          ▼
┌──────────────────────────────────────────────────────────────┐
│  payslipUtils.js                                             │
│  - Converts sections array to HTML string                    │
│  - Extracts {{PLACEHOLDER}} from content                     │
│  - Generates semantic HTML with inline styles               │
└─────────┬────────────────────────────────────────────────────┘
          │ api.post('/payslip-templates', {
          │   name, htmlContent, templateType: 'CUSTOM'
          │ })
          ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend API                                                 │
│  (payslipTemplate.controller.js)                             │
└─────────┬────────────────────────────────────────────────────┘
          │ extractPlaceholders(htmlContent)
          ▼
┌──────────────────────────────────────────────────────────────┐
│  MongoDB (PayslipTemplate collection)                        │
│  {                                                           │
│    _id: ObjectId,                                            │
│    tenant: ObjectId,                                         │
│    name: "My Custom Payslip",                                │
│    templateType: "CUSTOM",                                   │
│    htmlContent: "<!DOCTYPE html>...",                        │
│    placeholders: ["EMPLOYEE_NAME", "BASIC", "GROSS"],        │
│    isActive: true,                                           │
│    isDefault: false,                                         │
│    createdAt: Date,                                          │
│    updatedAt: Date                                           │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
PayslipTemplates (Main Page)
├─ State: templates[], selectedType, formData, showBuilderModal
├─ Methods: handleTypeSelect(), fetchTemplates(), handleSaveTemplate()
└─ Children:
   ├─ Modal (Template Type Selection)
   │  ├─ Button: HTML Editor
   │  ├─ Button: Word Template
   │  └─ Button: Visual Builder ← Triggers PayslipBuilder
   │
   ├─ Modal (HTML/Word Editor)
   │  └─ Traditional form-based editing
   │
   └─ PayslipBuilder (CUSTOM)
      ├─ State: sections, selectedSectionId, templateName, saving, loading
      ├─ Methods: handleAddSection, handleUpdateSection, handleSaveTemplate
      └─ Children:
         ├─ PayslipLayerPanel (Left)
         │  ├─ Section List
         │  ├─ Add Section Button
         │  ├─ Reorder Controls
         │  ├─ Delete/Duplicate Buttons
         │  ├─ Placeholder Reference
         │  └─ Restore Defaults Button
         │
         ├─ PayslipDesigner (Center)
         │  ├─ Property Form (dynamic based on section type)
         │  ├─ Text Inputs
         │  ├─ Number Inputs
         │  ├─ Color Pickers
         │  ├─ Select Dropdowns
         │  └─ Item Management (Add/Remove items)
         │
         └─ PayslipPreview (Right)
            ├─ A4 Container (210mm x 297mm)
            ├─ HTML Preview (memoized)
            ├─ Sample Data Injection
            ├─ Essential Placeholder Warning
            └─ Scroll Area
```

## File Structure with Line Counts

```
frontend/src/pages/HR/
│
├─ PayslipBuilder/                                    (NEW)
│  ├─ PayslipBuilder.jsx                            (~350 lines)
│  │  └─ Main component orchestrating everything
│  │     • 3-column layout management
│  │     • Section CRUD operations
│  │     • Template save logic
│  │     • Essential validation
│  │
│  ├─ PayslipDesigner.jsx                           (~255 lines)
│  │  └─ Property editor for selected section
│  │     • Dynamic field rendering
│  │     • Property change handlers
│  │     • Item management (add/remove)
│  │     • Type-specific configuration
│  │
│  ├─ PayslipPreview.jsx                            (~85 lines)
│  │  └─ Live A4 preview panel
│  │     • Real-time HTML rendering
│  │     • Sample data injection
│  │     • Essential placeholder validation
│  │     • Memoized computation
│  │
│  ├─ PayslipLayerPanel.jsx                         (~205 lines)
│  │  └─ Section manager left panel
│  │     • Section list display
│  │     • Reorder controls
│  │     • Duplicate/delete buttons
│  │     • Placeholder reference
│  │     • Restore defaults
│  │
│  ├─ blocks/                                         (Future Use)
│  │  └─ [Custom block components can go here]
│  │
│  └─ utils/
│     └─ payslipUtils.js                            (~450 lines)
│        └─ All utility functions & configurations
│           • PAYSLIP_PLACEHOLDERS array
│           • getDefaultPayslipDesign()
│           • convertDesignToHTML()
│           • extractPlaceholders()
│           • checkMissingEssentialPlaceholders()
│           • getSamplePayslipData()
│           • replacePlaceholdersWithData()
│           • renderSectionHTML()
│
├─ Payroll/
│  └─ PayslipTemplates.jsx                          (UPDATED ~510 lines)
│     └─ Template management page
│        • Imports PayslipBuilder
│        • Selection modal with 3 options
│        • State for showBuilderModal
│        • PayslipBuilder modal rendering
│
└─ [Other existing files unchanged]

backend/
│
├─ models/
│  └─ PayslipTemplate.js                            (UPDATED ~60 lines)
│     └─ Updated:
│        • templateType enum: ['HTML', 'WORD', 'CUSTOM']
│
├─ controllers/
│  └─ payslipTemplate.controller.js                 (UPDATED ~430 lines)
│     └─ Updated createTemplate():
│        • Accepts templateType: 'CUSTOM'
│        • Extracts placeholders
│        • Stores HTML content
│
└─ [Other files unchanged - NO other modifications]
```

## Data Structure Details

### Section Object Schema
```javascript
{
    id: String,              // Unique identifier (e.g., "section-1707123456789")
    type: String,            // 'header', 'text-section', 'earnings-section', 
                             // 'deductions-section', 'net-pay-section', 'attendance-section'
    order: Number,           // Display order (0, 1, 2, ...)
    content: {
        // HEADER type
        title: String,
        subtitle: String,
        titleFontSize: Number,
        subtitleFontSize: Number,
        textColor: String,           // Hex color: "#333333"
        backgroundColor: String,     // Hex color: "#ffffff"
        padding: Number,             // Pixels
        textAlign: String,           // 'left', 'center', 'right'
        
        // TEXT-SECTION type
        title: String,
        blocks: Array<{              // Text blocks
            id: String,
            type: 'text',
            text: String,            // HTML content
            fontSize: Number,
            fontWeight: String,      // 'normal', 'bold'
            textColor: String
        }>,
        backgroundColor: String,
        padding: Number,
        
        // EARNINGS/DEDUCTIONS/ATTENDANCE types
        title: String,
        items: Array<{               // Earnings/Deductions items
            id: String,
            label: String,           // "Basic Salary"
            placeholder: String,     // "{{BASIC}}"
            align: String            // 'left', 'right'
        }>,
        totalPlaceholder: String,    // "{{GROSS}}"
        fontSize: Number,
        padding: Number,
        
        // NET-PAY type
        label: String,               // "Net Payable"
        placeholder: String,         // "{{NET_PAY}}"
        fontSize: Number,
        fontWeight: String,
        textColor: String,           // "#ffffff"
        backgroundColor: String,     // "#2563eb"
        padding: Number,
        textAlign: String
    }
}
```

### Payslip Template Document (MongoDB)
```javascript
{
    _id: ObjectId("507f1f77bcf86cd799439011"),
    tenant: ObjectId("507f1f77bcf86cd799439012"),
    name: String,                                    // "Standard Payslip"
    templateType: String,                           // "HTML" | "WORD" | "CUSTOM"
    htmlContent: String,                            // Full HTML markup
    filePath: String,                               // Only for WORD type
    placeholders: Array<String>,                    // ["EMPLOYEE_NAME", "BASIC", ...]
    isActive: Boolean,                              // true/false
    isDefault: Boolean,                             // true/false (only one per tenant)
    createdBy: ObjectId,                            // User who created
    updatedBy: ObjectId,                            // User who last updated
    createdAt: Date,                                // ISO timestamp
    updatedAt: Date                                 // ISO timestamp
}
```

## State Flow Diagram

```
Top Level: PayslipBuilder
│
├─> sections: Array<Section>
│   └─ [Updated by]:
│      • handleAddSection() - push new section
│      • handleUpdateSection(id) - update one section
│      • handleDeleteSection(id) - filter out section
│      • handleDuplicateSection(id) - spread existing section
│      • handleRestoreDefaults() - reset to default
│
├─> selectedSectionId: String
│   └─ [Updated by]:
│      • setSelectedSectionId() - when clicking section
│      • handleAddSection() - sets newly added as selected
│      • handleDeleteSection() - sets first remaining if deleted is selected
│
├─> templateName: String
│   └─ [Updated by]:
│      • handleNameChange() - user typed in name field
│
├─> showNameInput: Boolean
│   └─ [Updated by]:
│      • setShowNameInput(true) - to show input field
│      • setShowNameInput(false) - to hide after setting
│
├─> saving: Boolean
│   └─ [Updated by]:
│      • handleSaveTemplate() - set true during save, false after
│
└─> loading: Boolean
    └─ [Updated by]:
        • Initial load set true, false when ready


Middle Level: Child Components receive:
├─ PayslipLayerPanel receives:
│  • sections (to display list)
│  • selectedSectionId (to highlight)
│  • onSelectSection (callback)
│  • onAddSection (callback)
│  • onDeleteSection (callback)
│  • onDuplicateSection (callback)
│  • onReorderSection (callback)
│  • onRestoreDefaults (callback)
│
├─ PayslipDesigner receives:
│  • selectedSectionId
│  • sections
│  • onSelectSection (callback)
│  • onUpdateSection (callback)
│  • onDeleteSection (callback)
│
└─ PayslipPreview receives:
   • sections (for HTML generation)
```

## API Contract

### GET /payslip-templates
Returns all templates for authenticated tenant
```javascript
Response: {
    success: true,
    data: [
        {
            _id: String,
            name: String,
            templateType: "HTML|WORD|CUSTOM",
            htmlContent: String (if HTML/CUSTOM),
            filePath: String (if WORD),
            placeholders: Array,
            isActive: Boolean,
            isDefault: Boolean,
            createdAt: Date,
            updatedAt: Date
        }
    ]
}
```

### POST /payslip-templates
Create new template
```javascript
Request: {
    name: String,                       // Required
    htmlContent: String,                // Required for HTML/CUSTOM
    templateType: "CUSTOM",             // NEW TYPE
    isActive: Boolean,                  // Optional, default: true
    isDefault: Boolean                  // Optional, default: false
}

Response: {
    success: true,
    data: {
        _id: String,
        tenant: String,
        name: String,
        templateType: "CUSTOM",
        htmlContent: String,
        placeholders: Array,
        isActive: Boolean,
        isDefault: Boolean,
        createdBy: String,
        updatedBy: String,
        createdAt: Date,
        updatedAt: Date
    }
}
```

### PUT /payslip-templates/:id
Update existing template
```javascript
Request: {
    name: String,
    htmlContent: String,
    isActive: Boolean,
    isDefault: Boolean
}

Response: {
    success: true,
    data: { /* Updated template object */ }
}
```

### DELETE /payslip-templates/:id
Delete template
```javascript
Response: {
    success: true,
    message: "Template deleted successfully"
}
```

## Placeholder Categories Reference

```
📋 EMPLOYEE (4 placeholders)
   • {{EMPLOYEE_NAME}}     → "John Doe"
   • {{EMPLOYEE_ID}}       → "EMP001"
   • {{DEPARTMENT}}        → "Engineering"
   • {{DESIGNATION}}       → "Senior Developer"

📅 DATE (3 placeholders)
   • {{MONTH}}             → "January"
   • {{YEAR}}              → "2024"
   • {{GENERATED_ON}}      → "2024-01-15"

💰 EARNINGS (5 placeholders)
   • {{BASIC}}             → "50,000"
   • {{SPECIAL}}           → "5,000"
   • {{HRA}}               → "10,000"
   • {{DEARNESS}}          → "2,000"
   • {{GROSS}}             → "67,000" ⭐ ESSENTIAL

💸 DEDUCTIONS (5 placeholders)
   • {{EPF}}               → "5,500"
   • {{ESI}}               → "850"
   • {{PT}}                → "200"
   • {{INCOME_TAX}}        → "5,000"
   • {{TOTAL_DEDUCTIONS}}  → "11,550" ⭐ ESSENTIAL

🎯 TOTALS (1 placeholder)
   • {{NET_PAY}}           → "55,450" ⭐ ESSENTIAL

📊 ATTENDANCE (4 placeholders)
   • {{PRESENT}}           → "28"
   • {{LEAVES}}            → "2"
   • {{LOP}}               → "0"
   • {{TOTAL_DAYS}}        → "30"
```

## Performance Metrics

### Component Render Count Optimization
- ✅ `PayslipPreview` uses `useMemo()` to prevent unnecessary re-renders
- ✅ Child components only re-render when their specific props change
- ✅ HTML conversion (expensive) is memoized

### Bundle Size Impact
- **New files added**: ~1300 lines of JSX + utilities
- **Minified estimate**: ~35-45 KB
- **Bundled with React**: Should add ~50-60 KB to bundle

### Performance Bottlenecks Identified
1. Large HTML generation in convertDesignToHTML() - **MITIGATION**: Memoized
2. Multiple section renders - **MITIGATION**: useMemo for children
3. Color pickers - **MITIGATION**: Native HTML5 input

## Migration & Compatibility

### Backward Compatibility
- ✅ Existing HTML templates unaffected
- ✅ Existing Word templates unaffected
- ✅ Payslip generation API unchanged
- ✅ Database schema accepts new type without migration

### Forward Compatibility
- ✅ New section types can be added without breaking existing
- ✅ New placeholders can be added to list without impact
- ✅ Component structure allows for future block library

---

## Quick Reference Checklist

**Files to Deploy:**
- [ ] `frontend/src/pages/HR/PayslipBuilder/PayslipBuilder.jsx`
- [ ] `frontend/src/pages/HR/PayslipBuilder/PayslipDesigner.jsx`
- [ ] `frontend/src/pages/HR/PayslipBuilder/PayslipPreview.jsx`
- [ ] `frontend/src/pages/HR/PayslipBuilder/PayslipLayerPanel.jsx`
- [ ] `frontend/src/pages/HR/PayslipBuilder/utils/payslipUtils.js`
- [ ] `frontend/src/pages/HR/Payroll/PayslipTemplates.jsx` (updated)
- [ ] `backend/models/PayslipTemplate.js` (updated)
- [ ] `backend/controllers/payslipTemplate.controller.js` (updated)

**No Database Migration Needed**: Schema already supports new type ✅
**No API Changes Needed**: Uses existing endpoints ✅
**No Other Files Modified**: Clean implementation ✅

---

*Created: February 6, 2026*  
*Status: Complete & Ready for Production* ✅
