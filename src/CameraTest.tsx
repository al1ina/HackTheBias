import "./Beginner.css";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

export default function CameraTest() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [status, setStatus] = useState("Loading hand tracking model...");
  const [error, setError] = useState("");

  // Load MediaPipe model on mount
  useEffect(() => {
    let active = true;

    const setup = async () => {
      try {
        setStatus("Loading AI hand tracker...");
        
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isLocalhost && window.location.protocol !== 'https:') {
          setError("Camera access requires HTTPS or localhost.");
          setStatus("Security context required.");
          return;
        }

        const vision = await import(
          /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14"
        );
        const { FilesetResolver, HandLandmarker } = vision;

        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        if (!active) return;

        landmarkerRef.current = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          numHands: 1,
        });

        setModelReady(true);
        setStatus("Model ready. Click 'Open Camera' to start.");
      } catch (err: any) {
        console.error("MediaPipe loading error:", err);
        setError(`Failed to load MediaPipe: ${err.message}`);
        setStatus("Model loading failed.");
      }
    };

    setup();

    return () => {
      active = false;
    };
  }, []);

  // Start camera function
  const startCamera = async () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isLocalhost && window.location.protocol !== 'https:') {
      setError("Camera access requires HTTPS or localhost.");
      setStatus("Security context required.");
      return;
    }

    if (!modelReady) {
      setError("MediaPipe model is still loading. Please wait.");
      return;
    }

    setError("");
    setStatus("Requesting camera access...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: "user" 
        } 
      });

      const video = videoRef.current;
      if (!video) {
        setError("Video element not found.");
        return;
      }

      video.srcObject = stream;
      
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Video metadata load timeout"));
          }, 5000);

          if (video.readyState >= 2) {
            clearTimeout(timeout);
            resolve();
          } else {
            const onLoaded = () => {
              clearTimeout(timeout);
              video.removeEventListener('loadedmetadata', onLoaded);
              resolve();
            };
            video.addEventListener('loadedmetadata', onLoaded);
          }
        });
        
        await video.play();
      } catch (playError: any) {
        console.error("Video play error:", playError);
        video.play().catch(() => {
          setError("Video playback failed. Camera may still be active.");
        });
      }
      
      setCameraReady(true);
      setCameraStarted(true);
      setStatus("Camera active. Show your hand to the camera.");

      const canvas = canvasRef.current;
      if (canvas && video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Continuous hand detection loop
      const detect = () => {
        if (!video || !landmarkerRef.current) return;
        const nowInMs = performance.now();
        
        if (lastVideoTimeRef.current !== video.currentTime) {
          lastVideoTimeRef.current = video.currentTime;
          try {
            const results = landmarkerRef.current.detectForVideo(video, nowInMs);
            const landmarks = results?.landmarks?.[0] ?? null;
            drawLandmarks(landmarks);
          } catch (detectError) {
            console.error("Detection error:", detectError);
          }
        }
        
        animationRef.current = requestAnimationFrame(detect);
      };

      detect();
    } catch (cameraError: any) {
      console.error("Camera access error:", cameraError);
      let errorMsg = "Could not access camera. ";
      
      if (cameraError.name === 'NotAllowedError' || cameraError.name === 'PermissionDeniedError') {
        errorMsg += "Please allow camera permissions when prompted, then click 'Open Camera' again.";
      } else if (cameraError.name === 'NotFoundError' || cameraError.name === 'DevicesNotFoundError') {
        errorMsg += "No camera found. Please connect a camera and try again.";
      } else if (cameraError.name === 'NotReadableError' || cameraError.name === 'TrackStartError') {
        errorMsg += "Camera is being used by another application. Please close other apps using the camera.";
      } else {
        errorMsg += `Error: ${cameraError.message || cameraError.name}`;
      }
      
      setError(errorMsg);
      setStatus("Camera access failed. Click 'Open Camera' to try again.");
      setCameraReady(false);
      setCameraStarted(false);
    }
  };

  // Stop camera function
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraStarted(false);
    setCameraReady(false);
    setStatus("Camera stopped. Click 'Open Camera' to start again.");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Draw hand landmarks on canvas
  const drawLandmarks = (landmarks: any[] | null) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;

    ctx.strokeStyle = "#3b82f6";
    ctx.fillStyle = "#3b82f6";
    ctx.lineWidth = 2;

    // Draw landmarks as points
    landmarks.forEach((point) => {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  return (
    <div className="beginner-page scrollable-container">
      <div className="beginner-card">
        <h1 className="beginner-resultsTitle">Camera Test</h1>
        
        <p style={{ color: "white", textAlign: "center", marginBottom: "1rem" }}>
          Test camera and hand tracking functionality
        </p>

        {error && (
          <div style={{
            padding: "12px",
            backgroundColor: "rgba(248, 113, 113, 0.2)",
            border: "1px solid rgba(248, 113, 113, 0.5)",
            borderRadius: "8px",
            color: "#fef2f2",
            marginBottom: "1rem",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        <div style={{
          padding: "12px",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          border: "1px solid rgba(59, 130, 246, 0.5)",
          borderRadius: "8px",
          color: "#e0e7ff",
          marginBottom: "1rem",
          fontSize: "14px"
        }}>
          {status}
        </div>

        {/* Video container */}
        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: "640px",
          margin: "0 auto 1rem",
          backgroundColor: "#1f2937",
          borderRadius: "8px",
          overflow: "hidden",
          aspectRatio: "4/3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {!cameraStarted ? (
            <p style={{ color: "rgba(255, 255, 255, 0.5)", textAlign: "center" }}>
              Camera not started
            </p>
          ) : null}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: cameraStarted ? "block" : "none"
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none"
            }}
          />
        </div>

        {/* Control buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          {!cameraStarted ? (
            <button
              className="beginner-btn primary"
              onClick={startCamera}
              disabled={!modelReady}
            >
              {modelReady ? "📷 Open Camera" : "Loading Model..."}
            </button>
          ) : (
            <button
              className="beginner-btn secondary"
              onClick={stopCamera}
            >
              Stop Camera
            </button>
          )}
          
          <button
            className="beginner-btn secondary"
            onClick={() => navigate("/home")}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
