import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, MapPin, CheckCircle, XCircle, User, UserPlus, Clock, AlertCircle,
  Loader2, Navigation, LogOut, RotateCcw, Shield, Smartphone
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import * as faceapi from 'face-api.js';


const FaceAttendance = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState('attendance'); // 'attendance' or 'register'
  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [registrationName, setRegistrationName] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [canUpdate, setCanUpdate] = useState(true);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [violationModal, setViolationModal] = useState({ show: false, violations: [] });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // Load face-api.js models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Loading face-api.js models...');

        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        console.log('✓ All face-api.js models loaded successfully');
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading face-api.js models:', err);
        setStatus('error');
        setMessage('Failed to load face recognition models. Please refresh the page.');
      }
    };

    loadModels();
  }, []);

  // Check face registration status on mount
  useEffect(() => {
    checkFaceStatus();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Real-time face detection for alignment feedback
  useEffect(() => {
    if (!cameraActive || !modelsLoaded || !videoRef.current) return;

    let detectionTimeout;
    let lastDetectionTime = 0;
    const detectionInterval = 50; // 50ms = ~20fps for faster feedback without blocking

    const detectFaceAlignment = async () => {
      try {
        const videoEl = videoRef.current;
        if (!videoEl || videoEl.readyState < 2) {
          detectionTimeout = setTimeout(detectFaceAlignment, detectionInterval);
          return;
        }

        const now = Date.now();
        if (now - lastDetectionTime >= detectionInterval) {
          lastDetectionTime = now;

          // Skip landmarks for alignment feedback - only detect face position
          const detectionOptions = new faceapi.SsdMobilenetv1Options({
            inputSize: 192, // Smaller for faster detection
            scoreThreshold: 0.4
          });

          const detection = await faceapi
            .detectSingleFace(videoEl, detectionOptions)
            .withFaceLandmarks(); // Still get landmarks but optimize drawing

          drawFaceAlignmentGuide(videoEl, detection);
        }

        detectionTimeout = setTimeout(detectFaceAlignment, 5); // Check again quickly but throttled
      } catch (err) {
        detectionTimeout = setTimeout(detectFaceAlignment, detectionInterval);
      }
    };

    detectFaceAlignment();

    return () => {
      if (detectionTimeout) clearTimeout(detectionTimeout);
    };
  }, [cameraActive, modelsLoaded]);

  async function getAddressOSM(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

    const response = await fetch(url);
    const data = await response.json();

    return data.display_name;
  }

  const handleSubmitRequest = async () => {
    if (!requestReason.trim()) {
      alert('Please enter a reason for the update request.');
      return;
    }

    try {
      setSubmittingRequest(true);
      const res = await api.post('/attendance/face/request-update', { reason: requestReason });
      if (res.data.success) {
        alert('Request submitted successfully!');
        setShowRequestModal(false);
        setRequestReason('');
        checkFaceStatus(); // Refresh status
      }
    } catch (err) {
      console.error('Error submitting request:', err);
      alert(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmittingRequest(false);
    }
  };
  const checkFaceStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/face/status');
      setFaceRegistered(res.data.isRegistered);
      setCanUpdate(res.data.canUpdate);
      setPendingRequest(res.data.data?.pendingRequest);

      if (!res.data.isRegistered) {
        setMode('register');
      }
    } catch (err) {
      console.error('Error checking face status:', err);
      setFaceRegistered(false);
    } finally {
      setLoading(false);
    }
  };

  const drawFaceAlignmentGuide = (videoEl, detection) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = videoEl.videoWidth;
    const height = videoEl.videoHeight;

    // Only resize canvas if dimensions changed
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Clear canvas once
    ctx.clearRect(0, 0, width, height);

    // Draw guide frame (centered square) - optimized for 1280x720
    const centerX = width / 2;
    const centerY = height / 2;
    // Larger guide size to cover entire face - use 65% of width and 90% of height
    const guideSize = Math.min(width * 0.65, height * 0.9);
    const guideLeft = centerX - guideSize / 2;
    const guideTop = centerY - guideSize / 2;

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // Clear the guide square area (make it visible)
    ctx.clearRect(guideLeft, guideTop, guideSize, guideSize);

    // Draw the guide frame
    if (detection) {
      const box = detection.detection.box;
      const detectionScore = detection.detection.score;

      // Expand bounding box to cover entire face (add 20% padding)
      const padding = 0.2;
      const expandedBox = {
        x: Math.max(0, box.x - box.width * padding),
        y: Math.max(0, box.y - box.height * padding),
        width: box.width * (1 + padding * 2),
        height: box.height * (1 + padding * 2)
      };

      // Calculate alignment metrics using expanded box
      const boxCenterX = expandedBox.x + expandedBox.width / 2;
      const boxCenterY = expandedBox.y + expandedBox.height / 2;
      const distanceFromCenter = Math.sqrt(
        Math.pow(boxCenterX - centerX, 2) + Math.pow(boxCenterY - centerY, 2)
      );
      const maxDistance = Math.sqrt(
        Math.pow(guideSize / 2, 2) + Math.pow(guideSize / 2, 2)
      );
      const alignmentPercentage = Math.max(0, 100 - (distanceFromCenter / maxDistance) * 100);

      // Determine color based on alignment and detection quality
      let borderColor, fillColor;
      if (detectionScore > 0.75 && alignmentPercentage > 70) {
        borderColor = 'rgba(34, 197, 94, 0.9)'; // Green - Good alignment
        fillColor = 'rgba(34, 197, 94, 0.08)';
      } else if (detectionScore > 0.6 && alignmentPercentage > 40) {
        borderColor = 'rgba(251, 146, 60, 0.9)'; // Orange - Acceptable
        fillColor = 'rgba(251, 146, 60, 0.08)';
      } else {
        borderColor = 'rgba(239, 68, 68, 0.9)'; // Red - Poor alignment
        fillColor = 'rgba(239, 68, 68, 0.08)';
      }

      // Draw the expanded face bounding box
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.fillRect(expandedBox.x, expandedBox.y, expandedBox.width, expandedBox.height);
      ctx.strokeRect(expandedBox.x, expandedBox.y, expandedBox.width, expandedBox.height);

      // Draw landmarks - render only key points (eyes, nose, mouth) for speed
      if (detection.landmarks) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
        const landmarks = detection.landmarks._positions;
        // Only draw key landmarks: left eye (36-41), right eye (42-47), nose (30-35), mouth (48-67)
        const keyIndices = [36, 39, 42, 45, 30, 33, 48, 54, 60];
        for (let i = 0; i < keyIndices.length; i++) {
          const point = landmarks[keyIndices[i]];
          if (point) {
            ctx.beginPath();
            ctx.arc(point._x, point._y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw alignment status indicator
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = borderColor;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      const statusText = detectionScore > 0.75 && alignmentPercentage > 70 ? '✓ ALIGNED' : '⊗ ADJUST';
      ctx.fillText(statusText, centerX, 50);

      // Draw alignment percentage
      ctx.font = '14px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 3;
      ctx.fillText(`${Math.round(alignmentPercentage)}%`, centerX, 75);
      ctx.shadowColor = 'transparent';
    } else {
      // No face detected - draw guide square
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 3;
      ctx.strokeRect(guideLeft, guideTop, guideSize, guideSize);

      // Draw instruction text
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText('⊗ NO FACE', centerX, 50);

      ctx.font = '14px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 3;
      ctx.fillText('Position in square', centerX, 75);
      ctx.shadowColor = 'transparent';
    }

    // Draw corner guides (optimized)
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 2;
    const cornerSize = 30;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(cornerSize, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, cornerSize);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - cornerSize, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, cornerSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(0, height - cornerSize);
    ctx.lineTo(0, height);
    ctx.lineTo(cornerSize, height);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - cornerSize, height);
    ctx.lineTo(width, height);
    ctx.lineTo(width, height - cornerSize);
    ctx.stroke();
  };

  const startCamera = async () => {
    try {
      setStatus(null);
      setMessage('');
      setCapturing(false);

      console.log('Starting camera initialization...');

      // Step 1: Set camera active FIRST to render the video element
      setCameraActive(true);
      console.log('Set cameraActive to true - waiting for DOM to update...');

      // Step 2: Wait for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Now request camera stream
      console.log('Requesting camera access...');
      // const stream = await navigator.mediaDevices.getUserMedia({
      //   video: {
      //     facingMode: 'user',
      //     width: { ideal: 1280 },
      //     height: { ideal: 720 }
      //   }
      // });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",

          // IMPORTANT: use ideal, not exact
          width: { ideal: 1280 },
          height: { ideal: 720 },

          frameRate: { ideal: 30, max: 30 }
        }
      });

      // console.log('Camera stream obtained:', stream);
      console.log('Camera stream obtained:');

      // Step 4: Attach stream to video element (should exist now)
      let retries = 0;
      const maxRetries = 10;

      const attachStream = () => {
        console.log(`Attempt ${retries + 1} to attach stream...`);

        if (!videoRef?.current) {
          console.warn(`videoRef.current not available yet (attempt ${retries + 1}/${maxRetries})`);

          if (retries < maxRetries) {
            retries++;
            setTimeout(attachStream, 150);
            return;
          } else {
            console.error('Failed to attach stream after max retries');
            setStatus('error');
            setMessage('Camera element not ready. Please refresh the page and try again.');
            setCameraActive(false);
            stream.getTracks().forEach(track => track.stop());
            return;
          }
        }

        try {
          console.log('Attaching stream to video element...');
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          console.log('✓ Stream attached successfully');

          // Ensure video plays
          setTimeout(() => {
            if (videoRef?.current && videoRef.current.paused) {
              console.log('Starting video playback...');
              videoRef.current.play()
                .then(() => {
                  console.log('✓ Video playback started');
                })
                .catch(err => {
                  console.error('✗ Video play error:', err);
                  setStatus('error');
                  setMessage('Failed to start video playback.');
                });
            }
          }, 100);

        } catch (err) {
          console.error('Error attaching stream:', err);
          setStatus('error');
          setMessage('Failed to attach camera stream.');
          setCameraActive(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      attachStream();

    } catch (err) {
      console.error('Camera access error:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);

      setCameraActive(false);
      setStatus('error');

      // Provide specific error messages
      if (err.name === 'NotAllowedError') {
        setMessage('Camera permission denied. Please enable camera in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setMessage('No camera found on this device.');
      } else if (err.name === 'NotSupportedError') {
        setMessage('Camera not supported in this browser. Try Chrome, Firefox, or Edge.');
      } else if (err.name === 'SecurityError') {
        setMessage('HTTPS is required for camera access.');
      } else {
        setMessage('Unable to access camera: ' + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported on this device'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const place = await getAddressOSM(position.coords.latitude, position.coords.longitude);
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            place: place
          };
          setLocation(loc);
          resolve(loc);
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas && video && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.9);
    }
    return null;
  };

  const handleAttendance = async () => {
    if (!faceRegistered) {
      setStatus('error');
      setMessage('Please register your face first');
      return;
    }

    if (!modelsLoaded) {
      setStatus('error');
      setMessage('Face recognition models are still loading. Please wait...');
      return;
    }

    setCapturing(true);
    setStatus(null);
    setMessage('Processing attendance...');

    try {
      // Get location
      const loc = await getLocation();
      console.log('Location obtained:');
      // console.log('Location obtained:', loc);

      const videoEl = videoRef.current;
      if (!videoEl) {
        throw new Error('Video element not ready');
      }

      if (!videoEl.srcObject) {
        throw new Error('Camera is not active. Please start the camera first.');
      }

      // Wait for video to be fully ready
      if (videoEl.readyState < 2) {
        console.log('Waiting for video to be ready...');
        await new Promise((resolve) => {
          videoEl.onloadeddata = resolve;
          setTimeout(resolve, 2000); // Timeout after 2 seconds
        });
      }

      console.log('Detecting face...');
      // console.log('Detecting face...', {
      //   videoWidth: videoEl.videoWidth,
      //   videoHeight: videoEl.videoHeight,
      //   readyState: videoEl.readyState
      // });

      // Optimized detection options for better accuracy
      const detectionOptions = new faceapi.SsdMobilenetv1Options({
        inputSize: 416,  // Larger input size for better detection
        scoreThreshold: 0.35  // Balanced threshold
      });

      const detection = await faceapi
        .detectSingleFace(videoEl, detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected. Please ensure your face is clearly visible in the camera and well-lit.');
      }

      console.log('Face detected successfully');

      // Get face embeddings (128-dimensional vector)
      const faceEmbedding = Array.from(detection.descriptor);

      console.log('ATTENDANCE - Face embedding generated:');
      // console.log('   Length:', faceEmbedding.length);
      // console.log('   First 10 values:', faceEmbedding.slice(0, 10).map(v => parseFloat(v.toFixed(6))));
      // console.log('   Last 10 values:', faceEmbedding.slice(118).map(v => parseFloat(v.toFixed(6))));
      // console.log('   Sum:', faceEmbedding.reduce((a, b) => a + b, 0).toFixed(4));
      // console.log('   Mean:', (faceEmbedding.reduce((a, b) => a + b, 0) / faceEmbedding.length).toFixed(4));

      // Validate embedding
      if (!Array.isArray(faceEmbedding) || faceEmbedding.length !== 128) {
        throw new Error(`Invalid embedding: expected 128 dimensions, got ${faceEmbedding?.length || 0}`);
      }

      const isValidEmbedding = faceEmbedding.every(val => typeof val === 'number' && !isNaN(val));
      if (!isValidEmbedding) {
        throw new Error('Invalid embedding: contains non-numeric values');
      }

      console.log('Embedding validation passed, sending to backend');

      // Prepare request data with embeddings
      const requestData = {
        faceEmbedding: faceEmbedding,
        location: {
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
          timestamp: new Date().toISOString()
        }
      };
      // console.log('Sending attendance verification request:', {
      //   faceEmbeddingLength: requestData.faceEmbedding.length,
      //   location: requestData.location
      // });

      // Call face verify API
      const res = await api.post('/attendance/face/verify', requestData, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.data.success) {
        setStatus('success');
        setMessage(res.data.message);

        // Check for policy violations to show popup
        const violations = res.data.data?.status?.policyViolations || [];
        if (violations.length > 0) {
          setViolationModal({ show: true, violations });
        }

        setTimeout(() => {
          stopCamera();
          setCapturing(false);
          // Only switch back if we aren't showing a modal to acknowledge
          if (violations.length === 0) {
            setMode('attendance');
          }
        }, 3000);
      }
    } catch (err) {
      console.error('Attendance error:', err);
      setStatus('error');

      // Extract specific error message from backend
      let errorMessage = 'Failed to mark attendance';
      let errorDetails = '';

      if (err.response?.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }

        // Handle specific details if available
        if (err.response.data.details) {
          if (typeof err.response.data.details === 'string') {
            errorDetails = err.response.data.details;
          } else if (err.response.data.details.reason) {
            errorDetails = err.response.data.details.reason;
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setMessage(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      setCapturing(false);
    }
  };

  const handleRegistration = async () => {
    // 1️⃣ Basic validation
    if (!registrationName.trim()) {
      setStatus('error');
      setMessage('Please enter your full name');
      return;
    }

    if (!registrationId.trim()) {
      setStatus('error');
      setMessage('Please enter your employee ID');
      return;
    }

    if (!consentGiven) {
      setStatus('error');
      setMessage('Please accept the consent to proceed with face registration');
      return;
    }

    setCapturing(true);
    setStatus(null);
    setMessage('Registering your face...');

    try {
      // 2️⃣ Detect face & generate embedding
      console.log('Detecting face with options...');
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({
          inputSize: 416,
          scoreThreshold: 0.4  // Optimized threshold for registration
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected. Please look at the camera clearly.');
      }

      // 3️⃣ Convert descriptor to normal array
      const faceEmbedding = Array.from(detection.descriptor);

      console.log('REGISTRATION - Face embedding generated:');
      // console.log('   Length:', faceEmbedding.length);
      // console.log('   First 10 values:', faceEmbedding.slice(0, 10).map(v => parseFloat(v.toFixed(6))));
      // console.log('   Last 10 values:', faceEmbedding.slice(118).map(v => parseFloat(v.toFixed(6))));
      // console.log('   Sum:', faceEmbedding.reduce((a, b) => a + b, 0).toFixed(4));
      // console.log('   Mean:', (faceEmbedding.reduce((a, b) => a + b, 0) / faceEmbedding.length).toFixed(4));

      // Validate embedding
      if (!Array.isArray(faceEmbedding) || faceEmbedding.length !== 128) {
        throw new Error(`Invalid embedding: expected 128 dimensions, got ${faceEmbedding.length}`);
      }

      const isValidEmbedding = faceEmbedding.every(val => typeof val === 'number' && !isNaN(val));
      if (!isValidEmbedding) {
        throw new Error('Invalid embedding: contains non-numeric values');
      }

      console.log('Embedding validation passed');

      // 4️⃣ Call registration API (CORRECT axios usage)
      const res = await api.post(
        '/attendance/face/register',
        {
          employeeName: registrationName,
          faceEmbedding,
          registrationNotes: `Self registration - ${registrationName}`,
          consentGiven: true
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log('Registration response:', res.data);

      // 5️⃣ Success handling
      if (res.data?.success) {
        setStatus('success');
        setMessage('Face registered successfully! You can now mark attendance.');
        setFaceRegistered(true);

        setRegistrationName('');
        setRegistrationId('');
        setConsentGiven(false);

        setTimeout(() => {
          stopCamera();
          setCapturing(false);
          setMode('attendance');
        }, 3000);
      } else {
        throw new Error(res.data?.message || 'Face registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      console.error('Error response:', err.response?.data);

      setStatus('error');
      setMessage(
        err.response?.data?.message ||
        err.message ||
        'Face registration failed'
      );
      setCapturing(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4 shadow-2xl">
            <Camera className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">
            Face Recognition Attendance
          </h1>
          <p className="text-blue-200 text-lg">Secure check-in with face & location verification</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1.5 shadow-xl border border-slate-700/50">
            {faceRegistered && (
              <button
                onClick={() => { setMode('attendance'); setStatus(null); setMessage(''); }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${mode === 'attendance'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                  : 'text-slate-300 hover:text-white'
                  }`}
              >
                <CheckCircle className="w-5 h-5" />
                Mark Attendance
              </button>
            )}
            <button
              onClick={() => {
                if (faceRegistered && !canUpdate) {
                  setShowRequestModal(true);
                } else {
                  setMode('register');
                  setStatus(null);
                  setMessage('');
                }
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${mode === 'register'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                : 'text-slate-300 hover:text-white'
                }`}
            >
              <UserPlus className="w-5 h-5" />
              {faceRegistered ? (canUpdate ? 'Update Face' : 'Request Face Update') : 'Register Face'}
            </button>
          </div>
        </div>

        {/* Pending Request Alert */}
        {pendingRequest && (
          <div className="max-w-2xl mx-auto mb-8 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-blue-100 font-semibold">Face Update Request Pending</p>
              <p className="text-blue-200/70 text-sm">Your request to update face data is currently under review by HR.</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Camera Section */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-700/50">
            <div className="aspect-video bg-slate-900/50 rounded-2xl overflow-hidden relative mb-6 border-2 border-slate-700/50">
              {!cameraActive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4 border-4 border-slate-700">
                    <Camera className="w-12 h-12 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-lg font-medium">Camera is off</p>
                </div>
              ) : (
                <>
                  <video
                    key="camera-video"
                    ref={videoRef}
                    autoPlay={true}
                    muted={true}
                    playsInline={true}
                    className="absolute inset-0 w-full h-full object-cover bg-black"
                    style={{ transform: 'scaleX(-1)', WebkitTransform: 'scaleX(-1)' }}
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ transform: 'scaleX(-1)', WebkitTransform: 'scaleX(-1)' }}
                  />
                  {capturing && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center z-20">
                      <Loader2 className="w-16 h-16 text-white animate-spin" />
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="space-y-3">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Camera className="w-5 h-5" />
                  Start Camera
                </button>
              ) : (
                <>
                  <button
                    onClick={mode === 'attendance' ? handleAttendance : handleRegistration}
                    disabled={capturing}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    {capturing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {mode === 'attendance' ? (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Capture & Mark Attendance
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-5 h-5" />
                            Capture & Register
                          </>
                        )}
                      </>
                    )}
                  </button>
                  <button
                    onClick={stopCamera}
                    disabled={capturing}
                    className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Stop Camera
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="space-y-6">
            {/* Registration Status */}
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-700/50">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-400" />
                Registration Status
              </h3>
              <div className="flex items-center gap-3">
                {faceRegistered ? (
                  <>
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-emerald-400 font-semibold">Face Registered</p>
                      <p className="text-slate-400 text-sm">You can mark attendance</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-orange-400 font-semibold">Not Registered</p>
                      <p className="text-slate-400 text-sm">Please register your face first</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Registration Form (only in register mode) */}
            {mode === 'register' && (
              <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-700/50">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-400" />
                  Your Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={registrationName}
                      onChange={(e) => setRegistrationName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      value={registrationId}
                      onChange={(e) => setRegistrationId(e.target.value)}
                      placeholder="Enter your employee ID"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="w-5 h-5 mt-0.5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="consent" className="text-sm text-slate-300 cursor-pointer flex-1">
                      I consent to my face data being captured, stored, and processed for attendance verification. My data will be encrypted and securely stored.
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {status && (
              <div className={`bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border-2 ${status === 'success' ? 'border-emerald-500/50' : 'border-red-500/50'
                }`}>
                <div className="flex items-start gap-4">
                  {status === 'success' ? (
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-7 h-7 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-7 h-7 text-red-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className={`text-xl font-bold mb-1 ${status === 'success' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                      {status === 'success' ? 'Success!' : 'Error'}
                    </h3>
                    <p className="text-slate-300 text-sm">{message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Location Info */}
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-700/50">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Navigation className="w-6 h-6 text-blue-400" />
                Location
              </h3>
              {location ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <MapPin className="w-5 h-5" />
                    <span className="font-semibold">Location Acquired</span>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Latitude:</span>
                      <span className="text-white font-mono">{location.lat.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Longitude:</span>
                      <span className="text-white font-mono">{location.lng.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Accuracy:</span>
                      <span className={`font-mono ${location.accuracy < 20 ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {Math.round(location.accuracy)}m
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-slate-400 whitespace-nowrap">
                        Place:
                      </span>
                      <span className="ml-auto max-w-[70%] text-right font-mono text-slate-200 break-words">
                        {location.place}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-slate-400">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    Location will be captured when you mark attendance
                  </p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-blue-500/20">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Instructions
              </h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Position your face clearly in the camera frame</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Ensure good lighting and face visibility</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Allow location access for GPS verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Remain within office geofence (20m accuracy)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Register once, then mark attendance daily</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Face Update Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowRequestModal(false)}></div>
          <div className="relative bg-slate-800 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Request Face Update</h2>
            <p className="text-slate-400 text-sm mb-6">
              To update your registered face, please provide a reason. HR will review your request and grant permission if approved.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5 ml-1">Reason for update</label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="e.g., Change in appearance, initial photo was unclear..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition h-32 resize-none"
                ></textarea>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRequest}
                  disabled={submittingRequest}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingRequest ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy Violation Modal */}
      {violationModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"></div>
          <div className="relative bg-slate-800 border border-orange-500/50 w-full max-w-md rounded-3xl p-6 shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-white text-center">Attendance Notice</h2>
            </div>

            <div className="space-y-3 mb-8">
              {violationModal.violations.map((violation, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0"></div>
                  <p className="text-slate-200 text-sm leading-relaxed">{violation}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setViolationModal({ show: false, violations: [] })}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all transform hover:scale-[1.02]"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default FaceAttendance;