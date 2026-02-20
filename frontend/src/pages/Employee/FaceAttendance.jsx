import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, MapPin, CheckCircle, XCircle, User, UserPlus, Clock, AlertCircle,
  Loader2, Navigation, LogOut, RotateCcw, Shield, Smartphone
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import * as faceapi from 'face-api.js';


const FaceAttendance = ({ onSuccess, onClose, actionType }) => {
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
  const requestedAction = (actionType || 'AUTO').toString().toUpperCase();
  const attendanceActionLabel = requestedAction === 'OUT' ? 'Check Out' : 'Check In';

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
        actionType: requestedAction,
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

        // Notify parent that attendance was marked successfully
        try {
          if (typeof onSuccess === 'function') onSuccess(res.data);
        } catch (e) {
          console.warn('onSuccess callback failed:', e);
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
      <div className="h-full flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Initializing Security Protocols...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Blurry Border Container */}
      <div className="relative bg-white border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] overflow-hidden p-6 sm:p-8">



        {/* Mode Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-white p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
            {faceRegistered && (
              <button
                onClick={() => { setMode('attendance'); setStatus(null); setMessage(''); }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-300 ${mode === 'attendance'
                  ? 'bg-white text-teal-600 shadow-md transform scale-105'
                  : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <CheckCircle className="w-4 h-4" />
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
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-300 ${mode === 'register'
                ? 'bg-white text-teal-600 shadow-md transform scale-105'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <UserPlus className="w-4 h-4" />
              {faceRegistered ? (canUpdate ? 'Update Face' : 'Request Update') : 'Register Face'}
            </button>
          </div>
        </div>

        {/* Pending Request Alert */}
        {pendingRequest && (
          <div className="max-w-2xl mx-auto mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-blue-800 font-bold text-sm uppercase tracking-wide">Update Pending</p>
              <p className="text-blue-600/80 text-xs font-medium mt-0.5">Your face update request is under review.</p>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-8">

          {/* Left Column: Camera */}
          <div className="rounded-[24px] bg-white border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="relative aspect-video bg-white rounded-2xl overflow-hidden border border-slate-200 mb-6 group">
              {!cameraActive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 transition-opacity">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                    <Camera className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Camera Inactive</p>
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
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ transform: 'scaleX(-1)', WebkitTransform: 'scaleX(-1)' }}
                  />
                  {capturing && (
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] flex items-center justify-center z-20">
                      <div className="bg-white/90 p-4 rounded-2xl shadow-xl">
                        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                      </div>
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex flex-col gap-3">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="w-full bg-[#14B8A6] hover:bg-[#0F766E] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                >
                  <Camera className="w-5 h-5" />
                  Activate Camera
                </button>
              ) : (
                <>
                  <button
                    onClick={mode === 'attendance' ? handleAttendance : handleRegistration}
                    disabled={capturing}
                    className="w-full bg-[#14B8A6] hover:bg-[#0F766E] disabled:bg-slate-300 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98] disabled:shadow-none disabled:active:scale-100 flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
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
                            {`Capture & ${attendanceActionLabel}`}
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
                    className="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold py-3 rounded-xl transition-all border border-slate-200/60 flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
                  >
                    <LogOut className="w-4 h-4" />
                    Stop Camera
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Status & Forms */}
          <div className="space-y-6">

            {/* 1. Registration Status Card */}
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-500" />
                Status check
              </h3>
              <div className="flex items-center gap-4">
                {faceRegistered ? (
                  <>
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 hidden sm:flex">
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-emerald-600 font-bold text-base">Face Registered</p>
                      <p className="text-slate-400 text-xs font-medium mt-0.5">System is ready for attendance</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 hidden sm:flex">
                      <AlertCircle className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-amber-500 font-bold text-base">Not Registered</p>
                      <p className="text-slate-400 text-xs font-medium mt-0.5">Face data is required</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 2. Registration Form (Register Mode) */}
            {mode === 'register' && (
              <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-500" />
                  Your Details
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                    <input
                      type="text"
                      value={registrationName}
                      onChange={(e) => setRegistrationName(e.target.value)}
                      placeholder="Enter Full Name"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Employee ID</label>
                    <input
                      type="text"
                      value={registrationId}
                      onChange={(e) => setRegistrationId(e.target.value)}
                      placeholder="Enter ID"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all text-sm"
                    />
                  </div>
                  <div className="pt-2">
                    <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-teal-200 cursor-pointer transition-colors group">
                      <input
                        type="checkbox"
                        checked={consentGiven}
                        onChange={(e) => setConsentGiven(e.target.checked)}
                        className="mt-1 w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 cursor-pointer"
                      />
                      <span className="text-xs text-slate-500 group-hover:text-slate-600 font-medium leading-relaxed">
                        I consent to capturing my face data for automated attendance verification securely.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Feedback / Status Messages */}
            {status && (
              <div className={`rounded-[24px] p-6 shadow-sm border animate-in zoom-in-95 duration-200 ${status === 'success' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'
                }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'
                    }`}>
                    {status === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm uppercase tracking-wide mb-1 ${status === 'success' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                      {status === 'success' ? 'Success' : 'Action Failed'}
                    </h3>
                    <p className={`text-sm font-medium leading-relaxed ${status === 'success' ? 'text-emerald-600/80' : 'text-rose-600/80'
                      }`}>{message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Location Details */}
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-teal-500" />
                Location Data
              </h3>
              {location ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-500 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold uppercase tracking-wide">Signal Acquired</span>
                  </div>
                  <div className="bg-white rounded-xl p-4 space-y-2 border border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider">Coords</span>
                      <span className="text-slate-600 font-mono font-medium">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider">Precision</span>
                      <span className={`font-mono font-bold ${location.accuracy < 20 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        ~{Math.round(location.accuracy)}m
                      </span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-dashed border-slate-200">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-xs text-slate-500 font-medium leading-relaxed break-words">
                          {location.place}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center bg-white rounded-xl border border-dashed border-slate-200">
                  <Navigation className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waiting for GPS</p>
                </div>
              )}
            </div>

            {/* 5. Instructions */}
            <div className="bg-[#F0FDFA] rounded-[24px] border border-[#CCFBF1] p-6">
              <h3 className="text-sm font-bold text-[#14B8A6] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Guidelines
              </h3>
              <ul className="space-y-2.5">
                {[
                  'Ensure your face is clearly visible',
                  'Verify you are within office premises',
                  'Clean camera lens for best results',
                  'Grant browser location permissions'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-[#0F766E] font-medium">
                    <span className="w-1 h-1 rounded-full bg-[#14B8A6] mt-1.5 shrink-0"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>

      {/* Face Update Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowRequestModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl scale-100 opacity-100 transition-all border border-white/40">
            <h2 className="text-xl font-black text-slate-800 mb-3">Update Request</h2>
            <p className="text-slate-500 text-sm mb-6 font-medium leading-relaxed">
              Please explain why you need to re-register your face data. Admin approval required.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">Reason</label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="e.g. Changed appearance, new glasses..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-700 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition h-32 resize-none text-sm font-medium"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm uppercase tracking-wide transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRequest}
                  disabled={submittingRequest}
                  className="flex-1 py-3.5 bg-[#14B8A6] hover:bg-[#0F766E] text-white rounded-2xl font-bold text-sm uppercase tracking-wide transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submittingRequest ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy Violation Modal */}
      {violationModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
          <div className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border-2 border-rose-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 border border-rose-100 shadow-sm">
                <AlertCircle className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-xl font-black text-slate-800">Policy Alert</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Attendance Verification</p>
            </div>

            <div className="space-y-3 mb-8">
              {violationModal.violations.map((violation, idx) => (
                <div key={idx} className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0"></div>
                  <p className="text-rose-700 text-sm font-medium leading-relaxed">{violation}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setViolationModal({ show: false, violations: [] })}
              className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-200 transition-all active:scale-[0.98] uppercase tracking-wide text-sm"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default FaceAttendance;
