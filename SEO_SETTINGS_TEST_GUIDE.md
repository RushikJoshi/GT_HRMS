# SEO Settings Feature - Quick Test Guide

## Pre-Flight Checklist

Before testing, ensure:
- [ ] Backend server is running on http://localhost:3001
- [ ] Frontend dev server is running on http://localhost:5173
- [ ] Database has at least one company with tenant ID

## Testing Workflow

### Step 1: Navigate to Career Builder
1. Go to HR Dashboard
2. Click on "Career Page Builder"
3. Verify page loads with existing career configuration

### Step 2: Test SEO Settings Panel
1. Click the **"🔍 SEO Settings"** button in the toolbar
2. Verify the right panel switches from "Editor" to SEO form
3. Verify button has purple highlight when active
4. Click again to toggle back to Editor panel

### Step 3: Test SEO Field Validation

#### Test Title Field
```
Action: Type more than 70 characters
Result: Should see error "SEO title must be maximum 70 characters"
Verify: Save button is disabled
```

#### Test Description Field
```
Action: Type more than 160 characters  
Result: Should see error "SEO description must be maximum 160 characters"
Verify: Save button is disabled
```

#### Test Slug Field
```
Actions (all should show error):
- Slug with uppercase: "Careers-Page" → Error: "Slug can only contain..."
- Slug with spaces: "my careers" → Error: "Slug can only contain..."
- Slug with special chars: "careers!" → Error: "Slug can only contain..."

Action: Valid slug "careers-page"
Result: No error, slug accepted
```

#### Test Keywords
```
Action: Type "career" and press Enter
Result: Keyword added as a tag below input
Action: Type "jobs" and press comma
Result: Keyword added as a tag below input
Action: Click X on keyword tag
Result: Keyword removed
```

#### Test OG Image Upload
```
Action: Click upload area and select image file
Result: 
- Image preview shows
- Base64 string stored internally
- No errors in console
```

### Step 4: Test Live Preview Modal
```
Action: Click "Preview SEO" button
Result: Modal opens showing:
- Title as it appears in Google search
- Description underneath
- URL with slug
Action: Modify fields and click preview again
Result: Preview updates immediately
```

### Step 5: Test Save Functionality
```
Step 1: Fill in SEO fields (all required)
  - Title: "Join Our Amazing Team"
  - Description: "Explore exciting career opportunities at our company"
  - Keywords: Add "jobs", "career", "hiring"
  - Slug: "careers"
  - OG Image: Upload a company image

Step 2: Click "Save SEO Settings"
Expected:
  - Button shows loading spinner
  - Toast message appears: "SEO settings saved"
  - Data persists when refreshing page
  - Backend logs: "Career page customization saved"
```

### Step 6: Test Publish Validation

#### Scenario A: Missing Required Fields
```
Step 1: Clear the SEO Title field
Step 2: Click "Publish Live"
Expected:
  - Warning toast: "SEO fields are required before publishing"
  - Right panel auto-toggles to SEO Settings
  - Publish is blocked
```

#### Scenario B: All Fields Complete
```
Step 1: Fill all SEO fields with valid data
Step 2: Click "Publish Live"
Expected:
  - Publishing spinner appears
  - Success toast: "Career Page Published Live with SEO Meta Tags!"
  - Backend generates meta tags
  - Database updates with metaTags object
```

### Step 7: Test Public Career Page

#### Verify Meta Tags in Browser
```
Step 1: Copy the tenant ID from localStorage
Step 2: Open new tab and go to: http://localhost:5173/careers/{tenantId}
Step 3: Open DevTools (F12)
Step 4: Go to Elements tab
Step 5: In <head> section, verify meta tags exist:
  - <title>Join Our Amazing Team</title>
  - <meta name="description" content="Explore exciting...">
  - <meta name="keywords" content="jobs, career, hiring">
  - <meta property="og:title" content="Join Our...">
  - <meta property="og:image" content="...">
  - <link rel="canonical" href="...">
```

#### Test Career Page Rendering
```
Action: Load http://localhost:5173/careers/{tenantId}
Expected:
  - Career page displays with all sections (hero, openings, etc)
  - Jobs list populated correctly
  - No console errors
  - Page title in tab shows: "Join Our Amazing Team"
```

#### Test Social Media Preview
For real-world testing:
```
1. Facebook Share Debugger:
   - Go to https://developers.facebook.com/tools/debug/
   - Enter: http://localhost:5173/careers/{tenantId}
   - Verify og:title, og:image, description show correctly

2. LinkedIn Inspector:
   - Go to https://www.linkedin.com/feed/
   - Try to share the link
   - Verify preview shows correct info

3. WhatsApp Web:
   - Open WhatsApp Web (web.whatsapp.com)
   - Share the link in a chat
   - Verify thumbnail and title appear
```

### Step 8: Test "View Live Page" Button
```
Action: In Career Builder, click "View Live Page" button
Expected:
  - New tab opens with: /careers/{tenantId}
  - Page loads correctly
  - SEO meta tags injected
```

## Expected Console Output

### Browser Console
```
[Good signs]
- No errors or warnings
- Page renders smoothly
- Meta tags properly injected

[Bad signs]
- Any red errors
- "Cannot read property..." messages
- API 404/500 errors
```

### Backend Console
```
[Good signs]
When saving:
✅ Career page customization saved
✅ Saved to draft

When publishing:
✅ Career page PUBLISHED (Atomic)
✅ Meta tags generated successfully
✅ Storing in both draft and live

[Bad signs]
❌ Missing Tenant ID
❌ Company not found
❌ Error saving to database
```

## API Response Verification

### Test Save Response
```bash
curl -X POST http://localhost:3001/api/hrms/hr/career/customize \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sections": [...],
    "theme": {...},
    "seoSettings": {
      "seo_title": "...",
      "seo_description": "...",
      "seo_keywords": [...],
      "seo_slug": "...",
      "seo_og_image": "..."
    }
  }'

Expected Response:
{
  "success": true,
  "message": "Career page customization saved",
  "config": {...}
}
```

### Test Publish Response
```bash
curl -X POST http://localhost:3001/api/hrms/hr/career/publish \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{...same as above...}'

Expected Response:
{
  "success": true,
  "message": "Career page published successfully with SEO meta tags",
  "livePage": {...},
  "metaTags": {
    "title": "Join Our Team",
    "description": "...",
    "keywords": "...",
    "metaTags": {
      "title": "<title>Join Our Team</title>",
      "description": "<meta name=\"description\"...>",
      ...all HTML meta tags
    }
  },
  "publishedAt": "2024-..."
}
```

### Test Public API Response
```bash
curl http://localhost:3001/api/public/career-customization/{tenantId}

Expected Response:
{
  "sections": [...],
  "theme": {...},
  "seoSettings": {...},
  "metaTags": {
    "title": "...",
    "description": "...",
    "keywords": "...",
    "metaTags": {
      "title": "<title>...</title>",
      ...HTML meta tags...
    }
  },
  "publishedAt": "...",
  "isPublished": true
}
```

## Performance Testing

- [ ] Page loads in < 2 seconds
- [ ] Typing in fields has no lag
- [ ] Save operation completes in < 1 second
- [ ] Publish operation completes in < 2 seconds
- [ ] Public career page loads in < 1.5 seconds
- [ ] No memory leaks (check DevTools Memory tab)

## Responsive Design Testing

Test on:
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

Verify:
- [ ] SEO form fields are readable
- [ ] Buttons are touch-friendly
- [ ] Image preview displays properly
- [ ] Live preview modal works on mobile
- [ ] Public career page is responsive

## Accessibility Testing

Using keyboard only:
- [ ] Tab through all fields
- [ ] Can activate buttons with Enter
- [ ] Can open/close modal with keyboard
- [ ] Form validation messages are announced

Using screen reader (NVDA/JAWS):
- [ ] Form labels are read correctly
- [ ] Error messages are announced
- [ ] Modal title is announced when opened
- [ ] All buttons have descriptive labels

## Data Persistence Testing

```
After saving SEO:
1. Refresh page (F5)
2. SEO data should still be visible
3. Check backend: draftCareerPage should have seoSettings

After publishing:
1. Refresh page
2. Check backend: careerCustomization should have metaTags
3. Visit public page and verify meta tags in head
```

## Error Scenarios Testing

```
Test 1: Missing Tenant ID
- Result: Should show error "Career page not found"

Test 2: Invalid file upload
- Result: Should show error message

Test 3: Network error during save
- Result: Toast with "Failed to save SEO settings"

Test 4: Empty keyword field when pressing Enter
- Result: Should not add empty keyword

Test 5: Too many keywords
- Result: Should accept but display as tags (no limit enforced currently)
```

## Rollback Procedure (if needed)

If issues occur:

1. **Frontend Issues**: 
   - Clear browser cache (Ctrl+Shift+Delete)
   - Restart dev server (`npm run dev`)
   - Check console for errors

2. **Backend Issues**:
   - Check database for corruption
   - Restart backend server
   - Check logs in `/logs` directory

3. **Database Issues**:
   - Backup current database
   - Remove invalid meta documents
   - Retry save/publish operations

## Success Criteria

✅ **All of the following must be true:**

1. SEO fields accept input without errors
2. Validation rules are enforced
3. Fields save to database correctly
4. Publish requires all SEO fields
5. Meta tags generate correctly
6. Meta tags inject into public page <head>
7. Social media crawlers see correct preview
8. No JavaScript console errors
9. No backend console errors
10. Public page loads and displays correctly
11. "View Live Page" button opens correct URL
12. All features work on mobile

---

**When all tests pass, the feature is ready for production deployment!**
