# SEO Settings Feature - Quick Deployment Guide

## Pre-Deployment Verification

```bash
# 1. Check all files exist
ls -la frontend/src/pages/HR/CareerBuilder/SEOSettings.jsx
ls -la frontend/src/pages/PublicCareerPage.jsx
ls -la backend/controllers/career.controller.js

# 2. Check for syntax errors
npm run lint      # Frontend
npm run build     # Build check

# 3. Verify no breaking changes
git diff          # Review all changes
```

## Deployment Steps

### 1. Code Preparation
```bash
cd GT_HRMS

# Ensure all changes are committed
git add .
git commit -m "Add SEO Settings feature to Career Page Builder"

# Push to staging branch first
git push origin develop
```

### 2. Backend Deployment
```bash
# Install dependencies (if any new ones)
cd backend
npm install

# Run tests
npm test

# Start backend in production mode
NODE_ENV=production npm start

# Verify no errors in logs
tail -f logs/app.log
```

### 3. Frontend Deployment
```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Verify build is successful
ls -la dist/

# Deploy dist folder to hosting
# (AWS S3, Netlify, Vercel, etc.)
```

### 4. Database
```bash
# No migrations needed!
# SEO settings stored in existing `meta` field
# With strict: false, automatically accepts new fields
```

### 5. Verify Deployment

```bash
# 1. Check frontend loads
curl http://your-domain.com/

# 2. Check Career Builder accessible
# Visit: https://your-domain.com/hrms/hr/career-builder

# 3. Check public career page accessible
# Visit: https://your-domain.com/careers/{tenantId}

# 4. Check API endpoint
curl https://your-api.com/api/public/career-customization/{tenantId}

# 5. Check meta tags injected
curl -s https://your-domain.com/careers/{tenantId} | grep -A1 "<meta name=\"description"
```

## Feature Activation

The feature is automatically active after deployment. HR users can:

1. Navigate to Career Page Builder
2. Click "🔍 SEO Settings" button
3. Fill in SEO fields
4. Click "Save SEO Settings"
5. Publish career page
6. View public page at `/careers/{tenantId}`

## Rollback Procedure (if needed)

```bash
# 1. Revert frontend
git revert <commit-hash>
npm run build
# Redeploy dist folder

# 2. Revert backend
git revert <commit-hash>
npm start

# 3. No database cleanup needed
# SEO fields simply won't be used, existing data stays
```

## Monitoring Post-Deployment

### Check Logs
```bash
# Backend logs
tail -f backend/logs/app.log | grep -E "SEO|metaTags|publishCustomization"

# Frontend errors
# Check browser console for any errors
# Check Sentry/error tracking service
```

### Performance Metrics
- Monitor API response times for:
  - `POST /hrms/hr/career/customize` - Should be < 1s
  - `POST /hrms/hr/career/publish` - Should be < 2s
  - `GET /api/public/career-customization/:tenantId` - Should be < 500ms

### User Acceptance Testing
- [ ] HR user can access SEO Settings
- [ ] SEO fields save correctly
- [ ] Publish validation works
- [ ] Public page displays
- [ ] Meta tags visible in DevTools
- [ ] Social media preview shows correct info

## Configuration Needed

None! The feature works out of the box with existing configuration.

## Environment Variables

No new environment variables needed.

## Third-Party Dependencies

No new dependencies added.

## Database Schema Changes

None! Works with existing schema.

## API Endpoint Summary

```
POST /hrms/hr/career/customize     ← Save draft (includes SEO)
POST /hrms/hr/career/publish       ← Publish (generates meta tags)
GET  /api/public/career-customization/:tenantId  ← Get public page
```

## Troubleshooting Common Issues

### Issue: SEO button not visible
**Solution:** 
- Clear browser cache (Ctrl+Shift+Delete)
- Restart dev server
- Check CareerBuilder.jsx has SEOSettings import

### Issue: Meta tags not injecting
**Solution:**
- Check PublicCareerPage.jsx is imported in RootRouter
- Verify route `/careers/:tenantId` exists
- Check browser console for API errors

### Issue: Save fails with 404
**Solution:**
- Verify backend is running
- Check API endpoint path in PublicCareerPage.jsx
- Ensure tenantId is correct

### Issue: Publish validation not working
**Solution:**
- Clear localStorage
- Refresh page
- Check CareerBuilder.jsx handlePublish function

### Issue: Meta tags visible in source but not in DevTools
**Solution:**
- This is normal for dynamically injected tags
- Check Network tab → Document → head element
- Use View Page Source (Ctrl+U) to see injected tags

## Success Indicators

After deployment, verify:
- ✅ No JavaScript errors in console
- ✅ No 404 errors for routes
- ✅ No API errors (status 500)
- ✅ SEO Settings panel opens
- ✅ Fields accept input without errors
- ✅ Save/Publish completes successfully
- ✅ Public page loads
- ✅ Meta tags visible in DevTools
- ✅ Social preview shows correct info
- ✅ Performance metrics acceptable

## Rollback Indicators

Rollback if:
- ❌ 500 errors on API endpoints
- ❌ Career Page Builder crashes
- ❌ Meta tags break page rendering
- ❌ Database errors in logs
- ❌ Significant performance degradation

## Post-Deployment Checklist

- [ ] All code deployed successfully
- [ ] No errors in application logs
- [ ] Database synced correctly
- [ ] Frontend and backend communicating
- [ ] SEO Settings panel visible and functional
- [ ] Public career page renders correctly
- [ ] Meta tags injected into head
- [ ] Performance acceptable
- [ ] User testing completed
- [ ] No major bugs reported
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team notified of new feature

## Support Contacts

- Frontend Issues: Check browser console + frontend logs
- Backend Issues: Check backend logs + database
- Database Issues: Check database server health
- Deployment Issues: Check build logs and deployment logs

## Next Steps After Deployment

1. **Monitor for 24-48 hours** for any issues
2. **Gather user feedback** on the new feature
3. **Track SEO improvements** using Google Search Console
4. **Monitor social media previews** using OG debug tools
5. **Plan Phase 2 enhancements** based on user feedback

---

## Quick Verify Checklist

```bash
# Run this after deployment to verify everything works

# 1. Check backend is responsive
curl -s http://localhost:3001/api/public/health && echo "✅ Backend OK"

# 2. Check frontend loads
curl -s http://localhost:5173/ | grep -q "React" && echo "✅ Frontend OK"

# 3. Check SEO endpoint exists
curl -s http://localhost:3001/api/public/career-customization/test && echo "✅ API OK"

# 4. Check no database errors
tail -n 50 backend/logs/app.log | grep -i error || echo "✅ No errors"

# 5. Quick functionality test
# Visit http://localhost:5173/hrms/hr (Career Builder)
# Should see "🔍 SEO Settings" button
# Click it - should toggle to SEO panel
# Check console for errors
```

---

**Deployment Status: READY**

All code is production-ready, tested, and documented. Follow these steps for a smooth deployment.
