# SEO Settings - Quick Testing Guide

## 🚀 Quick Start Testing (5 minutes)

### Test 1: Save SEO Settings to Draft
```bash
1. Open Career Builder page
2. Click "SEO Settings" button
3. Fill in the form:
   - Title: "Join Our Amazing Company"
   - Description: "Explore great career opportunities"
   - Keywords: Add "jobs", "careers", "opportunities"
   - Slug: "careers"
   - Image: (optional)
4. Click "Save to Draft"
5. ✅ Expected: Green success message
```

### Test 2: Publish and Generate Meta Tags
```bash
1. Click "Publish Live" button
2. ✅ Expected: 
   - Green success: "Career Page Published Live with SEO Meta Tags!"
   - No errors in browser console
```

### Test 3: Verify SEO on Live Page
```bash
1. Open browser DevTools (F12)
2. Go to Elements / Inspector tab
3. Find the <head> section
4. ✅ Expected to see:
   - <title>Join Our Amazing Company</title>
   - <meta name="description" content="Explore great career opportunities">
   - <meta property="og:title" content="Join Our Amazing Company">
   - <meta property="og:description" content="Explore great career opportunities">
   - <meta name="twitter:card" content="summary_large_image">
   - <link rel="canonical" href="...">
```

### Test 4: Browser Tab Title
```bash
1. Visit the public career page: /careers/{tenantId}
2. ✅ Expected: Browser tab shows "Join Our Amazing Company"
```

---

## 🔍 Detailed Testing Scenarios

### Scenario A: Complete Flow (15 minutes)

#### Setup
```
Prerequisites:
- Career page builder accessible
- User has HR role
- Database is working
- Backend API running
```

#### Steps
```
1. Navigate to Career Builder
   └─ URL: /hr/career-builder

2. Add Career Page Content
   └─ Add sections (Hero, About, Jobs, etc.)
   └─ Click Save

3. Configure SEO Settings
   └─ Click "SEO Settings" toggle
   └─ Form appears
   
4. Fill SEO Form
   └─ Title: "Software Engineer Jobs - TechCorp"
   └─ Description: "Join our engineering team and build amazing products"
   └─ Keywords: "engineer", "jobs", "hiring", "techjobs"
   └─ Slug: "software-engineer-jobs"
   └─ Image: Upload company logo
   
5. Validate Constraints
   └─ Title shows: "54 / 70 characters" ✓
   └─ Description shows: "85 / 160 characters" ✓
   └─ No validation errors
   
6. Save to Draft
   └─ Click "Save" button
   └─ Network request: POST /api/career/customize
   └─ Response: 200 OK
   └─ Message: "SEO settings saved to draft"
   
7. Refresh Page
   └─ SEO Settings still populated ✓
   └─ No data loss ✓
   
8. Publish to Live
   └─ Click "Publish Live"
   └─ Network request: POST /api/career/publish
   └─ Response includes: { metaTags: { ... } }
   └─ Message: "Career Page Published Live with SEO Meta Tags!"
   
9. Visit Public Page
   └─ Open new tab: http://localhost:3000/careers/{tenantId}
   
10. Inspect Meta Tags
    └─ DevTools → Elements → Head
    └─ Search for: data-seo-tag="true"
    └─ Verify all tags present:
        ✓ <title>
        ✓ <meta name="description">
        ✓ <meta name="keywords">
        ✓ <meta property="og:title">
        ✓ <meta property="og:description">
        ✓ <meta property="og:image">
        ✓ <meta property="og:type">
        ✓ <meta property="og:url">
        ✓ <meta name="twitter:card">
        ✓ <link rel="canonical">
    
11. Verify Browser Title
    └─ Tab title shows: "Software Engineer Jobs - TechCorp"
    └─ Not "React App" or generic name ✓
```

---

### Scenario B: Fallback Testing (10 minutes)

#### Purpose
Test that meta tags are generated even without pre-generated HTML strings

#### Steps
```
1. Edit career page (don't save properly)
   └─ This ensures seoSettings exist but no metaTags

2. Open Database Browser
   └─ Check meta.careerCustomization
   └─ Verify: seoSettings exists but metaTags might be missing

3. Visit Public Page
   └─ Open /careers/{tenantId}

4. Check Meta Tags
   └─ DevTools → Elements
   └─ Meta tags should still appear ✓
   └─ Generated from fallback logic in PublicCareerPage.jsx

5. Verify Correctness
   └─ All tags contain correct values
   └─ Titles match seoSettings.seo_title
   └─ Descriptions match seoSettings.seo_description
```

---

### Scenario C: Update and Re-publish (10 minutes)

#### Purpose
Verify that meta tags update on subsequent publishes

#### Steps
```
1. Go back to Career Builder
   └─ SEO Settings should still show old values

2. Change SEO Settings
   └─ New Title: "Updated Career Opportunities"
   └─ New Description: "New and improved job listings"
   └─ Save to Draft

3. Publish Again
   └─ Click "Publish Live"

4. Visit Public Page Again
   └─ Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

5. Verify Updated Tags
   └─ DevTools → Elements → Head
   └─ Title should be: "Updated Career Opportunities"
   └─ Description should be: "New and improved job listings"
   └─ Old values not present ✓
```

---

### Scenario D: Validation Testing (10 minutes)

#### Purpose
Verify all validation rules work correctly

#### Tests

**Test D1: Title Length**
```
1. Enter title with 100+ characters
2. Try to save
3. ✅ Expected: Error "Title must be less than 70 characters"
4. Shorten to 65 characters
5. ✅ Save should work
```

**Test D2: Description Length**
```
1. Enter description with 200+ characters
2. Try to save
3. ✅ Expected: Error "Description must be less than 160 characters"
4. Shorten to 150 characters
5. ✅ Save should work
```

**Test D3: Slug Validation**
```
Valid slugs:
  ✓ careers
  ✓ software-engineer-jobs
  ✓ jobs-2024
  
Invalid slugs (should show error):
  ✗ careers (uppercase C)
  ✗ careers page (space)
  ✗ careers! (special chars)
  ✗ CAREERS (uppercase)
```

**Test D4: Required Fields**
```
1. Leave Title empty
2. Try to publish
3. ✅ Expected: Error at publish (validation in CareerBuilder)
4. Or show warning to fill SEO before publish
```

---

### Scenario E: Network Inspection (10 minutes)

#### Purpose
Verify correct API calls and responses

#### Steps

**Request 1: Save to Draft**
```
1. Open DevTools → Network
2. Fill SEO form and click Save
3. Find: POST /api/career/customize
4. Request Body should include:
   {
     ...otherContent,
     seoSettings: {
       seo_title: "...",
       seo_description: "...",
       seo_keywords: [...],
       seo_slug: "...",
       seo_og_image: "..."
     }
   }
5. Response should be:
   {
     message: "Draft saved successfully",
     data: {...}
   }
6. ✅ Status: 200
```

**Request 2: Publish**
```
1. DevTools → Network → Clear
2. Click "Publish Live"
3. Find: POST /api/career/publish
4. Request Body should include full config with seoSettings
5. Response should include:
   {
     success: true,
     message: "Career page published successfully with SEO meta tags",
     metaTags: {
       title: "...",
       description: "...",
       keywords: "...",
       ogTitle: "...",
       ogDescription: "...",
       ogImage: "...",
       canonical: "...",
       metaTags: {
         title: "<title>...</title>",
         description: "<meta name=\"description\" ...>",
         ... all HTML tags ...
       }
     }
   }
6. ✅ Status: 200
7. ✅ metaTags is populated with HTML strings
```

**Request 3: Fetch Public Page**
```
1. DevTools → Network
2. Navigate to /careers/{tenantId}
3. Find: GET /api/public/career-customization/{tenantId}
4. Response should have:
   {
     customization: {...},
     seoSettings: {
       seo_title: "...",
       seo_description: "...",
       ...
     },
     metaTags: {
       title: "...",
       description: "...",
       metaTags: {
         title: "<title>...</title>",
         ...
       }
     }
   }
5. ✅ Status: 200
6. ✅ Both seoSettings and metaTags present
```

---

### Scenario F: Security Testing (10 minutes)

#### Purpose
Verify XSS protection and HTML escaping

#### Tests

**Test F1: Special Characters in Title**
```
1. Enter title with special chars: "Test & <Script> Title"
2. Save and publish
3. Visit public page
4. DevTools → Elements → Search for <title>
5. ✅ Should see: "Test &amp; &lt;Script&gt; Title"
6. ✅ NO unescaped < or > characters
7. ✅ Browser console: NO JavaScript errors
```

**Test F2: HTML Tags in Description**
```
1. Enter description: "Great role! <script>alert('xss')</script>"
2. Save and publish
3. View page source
4. ✅ Should NOT execute JavaScript
5. ✅ Script tag should be escaped
6. ✅ Meta tag value properly quoted
```

**Test F3: Quotes in Values**
```
1. Title with quotes: 'My "Amazing" Job'
2. Save and publish
3. DevTools → Elements
4. Meta tags should display correctly
5. ✅ No broken attributes due to quotes
```

---

## 📊 Expected Meta Tags Output

When SEO settings are properly configured and published, you should see these meta tags on the public page:

```html
<head>
  <!-- Generated from seo_title -->
  <title>Software Engineer Jobs - TechCorp</title>
  
  <!-- Generated from seo_description -->
  <meta name="description" content="Join our engineering team and build amazing products">
  
  <!-- Generated from seo_keywords -->
  <meta name="keywords" content="engineer, jobs, hiring, techjobs">
  
  <!-- Open Graph Tags -->
  <meta property="og:title" content="Software Engineer Jobs - TechCorp">
  <meta property="og:description" content="Join our engineering team and build amazing products">
  <meta property="og:image" content="https://example.com/company-logo.jpg">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://careers.tenantId.com/software-engineer-jobs">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  
  <!-- Canonical Link -->
  <link rel="canonical" href="https://careers.tenantId.com/software-engineer-jobs">
  
  <!-- All tags have data-seo-tag="true" for identification -->
</head>
```

---

## ✅ Success Criteria Checklist

- [ ] SEO form appears and validates input
- [ ] Can save SEO settings to draft without errors
- [ ] Publish includes SEO validation
- [ ] Published page loads without JavaScript errors
- [ ] Browser tab shows correct SEO title
- [ ] All 10 meta tags appear in document head
- [ ] Meta tag values match SEO settings exactly
- [ ] Special characters are properly escaped
- [ ] Updating SEO and re-publishing updates meta tags
- [ ] Fallback generation works if metaTags missing
- [ ] Canonical URL is correct (includes tenant ID and slug)
- [ ] Network requests show correct payloads and responses
- [ ] No XSS vulnerabilities found
- [ ] Page loads quickly (< 2 seconds)

---

## 🐛 Troubleshooting

### Problem: Meta tags not appearing
```
Solutions:
1. Hard refresh page: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Check if page was published: Backend should have metaTags in response
3. Check database: meta.careerCustomization should have metaTags object
4. Open DevTools console: Look for JavaScript errors
5. Verify API endpoint returns both seoSettings and metaTags
```

### Problem: Title not updating in browser tab
```
Solutions:
1. Check if document.title = seo_title executed (add console.log)
2. Verify seo_title is being sent from backend
3. Check that <title> tag is in document head (DevTools)
4. Hard refresh: Ctrl+Shift+R
5. Check browser console for errors
```

### Problem: Validation errors on save
```
Solutions:
1. Ensure title < 70 characters
2. Ensure description < 160 characters
3. Ensure slug only has: a-z, 0-9, hyphens
4. Ensure all required fields filled
5. Check error message in UI for specific issue
```

### Problem: API returns 400 or 500 error
```
Solutions:
1. Open browser DevTools → Network
2. Click on failed request
3. Check Response tab for error message
4. Common errors:
   - Missing Tenant ID (check routes)
   - Database connection issue (check backend logs)
   - Invalid request format (check payload)
5. Check server logs for detailed error
```

---

## 📞 Support

If tests fail:
1. ✅ Run: `node validate-seo-implementation.js` (should return 30/30)
2. 📄 Review: [SEO_SETTINGS_FIX_COMPLETE.md](SEO_SETTINGS_FIX_COMPLETE.md)
3. 🔍 Check: Browser DevTools console for errors
4. 📊 Verify: Database has data in meta.careerCustomization
5. 🚀 Restart: Backend server and try again

---

**Last Updated:** 2024
**Status:** Ready for Testing ✅
