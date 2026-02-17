const Activity = require('../models/Activity');
const Tenant = require('../models/Tenant');
const getTenantDB = require('../utils/tenantDB');

exports.getRecent = async (req, res, next) => {
    try {
        const db = req.tenantDB;
        const ActivityModel = db.model("Activity");

        const items = await ActivityModel.find({ tenant: req.tenantId })
            .sort({ time: -1 })
            .limit(10);

        res.json({ success: true, data: items });
    } catch (err) {
        next(err);
    }
};

exports.getAllActivities = async (req, res, next) => {
    try {
        const tenants = await Tenant.find({ status: 'active' }).lean();
        const allActivities = [];

        for (const tenant of tenants) {
            try {
                const tenantDB = await getTenantDB(tenant._id);
                const ActivityModel = tenantDB.model('Activity');

                const activities = await ActivityModel.find({ tenant: tenant._id })
                    .sort({ time: -1 })
                    .limit(50)
                    .lean();

                activities.forEach(act => {
                    act.tenantInfo = {
                        name: tenant.name,
                        code: tenant.code,
                        _id: tenant._id
                    };
                });

                allActivities.push(...activities);
            } catch (err) {
                console.error(`Error fetching activities for tenant ${tenant.code}:`, err.message);
            }
        }

        allActivities.sort((a, b) => {
            const dateA = a.time ? new Date(a.time) : new Date(a.createdAt || 0);
            const dateB = b.time ? new Date(b.time) : new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        res.json({ success: true, data: allActivities.slice(0, 100) });
    } catch (err) {
        next(err);
    }
};

exports.create = async (req, res, next) => {
    try {
        const db = req.tenantDB;
        const ActivityModel = db.model("Activity");
        const body = { ...(req.body || {}), time: new Date(), tenant: req.tenantId };
        const a = await ActivityModel.create(body);
        res.status(201).json({ success: true, data: a });
    } catch (err) {
        next(err);
    }
};

exports.delete = async (req, res, next) => {
    try {
        const db = req.tenantDB;
        const ActivityModel = db.model("Activity");
        const deleted = await ActivityModel.findOneAndDelete({ _id: req.params.id, tenant: req.tenantId });
        if (!deleted) return res.status(404).json({ success: false, message: "not_found" });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};
