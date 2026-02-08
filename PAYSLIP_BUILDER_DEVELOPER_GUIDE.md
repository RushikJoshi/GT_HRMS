# 🛠️ Custom Payslip Builder - Developer Quick Reference

## Quick Start Guide

### 1. Adding New Section Types

**Step 1**: Update `payslipUtils.js`
```javascript
// In getDefaultPayslipDesign()
{
    id: 'custom-section-' + Date.now(),
    type: 'custom-section',  // New type
    order: 7,
    content: {
        title: 'Your Title',
        customField: 'value'
    }
}
```

**Step 2**: Update `renderSectionHTML()` in `payslipUtils.js`
```javascript
case 'custom-section':
    html = `<div class="section custom">
        <h3>${section.content.title}</h3>
        <!-- Your HTML here -->
    </div>`;
    break;
```

**Step 3**: Update `PayslipDesigner.jsx`
```javascript
const sectionTypeConfig = {
    // ... existing types
    'custom-section': [
        { label: 'Title', key: 'title', type: 'text' },
        { label: 'Custom Field', key: 'customField', type: 'text' }
    ]
}
```

### 2. Adding New Placeholders

**Step 1**: Update `payslipUtils.js`
```javascript
export const PAYSLIP_PLACEHOLDERS = [
    // ... existing placeholders
    { 
        name: '{{NEW_FIELD}}', 
        description: 'Field description',
        category: 'Category Name',
        essential: false  // true if required
    }
];
```

**Step 2**: Update essential validation (if applicable)
```javascript
export const checkMissingEssentialPlaceholders = (html) => {
    const extractedPlaceholders = extractPlaceholders(html);
    const essential = [
        '{{GROSS}}', 
        '{{TOTAL_DEDUCTIONS}}', 
        '{{NET_PAY}}',
        '{{NEW_FIELD}}'  // Add if essential
    ];
    return essential.filter(ph => !extractedPlaceholders.includes(ph));
};
```

**Step 3**: Update sample data
```javascript
export const getSamplePayslipData = () => {
    return {
        // ... existing data
        'NEW_FIELD': 'Sample Value'
    };
};
```

### 3. Customizing Colors & Fonts

**Edit A4 Preview Styling** in `convertDesignToHTML()`:
```javascript
<style>
    body { 
        font-family: 'Your Font Here', sans-serif; 
        color: #333;
    }
    .payslip-container {
        background: #ffffff;
        border: 1px solid #e0e0e0;
    }
    /* More CSS here */
</style>
```

### 4. Extending Editor Properties

**Add new input type** in `PayslipDesigner.jsx`:
```javascript
{field.type === 'custom-type' && (
    <textarea
        rows={4}
        value={selectedSection.content[field.key] || ''}
        onChange={(e) => handleFieldChange(field.key, e.target.value)}
        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
    />
)}
```

### 5. Adding Validation Rules

**Edit `PayslipBuilder.jsx`**:
```javascript
const handleSaveTemplate = async () => {
    // Add custom validation
    if (someCondition) {
        message.warning('Your validation message');
        return;
    }
    
    // ... rest of save logic
};
```

## Component Prop Reference

### PayslipBuilder Props
```javascript
<PayslipBuilder 
    onClose={Function}              // Required: Called when user closes
    templateId={String}             // Optional: For editing existing
    initialTemplateName={String}    // Optional: Pre-fill name
/>
```

### PayslipPreview Props
```javascript
<PayslipPreview 
    sections={Array}  // Array of section objects
/>
```

### PayslipDesigner Props
```javascript
<PayslipDesigner 
    selectedSectionId={String}
    onSelectSection={Function}
    onUpdateSection={Function}
    onDeleteSection={Function}
    sections={Array}
/>
```

### PayslipLayerPanel Props
```javascript
<PayslipLayerPanel 
    sections={Array}
    selectedSectionId={String}
    onSelectSection={Function}
    onAddSection={Function}
    onDeleteSection={Function}
    onDuplicateSection={Function}
    onReorderSection={Function}
    onRestoreDefaults={Function}
/>
```

## State Management Guide

### PayslipBuilder State
```javascript
const [sections, setSections] = useState([])           // All sections
const [selectedSectionId, setSelectedSectionId] = useState(null)  // Active
const [templateName, setTemplateName] = useState('')   // Template name
const [showNameInput, setShowNameInput] = useState(false)
const [saving, setSaving] = useState(false)
const [loading, setLoading] = useState(false)
```

### Section Object Structure
```javascript
{
    id: 'unique-id',
    type: 'header|text-section|earnings-section|deductions-section|net-pay-section|attendance-section',
    order: 1,  // Display order
    content: {
        // Varies by type
        title?: String,
        subtitle?: String,
        items?: Array,
        padding?: Number,
        fontSize?: Number,
        textColor?: String,
        backgroundColor?: String,
        textAlign?: String,
        // ... more fields
    }
}
```

## API Integration

### Save Template
```javascript
// POST /payslip-templates
const payload = {
    name: "Template Name",
    htmlContent: "<html>...</html>",
    templateType: "CUSTOM",
    isActive: true,
    isDefault: false
};

await api.post('/payslip-templates', payload);
```

### Update Template
```javascript
// PUT /payslip-templates/:id
await api.put(`/payslip-templates/${templateId}`, payload);
```

### Fetch All Templates
```javascript
// GET /payslip-templates
const res = await api.get('/payslip-templates');
const templates = res.data.data;
```

## Utility Functions Reference

### payslipUtils.js Exports

#### `extractPlaceholders(text: String): Array<String>`
Extracts all `{{PLACEHOLDER}}` from text
```javascript
const placeholders = extractPlaceholders("Hello {{NAME}}, your {{SALARY}} is...");
// Returns: ["{{NAME}}", "{{SALARY}}"]
```

#### `convertDesignToHTML(sections: Array): String`
Converts section array to full HTML
```javascript
const html = convertDesignToHTML(sections);
// Returns: Full <!DOCTYPE html>...</html>
```

#### `replacePlaceholdersWithData(html: String, data: Object): String`
Replaces placeholders with actual values
```javascript
const html = "Salary: {{BASIC}}";
const data = { 'BASIC': '50000' };
const result = replacePlaceholdersWithData(html, data);
// Returns: "Salary: 50000"
```

#### `checkMissingEssentialPlaceholders(html: String): Array<String>`
Returns missing essential placeholders
```javascript
const missing = checkMissingEssentialPlaceholders(html);
// Returns: ["{{GROSS}}", "{{NET_PAY}}"]
```

#### `getSamplePayslipData(): Object`
Returns dummy data for preview
```javascript
const data = getSamplePayslipData();
// {EMPLOYEE_NAME: "John Doe", BASIC: "50,000", ...}
```

#### `getDefaultPayslipDesign(): Object`
Returns default section structure
```javascript
const design = getDefaultPayslipDesign();
// Configuration object with 6 default sections
```

## CSS Classes Used

### Tailwind CSS Classes
- Layout: `flex`, `grid`, `w-full`, `h-full`, `gap-*`, `p-*`
- Colors: `bg-white`, `text-slate-900`, `border-slate-200`
- Effects: `rounded-lg`, `shadow-sm`, `hover:bg-blue-50`
- Typography: `font-bold`, `text-sm`, `uppercase`
- Responsive: `md:grid-cols-2`, `lg:grid-cols-3`

### Custom Styles (in HTML generation)
```css
.payslip-container { width: 210mm; height: 297mm; }
.section { margin-bottom: 20px; }
.table-section table { width: 100%; border-collapse: collapse; }
.net-pay-box { background: #2563eb; color: white; padding: 15px; }
@media print { /* Print-specific styles */ }
```

## Debugging Tips

### 1. Check Section State
```javascript
console.log('Current sections:', sections);
console.log('Selected section:', sections.find(s => s.id === selectedSectionId));
```

### 2. Verify HTML Generation
```javascript
const html = convertDesignToHTML(sections);
console.log('Generated HTML:', html);
// Copy entire HTML and test in separate HTML file
```

### 3. Check Placeholder Extraction
```javascript
const html = convertDesignToHTML(sections);
const placeholders = extractPlaceholders(html);
console.log('Extracted placeholders:', placeholders);
```

### 4. Test Preview Data Replacement
```javascript
const html = convertDesignToHTML(sections);
const sampleData = getSamplePayslipData();
const preview = replacePlaceholdersWithData(html, sampleData);
console.log('Preview HTML:', preview);
```

## Performance Optimization

### Memoization
Already implemented in `PayslipPreview.jsx`:
```javascript
const previewHTML = useMemo(() => {
    // Expensive calculation
}, [sections]);
```

### To Add More:
```javascript
const memoizedSections = useMemo(() => 
    sections.sort((a, b) => a.order - b.order),
    [sections]
);
```

## Accessibility Considerations

### Labels for Inputs
```javascript
<label className="text-xs font-medium text-slate-600 block mb-1">
    Field Name
</label>
```

### ARIA Attributes (Future)
```javascript
<button aria-label="Delete section" onClick={...}>
    <Trash2 size={18} />
</button>
```

### Keyboard Navigation (TODO)
- Tab through sections
- Arrow keys for reordering
- Delete/Enter for actions

## Common Issues & Solutions

### Issue: State not updating immediately
**Solution**: Use functional setState
```javascript
setSections(prev => [...prev, newSection]);
```

### Issue: Styles not applying
**Solution**: Check Tailwind is imported in parent
```javascript
import 'tailwindcss/tailwind.css';
```

### Issue: Placeholder not showing in preview
**Solution**: Verify exact format: `{{UPPERCASE_NAME}}`
```javascript
// ❌ Wrong: {{Employee_Name}}, {{employee_name}}
// ✅ Correct: {{EMPLOYEE_NAME}}
```

### Issue: HTML too long for storage
**Solution**: Compress or split sections (not recommended - just store as-is)

### Issue: Items not persisting after edit
**Solution**: Spread operator needed
```javascript
const updated = {
    ...selectedSection,
    content: {
        ...selectedSection.content,
        items: newItems  // This spreads the entire object
    }
};
```

## Browser Compatibility

- ✅ Chrome/Edge (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)
- ⚠️ IE 11 (Not tested - uses ES6)

## Testing Examples

### Unit Test Example
```javascript
describe('payslipUtils', () => {
    it('should extract placeholders', () => {
        const text = "Hello {{NAME}}";
        const result = extractPlaceholders(text);
        expect(result).toEqual(['{{NAME}}']);
    });

    it('should convert design to HTML', () => {
        const sections = getDefaultPayslipDesign().sections;
        const html = convertDesignToHTML(sections);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html>');
    });
});
```

### Integration Test
```javascript
it('should save and retrieve custom template', async () => {
    const template = {
        name: 'Test Template',
        htmlContent: '<h1>Test</h1>',
        templateType: 'CUSTOM'
    };
    
    const res = await api.post('/payslip-templates', template);
    expect(res.status).toBe(201);
    expect(res.data.templateType).toBe('CUSTOM');
});
```

---

**Happy Building! 🎨**

For additional help, refer to `CUSTOM_PAYSLIP_BUILDER_GUIDE.md`
