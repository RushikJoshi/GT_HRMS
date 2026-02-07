
const BGVCaseSchema = require('../models/BGVCase');
const BGVCheckSchema = require('../models/BGVCheck');
const BGVDocumentSchema = require('../models/BGVDocument');
const BGVTimelineSchema = require('../models/BGVTimeline');
const BGVReportSchema = require('../models/BGVReport');
const ApplicantSchema = require('../models/Applicant');
const getTenantDB = require('./tenantDB');

/**
 * HELPER: Load BGV models for a specific tenant.
 * Accepts either a 'req' object (with tenantDB/tenantId) or a raw 'tenantId' string.
 */
async function getBGVModels(context) {
    let db;
    let tenantId;

    if (typeof context === 'string') {
        tenantId = context;
        db = await getTenantDB(tenantId);
    } else if (context && context.tenantDB) {
        db = context.tenantDB;
        tenantId = context.tenantId;
    } else {
        throw new Error("Invalid context for getBGVModels: Expected req object or tenantId string");
    }

    return {
        BGVCase: db.model("BGVCase", BGVCaseSchema),
        BGVCheck: db.model("BGVCheck", BGVCheckSchema),
        BGVDocument: db.model("BGVDocument", BGVDocumentSchema),
        BGVTimeline: db.model("BGVTimeline", BGVTimelineSchema),
        BGVReport: db.model("BGVReport", BGVReportSchema),
        Applicant: db.model("Applicant", ApplicantSchema)
    };
}

module.exports = { getBGVModels };
