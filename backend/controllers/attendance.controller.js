const mongoose = require('mongoose');
const XLSX = require('xlsx');
const crypto = require('crypto');
const AttendanceSchema = require('../models/Attendance');
const AttendanceSettingsSchema = require('../models/AttendanceSettings');
const EmployeeSchema = require('../models/Employee');
const HolidaySchema = require('../models/Holiday');
const LeaveRequestSchema = require('../models/LeaveRequest');
const AuditLogSchema = require('../models/AuditLog');
const FaceDataSchema = require('../models/FaceData');
const FaceUpdateRequestSchema = require('../models/FaceUpdateRequest');
// const OfficeSchema = require('../models/OfficeSchema.model');
// const CompanyProfile = require('../models/CompanyProfile');
const Employee = require('../models/Employee');
const TenantSchema = require('../models/Tenant');
const Tenant = require('../models/Tenant');
const FaceRecognitionService = require('../services/faceRecognition.service');
const {
    applyAttendanceRules,
    isWeeklyOffDate
} = require('../services/attendanceRulesEngine');


const FACE_EMBEDDING_DIM = 128;
const getModels = (req) => {
    const db = req.tenantDB;
    if (!db) throw new Error("Tenant database connection not available");
    return {
        Attendance: db.model('Attendance', AttendanceSchema),
        AttendanceSettings: db.model('AttendanceSettings', AttendanceSettingsSchema),
        Employee: db.model('Employee', EmployeeSchema),
        Tenant: db.models.Tenant || db.model('Tenant', Tenant.schema),
        Holiday: db.model('Holiday', HolidaySchema),
        LeaveRequest: db.model('LeaveRequest', LeaveRequestSchema),
        AuditLog: db.model('AuditLog', AuditLogSchema),
        FaceData: db.model('FaceData', FaceDataSchema),
        FaceUpdateRequest: db.model('FaceUpdateRequest', FaceUpdateRequestSchema),
        // Office: db.model('Office', CompanyProfile)
    };
};

const MASTER_FACE_KEY = Buffer.from(
    process.env.MASTER_FACE_KEY,
    'hex'
);

// if (!MASTER_FACE_KEY || MASTER_FACE_KEY.length !== 32) {
//     throw new Error('Invalid MASTER_FACE_KEY');
// }

if (!MASTER_FACE_KEY) {
    throw new Error('Invalid MASTER_FACE_KEY');
}
// ====== ENCRYPTION CONFIG ======
const ENCRYPTION_KEY = process.env.FACE_EMBEDDING_KEY || 'default-key-32-char-string-here!';
const FACE_MATCH_THRESHOLD = 0.60; // CRITICAL: Euclidean distance threshold - 0.60 is standard for face-api.js

// 🔹 Point-in-polygon helper
const isInsidePolygon = (point, polygon) => {
    let inside = false;
    const x = point.lng;
    const y = point.lat;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;

        const intersect =
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
};

exports.validateLocation = async (req, res) => {
    try {
        console.log("Tenant DB exists:", !!req.tenantDB);
        console.log("Request body:", req.body);


        // Employee.updateOne(
        //     { _id: '69661f85507ce0cf47b618ae' },
        //     {
        //         $set: {
        //             geofance: [
        //                 {
        //                     lat: 23.021288,
        //                     lng: 72.555100
        //                 },
        //                 {
        //                     lat: 23.021188,
        //                     lng: 72.554934
        //                 },
        //                 {
        //                     lat: 23.020960,
        //                     lng: 72.555106
        //                 },
        //                 {
        //                     lat: 23.021033,
        //                     lng: 72.555232
        //                 },
        //             ]
        //         }
        //     });

        const { location, isFaceVerified, tenantId } = req.body;

        if (!isFaceVerified) {
            return res.status(400).json({ message: "Face verification required" });
        }

        if (!location || !location.lat || !location.lng) {
            return res.status(400).json({ message: "Location data is required" });
        }

        const { Attendance, Employee } = getModels(req);

        const officeTenantId = tenantId || req.tenantId;
        console.log("🔍 Looking for office with tenantId:", officeTenantId);
        console.log("🔍 tenantId from body:", tenantId);
        console.log("🔍 tenantId from req:", req.tenantId);
        console.log("🔍 User info:", req.user);

        const employee = await Employee.findOne({ _id: '69662fbeb56bd4e7fefcf5fa' });
        console.log("📍 Office found:", employee);

        if (!employee) {
            // Let's check if ANY office exists
            const allEmployees = await Employee.find({}).limit(5);
            console.log("📋 All offices in DB (first 5):", allEmployees);
            return res.status(404).json({
                message: "Office not found for this tenant",
                debug: {
                    searchedTenantId: officeTenantId,
                    availableOfficeCount: allEmployees.length,
                    hint: "Please create a CompanyProfile record with the correct tenantId"
                }
            });
        }

        console.log("Accuracy:", location.accuracy);
        console.log("Allowed:", employee.allowedAccuracy);

        // Check location accuracy
        if (location.accuracy > employee.allowedAccuracy) {
            return res.status(400).json({
                message: `Location accuracy too low. Required: ${employee.allowedAccuracy}m, Got: ${location.accuracy}m`
            });
        }

        // Check if location is inside geofence
        if (employee.geofance && employee.geofance.length > 0) {
            const inside = isInsidePolygon(location, demoGeofance);

            if (!inside) {
                return res.status(400).json({ message: "You are outside the office location" });
            }
        }

        // Create attendance record
        const employeeId = req.user.id;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        today.setHours(0, 0, 0, 0);
        const employee1 = await Employee.findOne({ _id: employeeId }).lean();
        console.log("Employee Name : ", employee1.firstName + " " + employee1.lastName);
        const employeeFullName = employee1.firstName + " " + employee1.lastName;

        // Check if attendance already exists for today
        let attendance = await Attendance.findOne({
            employee: employeeId,
            tenant: officeTenantId,
            date: today
        });

        if (attendance) {
            return res.status(400).json({
                message: "Attendance already marked for today",
                data: attendance
            });
        }

        // Create new attendance record
        attendance = new Attendance({
            tenant: officeTenantId,
            employee: employeeId,
            date: today,
            checkIn: now,
            status: 'present',
            logs: [{
                time: now,
                type: 'IN',
                location: `${location.lat}, ${location.lng}`,
                device: req.body.device || 'Face Recognition',
                ip: req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || 'unknown'
            }]
        });

        await attendance.save();

        res.json({
            message: "Attendance marked successfully",
            data: attendance
        });

    } catch (err) {
        console.error("❌ VALIDATE LOCATION ERROR:", err);
        return res.status(500).json({
            message: "Internal Server Error",
            error: err.message
        });
    }
};


const calculateWorkingHours = (logs = []) => {
    if (logs.length < 2) return 0;

    let totalMinutes = 0;
    let inTime = null;

    for (const log of logs) {
        if (log.type === 'IN') {
            inTime = new Date(log.time);
        } else if (log.type === 'OUT' && inTime) {
            const outTime = new Date(log.time);
            const duration = (outTime - inTime) / (1000 * 60); // Duration in minutes
            totalMinutes += duration;
            inTime = null;
        }
    }

    return parseFloat((totalMinutes / 60).toFixed(2));
};

function euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

// Helper: Validate Geo-fencing
const validateGeoFencing = (latitude, longitude, settings) => {
    if (!settings.geoFencingEnabled) {
        return { valid: true };
    }

    if (!latitude || !longitude) {
        return { valid: false, error: 'Location data required for geo-fencing' };
    }

    // 1. Polygon Geofence Validation (if at least 3 points provided)
    if (settings.geofance && settings.geofance.length >= 3) {
        const inside = isInsidePolygon({ lat: latitude, lng: longitude }, settings.geofance);
        if (inside) {
            return { valid: true, mode: 'polygon' };
        }
        // If polygon is defined, it usually takes precedence. 
        // If we're outside the polygon, we fail (unless we want to also check radius as a fallback/OR condition)
        return {
            valid: false,
            error: `Punch outside allowed boundary (Polygon). Location: ${latitude}, ${longitude}`
        };
    }

    // 2. Fallback: Circular Radius Validation
    if (!settings.officeLatitude || !settings.officeLongitude) {
        return { valid: true }; // No office location set, skip circular check
    }

    // Haversine formula to calculate distance
    const R = 6371e3; // Earth radius in meters
    const φ1 = settings.officeLatitude * Math.PI / 180;
    const φ2 = latitude * Math.PI / 180;
    const Δφ = (latitude - settings.officeLatitude) * Math.PI / 180;
    const Δλ = (longitude - settings.officeLongitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters

    const allowedRadius = settings.allowedRadiusMeters || 100;

    if (distance > allowedRadius) {
        return {
            valid: false,
            error: `Punch outside allowed radius. Distance: ${Math.round(distance)}m, Allowed: ${allowedRadius}m`
        };
    }

    return { valid: true, distance: Math.round(distance), mode: 'radius' };
};

// Helper: Validate IP Address
const validateIPAddress = (ipAddress, settings) => {
    if (!settings.ipRestrictionEnabled || !settings.allowedIPs || settings.allowedIPs.length === 0) {
        return { valid: true };
    }

    if (!ipAddress) {
        return { valid: false, error: 'IP address required for IP restriction' };
    }

    // Check if IP is in allowed list
    const isAllowed = settings.allowedIPs.some(allowedIP => {
        // Support CIDR notation (e.g., "192.168.1.0/24")
        if (allowedIP.includes('/')) {
            const [network, prefixLength] = allowedIP.split('/');
            return isIPInCIDR(ipAddress, network, parseInt(prefixLength));
        }
        // Exact match
        return ipAddress === allowedIP;
    });

    // Also check IP ranges if defined
    if (!isAllowed && settings.allowedIPRanges && settings.allowedIPRanges.length > 0) {
        const inRange = settings.allowedIPRanges.some(range => {
            if (range.includes('/')) {
                const [network, prefixLength] = range.split('/');
                return isIPInCIDR(ipAddress, network, parseInt(prefixLength));
            }
            return ipAddress.startsWith(range);
        });

        if (inRange) {
            return { valid: true };
        }
    }

    if (!isAllowed) {
        return { valid: false, error: `IP address ${ipAddress} not in allowed list` };
    }

    return { valid: true };
};

// Helper: Check if IP is in CIDR range
const isIPInCIDR = (ip, network, prefixLength) => {
    const ipNum = ipToNumber(ip);
    const networkNum = ipToNumber(network);
    const mask = (0xFFFFFFFF << (32 - prefixLength)) >>> 0;
    return (ipNum & mask) === (networkNum & mask);
};

// Helper: Convert IP to number
const ipToNumber = (ip) => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
};

// Helper: Get client IP address
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';
};

// Helper: Calculate Overtime Hours
const calculateOvertimeHours = (workingHours, shiftStartTime, shiftEndTime, overtimeAfterShiftHours = true) => {
    if (!overtimeAfterShiftHours) return Math.max(0, workingHours - 8); // Default 8 hours standard

    // Calculate shift duration
    const [startHour, startMin] = shiftStartTime.split(':').map(Number);
    const [endHour, endMin] = shiftEndTime.split(':').map(Number);
    const shiftDuration = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60;

    return Math.max(0, workingHours - shiftDuration);
};

// 1. PUNCH IN / OUT (DYNAMIC) - With Policy Validation
exports.punch = async (req, res) => {
    try {
        const { Attendance, AttendanceSettings, AuditLog } = getModels(req);
        const employeeId = req.user.id;
        const tenantId = req.tenantId;
        const now = new Date();

        // Prefer client-provided local date to ensure alignment with dashboard
        let today;
        if (req.body.dateStr) {
            const [y, m, d] = req.body.dateStr.split('-').map(Number);
            today = new Date(y, m - 1, d);
            today.setHours(0, 0, 0, 0);
        } else {
            today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            today.setHours(0, 0, 0, 0);
        }

        let settings = await AttendanceSettings.findOne({ tenant: tenantId });
        if (!settings) {
            settings = new AttendanceSettings({ tenant: tenantId });
            await settings.save();
        }

        // ========== WEEKLY OFF VALIDATION ==========
        // Prevent punching in on configured weekly off days
        const dayOfWeek = today.getDay();
        const weeklyOffDays = settings.weeklyOffDays || [0];

        if (weeklyOffDays.includes(dayOfWeek)) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const violationLog = new AuditLog({
                tenant: tenantId,
                entity: 'Attendance',
                entityId: employeeId,
                action: 'PUNCH_WEEKLY_OFF_VIOLATION',
                performedBy: employeeId,
                changes: { before: null, after: { day: dayNames[dayOfWeek], error: 'Attempted punch on weekly off day' } },
                meta: { employeeId, weeklyOffDay: dayOfWeek }
            });
            await violationLog.save();

            return res.status(403).json({
                error: `Cannot punch in on ${dayNames[dayOfWeek]}. It is configured as a weekly off day.`,
                code: 'WEEKLY_OFF_VIOLATION',
                day: dayNames[dayOfWeek]
            });
        }

        // ========== LOCATION VALIDATION ==========
        const clientIP = getClientIP(req);
        const { latitude, longitude } = req.body;

        // Geo-fencing validation
        if (settings.locationRestrictionMode === 'geo' || settings.locationRestrictionMode === 'both') {
            const geoValidation = validateGeoFencing(latitude, longitude, settings);
            if (!geoValidation.valid) {
                // Log violation
                const violationLog = new AuditLog({
                    tenant: tenantId,
                    entity: 'Attendance',
                    entityId: employeeId,
                    action: 'PUNCH_GEO_VIOLATION',
                    performedBy: employeeId,
                    changes: { before: null, after: { latitude, longitude, error: geoValidation.error } },
                    meta: { ip: clientIP, employeeId }
                });
                await violationLog.save();

                return res.status(403).json({
                    error: geoValidation.error,
                    code: 'GEO_FENCING_VIOLATION'
                });
            }
        }

        // IP restriction validation
        if (settings.locationRestrictionMode === 'ip' || settings.locationRestrictionMode === 'both') {
            const ipValidation = validateIPAddress(clientIP, settings);
            if (!ipValidation.valid) {
                // Log violation
                const violationLog = new AuditLog({
                    tenant: tenantId,
                    entity: 'Attendance',
                    entityId: employeeId,
                    action: 'PUNCH_IP_VIOLATION',
                    performedBy: employeeId,
                    changes: { before: null, after: { ip: clientIP, error: ipValidation.error } },
                    meta: { employeeId }
                });
                await violationLog.save();

                return res.status(403).json({
                    error: ipValidation.error,
                    code: 'IP_RESTRICTION_VIOLATION'
                });
            }
        }

        let attendance = await Attendance.findOne({
            employee: employeeId,
            tenant: tenantId,
            date: today
        });

        // ========== PUNCH MODE VALIDATION ==========
        if (!attendance) {
            // First punch of the day → Must be IN
            const [h, m] = settings.shiftStartTime.split(':').map(Number);
            const shiftStart = new Date(today);
            shiftStart.setHours(h, m, 0, 0);

            // isLate is true only if they cross the Grace + Late Mark Threshold? 
            // Usually: 
            // - Grace Time: 15 mins (Allowed late without marking 'Late')
            // - Late Mark Threshold: 30 mins (If after THIS, definitely 'Late')
            const lateThreshold = new Date(shiftStart.getTime() + (settings.lateMarkThresholdMinutes || settings.graceTimeMinutes || 0) * 60000);
            const isLate = now > lateThreshold;

            attendance = new Attendance({
                tenant: tenantId,
                employee: employeeId,
                date: today,
                checkIn: now,
                status: 'present', // Placeholder, will be re-evaluated on OUT
                isLate,
                logs: [{
                    time: now,
                    type: 'IN',
                    location: req.body.location || 'Remote',
                    device: req.body.device || 'Unknown',
                    ip: clientIP
                }]
            });
            await attendance.save();
            return res.json({ message: "Punched In", data: attendance });
        }

        // Attendance exists - determine next punch type
        const lastLog = attendance.logs[attendance.logs.length - 1];
        const nextPunchType = (lastLog && lastLog.type === 'IN') ? 'OUT' : 'IN';

        // ========== SINGLE PUNCH MODE VALIDATION ==========
        if (settings.punchMode === 'single') {
            if (nextPunchType === 'IN' && attendance.checkIn) {
                return res.status(400).json({
                    error: 'Single punch mode: Only one punch in allowed per day',
                    code: 'SINGLE_PUNCH_MODE_VIOLATION'
                });
            }
            if (nextPunchType === 'OUT' && attendance.checkOut) {
                return res.status(400).json({
                    error: 'Single punch mode: You have already completed your shift for today.',
                    code: 'SINGLE_PUNCH_MODE_VIOLATION'
                });
            }
        }

        // ========== MAX PUNCH LIMIT VALIDATION ==========
        if (settings.punchMode === 'multiple') {
            const currentPunchCount = attendance.logs.length;
            if (currentPunchCount >= settings.maxPunchesPerDay) {
                if (settings.maxPunchAction === 'block') {
                    return res.status(400).json({
                        error: `Maximum punch limit reached (${settings.maxPunchesPerDay}). Contact HR for manual override.`,
                        code: 'MAX_PUNCH_LIMIT_EXCEEDED'
                    });
                }
            }
        }

        // ========== EARLY OUT VALIDATION (On OUT punch) ==========
        let isEarlyOut = attendance.isEarlyOut;
        if (nextPunchType === 'OUT') {
            const [eH, eM] = settings.shiftEndTime.split(':').map(Number);
            const shiftEnd = new Date(today);
            shiftEnd.setHours(eH, eM, 0, 0);
            isEarlyOut = now < shiftEnd;
        }

        // Add new punch log
        attendance.logs.push({
            time: now,
            type: nextPunchType,
            location: req.body.location || 'Remote',
            device: req.body.device || 'Unknown',
            ip: clientIP
        });

        // Update timestamps
        if (nextPunchType === 'IN') {
            // Keep the first checkIn of the day
            if (!attendance.checkIn) attendance.checkIn = now;
        } else {
            // Always update checkOut with the latest OUT time
            attendance.checkOut = now;
            attendance.isEarlyOut = isEarlyOut;
        }

        // ========== CALCULATE WORKING HOURS ==========
        // Always sum logs to avoid issues with multiple punches
        attendance.workingHours = calculateWorkingHours(attendance.logs);

        // ========== OVERTIME ==========
        // Business Rule: Standard Shift = 8 Hours. Calculate overtime if > 8h.
        if (attendance.workingHours > 0) {
            attendance.overtimeHours = calculateOvertimeHours(
                attendance.workingHours,
                settings.shiftStartTime || "09:00",
                settings.shiftEndTime || "17:00",
                settings.overtimeAfterShiftHours // If false/undefined, uses 8h rule
            );
        }

        // ========== FETCH ACCUMULATED STATS ==========
        // Required for implementing "Late Marks -> Half Day" policies
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const [accumulatedLateCount, accumulatedEarlyExitCount] = await Promise.all([
            Attendance.countDocuments({
                employee: employeeId,
                tenant: tenantId,
                date: { $gte: startOfMonth, $lt: today },
                isLate: true
            }),
            Attendance.countDocuments({
                employee: employeeId,
                tenant: tenantId,
                date: { $gte: startOfMonth, $lt: today },
                isEarlyOut: true
            })
        ]);

        // ========== RULES ENGINE: FINAL STATUS & FLAGS ==========
        const rulesResult = applyAttendanceRules({
            date: today,
            employeeId,
            logs: attendance.logs,
            workingHours: attendance.workingHours,
            baseStatus: attendance.status,
            settings,
            accumulatedLateCount,
            accumulatedEarlyExitCount
        });

        attendance.status = rulesResult.status;
        attendance.isLate = rulesResult.isLate;
        attendance.isEarlyOut = rulesResult.isEarlyOut;
        attendance.workingHours = rulesResult.workingHours;
        attendance.lateMinutes = rulesResult.lateMinutes;
        attendance.earlyExitMinutes = rulesResult.earlyExitMinutes;
        attendance.isWFH = !!rulesResult.isWFH;
        attendance.isOnDuty = !!rulesResult.isOnDuty;
        attendance.isCompOffDay = !!rulesResult.isCompOffDay;
        attendance.isNightShift = !!rulesResult.isNightShift;
        attendance.lopDays = typeof rulesResult.lopDays === 'number' ? rulesResult.lopDays : attendance.lopDays;
        attendance.ruleEngineVersion = rulesResult.engineVersion || 1;
        attendance.ruleEngineMeta = rulesResult.meta || attendance.ruleEngineMeta;
        await attendance.save();

        res.json({
            message: `Successfully Punched ${nextPunchType}`,
            data: attendance,
            policy: {
                punchMode: settings.punchMode,
                isLate: attendance.isLate,
                isEarlyOut: attendance.isEarlyOut,
                workingHours: attendance.workingHours,
                lateMinutes: attendance.lateMinutes,
                earlyExitMinutes: attendance.earlyExitMinutes,
                violations: rulesResult.policyViolations || []
            }
        });

    } catch (error) {
        console.error("Punch error:", error);
        res.status(500).json({ error: error.message });
    }
};

// 2. GET MY ATTENDANCE (Employee View)
exports.getMyAttendance = async (req, res) => {
    try {
        const { Attendance, Employee, AttendanceSettings } = getModels(req);
        const { month, year, employeeId } = req.query;

        // Target Employee: either the self or requested ID (RBAC check)
        let targetId = req.user.id;

        if (employeeId && employeeId !== req.user.id) {
            // If requesting someone else, must be Manager or HR
            if (req.user.role === 'hr') {
                targetId = employeeId;
            } else if (req.user.role === 'manager') {
                // Verify if target reports to this manager
                const isReport = await Employee.findOne({ _id: employeeId, manager: req.user.id, tenant: req.tenantId });
                if (!isReport) return res.status(403).json({ error: "Unauthorized access to employee data" });
                targetId = employeeId;
            } else {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        const filter = {
            employee: targetId,
            tenant: req.tenantId
        };

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            filter.date = { $gte: startDate, $lte: endDate };
        }

        // Fetch attendance data
        const data = await Attendance.find(filter).sort({ date: 1 })
            .populate('employee', 'firstName lastName employeeId');

        // Fetch settings to check weekly offs (including advanced weekly off rules)
        const settings = await AttendanceSettings.findOne({ tenant: req.tenantId });
        const correctedData = data.map(att => {
            const raw = att.toObject ? att.toObject() : JSON.parse(JSON.stringify(att));
            const dateObj = new Date(raw.date);

            const { isWeeklyOff } = isWeeklyOffDate({
                date: dateObj,
                settings: settings || { weeklyOffDays: [0] },
                employeeId: raw.employee?._id || raw.employee
            });

            if (isWeeklyOff) {
                raw.status = 'weekly_off';
                raw.correctedBySystem = true;
            }

            return raw;
        });

        res.json(correctedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. GET TEAM ATTENDANCE (Manager View)
exports.getTeamAttendance = async (req, res) => {
    try {
        const { Attendance, Employee } = getModels(req);
        const managerId = req.user.id;

        // Find direct reports
        const reports = await Employee.find({ manager: managerId, tenant: req.tenantId }).select('_id');
        const reportIds = reports.map(r => r._id);

        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        const start = new Date(queryDate.setHours(0, 0, 0, 0));
        const end = new Date(queryDate.setHours(23, 59, 59, 999));

        const data = await Attendance.find({
            employee: { $in: reportIds },
            tenant: req.tenantId,
            date: { $gte: start, $lte: end }
        }).populate('employee', 'firstName lastName employeeId profilePic');

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. GET ALL ATTENDANCE (HR View)
exports.getAllAttendance = async (req, res) => {
    try {
        const { Attendance } = getModels(req);
        const { date, departmentId } = req.query;

        let query = { tenant: req.tenantId };
        if (date) {
            const d = new Date(date);
            query.date = { $gte: new Date(d.setHours(0, 0, 0, 0)), $lte: new Date(d.setHours(23, 59, 59, 999)) };
        }

        const data = await Attendance.find(query)
            .populate('employee', 'firstName lastName employeeId departmentId role')
            .sort({ date: -1 });

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. ATTENDANCE SETTINGS (HR)
exports.getSettings = async (req, res) => {
    try {
        const { AttendanceSettings } = getModels(req);
        let settings = await AttendanceSettings.findOne({ tenant: req.tenantId });
        if (!settings) {
            settings = new AttendanceSettings({ tenant: req.tenantId });
            await settings.save();
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { AttendanceSettings, AuditLog } = getModels(req);

        // Get existing settings for audit log
        const existingSettings = await AttendanceSettings.findOne({ tenant: req.tenantId });
        const before = existingSettings ? existingSettings.toObject() : null;

        // Filter out empty IP addresses
        const updateData = { ...req.body, updatedBy: req.user.id };
        if (updateData.allowedIPs) {
            updateData.allowedIPs = updateData.allowedIPs.filter(ip => ip && ip.trim() !== '');
        }
        if (updateData.allowedIPRanges) {
            updateData.allowedIPRanges = updateData.allowedIPRanges.filter(range => range && range.trim() !== '');
        }

        const settings = await AttendanceSettings.findOneAndUpdate(
            { tenant: req.tenantId },
            updateData,
            { new: true, upsert: true }
        );

        // Audit log the settings update
        const auditLog = new AuditLog({
            tenant: req.tenantId,
            entity: 'AttendanceSettings',
            entityId: settings._id,
            action: 'ATTENDANCE_SETTINGS_UPDATED',
            performedBy: req.user.id,
            changes: {
                before,
                after: settings.toObject()
            },
            meta: { settingsType: 'punch_policy' }
        });
        await auditLog.save();

        res.json({ message: "Settings updated", data: settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. MANUAL OVERRIDE (HR)
exports.override = async (req, res) => {
    try {
        const { Attendance, AuditLog } = getModels(req);
        const { employeeId, date, status, checkIn, checkOut, reason } = req.body;

        if (!reason) return res.status(400).json({ error: "Reason is mandatory for manual override" });

        const targetDate = new Date(new Date(date).setHours(0, 0, 0, 0));

        let attendance = await Attendance.findOne({ employee: employeeId, date: targetDate, tenant: req.tenantId });
        const before = attendance ? attendance.toObject() : null;

        if (!attendance) {
            attendance = new Attendance({ employee: employeeId, date: targetDate, tenant: req.tenantId });
        }

        attendance.status = status;
        if (checkIn) attendance.checkIn = checkIn;
        if (checkOut) attendance.checkOut = checkOut;
        attendance.isManualOverride = true;
        attendance.overrideReason = reason;
        attendance.approvedBy = req.user.id;

        await attendance.save();

        // Log the change
        const log = new AuditLog({
            tenant: req.tenantId,
            entity: 'Attendance',
            entityId: attendance._id,
            action: 'MANUAL_OVERRIDE',
            performedBy: req.user.id,
            changes: { before, after: attendance.toObject() },
            meta: { reason }
        });
        await log.save();

        res.json({ message: "Attendance overridden successfully", data: attendance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 7. GET ATTENDANCE CALENDAR (HR-Managed Calendar View)
// This generates a calendar view with priority: Holiday > Weekly Off > Attendance Status > Not Marked
exports.getCalendar = async (req, res) => {
    try {
        const { Attendance, AttendanceSettings, Holiday } = getModels(req);
        const { year, month, employeeId } = req.query;
        const tenantId = req.tenantId;

        // Get target year/month (default to current)
        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // month is 0-indexed

        // Calculate date range for the month
        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

        // Get settings (weekly off days, shifts, etc.)
        let settings = await AttendanceSettings.findOne({ tenant: tenantId });
        if (!settings) {
            settings = { weeklyOffDays: [0] }; // Default to Sunday
        }

        // Get holidays for the month (including past and future for full visibility)
        const holidays = await Holiday.find({
            tenant: tenantId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        // Create holiday map for quick lookup
        const holidayMap = {};
        holidays.forEach(h => {
            const dateStr = h.date.toISOString().split('T')[0];
            holidayMap[dateStr] = {
                name: h.name,
                type: h.type,
                description: h.description || ''
            };
        });

        // Get attendance records if employeeId is provided (for employee-specific calendar)
        let attendanceMap = {};
        if (employeeId) {
            const attendance = await Attendance.find({
                tenant: tenantId,
                employee: employeeId,
                date: { $gte: startDate, $lte: endDate }
            }).sort({ date: 1 });

            attendance.forEach(a => {
                const dateStr = a.date.toISOString().split('T')[0];
                attendanceMap[dateStr] = {
                    status: a.status,
                    checkIn: a.checkIn,
                    checkOut: a.checkOut,
                    workingHours: a.workingHours,
                    isLate: a.isLate,
                    isEarlyOut: a.isEarlyOut
                };
            });
        }

        // Generate calendar days with priority rules
        const calendarDays = [];
        const lastDate = endDate.getDate();

        for (let day = 1; day <= lastDate; day++) {
            const date = new Date(targetYear, targetMonth, day);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();
            const isWeeklyOff = settings.weeklyOffDays?.includes(dayOfWeek) || false;
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isPast = dateStr < new Date().toISOString().split('T')[0];

            // Apply priority: 1. Holiday 2. Weekly Off 3. Attendance 4. Absent (Past) 5. Not Marked
            let status = 'not_marked';
            let displayLabel = '';
            let holiday = null;

            if (holidayMap[dateStr]) {
                status = 'holiday';
                displayLabel = holidayMap[dateStr].name;
                holiday = holidayMap[dateStr];
            } else if (isWeeklyOff) {
                status = 'weekly_off';
                displayLabel = 'Weekly Off';
            } else if (attendanceMap[dateStr]) {
                status = (attendanceMap[dateStr].status || 'present').toLowerCase();
                displayLabel = status.charAt(0).toUpperCase() + status.slice(1);
            } else if (isPast) {
                status = 'absent';
                displayLabel = 'Absent';
            } else {
                status = 'not_marked';
                displayLabel = '--';
            }

            calendarDays.push({
                date: dateStr,
                day: day,
                dayOfWeek: dayOfWeek,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                status: status,
                displayLabel: displayLabel,
                isWeeklyOff: isWeeklyOff,
                isHoliday: !!holidayMap[dateStr],
                holiday: holiday,
                attendance: attendanceMap[dateStr] || null,
                isPast,
                isToday,
                isFuture: !isPast && !isToday
            });
        }

        // Calculate monthly summary
        const summary = {
            totalPresent: 0,
            totalAbsent: 0,
            totalLeave: 0,
            totalHolidays: holidays.length,
            totalWeeklyOff: 0
        };

        calendarDays.forEach(day => {
            if (day.status === 'present') summary.totalPresent++;
            else if (day.status === 'absent') summary.totalAbsent++;
            else if (day.status === 'leave') summary.totalLeave++;
            else if (day.status === 'weekly_off') summary.totalWeeklyOff++;
        });

        res.json({
            year: targetYear,
            month: targetMonth + 1,
            summary,
            settings: {
                weeklyOffDays: settings.weeklyOffDays || [0],
                shiftStartTime: settings.shiftStartTime || "09:00",
                shiftEndTime: settings.shiftEndTime || "18:00"
            },
            holidays: holidays,
            calendarDays: calendarDays
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 8. GET TODAY SUMMARY (For Employee Dashboard)
exports.getTodaySummary = async (req, res) => {
    try {
        const { Attendance } = getModels(req);
        const employeeId = req.user.id;
        const tenantId = req.tenantId;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const attendance = await Attendance.findOne({
            tenant: tenantId,
            employee: employeeId,
            date: today
        });

        if (!attendance) {
            return res.json({
                totalPunches: 0,
                totalIn: 0,
                totalOut: 0,
                workingHours: 0,
                status: 'Not Marked',
                firstPunch: null,
                lastPunch: null,
                logs: []
            });
        }

        let totalIn = 0;
        let totalOut = 0;
        attendance.logs.forEach(log => {
            if (log.type === 'IN') totalIn++;
            if (log.type === 'OUT') totalOut++;
        });

        res.json({
            totalPunches: attendance.logs.length,
            totalIn,
            totalOut,
            workingHours: attendance.workingHours || 0,
            overtimeHours: attendance.overtimeHours || 0, // Added field
            shiftHours: Math.min(attendance.workingHours || 0, 8), // Added field (Max 8h)
            status: attendance.status || 'Not Marked',
            firstPunch: attendance.checkIn || null,
            lastPunch: attendance.checkOut || null,
            logs: attendance.logs
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 9. GET HR DASHBOARD STATS (For HR/Admin Dashboard)
exports.getHRStats = async (req, res) => {
    try {
        const { Attendance, Employee } = getModels(req);
        const tenantId = req.tenantId;
        const { date } = req.query;

        // Determine target date (default today)
        const targetDateStr = date || new Date().toISOString().split('T')[0];
        const [y, m, d] = targetDateStr.split('-').map(Number);
        const targetDate = new Date(y, m - 1, d); // Local midnight

        // Fetch all attendance for today
        const attendances = await Attendance.find({
            tenant: tenantId,
            date: targetDate
        });

        const totalPunchedIn = attendances.length;

        let multiplePunches = 0;
        let missingPunchOut = 0;
        let totalWorkingHours = 0;

        attendances.forEach(att => {
            // Multiple punches: if logs > 2 (meaning more than just IN-OUT pair)
            if (att.logs && att.logs.length > 2) {
                multiplePunches++;
            }

            // Missing Punch Out: user checked in roughly (logs not empty) but no checkOut yet
            // (Only counts if they are not currently working late? Simple logic: !checkOut)
            if (att.checkIn && !att.checkOut) {
                missingPunchOut++;
            }

            totalWorkingHours += (att.workingHours || 0);
        });

        const avgWorkingHours = totalPunchedIn > 0 ? (totalWorkingHours / totalPunchedIn).toFixed(2) : 0;

        res.json({
            date: targetDateStr,
            totalPunchedIn,
            multiplePunches,
            missingPunchOut,
            avgWorkingHours
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/attendance/upload-excel
 * Upload attendance from Excel
 */
exports.uploadExcel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Excel file is required" });

        const { Attendance, Employee, AuditLog, AttendanceSettings } = getModels(req);
        const tenantId = req.tenantId;

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

        if (rows.length === 0) return res.status(400).json({ error: "Excel sheet is empty" });

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Cache settings
        let settings = await AttendanceSettings.findOne({ tenant: tenantId });
        if (!settings) settings = new AttendanceSettings({ tenant: tenantId });

        // Normalize header names
        const normalize = (s) => s ? s.toString().toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '') : '';

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowIdx = i + 2; // 1-indexed + header row

            try {
                // Find column names
                let empIdVal = "";
                let dateVal = null;
                let statusVal = "";
                let checkInVal = null;
                let checkOutVal = null;

                for (const key of Object.keys(row)) {
                    const normKey = normalize(key);
                    const val = row[key];

                    if (normKey.includes('employeeid') || normKey.includes('empid') || normKey === 'id' || normKey === 'code') {
                        empIdVal = val.toString().trim();
                    } else if (normKey === 'date' || normKey.includes('attendancedate') || normKey.includes('punchdate')) {
                        dateVal = val;
                    } else if (normKey === 'status') {
                        statusVal = val.toString().trim().toLowerCase();
                    } else if (normKey.includes('checkin') || normKey.includes('punchin') || normKey === 'in') {
                        checkInVal = val;
                    } else if (normKey.includes('checkout') || normKey.includes('punchout') || normKey === 'out') {
                        checkOutVal = val;
                    }
                }

                if (!empIdVal) throw new Error("Employee ID is missing");
                if (!dateVal) throw new Error("Date is missing");

                // Find Employee
                const employee = await Employee.findOne({
                    tenant: tenantId,
                    $or: [{ employeeId: empIdVal }, { customId: empIdVal }]
                });
                if (!employee) throw new Error(`Employee not found with ID: ${empIdVal}`);

                // Process Date
                let attendanceDate = new Date(dateVal);
                if (isNaN(attendanceDate.getTime())) throw new Error(`Invalid date format: ${dateVal}`);
                attendanceDate.setHours(0, 0, 0, 0);

                // Default status if missing
                if (!statusVal) statusVal = 'present';

                // Find or Create Attendance
                let attendance = await Attendance.findOne({
                    tenant: tenantId,
                    employee: employee._id,
                    date: attendanceDate
                });

                if (!attendance) {
                    attendance = new Attendance({
                        tenant: tenantId,
                        employee: employee._id,
                        date: attendanceDate
                    });
                }

                attendance.status = statusVal;

                // Process Punch Times if they are Date objects or strings
                const parseTime = (val, baseDate) => {
                    if (!val) return null;
                    if (val instanceof Date) return val;
                    // Try to parse string time like "09:00"
                    if (typeof val === 'string' && val.includes(':')) {
                        const [h, m] = val.split(':').map(Number);
                        const d = new Date(baseDate);
                        d.setHours(h, m || 0, 0, 0);
                        return d;
                    }
                    return null;
                };

                const checkIn = parseTime(checkInVal, attendanceDate);
                const checkOut = parseTime(checkOutVal, attendanceDate);

                if (checkIn) {
                    attendance.checkIn = checkIn;
                    // Also check late mark
                    const [h, m] = settings.shiftStartTime.split(':').map(Number);
                    const shiftStart = new Date(attendanceDate);
                    shiftStart.setHours(h, m, 0, 0);
                    const grace = settings.graceTimeMinutes || 0;
                    if (checkIn > new Date(shiftStart.getTime() + grace * 60000)) {
                        attendance.isLate = true;
                    }
                }

                if (checkOut) {
                    attendance.checkOut = checkOut;
                    // Also check early out
                    const [h, m] = settings.shiftEndTime.split(':').map(Number);
                    const shiftEnd = new Date(attendanceDate);
                    shiftEnd.setHours(h, m, 0, 0);
                    if (checkOut < shiftEnd) {
                        attendance.isEarlyOut = true;
                    }
                }

                // Sync Logs for consistency if we have punch times
                if (checkIn || checkOut) {
                    attendance.logs = [];
                    if (checkIn) attendance.logs.push({ time: checkIn, type: 'IN', location: 'Excel Upload', device: 'System' });
                    if (checkOut) attendance.logs.push({ time: checkOut, type: 'OUT', location: 'Excel Upload', device: 'System' });

                    attendance.workingHours = calculateWorkingHours(attendance.logs);
                }

                attendance.isManualOverride = true;
                attendance.overrideReason = "Bulk Excel Upload";
                attendance.approvedBy = req.user.id;

                await attendance.save();
                results.success++;

            } catch (err) {
                results.failed++;
                results.errors.push({ row: rowIdx, error: err.message });
            }
        }

        // Log the bulk action
        const bulkLog = new AuditLog({
            tenant: tenantId,
            entity: 'AttendanceBatch',
            entityId: req.user.id,
            action: 'BULK_UPLOAD_EXCEL',
            performedBy: req.user.id,
            meta: {
                file: req.file.originalname,
                successCount: results.success,
                failCount: results.failed
            }
        });
        await bulkLog.save();

        res.json({
            message: `Bulk upload completed: ${results.success} succeeded, ${results.failed} failed.`,
            data: results
        });

    } catch (error) {
        console.error("Bulk upload error:", error);
        res.status(500).json({ error: error.message });
    }
};

// 10. DOWNLOAD BULK UPLOAD TEMPLATE
exports.downloadBulkUploadTemp = async (req, res) => {
    try {
        const XLSX = require('xlsx');

        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Sample data
        const sampleData = [
            {
                'Sr No': '1',
                'Employee ID': 'CYB001-IT-001',
                'Date': '2025-12-31',
                'Check In': '09:00:00',
                'Check Out': '07:07:00',
                'Working Hours': '7.03',
                'Overtime Hours': '',
                'Is Late': 'false',
                'Is Early': 'false',
                'Status': 'present',
                'Leave Type': ''
            },
            {
                'Sr No': '2',
                'Employee ID': 'CYB001-IT-001',
                'Date': '2026-01-01',
                'Check In': '09:00:00',
                'Check Out': '07:03:00',
                'Working Hours': '7.03',
                'Overtime Hours': '',
                'Is Late': 'false',
                'Is Early': 'false',
                'Status': 'present',
                'Leave Type': ''
            }
        ];

        // Headers (first row)
        const headers = [
            'Sr No.',
            'Employee ID (Required)',
            'Date (YYYY-MM-DD, Required)',
            'Check In (HH:MM:SS, Optional)',
            'Check Out (HH:MM:SS, Optional)',
            'Working Hours',
            'Overtime Hours',
            'Is Late',
            'Is Early Out',
            'Status (present/absent/leave/half_day/holiday/weekly_off)',
            'Leave Type'
        ];

        // Convert data to sheet
        const worksheet = XLSX.utils.json_to_sheet(sampleData);

        // Auto-fit columns
        const colWidths = [
            { wch: 25 }, // Sr No.
            { wch: 25 }, // Employee ID
            { wch: 15 }, // Date
            { wch: 25 }, // Check In
            { wch: 25 },  // Check Out
            { wch: 25 },
            { wch: 25 },
            { wch: 25 },
            { wch: 15 },
            { wch: 25 },
            { wch: 25 },

        ];
        worksheet['!cols'] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Template');

        // Generate buffer
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // Send file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Attendance_Bulk_Upload_Template_${Date.now()}.xlsx"`);
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);

    } catch (err) {
        console.error('Error generating attendance template:', err);
        res.status(500).json({ error: 'template_generation_failed', message: err.message });
    }
};

// Bulk Upload from JSON data (for frontend Excel import)
// exports.bulkUpload = async (req, res) => {
//     try {
//         const { records } = req.body;
//         console.log(records);

//         if (!records || !Array.isArray(records)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Records must be an array"
//             });
//         }

//         if (records.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No records provided"
//             });
//         }

//         const { Attendance, Employee, AuditLog, AttendanceSettings } = getModels(req);
//         const tenantId = req.tenantId;
//         const userId = req.userId;

//         const results = {
//             uploadedCount: 0,
//             failedCount: 0,
//             errors: []
//         };

//         // Cache settings
//         let settings = await AttendanceSettings.findOne({ tenant: tenantId });
//         if (!settings) settings = new AttendanceSettings({ tenant: tenantId });

//         // Normalize header names
//         const normalize = (s) => s ? s.toString().toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '') : '';

//         for (let i = 0; i < records.length; i++) {
//             const row = records[i];
//             const rowIdx = i + 2; // 1-indexed + header row

//             try {
//                 // Find column names
//                 let empIdVal = "";
//                 let dateVal = null;
//                 let statusVal = "";
//                 let checkInVal = null;
//                 let checkOutVal = null;
//                 let workingHoursVal = null;
//                 let overtimeHoursVal = null;
//                 let isLateVal = null;
//                 let isEarlyOutVal = null;
//                 let leaveTypeVal = '';


//                 for (const key of Object.keys(row)) {
//                     const normKey = normalize(key);
//                     const val = row[key];

//                     if (normKey.includes('employeeid') || normKey.includes('empid') || normKey === 'id' || normKey === 'code') {
//                         empIdVal = val ? val.toString().trim() : "";
//                     } else if (normKey === 'date' || normKey.includes('attendancedate') || normKey.includes('punchdate')) {
//                         dateVal = val;
//                     } else if (normKey === 'status') {
//                         statusVal = val ? val.toString().trim().toLowerCase() : "";
//                     } else if (normKey.includes('checkin') || normKey.includes('punchin') || normKey === 'in') {
//                         checkInVal = val;
//                     } else if (normKey.includes('checkout') || normKey.includes('punchout') || normKey === 'out') {
//                         checkOutVal = val;
//                     } else if (normKey.includes('workinghours')){
//                         workingHoursVal = val;
//                     } else if (normKey.includes('overtimehours')){
//                         overtimeHoursVal = val;
//                     } else if (normKey.includes('islate')){
//                         isLateVal = val || false;
//                     } else if (normKey.includes('isearly')){
//                         isEarlyOutVal = val || false;
//                     } else if (normKey.includes('leavetype')){
//                         leaveTypeVal = val ? val.toString().trim().toLowerCase() : "";
//                     }
//                 }

//                 if (!empIdVal) throw new Error("Employee ID is missing");
//                 if (!dateVal) throw new Error("Date is missing");

//                 // Find Employee
//                 const employee = await Employee.findOne({
//                     tenant: tenantId,
//                     $or: [{ employeeId: empIdVal }, { customId: empIdVal }]
//                 });
//                 if (!employee) throw new Error(`Employee not found with ID: ${empIdVal}`);

//                 // Process Date
//                 let attendanceDate = new Date(dateVal);
//                 if (isNaN(attendanceDate.getTime())) throw new Error(`Invalid date format: ${dateVal}`);
//                 attendanceDate.setHours(0, 0, 0, 0);

//                 // Default status if missing
//                 if (!statusVal) statusVal = 'present';

//                 // Validate status
//                 const validStatuses = ['present', 'absent', 'leave', 'holiday', 'weekly_off', 'half_day', 'missed_punch'];
//                 if (!validStatuses.includes(statusVal)) {
//                     statusVal = 'present'; // Default to present if invalid
//                 }

//                 // Process check-in/out times
//                 let checkInTime = null;
//                 let checkOutTime = null;

//                 if (checkInVal) {
//                     checkInTime = new Date(checkInVal);
//                     if (isNaN(checkInTime.getTime())) checkInTime = null;
//                 }

//                 if (checkOutVal) {
//                     checkOutTime = new Date(checkOutVal);
//                     if (isNaN(checkOutTime.getTime())) checkOutTime = null;
//                 }

//                 // Check if record already exists
//                 let attendance = await Attendance.findOne({
//                     tenant: tenantId,
//                     employee: employee._id,
//                     date: attendanceDate
//                 });

//                 const attendanceData = {
//                     tenant: tenantId,
//                     employee: employee._id,
//                     date: attendanceDate,
//                     status: statusVal,
//                     checkIn: checkInTime,
//                     checkOut: checkOutTime,
//                     ipAddress: req.ip || '0.0.0.0',
//                     userAgent: req.get('user-agent') || '',
//                     workingHours: workingHoursVal,
//                     overtimeHours: overtimeHoursVal,
//                     isLate: isLateVal,
//                     isEarlyOut: isEarlyOutVal,
//                     leaveType: leaveTypeVal
//                 };

//                 if (attendance) {
//                     // Update existing
//                     Object.assign(attendance, attendanceData);
//                     await attendance.save();
//                 } else {
//                     // Create new
//                     attendance = new Attendance(attendanceData);
//                     await attendance.save();
//                 }

//                 results.uploadedCount++;

//             } catch (error) {
//                 results.failedCount++;
//                 results.errors.push(`Row ${rowIdx}: ${error.message}`);
//             }
//         }

//         // // Log audit
//         // try {
//         //     const AuditLog = require('../models/auditLog.model');
//         //     const auditLog = new AuditLog({
//         //         tenant: tenantId,
//         //         user: userId,
//         //         action: 'BULK_UPLOAD_ATTENDANCE',
//         //         module: 'Attendance',
//         //         changes: {
//         //             uploadedCount: results.uploadedCount,
//         //             failedCount: results.failedCount
//         //         }
//         //     });
//         //     await auditLog.save();
//         // } catch (e) {
//         //     console.error('Audit log error:', e);
//         // }

//         res.json({
//             success: true,
//             uploadedCount: results.uploadedCount,
//             failedCount: results.failedCount,
//             errors: results.errors,
//             message: `Uploaded ${results.uploadedCount} records successfully${results.failedCount > 0 ? ` (${results.failedCount} failed)` : ''}`
//         });

//     } catch (error) {
//         console.error("Bulk upload error:", error);
//         res.status(500).json({
//             success: false,
//             message: error.message || 'Error uploading records'
//         });
//     }
// };

exports.bulkUpload = async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records)) {
            return res.status(400).json({
                success: false,
                message: "Records must be an array"
            });
        }

        if (records.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No records provided"
            });
        }

        const { Attendance, Employee, AttendanceSettings } = getModels(req);
        const tenantId = req.tenantId;
        const userId = req.userId;

        const results = {
            uploadedCount: 0,
            failedCount: 0,
            errors: []
        };

        // Cache settings for late/early out calculation
        let settings = await AttendanceSettings.findOne({ tenant: tenantId });
        if (!settings) settings = new AttendanceSettings({ tenant: tenantId });

        /* ---------------- Helpers ---------------- */

        const normalize = (s) =>
            s ? s.toString().toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '') : '';

        const parseBoolean = (val) => {
            if (val === true || val === 1) return true;
            if (typeof val === 'string') {
                return ['true', 'yes', '1'].includes(val.toLowerCase());
            }
            return false;
        };

        const parseNumber = (val) => {
            if (val === null || val === undefined || val === '') return null;
            const num = Number(val);
            if (isNaN(num)) return null;
            // If it's a small fraction (e.g., 0.375 for 9h), it might be Excel time
            // Excel stores 1 day as 1.0. So 9h is 9/24 = 0.375.
            // We only apply this if it looks like an Excel fraction and the column is likely working hours
            return num;
        };

        const parseDate = (val) => {
            if (!val) return null;

            // Excel date number
            if (typeof val === 'number') {
                return new Date(Math.round((val - 25569) * 86400 * 1000));
            }

            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        const parseTime = (val, baseDate) => {
            if (!val) return null;

            // If it's already a full Date object
            if (val instanceof Date && !isNaN(val.getTime())) {
                return val;
            }

            // Excel time fraction (e.g. 0.375 for 09:00:00)
            if (typeof val === 'number') {
                const d = new Date(baseDate);
                const totalSeconds = Math.round(val * 86400);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                d.setHours(hours, minutes, seconds, 0);
                return d;
            }

            // String time like "09:00:00" or "09:00"
            if (typeof val === 'string' && val.includes(':')) {
                const parts = val.split(':').map(Number);
                const d = new Date(baseDate);
                d.setHours(parts[0], parts[1] || 0, parts[2] || 0, 0);
                return d;
            }

            // Try generic date parse
            const tried = new Date(val);
            if (!isNaN(tried.getTime())) return tried;

            return null;
        };

        const normalizeStatus = (status) => {
            if (!status) return 'present';

            const map = {
                present: 'present',
                absent: 'absent',
                leave: 'leave',
                holiday: 'holiday',
                weeklyoff: 'weekly_off',
                weekly_off: 'weekly_off',
                halfday: 'half_day',
                half_day: 'half_day',
                missedpunch: 'missed_punch',
                missed_punch: 'missed_punch'
            };

            const key = normalize(status);
            return map[key] || 'present';
        };

        /* --------------- Main Loop --------------- */

        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const rowIdx = i + 2; // header + 1-indexed

            try {
                let empIdVal = '';
                let dateVal = null;
                let statusVal = '';
                let checkInVal = null;
                let checkOutVal = null;
                let workingHoursVal = null;
                let overtimeHoursVal = null;
                let isLateVal = null; // Use null to detect if provided
                let isEarlyOutVal = null;
                let leaveTypeVal = '';

                for (const key of Object.keys(row)) {
                    const normKey = normalize(key);
                    const val = row[key];

                    if (
                        normKey.includes('employeeid') ||
                        normKey.includes('empid') ||
                        normKey.includes('employeecode') ||
                        normKey === 'code'
                    ) {
                        empIdVal = val ? val.toString().trim() : '';
                    } else if (
                        normKey.includes('date') ||
                        normKey.includes('attendancedate') ||
                        normKey.includes('punchdate')
                    ) {
                        dateVal = val;
                    } else if (normKey === 'status') {
                        statusVal = val;
                    } else if (normKey.includes('checkin') || normKey.includes('punchin') || normKey === 'in') {
                        checkInVal = val;
                    } else if (normKey.includes('checkout') || normKey.includes('punchout') || normKey === 'out') {
                        checkOutVal = val;
                    } else if (normKey.includes('workinghours')) {
                        // Handle potential Excel fraction for working hours
                        if (typeof val === 'number' && val > 0 && val < 1) {
                            workingHoursVal = parseFloat((val * 24).toFixed(2));
                        } else {
                            workingHoursVal = parseNumber(val);
                        }
                    } else if (normKey.includes('overtimehours')) {
                        if (typeof val === 'number' && val > 0 && val < 1) {
                            overtimeHoursVal = parseFloat((val * 24).toFixed(2));
                        } else {
                            overtimeHoursVal = parseNumber(val);
                        }
                    } else if (normKey.includes('islate')) {
                        isLateVal = parseBoolean(val);
                    } else if (normKey.includes('isearly')) {
                        isEarlyOutVal = parseBoolean(val);
                    } else if (normKey.includes('leavetype')) {
                        leaveTypeVal = val ? val.toString().trim().toLowerCase() : '';
                    }
                }

                if (!empIdVal) throw new Error("Employee ID is missing");
                if (!dateVal) throw new Error("Date is missing");

                const employee = await Employee.findOne({
                    tenant: tenantId,
                    $or: [{ employeeId: empIdVal }, { customId: empIdVal }]
                });

                if (!employee) {
                    throw new Error(`Employee not found: ${empIdVal}`);
                }

                const attendanceDate = parseDate(dateVal);
                if (!attendanceDate) {
                    throw new Error(`Invalid date format: ${dateVal}`);
                }
                attendanceDate.setHours(0, 0, 0, 0);

                const checkInTime = parseTime(checkInVal, attendanceDate);
                const checkOutTime = parseTime(checkOutVal, attendanceDate);

                const finalStatus = normalizeStatus(statusVal);

                let attendance = await Attendance.findOne({
                    tenant: tenantId,
                    employee: employee._id,
                    date: attendanceDate
                });

                if (!attendance) {
                    attendance = new Attendance({
                        tenant: tenantId,
                        employee: employee._id,
                        date: attendanceDate
                    });
                }

                attendance.status = finalStatus;
                attendance.checkIn = checkInTime;
                attendance.checkOut = checkOutTime;
                attendance.leaveType = leaveTypeVal;
                attendance.ipAddress = req.ip || '0.0.0.0';
                attendance.userAgent = req.get('user-agent') || '';
                attendance.updatedBy = userId;
                attendance.isManualOverride = true;
                attendance.overrideReason = "Bulk Upload";

                // Sync Logs for consistency
                if (checkInTime || checkOutTime) {
                    attendance.logs = [];
                    if (checkInTime) attendance.logs.push({ time: checkInTime, type: 'IN', location: 'Bulk Upload', device: 'System' });
                    if (checkOutTime) attendance.logs.push({ time: checkOutTime, type: 'OUT', location: 'Bulk Upload', device: 'System' });
                }

                // Calculate working hours if not provided
                if (workingHoursVal !== null) {
                    attendance.workingHours = workingHoursVal;
                } else if (attendance.logs.length >= 2) {
                    attendance.workingHours = calculateWorkingHours(attendance.logs);
                }

                if (overtimeHoursVal !== null) {
                    attendance.overtimeHours = overtimeHoursVal;
                }

                // Handle Lateness
                if (isLateVal !== null) {
                    attendance.isLate = isLateVal;
                } else if (checkInTime && settings.shiftStartTime) {
                    const [h, m] = settings.shiftStartTime.split(':').map(Number);
                    const shiftStart = new Date(attendanceDate);
                    shiftStart.setHours(h, m, 0, 0);
                    const grace = settings.graceTimeMinutes || 0;
                    if (checkInTime > new Date(shiftStart.getTime() + grace * 60000)) {
                        attendance.isLate = true;
                    } else {
                        attendance.isLate = false;
                    }
                }

                // Handle Early Out
                if (isEarlyOutVal !== null) {
                    attendance.isEarlyOut = isEarlyOutVal;
                } else if (checkOutTime && settings.shiftEndTime) {
                    const [h, m] = settings.shiftEndTime.split(':').map(Number);
                    const shiftEnd = new Date(attendanceDate);
                    shiftEnd.setHours(h, m, 0, 0);
                    if (checkOutTime < shiftEnd) {
                        attendance.isEarlyOut = true;
                    } else {
                        attendance.isEarlyOut = false;
                    }
                }

                await attendance.save();
                results.uploadedCount++;

            } catch (err) {
                results.failedCount++;
                results.errors.push(`Row ${rowIdx}: ${err.message}`);
            }
        }

        return res.json({
            success: true,
            uploadedCount: results.uploadedCount,
            failedCount: results.failedCount,
            errors: results.errors,
            message: `Uploaded ${results.uploadedCount} records successfully` +
                (results.failedCount ? ` (${results.failedCount} failed)` : '')
        });

    } catch (error) {
        console.error("Bulk upload error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Error uploading records"
        });
    }
};


exports.registerFace = async (req, res) => {
    try {
        const { faceEmbedding, registrationNotes, consentGiven, employeeName } = req.body;
        const userId = req.user?.id; // MUST use authenticated user, NOT user input
        const tenantId = req.tenantId;

        console.log('📝 registerFace called with:', {
            embeddingLength: faceEmbedding?.length,
            consentGiven,
            userId: userId,
            tenantId
        });

        // DEBUG: Log embedding details BEFORE encryption
        if (faceEmbedding && Array.isArray(faceEmbedding)) {
            console.log('📊 REGISTRATION EMBEDDING (INCOMING):');
            console.log('   Length:', faceEmbedding.length);
            console.log('   Sum:', faceEmbedding.reduce((a, b) => a + b, 0).toFixed(4));
            console.log('   Mean:', (faceEmbedding.reduce((a, b) => a + b, 0) / faceEmbedding.length).toFixed(4));
            console.log('   First 10:', faceEmbedding.slice(0, 10).map(v => v.toFixed(6)));
            console.log('   Last 10:', faceEmbedding.slice(118).map(v => v.toFixed(6)));
        }

        // --------- SECURITY CHECK: User must be authenticated ----------
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please login first.'
            });
        }

        // --------- VALIDATION ----------
        if (!Array.isArray(faceEmbedding) || faceEmbedding.length !== 128) {
            return res.status(400).json({
                success: false,
                message: `Valid 128-dimensional face embedding is required. Got ${faceEmbedding?.length || 0} dimensions.`
            });
        }

        // Validate all values are numbers
        const isValidEmbedding = faceEmbedding.every(val => typeof val === 'number' && !isNaN(val));
        if (!isValidEmbedding) {
            return res.status(400).json({
                success: false,
                message: 'Invalid face embedding: contains non-numeric values'
            });
        }

        if (!consentGiven) {
            return res.status(400).json({
                success: false,
                message: 'Consent must be given for face registration'
            });
        }

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        const { FaceData, FaceUpdateRequest } = getModels(req);

        // Check if employee already registered (any status to prevent bypass via deletion/inactivation)
        const existingFace = await FaceData.findOne({
            tenant: tenantId,
            employee: userId
        });

        let approvedRequest = null;
        if (existingFace) {
            console.log('⚠️ Face already registered for employee:', userId);

            // Check for approved update request
            approvedRequest = await FaceUpdateRequest.findOne({
                tenant: tenantId,
                employee: userId,
                status: 'approved'
            });

            if (!approvedRequest) {
                return res.status(403).json({
                    success: false,
                    message: 'Face already registered. Please request an update from HR to change it.'
                });
            }

            // Allow update - delete old registration
            await FaceData.deleteOne({ _id: existingFace._id });
            console.log('✅ Old face registration deleted for update');
        }

        // Mock quality & detection metrics
        const quality = { sharpness: 75, brightness: 120, contrast: 45, confidence: 92 };
        const detection = { bbox: { x: 50, y: 50, width: 200, height: 250 } };

        // --------- ENCRYPT EMBEDDING ----------
        const faceRecognitionService = FaceRecognitionService;
        let encryptedEmbedding;
        try {
            encryptedEmbedding = faceRecognitionService.encryptEmbedding(
                faceEmbedding,
                ENCRYPTION_KEY
            );
            console.log('📝 Registration Encryption Details:');
            // console.log('   Employee ID:', userId);
            // console.log('   Embedding Length:', faceEmbedding.length);
            // console.log('   First 5 values:', faceEmbedding.slice(0, 5).map(v => v.toFixed(4)));
            // console.log('   Encrypted Key Present:', !!encryptedEmbedding.encrypted);
            // console.log('   IV Present:', !!encryptedEmbedding.iv);
            // console.log('   AuthTag Present:', !!encryptedEmbedding.authTag);
            console.log('✅ Embedding encrypted successfully');
        } catch (encryptErr) {
            console.error('❌ Encryption failed:', encryptErr);
            return res.status(500).json({
                success: false,
                message: 'Failed to encrypt face data'
            });
        }

        // --------- CREATE FACE RECORD ----------
        const faceData = new FaceData({
            tenant: tenantId,
            employee: userId,
            faceEmbedding: encryptedEmbedding, // encrypted object with iv, encrypted, authTag
            quality,
            detection,
            registration: {
                registeredAt: new Date(),
                registeredBy: userId,
                registrationNotes: registrationNotes || `Registered by ${employeeName || 'Self'}`,
                deviceInfo: req.headers['user-agent'] || 'Unknown',
                ipAddress: req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || 'Unknown',
                consentVersion: 1,
                consentGiven: true,
                consentGivenAt: new Date()
            },
            status: 'ACTIVE',
            isVerified: true,
            verification: {
                verifiedAt: new Date(),
                verifiedBy: userId
            },
            liveness: { status: 'PASSED', confidence: 90, method: 'TEXTURE' },
            model: { name: 'facenet-mobilenet-v2', version: '1.0.0', generatedAt: new Date() }
        });

        await faceData.save();

        // Mark request as used if it was an update
        if (approvedRequest) {
            approvedRequest.status = 'used';
            await approvedRequest.save();
        }

        res.status(201).json({
            success: true,
            message: 'Face registered successfully',
            data: {
                faceDataId: faceData._id,
                employeeId: faceData.employee,
                registeredAt: faceData.registration.registeredAt
            }
        });

    } catch (err) {
        console.error('Face registration error:', err);
        res.status(500).json({
            success: false,
            message: 'Face registration failed',
            error: err.message
        });
    }
};

function decryptEmbedding(encrypted) {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const data = Buffer.from(encrypted.data, 'hex');
    const tag = Buffer.from(encrypted.tag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_FACE_KEY, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final()
    ]);

    return JSON.parse(decrypted.toString());
}

function euclideanDistance(a, b) {
    // Validate inputs
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        console.error('❌ EUCLIDEAN DISTANCE ERROR: Invalid input arrays');
        return Infinity; // Return invalid value to trigger rejection
    }

    let sumSquares = 0;

    for (let i = 0; i < a.length; i++) {
        if (typeof a[i] !== 'number' || typeof b[i] !== 'number') {
            console.error(`❌ EUCLIDEAN DISTANCE ERROR: Non-numeric value at index ${i}`);
            return Infinity;
        }
        const diff = a[i] - b[i];
        sumSquares += diff * diff;
    }

    const distance = Math.sqrt(sumSquares);

    // Validate distance is reasonable
    if (!isFinite(distance)) {
        console.error('❌ EUCLIDEAN DISTANCE ERROR: Invalid distance calculated');
        return Infinity;
    }

    return distance;
}

function isValidLocation(location) {
    return (
        location &&
        typeof location.lat === 'number' &&
        typeof location.lng === 'number'
    );
}

function isValidLocation(loc) {
    return loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
}

exports.verifyFaceAttendance = async (req, res) => {
    try {
        const { faceEmbedding, location } = req.body;
        const employeeId = req.user.id;
        const tenantId = req.tenantId;

        // ---------- VALIDATION ----------
        if (!Array.isArray(faceEmbedding) || faceEmbedding.length !== 128) {
            return res.status(400).json({
                success: false,
                message: `Valid 128-dimensional face embedding is required. Got ${faceEmbedding?.length || 0}.`
            });
        }

        // Validate all values are numbers
        const isValidEmbedding = faceEmbedding.every(val => typeof val === 'number' && !isNaN(val));
        if (!isValidEmbedding) {
            return res.status(400).json({
                success: false,
                message: 'Invalid embedding: contains non-numeric values'
            });
        }

        if (!isValidLocation(location)) {
            return res.status(400).json({
                success: false,
                message: 'Valid location data is required'
            });
        }

        const { FaceData, Attendance, Employee, AttendanceSettings } = getModels(req);

        // ---------- FETCH REGISTERED FACE ----------
        const registeredFace = await FaceData.findOne({
            tenant: tenantId,
            employee: employeeId,
            status: 'ACTIVE'
        });

        if (!registeredFace) {
            console.log('❌ FACE REJECTED - No registered face found for employee:', employeeId);
            return res.status(404).json({
                success: false,
                message: 'Face not registered for this employee. Please register first.'
            });
        }

        // Verify face belongs to current employee
        if (registeredFace.employee.toString() !== employeeId.toString()) {
            console.log('❌ FACE REJECTED - Face does not belong to current employee');
            console.log('   Registered to:', registeredFace.employee.toString());
            console.log('   Current user:', employeeId.toString());
            return res.status(403).json({
                success: false,
                message: 'Face does not belong to your account. Access denied.',
                status: 'REJECTED'
            });
        }

        // ---------- DECRYPT STORED EMBEDDING ----------
        const faceRecognitionService = FaceRecognitionService;
        let storedEmbedding;

        try {
            storedEmbedding = faceRecognitionService.decryptEmbedding(
                registeredFace.faceEmbedding,
                ENCRYPTION_KEY
            );
            console.log('✅ Embedding decrypted successfully for comparison');
        } catch (err) {
            console.error('❌ Failed to decrypt stored embedding:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify face - decryption error'
            });
        }

        // Ensure decrypted is an array
        if (!Array.isArray(storedEmbedding)) {
            console.error('❌ Decrypted embedding is not an array:', typeof storedEmbedding);
            return res.status(500).json({
                success: false,
                message: 'Invalid stored embedding format'
            });
        }

        // Validate decrypted embedding is properly formed
        if (storedEmbedding.length !== 128) {
            console.error('❌ Decrypted embedding has wrong dimension:', storedEmbedding.length);
            return res.status(500).json({
                success: false,
                message: 'Invalid stored embedding dimensions'
            });
        }

        const isValidDecryptedEmbedding = storedEmbedding.every(val => typeof val === 'number' && !isNaN(val));
        if (!isValidDecryptedEmbedding) {
            console.error('❌ Decrypted embedding contains invalid values');
            return res.status(500).json({
                success: false,
                message: 'Invalid stored embedding values'
            });
        }

        const distance = euclideanDistance(
            faceEmbedding,
            storedEmbedding
        );

        console.log("Goted Distance :- ", distance);

        console.log('\n' + '='.repeat(80));
        console.log('🔍 CRITICAL: FACE MATCHING VALIDATION');
        console.log('='.repeat(80));
        console.log('Employee ID:', employeeId);
        console.log('Tenant ID:', tenantId);
        console.log('');
        console.log('INCOMING EMBEDDING:');
        // console.log('  - Length:', faceEmbedding.length);
        // console.log('  - First 10 values:', faceEmbedding.slice(0, 10).map(v => parseFloat(v.toFixed(6))));
        // console.log('  - Sum:', faceEmbedding.reduce((a, b) => a + b, 0).toFixed(4));
        // console.log('  - Mean:', (faceEmbedding.reduce((a, b) => a + b, 0) / faceEmbedding.length).toFixed(4));
        // console.log('');
        console.log('STORED EMBEDDING:');
        // console.log('  - Length:', storedEmbedding.length);
        // console.log('  - First 10 values:', storedEmbedding.slice(0, 10).map(v => parseFloat(v.toFixed(6))));
        // console.log('  - Sum:', storedEmbedding.reduce((a, b) => a + b, 0).toFixed(4));
        // console.log('  - Mean:', (storedEmbedding.reduce((a, b) => a + b, 0) / storedEmbedding.length).toFixed(4));
        // console.log('');
        console.log('DISTANCE SCORE:');
        console.log('  - Euclidean Distance:', distance);
        console.log('  - Distance (formatted):', distance.toFixed(6));
        console.log('  - Is Valid Number?:', !isNaN(distance) && isFinite(distance));
        console.log('');
        console.log('THRESHOLD CHECK:');
        console.log('  - Maximum Distance Threshold:', FACE_MATCH_THRESHOLD);
        console.log('  - Distance <= Threshold?:', distance <= FACE_MATCH_THRESHOLD);
        console.log('  - Difference from Threshold:', (FACE_MATCH_THRESHOLD - distance).toFixed(6));
        console.log('='.repeat(80) + '\n');

        // CRITICAL CHECK 1: Distance must be a valid number
        if (!isFinite(distance)) {
            console.log('❌ CRITICAL REJECTION - Distance is not a valid number:', distance);
            return res.status(500).json({
                success: false,
                message: 'Face comparison failed - invalid distance calculation',
                status: 'REJECTED'
            });
        }

        // CRITICAL CHECK 2: Distance must be BELOW OR EQUAL threshold to match
        if (distance > FACE_MATCH_THRESHOLD) {
            console.log('❌ FACE REJECTED - DISTANCE TOO HIGH');
            console.log('   Incoming face does NOT match registered face');
            console.log(`   Distance: ${distance.toFixed(6)} > Threshold: ${FACE_MATCH_THRESHOLD}`);
            return res.status(403).json({
                success: false,
                message: 'Face verification FAILED. Face mismatch.',
                details: `Face does not match registered template (Score: ${distance.toFixed(3)})`,
                debug: {
                    distance: Number(distance.toFixed(6)),
                    threshold: FACE_MATCH_THRESHOLD
                }
            });
        }

        console.log(`✅ FACE APPROVED - Distance: ${distance.toFixed(6)} is acceptable`);

        console.log(tenantId);
        // ---------- EMPLOYEE ----------
        const employee = await Employee.findById(employeeId).lean();

        // Use the master Tenant model imported at the top of the file
        // Use findOne({ tenant: tenantId }) because tenantId is a field, not the document's _id
        const attendanceSettings = await AttendanceSettings.findOne({ tenant: tenantId }).lean();

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        // ---------- LOCATION ACCURACY ----------
        // Default: 150m (increased from 100m for better real-world GPS performance)
        // Grace margin: 20% tolerance for GPS fluctuations

        console.log("attendanceSettings ", attendanceSettings)

        const baseAllowedAccuracy = attendanceSettings?.allowedAccuracy || 100;
        const graceMargin = 1.2; // 20% tolerance
        const effectiveAllowedAccuracy = baseAllowedAccuracy * graceMargin;

        console.log('📍 Location Accuracy Check:', {
            received: location.accuracy,
            baseAllowed: baseAllowedAccuracy,
            effectiveAllowed: effectiveAllowedAccuracy,
            withinLimit: location.accuracy <= effectiveAllowedAccuracy
        });

        if (location.accuracy && location.accuracy > effectiveAllowedAccuracy) {
            console.error(`❌ Location accuracy too low: ${location.accuracy}m > ${effectiveAllowedAccuracy}m (base: ${baseAllowedAccuracy}m + 20% grace)`);
            return res.status(400).json({
                success: false,
                message: `Location accuracy too low. Required: ${baseAllowedAccuracy}m (with 20% tolerance: ${effectiveAllowedAccuracy}m), Got: ${Math.round(location.accuracy)}m. Please move to an area with better GPS signal.`,
                details: {
                    receivedAccuracy: Math.round(location.accuracy),
                    requiredAccuracy: baseAllowedAccuracy,
                    effectiveLimit: Math.round(effectiveAllowedAccuracy),
                    reason: 'GPS_ACCURACY_TOO_LOW'
                }
            });
        }

        console.log('✅ Location accuracy acceptable:', location.accuracy, 'm');

        // ---------- ATTENDANCE ----------
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({
            employee: employeeId,
            tenant: tenantId,
            date: today
        });

        if (attendance?.checkIn) {
            return res.status(400).json({ success: false, message: 'Attendance already marked' });
        }

        if (!attendance) {
            attendance = new Attendance({
                tenant: tenantId,
                employee: employeeId,
                date: today,
                status: 'present',
                logs: []
            });
        }

        attendance.checkIn = new Date();
        attendance.logs.push({
            time: new Date(),
            type: 'IN',
            location: `${location.lat},${location.lng}`,
            device: 'Face Recognition',
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });

        await attendance.save();

        // ---------- UPDATE FACE USAGE ----------
        await FaceData.updateOne(
            { _id: registeredFace._id },
            { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
        );

        // ---------- SUCCESS ----------
        res.json({
            success: true,
            message: 'Attendance marked successfully',
            data: { attendanceId: attendance._id, checkInTime: attendance.checkIn, distance: Number(distance.toFixed(4)) }
        });

    } catch (err) {
        console.error('Face attendance error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 🔹 Get Face Registration Status
exports.getFaceStatus = async (req, res) => {
    try {
        const employeeId = req.user?.id || req.body.employeeId;
        const tenantId = req.tenantId;

        if (!employeeId || !tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID and Tenant ID required'
            });
        }

        const { FaceData, FaceUpdateRequest } = getModels(req);

        const faceData = await FaceData.findOne({
            tenant: tenantId,
            employee: employeeId
        }).select('-faceImageData -faceDescriptor -faceEmbedding');

        // Check for approved update requests
        const updateRequest = await FaceUpdateRequest.findOne({
            tenant: tenantId,
            employee: employeeId,
            status: 'approved'
        });

        const canUpdate = !faceData || !!updateRequest;

        if (!faceData) {
            return res.json({
                success: true,
                isRegistered: false,
                canUpdate: true,
                message: 'Face not registered. Please register your face first.'
            });
        }

        res.json({
            success: true,
            isRegistered: true,
            canUpdate: !!updateRequest,
            data: {
                registeredAt: faceData.registration?.registeredAt,
                isVerified: faceData.isVerified,
                usageCount: faceData.usageCount || 0,
                lastUsedAt: faceData.lastUsedAt,
                quality: faceData.quality,
                pendingRequest: await FaceUpdateRequest.findOne({
                    tenant: tenantId,
                    employee: employeeId,
                    status: 'pending'
                })
            }
        });
    } catch (err) {
        console.error('Face status check error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to check face status'
        });
    }
};

// 🔹 Delete Face Registration
exports.deleteFace = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const tenantId = req.tenantId;

        const { FaceData } = getModels(req);

        const result = await FaceData.updateOne(
            {
                tenant: tenantId,
                employee: employeeId
            },
            {
                $set: { status: 'inactive' }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Face registration not found'
            });
        }

        res.json({
            success: true,
            message: 'Face registration deleted successfully'
        });

    } catch (err) {
        console.error('Delete face error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete face registration',
            error: err.message
        });
    }
};

// 10. GET ATTENDANCE BY DATE (Admin/HR) - returns list + summary for the date
exports.getByDate = async (req, res) => {
    try {
        const { Attendance, LeaveRequest, Employee, Holiday, AttendanceSettings } = getModels(req);
        const { date, filterType } = req.query; // filterType: 'total' | 'present' | 'absent' | 'leave'

        if (!date) return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const endOfDate = new Date(targetDate);
        endOfDate.setHours(23, 59, 59, 999);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isFutureDate = targetDate > today;

        // 1. Fetch data
        const allEmployees = await Employee.find({
            tenant: req.tenantId,
            isActive: { $ne: false }
        }).select('firstName lastName employeeId department profilePic').lean();

        const attendanceMap = {};
        const attendanceRecords = await Attendance.find({
            tenant: req.tenantId,
            date: targetDate
        }).lean();
        attendanceRecords.forEach(r => { attendanceMap[String(r.employee)] = r; });

        const leaveMap = {};
        const leaves = await LeaveRequest.find({
            tenant: req.tenantId,
            status: 'Approved',
            startDate: { $lte: endOfDate },
            endDate: { $gte: targetDate }
        }).lean();
        leaves.forEach(l => { leaveMap[String(l.employee)] = l; });

        const holiday = await Holiday.findOne({
            tenant: req.tenantId,
            date: targetDate
        }).lean();

        let settings = await AttendanceSettings.findOne({ tenant: req.tenantId });
        if (!settings) settings = { weeklyOffDays: [0] };
        const { isWeeklyOff } = isWeeklyOffDate({
            date: targetDate,
            settings,
            employeeId: null
        });

        // 2. Compute Statuses for all relevant employees
        // If FUTURE: Only consider employees with leaves (as Total = Leave count rule)
        // If PAST/TODAY: Consider all active employees
        const baseEmployees = isFutureDate
            ? allEmployees.filter(emp => leaveMap[String(emp._id)])
            : allEmployees;

        const processedEmployees = baseEmployees.map(emp => {
            const empId = String(emp._id);
            const att = attendanceMap[empId];
            const leave = leaveMap[empId];

            let status = 'Not Marked';
            let leaveType = leave ? leave.leaveType : null;

            if (isFutureDate) {
                if (leave) status = 'Leave';
                else status = 'Not Marked';
            } else {
                if (holiday) status = 'Holiday';
                else if (isWeeklyOff) status = 'Weekly Off';
                else if (leave) status = 'Leave';
                else if (att) {
                    let s = (att.status || 'Present').toLowerCase();
                    if (s === 'half_day') status = 'Half Day';
                    else if (s === 'missed_punch') status = 'Missed Punch';
                    else status = s.charAt(0).toUpperCase() + s.slice(1);
                } else {
                    status = 'Absent';
                }
            }

            return {
                _id: emp._id,
                employeeId: emp.employeeId,
                name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
                department: emp.department || '-',
                profilePic: emp.profilePic || '/uploads/default-avatar.png',
                status,
                leaveType,
                isFutureDate,
                attendanceRecord: att ? {
                    checkIn: att.checkIn,
                    checkOut: att.checkOut,
                    workingHours: att.workingHours
                } : null
            };
        });

        // 3. Summaries (Rule: For Future, Total = Leave Count)
        const summary = {
            totalEmployees: isFutureDate ? processedEmployees.filter(e => e.status === 'Leave').length : allEmployees.length,
            present: isFutureDate ? 0 : processedEmployees.filter(e => ['Present', 'Half Day', 'On Duty'].includes(e.status)).length,
            absent: isFutureDate ? 0 : processedEmployees.filter(e => e.status === 'Absent').length,
            onLeave: processedEmployees.filter(e => e.status === 'Leave').length,
            isFutureDate
        };

        // 4. Filtering by filterType (Summary Card Click)
        let filteredEmployees = processedEmployees;
        if (filterType && filterType !== 'total') {
            if (filterType === 'present') {
                filteredEmployees = processedEmployees.filter(e => ['Present', 'Half Day', 'On Duty'].includes(e.status));
            } else if (filterType === 'absent') {
                filteredEmployees = processedEmployees.filter(e => e.status === 'Absent');
            } else if (filterType === 'leave') {
                filteredEmployees = processedEmployees.filter(e => e.status === 'Leave');
            }
        }

        return res.json({
            date,
            summary,
            employees: filteredEmployees,
            holiday: holiday ? holiday.name : null
        });

    } catch (error) {
        console.error('getByDate error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getEmployeeDateDetail = async (req, res) => {
    try {
        const { Attendance, LeaveRequest, Employee, Holiday, AttendanceSettings } = getModels(req);
        const { employeeId, date } = req.params;

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const endOfDate = new Date(targetDate);
        endOfDate.setHours(23, 59, 59, 999);

        const employee = await Employee.findOne({ _id: employeeId, tenant: req.tenantId }).lean();
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const attendance = await Attendance.findOne({ employee: employeeId, tenant: req.tenantId, date: targetDate }).lean();
        const leave = await LeaveRequest.findOne({
            employee: employeeId,
            tenant: req.tenantId,
            status: 'Approved',
            startDate: { $lte: endOfDate },
            endDate: { $gte: targetDate }
        }).lean();

        const holiday = await Holiday.findOne({ tenant: req.tenantId, date: targetDate }).lean();
        const settings = await AttendanceSettings.findOne({ tenant: req.tenantId });
        const { isWeeklyOff } = isWeeklyOffDate({
            date: targetDate,
            settings: settings || { weeklyOffDays: [0] },
            employeeId
        });

        res.json({
            employee: {
                name: `${employee.firstName} ${employee.lastName}`,
                employeeId: employee.employeeId,
                department: employee.department,
                designation: employee.designation
            },
            date: targetDate,
            attendance,
            leave,
            holiday,
            isWeeklyOff
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🔹 Request Face Update
exports.requestFaceUpdate = async (req, res) => {
    try {
        const { reason } = req.body;
        const employeeId = req.user.id;
        const tenantId = req.tenantId;

        if (!reason) {
            return res.status(400).json({ success: false, message: 'Reason for update is required' });
        }

        const { FaceUpdateRequest } = getModels(req);

        const existingPending = await FaceUpdateRequest.findOne({
            tenant: tenantId,
            employee: employeeId,
            status: 'pending'
        });

        if (existingPending) {
            return res.status(400).json({ success: false, message: 'You already have a pending request' });
        }

        const request = new FaceUpdateRequest({
            tenant: tenantId,
            employee: employeeId,
            reason
        });

        await request.save();
        res.json({ success: true, message: 'Request submitted successfully' });
    } catch (err) {
        console.error('Face update request error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 🔹 Get Face Update Requests (HR)
exports.getFaceUpdateRequests = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { FaceUpdateRequest } = getModels(req);

        const requests = await FaceUpdateRequest.find({ tenant: tenantId })
            .populate('employee', 'firstName lastName employeeId')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: requests });
    } catch (err) {
        console.error('Get face update requests error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 🔹 Action Face Update Request (HR)
exports.actionFaceUpdate = async (req, res) => {
    try {
        const { requestId, status, rejectionReason } = req.body;
        const tenantId = req.tenantId;
        const actionedBy = req.user.id;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const { FaceUpdateRequest } = getModels(req);

        const request = await FaceUpdateRequest.findOne({ _id: requestId, tenant: tenantId });
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        request.status = status;
        request.actionedBy = actionedBy;
        request.actionedAt = new Date();
        if (rejectionReason) request.rejectionReason = rejectionReason;

        await request.save();
        res.json({ success: true, message: `Request ${status} successfully` });
    } catch (err) {
        console.error('Action face update request error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
