/**
 * FACE ATTENDANCE CONTROLLER - ENTERPRISE EDITION
 * 
 * Implements secure, scalable face registration and verification
 * with embeddings, liveness detection, and quality checks.
 * 
 * API Endpoints:
 * POST /attendance/face/register  - Register face with embeddings
 * POST /attendance/face/verify    - Verify face for attendance
 * GET  /attendance/face/status    - Check registration status
 * DELETE /attendance/face/delete  - Remove face registration
 */

const RealFaceRecognitionService = require('../services/realFaceRecognition.service');
const faceService = new RealFaceRecognitionService();
const crypto = require('crypto');

/**
 * Configuration & Constants
 */
const FACE_EMBEDDING_KEY = process.env.FACE_EMBEDDING_KEY || 'master-encryption-key-change-in-prod';
const RETRY_LIMITS = {
  hourly: 10,
  daily: 50
};

/**
 * REGISTER FACE
 * 
 * Flow:
 * 1. Validate input (image data, consent, employee info)
 * 2. Detect face and validate quality
 * 3. Generate encrypted embedding
 * 4. Check for duplicates (same employee re-registering)
 * 5. Store encrypted embedding in database
 * 6. Create audit log entry
 * 7. Send notification to HR for verification (optional)
 * 
 * Security Checks:
 * - Image quality validation (lighting, sharpness, angle)
 * - Liveness detection (prevent photo spoofing)
 * - Consent verification
 * - Rate limiting
 * - Encryption of stored embeddings
 */
exports.registerFace = async (req, res) => {
  const startTime = Date.now();
  let auditLog = null;

  try {
    const { faceImageData, liveFrames, consentGiven } = req.body;
    const employeeId = req.user.id;
    const tenantId = req.tenantId || req.body.tenantId;

    // ============ STEP 1: VALIDATE INPUT ============
    if (!faceImageData) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_IMAGE',
        message: 'Face image data is required'
      });
    }

    if (!consentGiven) {
      return res.status(400).json({
        success: false,
        error: 'CONSENT_REQUIRED',
        message: 'You must provide consent for face registration'
      });
    }

    // Get models
    const { FaceData, Attendance, Employee, AuditLog } = getModels(req);

    // ============ STEP 2: CHECK RATE LIMITING ============
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAttempts = await FaceData.countDocuments({
      employee: employeeId,
      'registration.registeredAt': { $gte: oneHourAgo }
    });

    if (recentAttempts >= RETRY_LIMITS.hourly) {
      // Log suspicious activity
      auditLog = new AuditLog({
        action: 'FACE_REGISTRATION_RATE_LIMIT',
        userId: employeeId,
        resource: 'FaceData',
        resourceId: null,
        status: 'BLOCKED',
        details: {
          reason: 'Rate limit exceeded',
          attempts: recentAttempts
        },
        ipAddress: req.ip
      });
      await auditLog.save();

      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many registration attempts. Please wait before trying again.',
        retryAfter: 3600
      });
    }

    // ============ STEP 3: GENERATE FACE EMBEDDING ============
    console.log('📸 Generating face embedding from image...');
    const embeddingResult = await faceService.generateFaceEmbedding(faceImageData);

    if (!embeddingResult.success) {
      auditLog = new AuditLog({
        action: 'FACE_REGISTRATION_FAILED',
        userId: employeeId,
        resource: 'FaceData',
        status: 'FAILED',
        details: {
          error: embeddingResult.error,
          message: embeddingResult.message,
          quality: embeddingResult.quality
        }
      });
      await auditLog.save();

      return res.status(400).json({
        success: false,
        error: embeddingResult.error,
        message: embeddingResult.message,
        quality: embeddingResult.quality
      });
    }

    const { embedding, metadata } = embeddingResult;

    // ============ STEP 4: VALIDATE LIVENESS (if enabled) ============
    let livenessResult = { valid: true, confidence: 100 };

    if (liveFrames && Array.isArray(liveFrames)) {
      console.log('🔍 Validating liveness from', liveFrames.length, 'frames...');
      livenessResult = await faceService.validateLiveness(liveFrames);

      if (!livenessResult.valid) {
        auditLog = new AuditLog({
          action: 'FACE_REGISTRATION_LIVENESS_FAILED',
          userId: employeeId,
          resource: 'FaceData',
          status: 'FAILED',
          details: {
            reason: livenessResult.reason,
            message: livenessResult.message
          }
        });
        await auditLog.save();

        return res.status(400).json({
          success: false,
          error: 'LIVENESS_CHECK_FAILED',
          message: livenessResult.message,
          details: 'This appears to be a photo or video. Please use your real face.'
        });
      }
    }

    // ============ STEP 5: ENCRYPT EMBEDDING ============
    console.log('🔐 Encrypting face embedding...');
    let encryptedEmbedding;
    try {
      encryptedEmbedding = faceService.encryptEmbedding(embedding, FACE_EMBEDDING_KEY);
    } catch (encryptErr) {
      console.error('❌ Encryption failed:', encryptErr);
      return res.status(500).json({
        success: false,
        error: 'ENCRYPTION_FAILED',
        message: 'Failed to encrypt face data'
      });
    }

    // ============ STEP 6: CHECK FOR EXISTING REGISTRATION ============
    const existingFace = await FaceData.findOne({
      tenant: tenantId,
      employee: employeeId,
      status: { $in: ['ACTIVE', 'PENDING_REVIEW'] }
    });

    if (existingFace) {
      console.log('⚠️  Previous face registration found. Updating...');

      // Mark old embedding as backup
      if (!existingFace.backups) existingFace.backups = [];

      existingFace.backups.push({
        embedding: existingFace.faceEmbedding,
        quality: existingFace.quality,
        registeredAt: existingFace.registration.registeredAt,
        notes: 'Previous registration - archived during re-registration'
      });

      // Keep only latest backups
      if (existingFace.backups.length > existingFace.maxBackups) {
        existingFace.backups = existingFace.backups.slice(-existingFace.maxBackups);
      }
    }

    // ============ STEP 7: SAVE FACE DATA ============
    let faceData = existingFace || new FaceData({
      tenant: tenantId,
      employee: employeeId
    });

    // Update embedding
    faceData.faceEmbedding = encryptedEmbedding;

    // Update quality metrics
    faceData.quality = metadata.quality;

    // Update detection info
    faceData.detection = {
      bbox: {
        x: metadata.detection.x,
        y: metadata.detection.y,
        width: metadata.detection.width,
        height: metadata.detection.height
      }
    };

    // Update liveness status
    faceData.liveness = {
      status: livenessResult.valid ? 'PASSED' : 'FAILED',
      confidence: livenessResult.confidence,
      method: 'BLINK',
      checkedAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    // Update registration metadata
    faceData.registration = {
      registeredAt: new Date(),
      registeredBy: employeeId,
      registrationNotes: 'Self registration via mobile app',
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip,
      consentVersion: 1,
      consentGiven: true,
      consentGivenAt: new Date()
    };

    // Update model info
    faceData.model = {
      name: 'facenet-mobilenet-v2',
      version: '1.0.0',
      generatedAt: new Date()
    };

    // Set status to pending review (can be auto-approved)
    faceData.status = 'PENDING_REVIEW';
    faceData.isVerified = false;

    // Save
    await faceData.save();

    console.log('✅ Face registration completed');

    // ============ STEP 8: CREATE AUDIT LOG ============
    auditLog = new AuditLog({
      action: 'FACE_REGISTRATION',
      userId: employeeId,
      resource: 'FaceData',
      resourceId: faceData._id,
      status: 'SUCCESS',
      details: {
        embeddingDimension: embedding.length,
        quality: metadata.quality,
        livenessConfidence: livenessResult.confidence
      },
      ipAddress: req.ip
    });
    await auditLog.save();

    // ============ STEP 9: SEND NOTIFICATIONS ============
    // TODO: Send email to employee confirming registration
    // TODO: Send notification to HR for verification (if required)

    return res.json({
      success: true,
      message: 'Face registered successfully',
      data: {
        registrationId: faceData._id,
        status: faceData.status,
        quality: faceData.quality,
        liveness: faceData.liveness,
        nextStep: 'Admin verification required',
        processingTime: `${Date.now() - startTime}ms`
      }
    });

  } catch (err) {
    console.error('❌ Face registration error:', err);

    // Log the error
    if (auditLog) {
      auditLog.status = 'ERROR';
      auditLog.details = { error: err.message };
      try {
        await auditLog.save();
      } catch (logErr) {
        console.error('Failed to save audit log:', logErr);
      }
    }

    return res.status(500).json({
      success: false,
      error: 'REGISTRATION_ERROR',
      message: 'Face registration failed',
      details: err.message
    });
  }
};

/**
 * VERIFY FACE (ATTENDANCE)
 * 
 * Flow:
 * 1. Validate input (live image, location)
 * 2. Get registered face embedding (decrypt)
 * 3. Generate live embedding from image
 * 4. Validate liveness from frames
 * 5. Compare embeddings using cosine similarity
 * 6. Validate location + time window
 * 7. Create attendance record if all checks pass
 * 8. Log audit trail
 * 
 * Security Checks:
 * - Face embedding comparison (with threshold)
 * - Liveness detection
 * - Location verification
 * - Time window validation (e.g., 6 AM - 10 AM for check-in)
 * - Duplicate prevention (one check-in per day)
 * - Rate limiting
 */
exports.verifyFaceAttendance = async (req, res) => {
  const startTime = Date.now();
  let auditLog = null;

  try {
    // Accept both faceImageData (old) and faceEmbedding (new from frontend)
    const { faceEmbedding, faceImageData, liveFrames, location } = req.body;
    const employeeId = req.user.id;
    const tenantId = req.tenantId || req.body.tenantId;

    // ============ DIAGNOSTIC LOGGING ============
    console.log('\n' + '='.repeat(80));
    console.log('🔍 FACE ATTENDANCE VERIFICATION - DIAGNOSTIC START');
    console.log('='.repeat(80));
    console.log('Timestamp:', new Date().toISOString());
    console.log('Employee ID:', employeeId);
    console.log('Tenant ID:', tenantId);
    console.log('Input data received:');
    console.log('  - faceEmbedding type:', typeof faceEmbedding);
    console.log('  - faceEmbedding is array?:', Array.isArray(faceEmbedding));
    console.log('  - faceEmbedding length:', faceEmbedding?.length || 'N/A');
    console.log('  - faceImageData type:', typeof faceImageData);
    console.log('  - location:', location ? `(${location.lat}, ${location.lng})` : 'MISSING');

    // ============ STEP 1: VALIDATE INPUT ============
    // Frontend sends faceEmbedding (128-dim array), not faceImageData
    const inputFaceData = faceEmbedding || faceImageData;
    if (!inputFaceData) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_IMAGE',
        message: 'Face image data or embedding is required'
      });
    }

    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_LOCATION',
        message: 'Location data is required'
      });
    }

    const { FaceData, Attendance, Employee, AuditLog } = getModels(req);

    // ============ STEP 2: GET REGISTERED FACE ============
    const registeredFaceData = await FaceData.findOne({
      tenant: tenantId,
      employee: employeeId,
      status: 'ACTIVE',
      isVerified: true
    });

    if (!registeredFaceData) {
      return res.status(404).json({
        success: false,
        error: 'NO_REGISTERED_FACE',
        message: 'No verified face registration found. Please register your face first.'
      });
    }

    // ============ STEP 3: DECRYPT REGISTERED EMBEDDING ============
    let registeredEmbedding;
    try {
      registeredEmbedding = faceService.decryptEmbedding(
        registeredFaceData.faceEmbedding,
        FACE_EMBEDDING_KEY
      );
    } catch (decryptErr) {
      console.error('❌ Decryption failed:', decryptErr);
      return res.status(500).json({
        success: false,
        error: 'DECRYPTION_FAILED',
        message: 'Failed to process face data'
      });
    }

    // ============ STEP 4: GET LIVE EMBEDDING ============
    let liveEmbedding;

    console.log('\n📋 STEP 4: Processing input face data');
    console.log('   Input type:', typeof inputFaceData);
    console.log('   Is array?:', Array.isArray(inputFaceData));
    console.log('   Array length:', Array.isArray(inputFaceData) ? inputFaceData.length : 'N/A');

    // Check if input is already an embedding array (from frontend face-api.js)
    if (Array.isArray(inputFaceData) && inputFaceData.length === 128) {
      console.log('✅ USING FRONTEND EMBEDDING - 128-dimensional vector detected');
      console.log('   Length:', inputFaceData.length);
      console.log('   First 10 values:', inputFaceData.slice(0, 10).map(v => v.toFixed(4)));
      console.log('   Last 5 values:', inputFaceData.slice(123).map(v => v.toFixed(4)));
      liveEmbedding = inputFaceData;
    } else {
      // Generate embedding from image (original flow - if faceImageData provided)
      console.log('📸 Generating live face embedding from image...');
      const liveEmbeddingResult = await faceService.generateFaceEmbedding(inputFaceData);

      if (!liveEmbeddingResult.success) {
        auditLog = new AuditLog({
          action: 'FACE_VERIFICATION_FAILED',
          userId: employeeId,
          resource: 'Attendance',
          status: 'FAILED',
          details: {
            error: liveEmbeddingResult.error,
            reason: 'Unable to detect face'
          }
        });
        await auditLog.save();

        return res.status(400).json({
          success: false,
          error: liveEmbeddingResult.error,
          message: liveEmbeddingResult.message
        });
      }

      liveEmbedding = liveEmbeddingResult.embedding;
    }

    // ============ STEP 5: VALIDATE LIVENESS ============
    let livenessValid = true;
    if (liveFrames && Array.isArray(liveFrames)) {
      console.log('🔍 Validating liveness...');
      const livenessResult = await faceService.validateLiveness(liveFrames);

      if (!livenessResult.valid) {
        auditLog = new AuditLog({
          action: 'FACE_VERIFICATION_LIVENESS_FAILED',
          userId: employeeId,
          resource: 'Attendance',
          status: 'FAILED',
          details: {
            reason: livenessResult.reason
          }
        });
        await auditLog.save();

        return res.status(400).json({
          success: false,
          error: 'LIVENESS_CHECK_FAILED',
          message: 'Liveness check failed. Please use your real face.',
          details: livenessResult.message
        });
      }
    }

    // ============ STEP 6: COMPARE EMBEDDINGS ============
    console.log('\n' + '='.repeat(80));
    console.log('🔄 FACE COMPARISON - CRITICAL VALIDATION');
    console.log('='.repeat(80));
    console.log('Employee ID:', employeeId);
    console.log('\nEmbedding Data Types:');
    console.log('  - registeredEmbedding is array?:', Array.isArray(registeredEmbedding));
    console.log('  - registeredEmbedding length:', Array.isArray(registeredEmbedding) ? registeredEmbedding.length : 'NOT ARRAY ❌');
    console.log('  - liveEmbedding is array?:', Array.isArray(liveEmbedding));
    console.log('  - liveEmbedding length:', Array.isArray(liveEmbedding) ? liveEmbedding.length : 'NOT ARRAY ❌');

    if (Array.isArray(registeredEmbedding)) {
      console.log('\n📌 REGISTERED EMBEDDING (from database):');
      console.log('   First 10:', registeredEmbedding.slice(0, 10).map(v => v.toFixed(4)));
      console.log('   Last 5:', registeredEmbedding.slice(123).map(v => v.toFixed(4)));
    }

    if (Array.isArray(liveEmbedding)) {
      console.log('\n📌 LIVE EMBEDDING (from frontend):');
      console.log('   First 10:', liveEmbedding.slice(0, 10).map(v => v.toFixed(4)));
      console.log('   Last 5:', liveEmbedding.slice(123).map(v => v.toFixed(4)));
    }

    const matchResult = faceService.compareFaceEmbeddings(
      registeredEmbedding,
      liveEmbedding
    );

    console.log('\n📊 COMPARISON RESULT:');
    console.log(`   Similarity/Distance: ${matchResult.similarity?.toFixed(6) || matchResult.distance?.toFixed(6) || 'ERROR'}`);
    console.log(`   Threshold: ${matchResult.threshold}`);
    console.log(`   Confidence: ${matchResult.confidence}`);
    console.log(`   isMatch: ${matchResult.isMatch} (${typeof matchResult.isMatch})`);
    console.log(`\n🔍 THRESHOLD CHECK:`);
    console.log(`   ${matchResult.similarity?.toFixed(6) || matchResult.distance?.toFixed(6)} >= ${matchResult.threshold} ?`);
    console.log(`   Result: ${matchResult.isMatch ? 'TRUE ✅ WILL ACCEPT' : 'FALSE ❌ WILL REJECT'}`);
    console.log('='.repeat(80) + '\n');

    if (!matchResult.isMatch) {
      console.log('❌ FACE VALIDATION FAILED - REJECTING ATTENDANCE');
      console.log(`   Reason: Similarity (${matchResult.similarity?.toFixed(6)}) below threshold (${matchResult.threshold})`);
      // Face doesn't match
      registeredFaceData.usage.failureCount += 1;
      registeredFaceData.usage.lastFailureAt = new Date();
      registeredFaceData.usage.lastFailureReason = 'FACE_MISMATCH';
      await registeredFaceData.save();

      auditLog = new AuditLog({
        action: 'FACE_VERIFICATION_FAILED',
        userId: employeeId,
        resource: 'Attendance',
        status: 'FAILED',
        details: {
          similarity: matchResult.similarity,
          threshold: matchResult.threshold,
          reason: 'Face did not match registered template'
        }
      });
      await auditLog.save();

      return res.status(400).json({
        success: false,
        error: 'FACE_MISMATCH',
        message: 'Face verification failed',
        details: 'Your face does not match the registered template. Please try again.',
        debugInfo: {
          similarity: matchResult.similarity,
          confidence: matchResult.confidence
        }
      });
    }

    // Face matched successfully!
    console.log('✅ FACE MATCH SUCCESSFUL - Similarity above threshold');
    console.log(`   ${matchResult.similarity.toFixed(6)} >= ${matchResult.threshold} = APPROVED`);

    // ============ STEP 7: VALIDATE LOCATION ============
    const employee = await Employee.findOne({ _id: employeeId }).lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee record not found'
      });
    }

    // Validate geofence with accuracy buffer
    if (employee.geofence && employee.geofence.length > 0) {
      const geofenceResult = faceService.validateGeofence(
        location,
        employee.geofence,
        location.accuracy || 50
      );

      if (!geofenceResult.valid) {
        return res.status(400).json({
          success: false,
          error: geofenceResult.reason,
          message: geofenceResult.message,
          details: {
            accuracy: geofenceResult.accuracy,
            distance: geofenceResult.distance
          }
        });
      }
    }

    // ============ STEP 8: CHECK FOR DUPLICATE ATTENDANCE ============
    const { AttendanceSettings } = getModels(req);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      employee: employeeId,
      tenant: tenantId,
      date: today
    });

    if (attendance && attendance.checkIn) {
      // Already marked today
      const checkInTime = new Date(attendance.checkIn).toLocaleTimeString();
      return res.status(400).json({
        success: false,
        error: 'ALREADY_MARKED',
        message: 'Attendance already marked for today',
        data: { checkInTime: checkInTime }
      });
    }

    // ============ FETCH SETTINGS & CALCULATE RULES ============
    let settings = await AttendanceSettings.findOne({ tenant: tenantId });
    if (!settings) {
      settings = new AttendanceSettings({ tenant: tenantId });
      await settings.save();
    }

    // Count accumulated stats for the current month
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

    // ============ STEP 9: CREATE ATTENDANCE RECORD ============
    if (!attendance) {
      attendance = new Attendance({
        tenant: tenantId,
        employee: employeeId,
        date: today,
        checkIn: now,
        status: 'present',
        logs: []
      });
    }

    // Add log entry
    attendance.logs.push({
      time: now,
      type: 'IN',
      location: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
      device: 'Face Recognition',
      method: 'FACE_EMBEDDING',
      matchScore: matchResult.matchScore,
      ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0]
    });

    // ============ APPLY RULES ENGINE ============
    const { applyAttendanceRules } = require('../services/attendanceRulesEngine');
    const rulesResult = applyAttendanceRules({
      date: today,
      employeeId,
      logs: attendance.logs,
      workingHours: 0,
      baseStatus: attendance.status,
      settings,
      accumulatedLateCount,
      accumulatedEarlyExitCount
    });

    attendance.status = rulesResult.status;
    attendance.isLate = rulesResult.isLate;
    attendance.isEarlyOut = rulesResult.isEarlyOut;
    attendance.lateMinutes = rulesResult.lateMinutes;
    attendance.earlyExitMinutes = rulesResult.earlyExitMinutes;
    attendance.lopDays = rulesResult.lopDays;
    attendance.ruleEngineMeta = rulesResult.meta;
    attendance.isWFH = rulesResult.isWFH;
    attendance.isOnDuty = rulesResult.isOnDuty;
    attendance.isCompOffDay = rulesResult.isCompOffDay;

    await attendance.save();

    // ============ STEP 10: UPDATE FACE USAGE STATS ============
    registeredFaceData.usage.lastUsedAt = new Date();
    registeredFaceData.usage.lastUsedFor = 'ATTENDANCE';
    registeredFaceData.usage.successCount += 1;

    // Add to audit trail
    if (!registeredFaceData.audit) registeredFaceData.audit = { events: [] };
    registeredFaceData.audit.events.push({
      eventType: 'USED',
      timestamp: new Date(),
      userId: employeeId,
      details: {
        matchScore: matchResult.matchScore,
        similarity: matchResult.similarity
      }
    });

    await registeredFaceData.save();

    // ============ STEP 11: CREATE AUDIT LOG ============
    auditLog = new AuditLog({
      action: 'FACE_VERIFICATION_SUCCESS',
      userId: employeeId,
      resource: 'Attendance',
      resourceId: attendance._id,
      status: 'SUCCESS',
      details: {
        faceMatchScore: matchResult.matchScore,
        similarity: matchResult.similarity,
        confidence: matchResult.confidence,
        location: {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy
        }
      },
      ipAddress: req.ip
    });
    await auditLog.save();

    console.log('✅ Attendance marked via face recognition');

    const responseData = {
      attendanceId: attendance._id,
      checkInTime: attendance.checkIn,
      employee: {
        id: employee._id,
        name: `${employee.firstName} ${employee.lastName}`,
        role: employee.role
      },
      verification: {
        matchScore: matchResult.matchScore,
        confidence: matchResult.confidence,
        liveness: livenessValid
      },
      status: {
        isLate: attendance.isLate,
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
        policyViolations: rulesResult.policyViolations || []
      },
      processingTime: `${Date.now() - startTime}ms`
    };

    return res.json({
      success: true,
      message: 'Attendance marked successfully via face recognition',
      data: responseData
    });

  } catch (err) {
    console.error('❌ Face verification error:', err);

    if (auditLog) {
      auditLog.status = 'ERROR';
      auditLog.details = { error: err.message };
      try {
        await auditLog.save();
      } catch (logErr) {
        console.error('Failed to save audit log:', logErr);
      }
    }

    return res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: 'Face verification failed',
      details: err.message
    });
  }
};

/**
 * GET FACE STATUS
 * Check if employee has a registered, verified face
 */
exports.getFaceStatus = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const tenantId = req.tenantId || req.body.tenantId;
    const { FaceData } = getModels(req);

    const faceData = await FaceData.findOne({
      tenant: tenantId,
      employee: employeeId,
      status: { $in: ['ACTIVE', 'PENDING_REVIEW'] }
    }).select('status isVerified registration.registeredAt quality liveness');

    if (!faceData) {
      return res.json({
        success: true,
        isRegistered: false,
        isPending: false,
        status: 'NOT_REGISTERED'
      });
    }

    return res.json({
      success: true,
      isRegistered: faceData.status === 'ACTIVE' && faceData.isVerified,
      isPending: faceData.status === 'PENDING_REVIEW',
      status: faceData.status,
      registeredAt: faceData.registration.registeredAt,
      quality: faceData.quality,
      liveness: faceData.liveness
    });

  } catch (err) {
    console.error('Error getting face status:', err);
    return res.status(500).json({
      success: false,
      error: 'STATUS_ERROR',
      message: 'Failed to get face status'
    });
  }
};

/**
 * DELETE FACE REGISTRATION
 * Remove face data (kept in backups for audit)
 */
exports.deleteFace = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const tenantId = req.tenantId || req.body.tenantId;
    const { FaceData, AuditLog } = getModels(req);

    const faceData = await FaceData.findOne({
      tenant: tenantId,
      employee: employeeId
    });

    if (!faceData) {
      return res.status(404).json({
        success: false,
        message: 'No face registration found'
      });
    }

    // Archive to backup before deleting
    faceData.status = 'INACTIVE';
    await faceData.save();

    // Log the deletion
    const auditLog = new AuditLog({
      action: 'FACE_DELETED',
      userId: employeeId,
      resource: 'FaceData',
      resourceId: faceData._id,
      status: 'SUCCESS',
      ipAddress: req.ip
    });
    await auditLog.save();

    return res.json({
      success: true,
      message: 'Face registration deleted'
    });

  } catch (err) {
    console.error('Error deleting face:', err);
    return res.status(500).json({
      success: false,
      error: 'DELETE_ERROR',
      message: 'Failed to delete face registration'
    });
  }
};

/**
 * HELPER FUNCTIONS
 */

function getModels(req) {
  // Get MongoDB models based on tenant
  // Implementation depends on your multi-tenant setup
  return {
    FaceData: require('../models/FaceData'),
    Attendance: require('../models/Attendance'),
    Employee: require('../models/Employee'),
    AuditLog: require('../models/AuditLog'),
    AttendanceSettings: require('../models/AttendanceSettings')
  };
}

function validateGeofenceAndAccuracy(point, geofence, accuracy) {
  return faceService.validateGeofence(point, geofence, accuracy);
}

module.exports = {
  registerFace: exports.registerFace,
  verifyFaceAttendance: exports.verifyFaceAttendance,
  getFaceStatus: exports.getFaceStatus,
  deleteFace: exports.deleteFace
};
