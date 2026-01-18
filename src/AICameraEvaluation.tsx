import "./Beginner.css";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * AI Camera Evaluation Component for Pro and Expert Levels
 * 
 * Uses MediaPipe Hand Landmarker in browser to detect hand landmarks.
 * Sends landmarks to backend for AI classification.
 * Waits for user to hold hand position and submit for checking.
 * 
 * Camera Input: Uses getUserMedia API to access device camera
 * Hand Tracking: MediaPipe Hand Landmarker (loaded from CDN)
 * AI Inference: Sends landmarks to backend /asl/check endpoint
 * Evaluation: Compares detected letter against expected letter
 */

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

type TierType = "expert" | "pro";

type AICameraEvaluationProps = {
  tierType: TierType;
  levelNumber: number;
  expectedLetters: string[]; // Letters to evaluate for this level
  onComplete: (score: number) => void;
};

type CheckResult = {
  success: boolean;
  match: boolean;
  target: string;
  prediction: string;
  confidence: number;
  message?: string;
};

export default function AICameraEvaluation({
  tierType,
  levelNumber,
  expectedLetters,
  onComplete,
}: AICameraEvaluationProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const lastLandmarksRef = useRef<any[] | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [status, setStatus] = useState("Loading hand tracking model...");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [evaluationResults, setEvaluationResults] = useState<Array<{ letter: string; correct: boolean }>>([]);

  // Browser detection
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Safety check for empty expectedLetters
  if (!expectedLetters || expectedLetters.length === 0) {
    return (
      <div className="beginner-page scrollable-container">
        <div className="beginner-card">
          <h1 className="beginner-resultsTitle">AI Camera Evaluation</h1>
          <p style={{ color: "white", textAlign: "center" }}>
            No letters to evaluate. Please return to level selection.
          </p>
        </div>
      </div>
    );
  }

  const currentLetter = expectedLetters[currentLetterIndex] || "";
  const allCorrect = evaluationResults.filter(r => r.correct).length;
  const progress = expectedLetters.length > 0 ? (currentLetterIndex / expectedLetters.length) * 100 : 0;

  // Pro vs Expert configuration
  const config = {
    pro: {
      confidenceThreshold: 0.7, // 70% confidence required
    },
    expert: {
      confidenceThreshold: 0.85, // 85% confidence required (stricter)
    },
  };

  const currentConfig = config[tierType];

  // Initialize MediaPipe and camera
  useEffect(() => {
    let active = true;

    // Check browser compatibility
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

    if (!hasMediaDevices) {
      setError("Your browser does not support camera access. Please use Chrome, Firefox, or Edge.");
      setStatus("Camera API not available.");
      return;
    }

    if (isSafari) {
      console.warn("Safari detected - MediaPipe may have compatibility issues. Consider using Chrome for best results.");
    }

    const setup = async () => {
      try {
        setStatus("Loading AI hand tracker...");
        
        // Check if we're on HTTPS or localhost (required for camera in some browsers)
        if (!isLocalhost && window.location.protocol !== 'https:') {
          setError("Camera access requires HTTPS or localhost. Please use localhost or enable HTTPS.");
          setStatus("Security context required.");
          return;
        }

        // Load MediaPipe from CDN
        try {
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
          setStatus("Model ready. Click 'Start Camera' to begin tracking.");
        } catch (mediaPipeError: any) {
          console.error("MediaPipe loading error:", mediaPipeError);
          if (isSafari) {
            setError("MediaPipe may not work properly in Safari. Please try Chrome, Firefox, or Edge for best compatibility.");
          } else {
            setError("Failed to load MediaPipe. Check your internet connection.");
          }
          setStatus("Model loading failed.");
        }
      } catch (err: any) {
        console.error("Setup error:", err);
        setError(`Setup failed: ${err.message || "Unknown error"}. Check browser console for details.`);
        setStatus("Hand tracking unavailable.");
      }
    };

    setup();

    return () => {
      active = false;
    };
  }, []);

  // Manual camera start function
  const startCamera = async () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Check if we're on HTTPS or localhost (required for camera in some browsers)
    if (!isLocalhost && window.location.protocol !== 'https:') {
      setError("Camera access requires HTTPS or localhost. Please use localhost or enable HTTPS.");
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
      // Get camera stream
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

      // Set video source
      try {
        video.srcObject = stream;
      } catch (srcError: any) {
        console.error("Error setting video srcObject:", srcError);
        setError("Failed to set video source. Please try again.");
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      // Wait for video metadata to load with timeout
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
      } catch (metadataError: any) {
        console.error("Metadata load error:", metadataError);
        // Continue anyway - video might still work
        setError("Video metadata load slow, but continuing...");
      }
      
      // Play video with error handling
      try {
        await video.play();
      } catch (playError: any) {
        console.error("Video play error:", playError);
        // Try to play anyway - some browsers auto-play without await
        try {
          await video.play();
        } catch (retryError) {
          setError("Video playback failed. Camera may still be active.");
        }
      }
      
      // Update state AFTER video is ready
      setCameraReady(true);
      setCameraStarted(true);
      setStatus("Camera active. Show your hand to the camera.");

      // Setup canvas for drawing landmarks
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
            lastLandmarksRef.current = landmarks;
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
        errorMsg += "Please allow camera permissions when prompted, then click 'Start Camera' again.";
      } else if (cameraError.name === 'NotFoundError' || cameraError.name === 'DevicesNotFoundError') {
        errorMsg += "No camera found. Please connect a camera and try again.";
      } else if (cameraError.name === 'NotReadableError' || cameraError.name === 'TrackStartError') {
        errorMsg += "Camera is being used by another application. Please close other apps using the camera.";
      } else {
        errorMsg += `Error: ${cameraError.message || cameraError.name}`;
      }
      
      setError(errorMsg);
      setStatus("Camera access failed. Click 'Start Camera' to try again.");
      setCameraReady(false);
      setCameraStarted(false);
    }
  };

  // Cleanup camera on unmount
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

  // Convert landmarks to format expected by backend
  const convertLandmarks = (landmarks: any[]) => {
    return landmarks.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z || 0,
    }));
  };

  // Check current hand sign against expected letter
  const handleCheck = async () => {
    setError("");
    setResult(null);

    const landmarks = lastLandmarksRef.current;
    if (!landmarks || landmarks.length < 21) {
      setError("No hand detected yet. Try showing your hand to the camera.");
      return;
    }

    setChecking(true);
    try {
      const convertedLandmarks = convertLandmarks(landmarks);
      
      const res = await fetch("http://localhost:5001/asl/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: currentLetter,
          landmarks: convertedLandmarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || "Backend returned an error.");
        return;
      }

      setResult(data);

      // If correct and meets confidence threshold, record result and move to next letter
      if (data.match && data.confidence >= currentConfig.confidenceThreshold) {
        const newResult = {
          letter: currentLetter,
          correct: true,
        };
        setEvaluationResults([...evaluationResults, newResult]);

        // Move to next letter
        if (currentLetterIndex < expectedLetters.length - 1) {
          setTimeout(() => {
            setCurrentLetterIndex(currentLetterIndex + 1);
            setResult(null);
            setError("");
          }, 1500);
        } else {
          // All letters completed
          const score = Math.round(
            ([...evaluationResults, newResult].filter((r) => r.correct).length / expectedLetters.length) * 100
          );
          setTimeout(() => {
            onComplete(score);
            navigate(tierRoutes[tierType]);
          }, 2000);
        }
      }
    } catch (err) {
      console.error("Check error:", err);
      setError("Unable to reach the backend server. Is Flask running?");
    } finally {
      setChecking(false);
    }
  };

  const handleNext = () => {
    // Skip current letter (mark as incorrect)
    const newResult = {
      letter: currentLetter,
      correct: false,
    };
    setEvaluationResults([...evaluationResults, newResult]);

    if (currentLetterIndex < expectedLetters.length - 1) {
      setCurrentLetterIndex(currentLetterIndex + 1);
      setResult(null);
      setError("");
    } else {
      // All letters completed
      const score = Math.round(
        ([...evaluationResults, newResult].filter((r) => r.correct).length / expectedLetters.length) * 100
      );
      onComplete(score);
      navigate(tierRoutes[tierType]);
    }
  };

  const tierRoutes: Record<TierType, string> = {
    expert: "/expert-levels",
    pro: "/pro-levels",
  };

  return (
    <div className="beginner-page scrollable-container">
      <button className="back-to-levels-btn" onClick={() => navigate(tierRoutes[tierType])}>
        <ArrowLeft size={18} />
        <span>Back to Levels</span>
      </button>
      <div className="beginner-card">
        <h1 className="beginner-resultsTitle">
          Level {levelNumber} Quiz
        </h1>
        
        <p style={{ color: "white", textAlign: "center", marginBottom: "1rem" }}>
          Show the sign for each letter using your camera
        </p>

        {/* Current letter prompt */}
        {currentLetter && (
          <div style={{ 
            background: "rgba(59, 130, 246, 0.2)", 
            padding: "16px", 
            borderRadius: "12px", 
            marginBottom: "16px",
            textAlign: "center",
            border: "1px solid rgba(59, 130, 246, 0.5)"
          }}>
            <h2 style={{ color: "white", fontSize: "24px", margin: "0 0 8px 0" }}>
              Show Sign: <strong style={{ color: "#93C5FD" }}>{currentLetter}</strong>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.8)", margin: 0, fontSize: "14px" }}>
              {cameraStarted ? "Hold your hand position, then click 'Check My Sign'" : "Start the camera to begin"}
            </p>
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "white", fontSize: "14px", marginBottom: "8px" }}>
            <span>Progress: {currentLetterIndex + 1} / {expectedLetters.length}</span>
            {evaluationResults.length > 0 && (
              <span>Correct: {allCorrect} / {evaluationResults.length}</span>
            )}
          </div>
          <div className="beginner-progressTrack">
            <div
              className="beginner-progressFill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error message */}
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

        {/* Safari warning */}
        {isSafari && (
          <div style={{
            padding: "12px",
            backgroundColor: "rgba(251, 191, 36, 0.2)",
            border: "1px solid rgba(251, 191, 36, 0.5)",
            borderRadius: "8px",
            color: "#FBBF24",
            marginBottom: "1rem",
            fontSize: "14px"
          }}>
            ⚠️ <strong>Safari Detected:</strong> For best results, use Chrome, Firefox, or Edge.
          </div>
        )}

        {/* Status message */}
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

        {/* Check result */}
        {result && (
          <div style={{
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "1rem",
            background: result.match && result.confidence >= currentConfig.confidenceThreshold 
              ? "rgba(34, 197, 94, 0.2)" 
              : result.match
              ? "rgba(251, 191, 36, 0.2)"
              : "rgba(248, 113, 113, 0.2)",
            border: `1px solid ${
              result.match && result.confidence >= currentConfig.confidenceThreshold 
                ? "rgba(34, 197, 94, 0.6)" 
                : result.match
                ? "rgba(251, 191, 36, 0.6)"
                : "rgba(248, 113, 113, 0.6)"
            }`,
          }}>
            <p style={{ color: "white", margin: "4px 0", fontSize: "14px" }}>
              <strong>Prediction:</strong> {result.prediction} | 
              <strong> Confidence:</strong> {(result.confidence * 100).toFixed(0)}%
            </p>
            <p style={{ 
              color: "white", 
              margin: "4px 0", 
              fontWeight: "600",
              fontSize: "14px"
            }}>
              {result.match && result.confidence >= currentConfig.confidenceThreshold
                ? "✓ Correct! Moving to next letter..."
                : result.match
                ? "⚠ Correct sign, but need higher confidence"
                : "✗ Incorrect. Keep practicing and try again"}
            </p>
          </div>
        )}

        {/* Control buttons */}
        <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
          {!cameraStarted ? (
            <button
              className="beginner-btn primary"
              onClick={startCamera}
              disabled={!modelReady}
            >
              {modelReady ? "📷 Start Camera" : "Loading Model..."}
            </button>
          ) : (
            <>
              <button
                className="beginner-btn primary"
                onClick={handleCheck}
                disabled={checking || !cameraReady || !modelReady}
              >
                {checking ? "Checking..." : "Check My Sign"}
              </button>
              <button
                className="beginner-btn secondary"
                onClick={handleNext}
              >
                Skip This Letter
              </button>
            </>
          )}
        </div>

        {/* Results list */}
        {evaluationResults.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <h3 style={{ color: "white", fontSize: "16px", marginBottom: "8px" }}>
              Results:
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {evaluationResults.map((result, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: result.correct ? "rgba(34, 197, 94, 0.3)" : "rgba(248, 113, 113, 0.3)",
                    color: "white",
                    fontSize: "14px",
                  }}
                >
                  {result.letter}: {result.correct ? "✓" : "✗"}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
