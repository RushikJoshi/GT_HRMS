# FACE ATTENDANCE SYSTEM - PSEUDOCODE & ALGORITHMS

## 1. FACE EMBEDDING GENERATION

```pseudocode
ALGORITHM: GenerateFaceEmbedding(imageData)
  INPUT: Raw image (base64 or buffer)
  OUTPUT: { embedding: [512], metadata: {...} }
  
  1. PREPARE_IMAGE(imageData)
     Convert to buffer if needed
     Verify format (JPEG/PNG)
     Load into tensor
  
  2. DETECT_FACE(imageBuffer)
     Load pre-trained face detection model (TinyFaceDetector)
     Process image through model
     Extract detection: { x, y, width, height, confidence }
     
     IF no face detected:
       RETURN { success: false, error: "NO_FACE_DETECTED" }
     
     IF multiple faces detected:
       RETURN { success: false, error: "MULTIPLE_FACES" }
     
     IF confidence < 85%:
       RETURN { success: false, error: "LOW_CONFIDENCE" }
  
  3. VALIDATE_FACE_SIZE(detection)
     IF width < 80 OR height < 80:
       RETURN error "FACE_TOO_SMALL - Move closer"
     IF width > 600 OR height > 600:
       RETURN error "FACE_TOO_LARGE - Move away"
     RETURN success
  
  4. ANALYZE_QUALITY(imageBuffer, detection)
     // Extract face region
     faceRegion = imageBuffer[detection.y : detection.y+height,
                              detection.x : detection.x+width]
     
     // Calculate sharpness using Laplacian variance
     laplacian = CONVOLVE(faceRegion, LAPLACIAN_KERNEL)
     sharpness = VAR(laplacian)  // Higher = sharper
     
     // Calculate brightness
     brightness = MEAN(faceRegion)  // 0-255 scale
     
     // Calculate contrast
     contrast = STD_DEV(faceRegion)
     
     RETURN { sharpness, brightness, contrast, confidence }
  
  5. VALIDATE_QUALITY(quality)
     IF sharpness < 40:
       RETURN error "BLURRY - Hold steady"
     IF brightness < 20:
       RETURN error "TOO_DARK - Improve lighting"
     IF contrast < 10:
       RETURN error "POOR_CONTRAST - Adjust lighting"
     IF confidence < 85:
       RETURN error "FACE_UNCLEAR - Position better"
     RETURN success
  
  6. GENERATE_EMBEDDING(imageBuffer, detection)
     // Load FaceNet or similar model
     faceRegion = CROP_AND_RESIZE(imageBuffer, detection, 160×160)
     
     // Pass through model
     embedding = MODEL.predict(faceRegion)
     
     // Output: 512-dimensional vector
     NORMALIZE(embedding)  // L2 normalization
     
     IF embedding.length ≠ 512:
       RETURN error "EMBEDDING_ERROR"
     
     RETURN embedding
  
  7. RETURN {
       success: true,
       embedding: [512 floats],
       metadata: {
         quality: {...},
         detection: {...},
         timestamp: now,
         modelVersion: "facenet-mobilenet-v2"
       }
     }
END ALGORITHM
```

## 2. FACE MATCHING (COSINE SIMILARITY)

```pseudocode
ALGORITHM: CompareFaceEmbeddings(embedding1, embedding2)
  INPUT: Two 512-dimensional vectors
  OUTPUT: { isMatch, similarity, confidence }
  
  1. VALIDATE_INPUTS
     IF embedding1.length ≠ 512 OR embedding2.length ≠ 512:
       RETURN error "INVALID_DIMENSION"
  
  2. CALCULATE_COSINE_SIMILARITY
     // Formula: cos(θ) = (A · B) / (||A|| * ||B||)
     
     dotProduct = 0
     FOR i = 0 TO 511:
       dotProduct += embedding1[i] * embedding2[i]
     
     magnitude1 = SQRT(SUM(embedding1[i]² for all i))
     magnitude2 = SQRT(SUM(embedding2[i]² for all i))
     
     IF magnitude1 == 0 OR magnitude2 == 0:
       RETURN { similarity: 0, isMatch: false }
     
     cosineSimilarity = dotProduct / (magnitude1 * magnitude2)
     // Result: 0 to 1
  
  3. DETERMINE_MATCH_CONFIDENCE
     MATCHING_THRESHOLD = 0.50
     HIGH_CONFIDENCE_THRESHOLD = 0.65
     
     IF cosineSimilarity >= HIGH_CONFIDENCE_THRESHOLD:
       confidence = "HIGH"
       matchScore = 100
     ELSE IF cosineSimilarity >= MATCHING_THRESHOLD:
       confidence = "MEDIUM"
       matchScore = (cosineSimilarity / MATCHING_THRESHOLD) * 100
     ELSE:
       confidence = "LOW"
       matchScore = (cosineSimilarity / MATCHING_THRESHOLD) * 100
     
     isMatch = cosineSimilarity >= MATCHING_THRESHOLD
  
  4. RETURN {
       isMatch: isMatch,
       similarity: cosineSimilarity.round(4),
       confidence: confidence,
       matchScore: matchScore,
       threshold: MATCHING_THRESHOLD
     }
END ALGORITHM
```

## 3. LIVENESS DETECTION

```pseudocode
ALGORITHM: ValidateLiveness(frames[])
  INPUT: Array of frame data with facial landmarks
  OUTPUT: { valid, confidence, method, detections }
  
  1. VALIDATE_INPUT
     IF frames.length == 0:
       RETURN { valid: false, reason: "NO_FRAMES" }
  
  2. DETECT_BLINK
     blinkCount = 0
     FOR i = 0 TO frames.length - 1:
       // Get eye landmarks
       leftEye = frames[i].landmarks[36:42]    // 6 points
       rightEye = frames[i].landmarks[42:48]
       
       // Calculate Eye Aspect Ratio (EAR)
       leftEAR = CALCULATE_EAR(leftEye)
       rightEAR = CALCULATE_EAR(rightEye)
       
       // Detect blink (sudden EAR drop)
       IF i > 0:
         prevLeftEAR = frames[i-1].ear.left
         prevRightEAR = frames[i-1].ear.right
         
         IF (prevLeftEAR > 0.2 AND leftEAR < 0.1) OR
            (prevRightEAR > 0.2 AND rightEAR < 0.1):
           blinkCount += 1
     
     blinkDetected = blinkCount >= 1
     
     IF NOT blinkDetected:
       RETURN { valid: false, reason: "NO_BLINK", confidence: 0 }
  
  3. DETECT_HEAD_MOVEMENT
     maxMovement = 0
     FOR i = 1 TO frames.length - 1:
       curr = frames[i].detection.box
       prev = frames[i-1].detection.box
       
       movement = SQRT((curr.x - prev.x)² + (curr.y - prev.y)²)
       maxMovement = MAX(maxMovement, movement)
     
     movementDetected = maxMovement >= 5  // pixels
     
     IF NOT movementDetected:
       RETURN { valid: false, reason: "NO_MOVEMENT", confidence: 50 }
  
  4. VALIDATE_TEXTURE_CONSISTENCY
     // Check for photo/video spoofing
     // Real skin has natural texture; photos are flat
     
     FOR i = 0 TO frames.length - 1:
       texture = ANALYZE_TEXTURE(frames[i].imageData)
       
       // High frequency components (texture)
       IF texture.variance < TEXTURE_THRESHOLD:
         // Possibly a photo
         RETURN { valid: false, reason: "FAKE_DETECTED", confidence: 25 }
     
     textureValid = true
  
  5. RETURN {
       valid: true,
       reason: "LIVENESS_CONFIRMED",
       confidence: 95,
       detections: {
         blink: blinkDetected,
         movement: movementDetected,
         texture: textureValid
       }
     }
END ALGORITHM
```

## 4. IMAGE QUALITY ANALYSIS

```pseudocode
FUNCTION: CALCULATE_SHARPNESS(imageData, region)
  // Laplacian variance method
  // Kernel: [0 -1 0; -1 4 -1; 0 -1 0]
  
  kernel = [[0, -1, 0],
            [-1, 4, -1],
            [0, -1, 0]]
  
  // Extract grayscale
  gray = RGB_TO_GRAYSCALE(imageData[region])
  
  // Apply Laplacian
  laplacian = CONVOLVE_2D(gray, kernel)
  
  // Calculate variance
  variance = VAR(laplacian)
  
  // Normalize to 0-100
  sharpness = MIN(100, variance / 1000)
  
  RETURN sharpness
END FUNCTION

FUNCTION: CALCULATE_BRIGHTNESS(imageData, region)
  // Average pixel intensity
  
  sum = 0
  count = 0
  
  FOR each pixel in imageData[region]:
    R, G, B = pixel RGB values
    intensity = (R + G + B) / 3
    sum += intensity
    count += 1
  
  brightness = sum / count  // 0-255
  
  RETURN brightness
END FUNCTION

FUNCTION: CALCULATE_EYE_ASPECT_RATIO(eyeLandmarks)
  // EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
  
  p1, p2, p3, p4, p5, p6 = eyeLandmarks[0:6]
  
  distance = (a, b) => SQRT((a.x - b.x)² + (a.y - b.y)²)
  
  numerator = distance(p2, p6) + distance(p3, p5)
  denominator = 2 * distance(p1, p4)
  
  IF denominator == 0:
    RETURN 0
  
  EAR = numerator / denominator
  
  RETURN EAR
END FUNCTION
```

## 5. ENCRYPTION & DECRYPTION

```pseudocode
ALGORITHM: EncryptEmbedding(embedding, masterKey)
  INPUT: [512] embedding vector, string masterKey
  OUTPUT: { encrypted, iv, authTag, algorithm }
  
  1. PREPARE_DATA
     embeddingJSON = JSON.stringify(embedding)
     embeddingBytes = TEXT_TO_BYTES(embeddingJSON)
  
  2. GENERATE_KEY
     // Derive 256-bit key from master key
     salt = "salt"  // Fixed salt for reproducibility
     derivedKey = SCRYPT(masterKey, salt, keyLength=32)
  
  3. GENERATE_IV
     // 128-bit random IV for this encryption
     iv = RANDOM_BYTES(16)
  
  4. CREATE_CIPHER
     algorithm = "AES-256-GCM"
     cipher = CREATE_CIPHER(algorithm, derivedKey, iv)
  
  5. ENCRYPT
     encrypted = cipher.update(embeddingBytes, "binary")
     encrypted += cipher.final("binary")
     encryptedHex = BYTES_TO_HEX(encrypted)
  
  6. GET_AUTH_TAG
     // Prevents tampering
     authTag = cipher.getAuthTag()
     authTagHex = BYTES_TO_HEX(authTag)
  
  7. RETURN {
       encrypted: encryptedHex,
       iv: HEX(iv),
       authTag: authTagHex,
       algorithm: "aes-256-gcm"
     }
END ALGORITHM

ALGORITHM: DecryptEmbedding(encryptedData, masterKey)
  INPUT: { encrypted, iv, authTag }, masterKey
  OUTPUT: [512] embedding vector
  
  1. PREPARE_KEY
     salt = "salt"
     derivedKey = SCRYPT(masterKey, salt, keyLength=32)
  
  2. RECONSTRUCT_COMPONENTS
     iv = HEX_TO_BYTES(encryptedData.iv)
     authTag = HEX_TO_BYTES(encryptedData.authTag)
     encryptedBytes = HEX_TO_BYTES(encryptedData.encrypted)
  
  3. CREATE_DECIPHER
     algorithm = "AES-256-GCM"
     decipher = CREATE_DECIPHER(algorithm, derivedKey, iv)
  
  4. SET_AUTH_TAG
     decipher.setAuthTag(authTag)
     // Will throw error if tampering detected
  
  5. DECRYPT
     decrypted = decipher.update(encryptedBytes)
     decrypted += decipher.final()
     decryptedText = BYTES_TO_TEXT(decrypted)
  
  6. PARSE
     embedding = JSON.parse(decryptedText)
  
  7. VALIDATE
     IF embedding.length ≠ 512:
       THROW error "Invalid embedding dimension"
  
  8. RETURN embedding
END ALGORITHM
```

## 6. GEOFENCE VALIDATION

```pseudocode
ALGORITHM: IsInsideGeofence(userLocation, geofencePolygon)
  INPUT: {lat, lng}, [{lat, lng}, ...]
  OUTPUT: boolean
  
  // Ray casting algorithm
  // Cast ray from point to infinity; count intersections
  
  point = userLocation
  polygon = geofencePolygon
  
  inside = false
  
  FOR i = 0 TO polygon.length - 1:
    j = (i + 1) % polygon.length
    
    xi = polygon[i].lng
    yi = polygon[i].lat
    xj = polygon[j].lng
    yj = polygon[j].lat
    
    // Check if ray intersects this edge
    IF (yi > point.lat) ≠ (yj > point.lat) AND
       point.lng < ((xj - xi) * (point.lat - yi) / (yj - yi) + xi):
      inside = NOT inside
  
  RETURN inside
END ALGORITHM
```

## 7. AUTO-CAPTURE LOGIC

```pseudocode
ALGORITHM: MonitorAndAutocapture(videoStream)
  INPUT: Real-time video stream
  OUTPUT: Trigger capture when conditions met
  
  stabilityCounter = 0
  previousDetection = NULL
  
  FOR each frame in videoStream:
    1. DETECT_FACE(frame)
       IF no face:
         SHOW_MESSAGE("📸 Position your face")
         CONTINUE
       
       IF multiple faces:
         SHOW_MESSAGE("⚠️ Only one face allowed")
         CONTINUE
    
    2. ANALYZE_QUALITY(frame)
       IF NOT quality.suitable:
         SHOW_FEEDBACK(quality.feedback)
         stabilityCounter = 0
         CONTINUE
    
    3. CHECK_STABILITY
       IF quality similar to previous:
         stabilityCounter += 1
       ELSE:
         stabilityCounter = 0
       
       SHOW_PROGRESS_BAR(stabilityCounter / 10)
    
    4. CHECK_AUTO_CAPTURE_CONDITION
       IF stabilityCounter >= 10 AND
          quality.suitable AND
          liveness.partial_detected:
         CAPTURE_IMAGE()
         PROCESS_REGISTRATION_OR_VERIFICATION()
         BREAK

END ALGORITHM
```

## 8. REGISTRATION FLOW

```pseudocode
ALGORITHM: RegisterFace(employeeId, imageData, consent)
  INPUT: Employee ID, face image, consent flag
  OUTPUT: Registration result
  
  1. VALIDATE_INPUT
     IF NOT imageData OR NOT consent:
       RETURN error "INVALID_INPUT"
  
  2. CHECK_RATE_LIMIT
     recentAttempts = COUNT_REGISTRATIONS(employeeId, last_hour=True)
     IF recentAttempts >= 10:
       LOG_AUDIT("RATE_LIMIT_BLOCKED")
       RETURN error "TOO_MANY_ATTEMPTS"
  
  3. GENERATE_EMBEDDING
     result = GENERATE_FACE_EMBEDDING(imageData)
     IF NOT result.success:
       LOG_AUDIT("REGISTRATION_FAILED", result.error)
       RETURN error (result.error, result.quality)
  
  4. VALIDATE_LIVENESS
     liveness = VALIDATE_LIVENESS(liveFrames)
     IF NOT liveness.valid:
       LOG_AUDIT("LIVENESS_FAILED")
       RETURN error liveness.message
  
  5. ENCRYPT_EMBEDDING
     encryptedData = ENCRYPT_EMBEDDING(result.embedding, KEY)
  
  6. CHECK_DUPLICATE
     existing = QUERY(FaceData, employeeId, status="ACTIVE")
     IF existing:
       ARCHIVE_TO_BACKUP(existing)
  
  7. STORE_FACE_DATA
     faceData = NEW FaceData {
       tenant: tenantId,
       employee: employeeId,
       faceEmbedding: encryptedData,
       quality: result.metadata.quality,
       liveness: { status: "PASSED", confidence: 95 },
       registration: {
         registeredAt: NOW,
         consentGiven: true,
         ipAddress: req.ip
       },
       status: "PENDING_REVIEW"
     }
     SAVE(faceData)
  
  8. CREATE_AUDIT_LOG
     LOG_AUDIT("FACE_REGISTRATION", {
       faceDataId: faceData._id,
       quality: result.metadata.quality,
       status: "SUCCESS"
     })
  
  9. SEND_NOTIFICATIONS
     SEND_EMAIL(employee, "Face registered successfully")
     NOTIFY_HR("New face registration for approval")
  
  10. RETURN {
        success: true,
        registrationId: faceData._id,
        status: "PENDING_REVIEW",
        processingTime: elapsed
      }
END ALGORITHM
```

## 9. VERIFICATION FLOW

```pseudocode
ALGORITHM: VerifyFaceAttendance(employeeId, imageData, location)
  INPUT: Employee ID, current image, GPS location
  OUTPUT: Verification result with attendance marking
  
  1. VALIDATE_INPUT
     IF NOT imageData OR NOT location:
       RETURN error "MISSING_DATA"
  
  2. GET_REGISTERED_FACE
     registeredFace = QUERY(FaceData, {
       employee: employeeId,
       status: "ACTIVE",
       isVerified: true
     })
     
     IF NOT registeredFace:
       RETURN error "NO_REGISTERED_FACE"
  
  3. DECRYPT_STORED_EMBEDDING
     TRY:
       storedEmbedding = DECRYPT_EMBEDDING(
         registeredFace.faceEmbedding, KEY
       )
     CATCH:
       LOG_SECURITY_ALERT("DECRYPTION_FAILED")
       RETURN error "DECRYPTION_ERROR"
  
  4. GENERATE_LIVE_EMBEDDING
     result = GENERATE_FACE_EMBEDDING(imageData)
     IF NOT result.success:
       LOG_AUDIT("VERIFICATION_FAILED", result.error)
       RETURN error result.error
  
  5. VALIDATE_LIVENESS
     liveness = VALIDATE_LIVENESS(liveFrames)
     IF NOT liveness.valid:
       LOG_AUDIT("LIVENESS_FAILED")
       RETURN error "LIVENESS_FAILED"
  
  6. COMPARE_EMBEDDINGS
     matchResult = COMPARE_FACE_EMBEDDINGS(
       storedEmbedding,
       result.embedding
     )
     
     IF NOT matchResult.isMatch:
       registeredFace.usage.failureCount += 1
       LOG_AUDIT("FACE_MISMATCH", {
         similarity: matchResult.similarity
       })
       RETURN error "FACE_MISMATCH"
  
  7. VALIDATE_LOCATION
     employee = QUERY(Employee, employeeId)
     
     IF location.accuracy > employee.allowedAccuracy:
       RETURN error "POOR_LOCATION_ACCURACY"
     
     IF NOT IS_INSIDE_GEOFENCE(location, employee.geofence):
       RETURN error "OUTSIDE_GEOFENCE"
  
  8. CHECK_DUPLICATE_ATTENDANCE
     today = DATE_TODAY()
     existing = QUERY(Attendance, {
       employee: employeeId,
       date: today,
       checkIn: NOT NULL
     })
     
     IF existing:
       RETURN error "ALREADY_MARKED", checkInTime: existing.checkIn
  
  9. CREATE_ATTENDANCE
     attendance = NEW Attendance {
       employee: employeeId,
       date: today,
       checkIn: NOW,
       status: "PRESENT",
       logs: [{
         type: "IN",
         method: "FACE_EMBEDDING",
         matchScore: matchResult.matchScore,
         location: location,
         device: "Face Recognition"
       }]
     }
     SAVE(attendance)
  
  10. UPDATE_FACE_STATS
      registeredFace.usage.lastUsedAt = NOW
      registeredFace.usage.successCount += 1
      registeredFace.audit.events.push({
        eventType: "USED",
        matchScore: matchResult.matchScore
      })
      SAVE(registeredFace)
  
  11. CREATE_AUDIT_LOG
      LOG_AUDIT("FACE_VERIFICATION_SUCCESS", {
        matchScore: matchResult.matchScore,
        similarity: matchResult.similarity,
        attendance: attendance._id
      })
  
  12. RETURN {
        success: true,
        attendanceId: attendance._id,
        checkInTime: NOW,
        verification: {
          matchScore: matchResult.matchScore,
          confidence: matchResult.confidence,
          liveness: true
        }
      }
END ALGORITHM
```

---

**Note**: These pseudocode algorithms provide the logic backbone for the enterprise face system. Actual implementations use TensorFlow.js models, Node.js crypto libraries, and MongoDB for persistence.

