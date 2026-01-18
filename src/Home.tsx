import "./Home.css"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

type ProfileMenuProps = {
  username: string;
  onSignOut: () => void;
};

function ProfileMenu({ username, onSignOut }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="profile-menu-container">
      <button 
        className="profile-button" 
        onClick={() => setIsOpen(!isOpen)}
      >
        👤 {username}
      </button>
      {isOpen && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-header">{username}</div>
          <button className="profile-dropdown-item" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

type LessonStatus = "current" | "locked" | "done"

type Lesson = {
  id: number
  icon: string
  label: string
  status: LessonStatus
}

export default function Home() {
  const navigate = useNavigate()

  // Get tier status from level_type in localStorage/database
  const getTierProgress = () => {
    const levelType = localStorage.getItem("level_type") || "beginner";
    const tierMap: Record<string, number> = {
      "beginner": 0,
      "intermediate": 1,
      "expert": 2,
      "pro": 3
    };
    return tierMap[levelType] || 0;
  };

  const [tierProgress, setTierProgress] = useState<number>(getTierProgress());
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderName, setLeaderName] = useState<string>("");
  const [leaderboardLevelType, setLeaderboardLevelType] = useState<string>("beginner");

  // Refresh tier progress when component mounts or level_type changes
  useEffect(() => {
    const checkProgress = async () => {
      const userId = localStorage.getItem("user_id");
      if (userId) {
        try {
          const response = await fetch(`http://localhost:5001/user-progress?user_id=${userId}`);
          if (response.ok) {
            const data = await response.json();
            const levelType = data.level_type || "beginner";
            const tierMap: Record<string, number> = {
              "beginner": 0,
              "intermediate": 1,
              "expert": 2,
              "pro": 3
            };
            const newProgress = tierMap[levelType] || 0;
            setTierProgress(newProgress);
            localStorage.setItem("level_type", levelType);
          }
        } catch (error) {
          console.error("Failed to load progress:", error);
        }
      }
    };
    checkProgress();
  }, []);

  const baseLessons = [
    { id: 1, icon: "⭐", label: "Beginner" },
    { id: 2, icon: "⭐", label: "Intermediate" },
    { id: 3, icon: "⭐", label: "Expert" },
    { id: 4, icon: "🏆", label: "Pro" },
  ]

  // Determine tier unlock status based on level_type
  const getTierStatus = (tierId: number): LessonStatus => {
    if (tierId === 1) return "current"; // Beginner always unlocked
    // Unlock if user has reached this tier or higher
    return tierProgress >= tierId - 1 ? "current" : "locked";
  };

  const lessons: Lesson[] = baseLessons.map((lesson) => ({
    ...lesson,
    status: getTierStatus(lesson.id),
  }))

  // Calculate progress based on tier progress (0-3)
  const rawProgress = (tierProgress / (lessons.length - 1)) * 100
  const progressPercent = rawProgress === 0 ? "8%" : `${Math.min(rawProgress, 100)}%`

  const handleLevelClick = (levelId: number) => {
    const level = lessons.find(l => l.id === levelId)
    if (level && level.status !== "locked") {
      // Navigate to tier's level selection page
      const tierRoutes: Record<number, string> = {
        1: "/beginner-levels",
        2: "/intermediate-levels",
        3: "/expert-levels",
        4: "/pro-levels",
      };
      navigate(tierRoutes[levelId]);
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("level_type");
    localStorage.removeItem("level_number");
    navigate("/login");
  };

  const handleLeaderboardClick = async (levelType: string) => {
    setLeaderboardLevelType(levelType);
    try {
      const response = await fetch(`http://localhost:5001/leaderboard?level_type=${levelType}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setLeaderName(data.name || "No players yet");
        setShowLeaderboard(true);
      } else {
        // Show error message from backend
        setLeaderName(data.message || "Error loading leaderboard");
        setShowLeaderboard(true);
      }
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
      setLeaderName("Unable to connect to server. Please check if Flask is running.");
      setShowLeaderboard(true);
    }
  };

  const username = localStorage.getItem("username") || "User";

  return (
    <div className="page-bg">
      <h1 style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "'Rustic Roadway', 'Permanent Marker', cursive",
        fontSize: "48px",
        color: "#ec4899",
        margin: 0,
        padding: "10px 0",
        textDecorationLine: "underline",
        textDecorationStyle: "double",
        textDecorationThickness: "3px",
        textDecorationColor: "#ec4899",
        zIndex: 1000,
        textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)",
        letterSpacing: "2px"
      }}>
        Silent Speak
      </h1>
      <ProfileMenu username={username} onSignOut={handleSignOut} />
      <img 
        src="/silent_speak_logo.png" 
        alt="Silent Speak Logo" 
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          width: "120px",
          height: "auto",
          zIndex: 100,
          opacity: 0.9
        }}
      />
      <div style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        display: "flex",
        gap: "10px",
        zIndex: 1000
      }}>
        <button
          onClick={() => navigate("/camera-test")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}
        >
          📷 Test Camera
        </button>
        <button
          onClick={() => {
            const currentLevelType = localStorage.getItem("level_type") || "beginner";
            handleLeaderboardClick(currentLevelType);
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}
        >
          🏆 Leaderboard
        </button>
      </div>
      <div className="duoPath">
        <div className="duoTrack" style={{ ["--progress" as any]: progressPercent }}>
          <div className="duoFill" />

          <div className="duoNodes">
            {lessons.map((l) => {
              const isPlayable = l.status === "current"

              return (
                <div key={l.id} style={{ textAlign: "center" }}>
                  <button
                    className="duoNodeBtn"
                    disabled={l.status === "locked"}
                    onClick={() => handleLevelClick(l.id)}
                  >
                    <div
                      className={[
                        "duoNode",
                        isPlayable ? "duoNode--current" : "",
                        l.status === "locked" ? "duoNode--locked" : "",
                        l.status === "done" ? "duoNode--done" : "",
                      ].join(" ")}
                      style={{ position: "relative" }}
                    >
                      <div className="duoNodeFace">
                        <span className="duoIcon">{l.icon}</span>
                      </div>
                    </div>
                  </button>

                  <div className="duoLabel">
                    {l.id === 4 && (
                      <span style={{ 
                        display: "block", 
                        fontSize: "20px", 
                        marginBottom: "4px",
                        filter: "drop-shadow(0 2px 4px rgba(255, 215, 0, 0.5))"
                      }}>
                        👑
                      </span>
                    )}
                    {l.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000
          }}
          onClick={() => setShowLeaderboard(false)}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              padding: "2rem",
              borderRadius: "16px",
              border: "2px solid rgba(59, 130, 246, 0.5)",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              color: "white",
              fontSize: "24px",
              marginBottom: "1rem",
              textAlign: "center"
            }}>
              🏆 Leaderboard
            </h2>
            <p style={{
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "14px",
              marginBottom: "1rem",
              textAlign: "center"
            }}>
              {leaderboardLevelType.charAt(0).toUpperCase() + leaderboardLevelType.slice(1)} Tier
            </p>
            <div style={{
              backgroundColor: "rgba(59, 130, 246, 0.2)",
              padding: "1.5rem",
              borderRadius: "12px",
              textAlign: "center",
              marginBottom: "1.5rem"
            }}>
              <p style={{
                color: "#93C5FD",
                fontSize: "18px",
                fontWeight: "600",
                margin: "0 0 0.5rem 0"
              }}>
                Top Player
              </p>
              <p style={{
                color: "white",
                fontSize: "28px",
                fontWeight: "bold",
                margin: 0
              }}>
                {leaderName}
              </p>
            </div>
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "500"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
