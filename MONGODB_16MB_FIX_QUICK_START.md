# MongoDB 16MB Fix - Quick Start Guide

## 🚀 What Changed?

The Career Page Builder now uses **3 separate MongoDB collections** instead of storing everything in one document:

### Old Architecture (❌ Problem)
```
CompanyProfile.meta.careerCustomization = {
  sections: [...huge arrays...],
  seoSettings: {...},
  theme: {...},
  images: [base64 encoded...],  // 500KB+ per image!
}
// Total: 16+ MB → EXCEEDS 16MB BSON LIMIT
```

### New Architecture (✅ Solution)
```
CareerSection collection    (sections < 2MB each)
CareerSEO collection        (metadata < 5KB)
CareerLayout collection     (theme config < 100KB)
// Total: < 2.2 MB → Well under 16MB limit
```

## 📝 For Developers

### 1. **Backend - New Routes**

All career endpoints are now at `/api/career/`:

```javascript
// Save SEO settings
POST /api/career/seo/save
Body: {
  seoTitle: "...",
  seoDescription: "...",
  seoKeywords: ["..."],
  seoSlug: "...",
  seoOgImageUrl: "https://...",  // URL, NOT base64!
  seoOgImageName: "..."
}

// Save sections
POST /api/career/sections/save
Body: {
  sections: [{id, type, content, order}],
  theme: {primaryColor: "#..."}
}

// Get draft data
GET /api/career/draft
Returns: {sections, seoSettings, theme}

// Publish (merges all 3 collections)
POST /api/career/publish
Returns: {success, metaTags, documentSizeMB}

// Public display
GET /api/career/public/:tenantId
Returns: {customization, seoSettings, metaTags}
```

### 2. **Database Models**

Three new Mongoose models available:

```javascript
// Import in controllers
const CareerSection = require('../models/CareerSection');
const CareerSEO = require('../models/CareerSEO');
const CareerLayout = require('../models/CareerLayout');

// Query examples
const sections = await CareerSection.find({
  tenantId, companyId, isDraft: true
});

const seo = await CareerSEO.findOne({
  tenantId, companyId
});

const layout = await CareerLayout.findOne({
  tenantId, companyId
});
```

### 3. **Payload Validation**

All `/api/career/*` endpoints validate payloads:

```javascript
// Automatically rejects payloads > 10MB
// Auto-strips large objects (previews, screenshots, base64)
// Returns helpful error with actual size

const payloadValidator = require('../middleware/payloadValidator');
router.post('/endpoint', payloadValidator(10), controller.handler);
```

### 4. **Image Handling**

Images must be stored as URLs (never Base64):

```javascript
const imageHandler = require('../utils/imageHandler');

// Convert Base64 to file + URL
const result = await imageHandler.saveImageAsUrl(
  'data:image/jpeg;base64,...',  // Base64 input
  tenantId,
  'og-image'
);
console.log(result);
// {
//   imageUrl: '/uploads/career-images/tenant-123/og-image.jpg',
//   imageName: 'og-image-1234567890-abcd.jpg',
//   imagePath: '/full/path/to/file',
//   sizeInMB: '0.45'
// }

// Validate image size
await imageHandler.validateImageSize('data:image/jpeg;base64,...');

// Cleanup unused images
await imageHandler.cleanupUnusedImages(tenantId, [activeImageUrls]);

// Convert entire config
const converted = await imageHandler.convertConfigImagesToUrls(
  config,
  tenantId
);
// {config, processedImages[], imageCount}
```

## 🎨 For Frontend Developers

### Using New CareerBuilder Endpoints

```javascript
// Save SEO (after user changes in SEO panel)
await api.post('/api/career/seo/save', {
  seoTitle: config.seoSettings.seo_title,
  seoDescription: config.seoSettings.seo_description,
  seoKeywords: config.seoSettings.seo_keywords,
  seoSlug: config.seoSettings.seo_slug,
  seoOgImageUrl: config.seoSettings.seo_og_image,
  seoOgImageName: config.seoSettings.seo_og_image_name
});

// Save sections (after user edits)
await api.post('/api/career/sections/save', {
  sections: config.sections,
  theme: config.theme
});

// Publish (merge from 3 collections)
await api.post('/api/career/publish');

// Load draft for editing
const draft = await api.get('/api/career/draft');

// Load public page
const page = await api.get(`/api/career/public/${tenantId}`);
// Returns: {customization, seoSettings, metaTags}
```

### Image Upload in Frontend

When user uploads image in SEO editor:

```javascript
// Instead of storing Base64:
// seo_og_image: "data:image/jpeg;base64,..." ❌

// Upload to backend and store URL:
const formData = new FormData();
formData.append('file', imageFile);

const result = await api.post('/api/career/upload', formData);
// Then store: seo_og_image: result.data.imageUrl ✅
```

## 🔍 Monitoring & Debugging

### Check Payload Sizes

Middleware logs all payload sizes:

```
📊 Payload size: 0.45MB (limit: 10MB)
✅ Payload cleaned and within limits
```

### Check Document Sizes

Publish endpoint returns document size:

```json
{
  "success": true,
  "message": "Career page published live...",
  "documentSizeMB": "1.23"
}
```

### Verify Installation

Run verification script:

```bash
node backend/scripts/verify-16mb-fix.js
```

Expected output:
```
✅ SEO Settings Save
✅ Sections Save
✅ Draft Data Fetch
✅ Career Page Publish
✅ Public Career Page Fetch

Results: 5 passed, 0 failed
✅ All endpoints are properly configured!
```

## 📚 File Reference

### New Files (Created)
```
backend/models/CareerSection.js
backend/models/CareerSEO.js
backend/models/CareerLayout.js
backend/controllers/career-optimized.controller.js
backend/routes/career-optimized.routes.js
backend/middleware/payloadValidator.js
backend/utils/imageHandler.js
backend/scripts/verify-16mb-fix.js
```

### Modified Files
```
backend/app.js                           (added new routes)
frontend/src/pages/HR/CareerBuilder/CareerBuilder.jsx
frontend/src/pages/PublicCareerPage.jsx
```

## ✅ Validation Checklist

Before deploying:

- [ ] All models imported in controller
- [ ] Payload validator applied to POST routes
- [ ] Image handler available in utils
- [ ] New routes registered in app.js
- [ ] CareerBuilder frontend uses new endpoints
- [ ] PublicCareerPage fetches from new endpoint
- [ ] No console errors on Publish Live
- [ ] Document size < 16MB in publish response
- [ ] Verification script returns all passed

## 🚨 Common Issues

### Issue: "Endpoint not found"
**Solution:** Check that routes are registered in `app.js`:
```javascript
const careerOptimizedRoutes = require('./routes/career-optimized.routes');
app.use('/api/career', careerOptimizedRoutes);
```

### Issue: "Tenant ID required"
**Solution:** Include tenant middleware. Check `getTenantFromRequest` in route file.

### Issue: "Payload exceeds limit"
**Solution:** Remove large images or base64 data before sending. Middleware will auto-strip.

### Issue: "Cannot publish without complete SEO"
**Solution:** Verify SEO Settings panel has all required fields filled.

## 📞 Support

For issues or questions:
1. Check console logs for detailed error messages
2. Run verification script to confirm endpoints
3. Review MONGODB_16MB_FIX_COMPLETE.md for architecture details
4. Check individual model files for schema validation rules

---

**Version:** 1.0
**Last Updated:** 2024
**Status:** Production Ready ✅
