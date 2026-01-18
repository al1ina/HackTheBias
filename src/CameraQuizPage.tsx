import "./Beginner.css";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

// Allowed letters for classification: A, B, C, D, H, L, V, Y, W
const allLetters = ["A", "B", "C", "D", "H", "L", "V", "Y", "W"];

// Shuffle function for randomizing
const shuffle = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

type CheckResult = {
  success: boolean;
  match: boolean;
  target: string;
  prediction: string;
  confidence: number;
  message?: string;
};

export default function CameraQuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const levelNumber = parseInt(searchParams.get("level") || "1");
  const tierType = searchParams.get("tier") || "pro";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastLandmarksRef = useRef<any[] | null>(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [status, setStatus] = useState("Loading hand tracking model...");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [evaluationResults, setEvaluationResults] = useState<Array<{ letter: string; correct: boolean }>>([]);
  const [showResults, setShowResults] = useState(false);

  // Generate questions based on level (cumulative - all letters learned so far)
  const questions = useMemo(() => {
    const lettersPerLevel = 4;
    const quizLetters = allLetters.slice(0, levelNumber * lettersPerLevel);
    return shuffle([...quizLetters]);
  }, [levelNumber]);

  const currentLetter = questions[currentQuestionIndex] || "";
  const allCorrect = evaluationResults.filter(r => r.correct).length;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  // Configuration for confidence thresholds (both set to 70%)
  const config = {
    pro: { confidenceThreshold: 0.7 },
    expert: { confidenceThreshold: 0.7 },
  };
  const currentConfig = config[tierType as "pro" | "expert"] || config.pro;

  const tierRoutes: Record<string, string> = {
    expert: "/expert-levels",
    pro: "/pro-levels",
  };

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

      // If correct and meets confidence threshold, record result and move to next question
      if (data.match && data.confidence >= currentConfig.confidenceThreshold) {
        const newResult = {
          letter: currentLetter,
          correct: true,
        };
        const updatedResults = [...evaluationResults, newResult];
        setEvaluationResults(updatedResults);

        // Move to next question
        if (currentQuestionIndex < questions.length - 1) {
          setTimeout(() => {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setResult(null);
            setError("");
          }, 1500);
        } else {
          // All questions completed
          const score = Math.round((updatedResults.filter((r) => r.correct).length / questions.length) * 100);
          setTimeout(() => {
            setShowResults(true);
            // Save score to backend
            const userId = localStorage.getItem("user_id");
            if (userId) {
              fetch("http://localhost:5001/save-score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: parseInt(userId),
                  level_type: tierType,
                  level_number: levelNumber,
                  score: score
                }),
              }).catch(error => console.error("Failed to save score:", error));
            }
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

  // Skip current question
  const handleSkip = () => {
    const newResult = {
      letter: currentLetter,
      correct: false,
    };
    const updatedResults = [...evaluationResults, newResult];
    setEvaluationResults(updatedResults);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setResult(null);
      setError("");
    } else {
      // All questions completed
      const score = Math.round((updatedResults.filter((r) => r.correct).length / questions.length) * 100);
      setShowResults(true);
      // Save score to backend
      const userId = localStorage.getItem("user_id");
      if (userId) {
        fetch("http://localhost:5001/save-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: parseInt(userId),
            level_type: tierType,
            level_number: levelNumber,
            score: score
          }),
        }).catch(error => console.error("Failed to save score:", error));
      }
    }
  };

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
      <button 
        className="back-to-levels-btn" 
        onClick={() => navigate(tierRoutes[tierType] || "/home")}
      >
        <ArrowLeft size={18} />
        <span>Back to Levels</span>
      </button>
      <div className="beginner-card">
        <h1 className="beginner-resultsTitle">
          {tierType === "expert" ? "Expert" : "Pro"} - Level {levelNumber}
        </h1>
        
        {showResults ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <h2 style={{ color: "white", fontSize: "24px", marginBottom: "1rem" }}>
                Quiz Complete!
              </h2>
              <div style={{
                fontSize: "48px",
                color: "white",
                marginBottom: "1rem"
              }}>
                {allCorrect} / {questions.length}
              </div>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "18px" }}>
                Score: {Math.round((allCorrect / questions.length) * 100)}%
              </p>
            </div>
            <button
              className="beginner-btn primary"
              onClick={() => navigate(tierRoutes[tierType] || "/home")}
            >
              Back to Levels
            </button>
          </>
        ) : (
          <>
            {/* Current question */}
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
                  Display the letter <strong style={{ color: "#93C5FD" }}>{currentLetter}</strong>
                </h2>
                <p style={{ color: "rgba(255,255,255,0.8)", margin: 0, fontSize: "14px" }}>
                  {cameraStarted ? "Hold your hand position, then click 'Check My Sign'" : "Start the camera to begin"}
                </p>
              </div>
            )}

            {/* Progress */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "white", fontSize: "14px", marginBottom: "8px" }}>
                <span>Question: {currentQuestionIndex + 1} / {questions.length}</span>
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
              display: cameraStarted ? "block" : "none",
              transform: "scaleX(-1)",
              WebkitTransform: "scaleX(-1)"
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
              pointerEvents: "none",
              transform: "scaleX(-1)",
              WebkitTransform: "scaleX(-1)"
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
                    ? "✓ Correct! Moving to next question..."
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
                  {modelReady ? "📷 Open Camera" : "Loading Model..."}
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
                    onClick={handleSkip}
                  >
                    Skip This Question
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
          </>
        )}
      </div>
    </div>
  );
}
