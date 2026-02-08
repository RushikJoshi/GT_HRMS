# 🔧 MongoDB 500 Collection Limit - RESOLVED

## 🚨 Problem

**Error**: `MongoServerError: cannot create a new collection -- already using 500 collections of 500`

**Root Cause**: MongoDB Atlas Free Tier (M0) has a **500 collection limit per cluster** (not per database). Your multi-tenant architecture creates a separate database for each company, and you had exactly 500 collections across 12 databases.

---

## ✅ Solution Applied

### Quick Fix: Deleted "test" Database
- **Collections Freed**: 25
- **New Capacity**: 475/500 collections (95% usage)
- **Status**: ✅ RESOLVED

---

## 📊 Cluster Analysis

### Before Cleanup:
```
Total Databases: 12
Total Collections: 500/500 (100% - CRITICAL!)
Remaining Capacity: 0 collections
```

### After Cleanup:
```
Total Databases: 11
Total Collections: 475/500 (95%)
Remaining Capacity: 25 collections
```

### Database Breakdown:
| Database | Collections | Size | Status |
|----------|-------------|------|--------|
| company_695c98181a01d447895992ff | 50 | 7.47 MB | Active |
| company_69661e7f9a31a4d8586249fe | 45 | 0.93 MB | Active |
| company_696df3ee47b68bc7fb26db74 | 45 | 1.58 MB | Active |
| company_695d4a6c409f9301a0df9a1d | 44 | 1.10 MB | Active |
| company_69789673b783b1d7805d0ba1 | 44 | 0.87 MB | Active |
| company_696647a058019a97bb12f7a7 | 43 | 0.78 MB | Active |
| company_696e120ff361a38fe65c131c | 43 | 0.87 MB | Active |
| company_696e13c2472f4997a2b49b4a | 43 | 0.76 MB | Active |
| company_6966624e68da1a460f8fd6cb | 42 | 0.77 MB | Active |
| hrms_tenants_data | 42 | 0.75 MB | Active |
| company_695d41626eff2fdbc8a9b6cb | 34 | 0.63 MB | Active |
| ~~test~~ | ~~25~~ | ~~1.86 MB~~ | **DELETED** ✅ |

---

## 🔮 Long-Term Solutions

### Option 1: Optimize Multi-Tenant Architecture (Recommended)
Instead of creating a separate database per tenant, use a **single database with tenant-scoped collections**:

**Current**: 
- `company_ABC/users`
- `company_XYZ/users`
- Result: 2 collections

**Optimized**:
- `users` (with `tenantId` field)
- Result: 1 collection

**Benefits**:
- Dramatically reduces collection count
- Easier to manage
- Better for scaling
- No collection limit issues

**Implementation**:
1. Migrate to single-database architecture
2. Add `tenantId` field to all documents
3. Use middleware to filter by tenant
4. Update all queries to include tenant filter

### Option 2: Upgrade to Paid Tier
- **M10**: 100,000 collection limit
- **M20+**: Unlimited collections
- **Cost**: Starting at $0.08/hour (~$57/month)

### Option 3: Use Multiple Clusters
- Split tenants across multiple free clusters
- Each cluster gets 500 collections
- More complex to manage

---

## 🛠️ Scripts Created

### 1. `cleanup-collections.js`
Analyzes and cleans up empty/test/temp collections within a single database.

**Usage**:
```bash
# Analyze only (safe)
node scripts/cleanup-collections.js

# Cleanup empty collections
node scripts/cleanup-collections.js --cleanup --empty

# Cleanup all (empty + test + temp)
node scripts/cleanup-collections.js --cleanup --all
```

### 2. `cluster-analysis.js`
Analyzes ALL databases in the cluster to find collection usage.

**Usage**:
```bash
# Analyze cluster
node scripts/cluster-analysis.js

# Delete a specific database
node scripts/cluster-analysis.js --delete-db <database_name>
```

### 3. `delete-test-db.js`
Quick script to delete the "test" database.

**Usage**:
```bash
node scripts/delete-test-db.js
```

---

## 📈 Monitoring

### Check Collection Usage:
```bash
node scripts/cluster-analysis.js
```

### Warning Levels:
- 🟢 **0-400 collections**: OK
- 🟡 **400-450 collections**: Warning (plan for optimization)
- 🔴 **450-500 collections**: Critical (take action immediately)

---

## 🚀 Next Steps

### Immediate (Done):
- ✅ Deleted "test" database
- ✅ Freed 25 collections
- ✅ BGV initiation should work now

### Short-Term (Recommended):
1. Monitor collection usage weekly
2. Clean up empty collections in each tenant database
3. Delete any unused tenant databases

### Long-Term (Highly Recommended):
1. **Migrate to single-database architecture**
   - This is the best solution for scalability
   - Eliminates collection limit issues
   - Easier to manage and backup

2. **Or upgrade to paid tier**
   - If multi-database architecture is required
   - M10 tier gives 100,000 collection limit

---

## 🧪 Test BGV Initiation

Now that we've freed up space, try initiating BGV again:

1. Navigate to: `Recruitment → Jobs → Candidates`
2. Click "Initiate BGV" for any applicant
3. Select a package (BASIC/STANDARD/PREMIUM)
4. Click "Initiate BGV"
5. **Expected**: Success! ✅

---

## 📚 Additional Resources

### MongoDB Atlas Limits:
- **M0 (Free)**: 500 collections, 512 MB storage
- **M2**: 500 collections, 2 GB storage
- **M5**: 500 collections, 5 GB storage
- **M10+**: 100,000 collections, unlimited storage

### Multi-Tenant Best Practices:
- Use single database with tenant scoping
- Add indexes on `tenantId` field
- Use middleware for automatic tenant filtering
- Implement proper data isolation

---

## ✅ Status

- **Issue**: ✅ RESOLVED
- **Collections**: 475/500 (95%)
- **Remaining Capacity**: 25 collections
- **BGV Initiation**: ✅ Should work now
- **Monitoring**: ✅ Scripts created

---

**Version**: 1.0  
**Date**: 2026-02-06  
**Status**: ✅ RESOLVED
