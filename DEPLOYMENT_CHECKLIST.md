# Document Management System - Deployment Checklist

## Pre-Deployment Verification (Staging)

### Database Setup
- [ ] MongoDB version verified (4.0+)
- [ ] Backup created before any changes
- [ ] Tenant database connection tested
- [ ] Storage quota sufficient for audit collections
- [ ] Migration script tested in isolation

### Backend Configuration
- [ ] All required environment variables set:
  - `MONGODB_URI` ✓
  - `EMAIL_SERVICE` ✓
  - `EMAIL_USER` ✓
  - `EMAIL_PASS` ✓
  - `EMAIL_FROM_NAME` ✓
  - `FRONTEND_URL` ✓
- [ ] Redis/cache cleared
- [ ] Error logging configured
- [ ] API rate limiting configured

### Code Quality
- [ ] All tests passing: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No security vulnerabilities: `npm audit`
- [ ] Code review completed
- [ ] Documentation updated

### Frontend Readiness
- [ ] Components imported in main layout
- [ ] CSS files linked
- [ ] No console errors
- [ ] Responsive design tested on mobile
- [ ] Accessibility audit passed
- [ ] Browser compatibility tested (Chrome, Firefox, Safari)

### Security Review
- [ ] JWT tokens verified working
- [ ] Role-based middleware tested
- [ ] CORS settings appropriate
- [ ] No secrets in code
- [ ] No SQL/NoSQL injection vulnerabilities
- [ ] Rate limiting on sensitive endpoints

---

## Deployment Steps

### Step 1: Pre-Deployment Backup (5 mins)

```bash
# Create full database backup
mongodump --uri "mongodb+srv://user:pass@cluster.mongodb.net/hrms" \
          --out ./backup_$(date +%Y%m%d_%H%M%S)

# Verify backup
ls -lh ./backup_*/
```

### Step 2: Migration Execution (5-10 mins)

```bash
# Run migration in production
cd backend
node migrations/001-document-management.js

# Expected output:
# ✓ Connecting to database...
# ✓ Checking migration history...
# ✓ Creating DocumentAudit collection...
# ✓ Creating DocumentAccess collection...
# ✓ Creating LetterRevocation collection...
# ✓ Extending GeneratedLetter schema...
# ✓ Recording migration in _migrations...
# ✅ Migration 001-document-management applied successfully
```

### Step 3: Verify Migration

```javascript
// Connect to MongoDB and verify
use hrms_db

// Check new collections exist
show collections
// Should show: documentaudits, documentaccesses, letterrevocations

// Verify migration tracking
db._migrations.findOne({ name: '001-document-management' })
// Should return object with appliedAt timestamp

// Verify indices created
db.documentaudits.getIndexes()
// Should show compound indices

// Verify GeneratedLetter fields added
db.generatedletters.findOne({ revokedAt: { $exists: true } })
// May return null (fields added but empty until used)
```

### Step 4: Deploy Backend

```bash
# Pull latest code
git pull origin main

# Install dependencies (if needed)
npm install

# Start application
npm start

# Verify startup logs - should see:
# ✓ Server running on port 5000
# ✓ Database connected
# ✓ Models registered
# ✓ Routes initialized
```

### Step 5: Deploy Frontend

```bash
# Build frontend
cd frontend
npm run build

# Deploy to CDN/server
npm run deploy

# Clear cache
npm run clear-cache
```

### Step 6: Smoke Tests (5 mins)

```bash
# Test 1: Basic document status check
curl -H "Authorization: Bearer ${TOKEN}" \
     https://hrms.company.com/api/documents/test-id/status

# Expected: 
# { "status": "active", "isRevoked": false, ... }

# Test 2: Revocation endpoint (HR role)
curl -X POST -H "Authorization: Bearer ${HR_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"reason":"POLICY_VIOLATION","details":"Test"}' \
     https://hrms.company.com/api/documents/test-id/revoke

# Expected:
# { "success": true, "revocationId": "...", ... }

# Test 3: Audit trail access
curl -H "Authorization: Bearer ${HR_TOKEN}" \
     https://hrms.company.com/api/documents/test-id/audit-trail

# Expected:
# [ { "action": "created", "timestamp": "...", ... }, ... ]
```

---

## Post-Deployment Verification

### Functional Tests (30 mins)

#### Test 1: Revocation Workflow
- [ ] Login as HR user
- [ ] Create/select test letter
- [ ] View document status (should show "active")
- [ ] Click "Revoke Letter" button
- [ ] Select revocation reason
- [ ] Add optional details
- [ ] Confirm revocation
- [ ] Verify status changed to "revoked"
- [ ] Check audit trail shows revocation event
- [ ] Verify email sent to candidate

#### Test 2: Access Control
- [ ] Verify non-HR users cannot revoke
- [ ] Verify Super-Admin can reinstate
- [ ] Verify HR can only revoke, not reinstate
- [ ] Verify candidates cannot access revocation endpoints

#### Test 3: Email Notifications
- [ ] Check emails received by candidates
- [ ] Verify email contains proper information
- [ ] Verify no test data in production emails
- [ ] Check email retry mechanism (logs)

#### Test 4: Audit Trail
- [ ] Access audit trail as HR user
- [ ] Verify all actions logged
- [ ] Check timestamps correct
- [ ] Verify IP addresses logged
- [ ] Check user agent information

#### Test 5: UI Components
- [ ] Badge shows correct status
- [ ] Modal appears on revoke action
- [ ] Modal closes properly
- [ ] Form validation works
- [ ] Loading states display correctly
- [ ] Error messages clear and helpful
- [ ] Responsive design on mobile

### Performance Monitoring (1 hour)

```bash
# Monitor API response times
# Target: < 200ms for status check, < 500ms for audit trail

# Monitor database query times
# Check indices being used:
db.documentaudits.find({ tenantId, documentId }).explain("executionStats")

# Monitor email service
# Check email queue: should be empty or minimal backlog

# Monitor error rates
# Target: < 0.1% error rate for new endpoints

# Monitor server resources
# CPU: < 70%
# Memory: < 80%
# Disk: > 20% free space
```

### Data Integrity Checks (30 mins)

```javascript
// Check 1: Audit records complete
db.documentaudits.countDocuments()
// Should be > 0 after activity

// Check 2: No orphaned revocations
db.letterrevocations.aggregate([
    { $lookup: {
        from: "generatedletters",
        localField: "generatedLetterId",
        foreignField: "_id",
        as: "letter"
    }},
    { $match: { letter: { $size: 0 } }}
])
// Should return 0 results

// Check 3: All isActive flags correct
db.letterrevocations.countDocuments({ isActive: false })
// Should only include explicitly deleted records

// Check 4: No duplicate access tokens
db.documentaccesses.aggregate([
    { $group: { _id: "$accessToken", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } }}
])
// Should return empty (no duplicates)
```

### User Acceptance Testing (2 hours)

- [ ] HR team tests revocation workflow
- [ ] HR team verifies candidates receive notifications
- [ ] HR team checks audit trail for compliance
- [ ] Candidates verify they receive notifications
- [ ] Admin verifies role-based access
- [ ] Super-Admin tests reinstatement
- [ ] Data entry team verifies no regression in existing features

---

## Rollback Procedure

### If Critical Issues Occur (< 1 hour from deployment)

#### Option 1: Immediate Rollback (Full Reset)

```bash
# 1. Stop application
systemctl stop hrms-api

# 2. Restore from backup
mongorestore --uri "mongodb+srv://user:pass@cluster.mongodb.net/hrms" \
             --drop \
             ./backup_20240115_143022/

# 3. Revert code
git revert HEAD~1

# 4. Redeploy
npm install
npm start

# 5. Verify
curl https://hrms.company.com/api/health
```

#### Option 2: Soft Rollback (Keep Migration, Disable Feature)

```javascript
// If migration applied but need to disable:

// Disable revocation routes in routes/index.js:
// Comment out:
// app.use('/api/documents', letterRevocationRoutes(auth, db));

// Clear frontend components from UI
// Restart application
```

#### Option 3: Database Rollback Only

```javascript
// Remove document management collections
use hrms_db

db._migrations.deleteOne({ name: '001-document-management' })
db.dropCollection('documentaudits')
db.dropCollection('documentaccesses')
db.dropCollection('letterrevocations')

// Remove soft-delete fields from GeneratedLetter
db.generatedletters.updateMany(
    {},
    { $unset: { revokedAt: '', revokedReason: '', revokedBy: '' } }
)
```

### Communication Plan (If Rollback Needed)

1. **Immediate**: Notify team of issue
2. **Within 5 mins**: Begin rollback
3. **Within 15 mins**: Confirm rollback complete
4. **Within 1 hour**: Root cause analysis
5. **Next day**: Postmortem meeting
6. **Before re-deploy**: Address all issues

---

## Post-Rollback Steps (If Needed)

1. [ ] Analyze error logs to find root cause
2. [ ] Create ticket in issue tracker
3. [ ] Fix code/configuration
4. [ ] Re-run all tests
5. [ ] Code review by 2+ people
6. [ ] Re-test in staging
7. [ ] Schedule re-deployment

---

## Monitoring & Maintenance

### Daily Checks (First 3 Days)

```bash
# Check error logs
tail -f /var/log/hrms/error.log | grep -i "document\|revocation"

# Monitor email queue
ps aux | grep "email\|nodemailer"

# Check database size
du -sh /data/mongodb/hrms

# Monitor API endpoint
curl -s https://hrms.company.com/api/documents/test/status | jq .
```

### Weekly Maintenance

```bash
# Check audit collection size
db.documentaudits.stats().size

# Analyze query performance
db.documentaudits.find().explain("executionStats")

# Check for expired access tokens
db.documentaccesses.countDocuments({ 
    isActive: true,
    expiresAt: { $lt: new Date() }
})

# Review error patterns
grep "error\|ERROR\|Exception" /var/log/hrms/error.log | tail -100
```

### Monthly Reporting

- [ ] Number of revocations processed
- [ ] Average response time for new endpoints
- [ ] Error rate and types
- [ ] Email delivery success rate
- [ ] Number of reinstatements
- [ ] User feedback/issues reported

---

## Contact & Escalation

**Primary Contact**: DevOps Team
- Slack: #devops
- Email: devops@company.com
- On-call: [rotation link]

**Secondary Contact**: HR Tech Lead
- Slack: #hr-tech
- Email: hrtech@company.com

**Critical Issues (Production Down)**:
- Page: [PagerDuty link]
- Phone: [On-call number]

---

## Sign-Off

| Role | Name | Date | Time | Verified |
|------|------|------|------|----------|
| DevOps Lead | | | | |
| Backend Lead | | | | |
| Frontend Lead | | | | |
| QA Lead | | | | |
| HR Manager | | | | |

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Reviewed By**: _____________
**Approved By**: _____________

**Start Time**: __________ **End Time**: __________ **Total Duration**: __________

---

## Appendix: Quick Reference

### Emergency Contacts
- On-Call: [phone/slack]
- DB Admin: [contact]
- Security: [contact]

### Useful Commands
```bash
# Check deployment status
pm2 status

# Restart service
pm2 restart hrms-api

# View live logs
pm2 logs hrms-api

# Scale instances
pm2 scale hrms-api 4

# Check MongoDB
mongo "mongodb+srv://..." --eval "db.serverStatus()"
```

### Monitoring Dashboards
- [Grafana Dashboard](https://monitoring.company.com/grafana)
- [Kibana Logs](https://logging.company.com/kibana)
- [New Relic APM](https://apm.company.com)
- [MongoDB Atlas](https://cloud.mongodb.com)

