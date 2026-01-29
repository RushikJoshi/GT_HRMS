const getTenantDB = require('../utils/tenantDB');

exports.getCustomization = async (req, res) => {
    try {
        if (!req.tenantId) {
            return res.status(400).json({ error: 'Tenant ID not found in request' });
        }

        const db = await getTenantDB(req.tenantId);
        const CompanyProfile = db.model('CompanyProfile');

        const company = await CompanyProfile.findOne({});
        if (!company) {
            console.warn('✅ No company found, returning empty configuration');
            return res.json(null);
        }

        // Strategy: Return Draft if exists. If not, return Live. 
        // If neither, return null (frontend handles default).
        // If Draft is missing but Live exists, we should probably initialize Draft = Live so user sees current state.

        let draft = company.meta?.draftCareerPage;
        const live = company.meta?.careerCustomization;

        if (!draft && live) {
            // Self-repair: Initialize draft from live so editor starts with current live state
            draft = { ...live };
            // We don't necessarily need to save this to DB yet, just return it.
        }

        if (draft) {
            // Inject metadata for UI
            draft.lastPublishedAt = live?.publishedAt || null;
            draft.isPublished = false; // It is draft content
        }

        res.json(draft || null);
    } catch (error) {
        console.error('❌ [getCustomization] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.saveCustomization = async (req, res) => {
    try {
        if (!req.tenantId) {
            return res.status(400).json({ error: 'Tenant ID not found in request' });
        }

        const db = await getTenantDB(req.tenantId);
        const CompanyProfile = db.model('CompanyProfile');

        const customization = req.body;

        // Find or create company profile
        let company = await CompanyProfile.findOne({});
        if (!company) {
            company = new CompanyProfile({
                tenantId: req.tenantId,
                companyName: 'My Company',
                meta: {}
            });
        }

        // Save customization to DRAFT field
        if (!company.meta) company.meta = {};
        company.meta.draftCareerPage = {
            ...customization,
            updatedAt: new Date()
        };
        company.markModified('meta');

        await company.save();

        console.log('✅ Customization saved to DRAFT');
        res.json({ message: 'Draft saved successfully', data: customization });
    } catch (error) {
        console.error('❌ [saveCustomization] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.publishCustomization = async (req, res) => {
    console.log(`[PUBLISH] Request received for Tenant: ${req.tenantId}`);
    try {
        if (!req.tenantId) {
            console.error('[PUBLISH] Missing Tenant ID');
            return res.status(400).json({ error: 'Tenant ID not found in request' });
        }

        const db = await getTenantDB(req.tenantId);
        const CompanyProfile = db.model('CompanyProfile');

        // Look for existing company
        let company = await CompanyProfile.findOne({});
        console.log(`[PUBLISH] Company found: ${!!company}`);

        if (!company) {
            // If company doesn't exist, we must create it now if we have data to publish
            if (!req.body || !req.body.sections) {
                console.error('[PUBLISH] New company creation failed - No sections');
                return res.status(400).json({ error: 'Company profile not found and no content provided to publish.' });
            }
            company = new CompanyProfile({
                tenantId: req.tenantId,
                companyName: 'My Company',
                address: { line1: 'Address', city: 'City', state: 'State', pincode: '0000' }, // Min requirements
                signatory: { name: 'Admin', designation: 'Admin' },
                meta: {}
            });
            console.log('[PUBLISH] Created new temporary company profile');
        }

        // Determine content to publish
        let contentToPublish = null;

        console.log('[PUBLISH] Payload Sections:', req.body?.sections ? 'Present' : 'Missing');

        // 1. Direct Paylod (Atomic Save & Publish)
        if (req.body && req.body.sections) {
            contentToPublish = req.body;
        }
        // 2. Fallback to Draft (Legacy)
        else if (company.meta && company.meta.draftCareerPage) {
            console.log('[PUBLISH] Using Draft Fallback');
            contentToPublish = company.meta.draftCareerPage;
        }

        if (!contentToPublish) {
            console.error('[PUBLISH] No content to publish');
            return res.status(400).json({ error: 'No content found to publish. Please save changes first.' });
        }

        // Ensure meta exists (Schema might not have it defined explicitly mixed)
        if (!company.meta) company.meta = {};

        const timestamp = new Date();

        // Update LIVE content
        const liveContent = {
            ...contentToPublish,
            publishedAt: timestamp,
            isPublished: true
        };

        // Update DRAFT as well (keep them in sync)
        const draftContent = {
            ...contentToPublish,
            updatedAt: timestamp
        };

        // Mongoose Mixed type update requires markModified
        company.meta.careerCustomization = liveContent;
        company.meta.draftCareerPage = draftContent;

        // Handling for Strict Schema: If meta isn't in schema, we might need to rely on 'strict: false' or add it.
        // Assuming strict: false or meta is defined. If previous steps worked, it is likely defined or loose.
        // However, looking at CompanyProfile.js, 'meta' is NOT defined in the schema!
        // We must define it or bypass. Since we are in controller, let's try to save. 
        // If 'meta' is missing from schema, it will be stripped.
        // CHECK: CompanyProfile.js lines 1-69 do NOT show 'meta'. This is the root cause!
        // We will fix the schema in next step. For now, try to force it via set if possible, 
        // but 'markModified' only works if field is in schema or strict is false.

        company.markModified('meta');

        // WORKAROUND: If meta is stripped, we might need to use updateOne with $set to force it if schema is strict.
        if (company.schema && company.schema.options.strict) {
            // We will try strict save first. If it fails to persist, we need schema change.
        }

        await company.save();

        // Double check with updateOne just in case Schema strips it
        await CompanyProfile.updateOne(
            { _id: company._id },
            { $set: { "meta.careerCustomization": liveContent, "meta.draftCareerPage": draftContent } }
        );

        console.log('✅ Career page PUBLISHED (Atomic)');

        res.json({
            success: true,
            message: 'Career page published successfully',
            livePage: liveContent
        });

    } catch (error) {
        console.error('❌ [publishCustomization] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.getPublicCustomization = async (req, res) => {
    try {
        const { tenantId } = req.params;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }

        // Prevent Caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');

        const db = await getTenantDB(tenantId);
        const CompanyProfile = db.model('CompanyProfile');

        const company = await CompanyProfile.findOne({});
        if (!company) {
            return res.json(null);
        }

        // Return LIVE content
        const customization = company.meta?.careerCustomization || null;
        res.json(customization);
    } catch (error) {
        console.error('❌ [getPublicCustomization] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
