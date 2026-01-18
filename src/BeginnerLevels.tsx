import "./BeginnerLevels.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type LevelStatus = "locked" | "unlocked" | "completed";

type Level = {
  id: number;
  name: string;
  status: LevelStatus;
  score: number; // 0-100
};

export default function BeginnerLevels() {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  // Load progress from database or localStorage
  useEffect(() => {
    const loadProgress = async () => {
      const userId = localStorage.getItem("user_id");
      let currentLevel = 1;

      // Try to get from database first
      if (userId) {
        try {
          const response = await fetch(`http://localhost:5001/user-progress?user_id=${userId}`);
          if (response.ok) {
            const data = await response.json();
            currentLevel = data.level_number || 1;
            localStorage.setItem("level_number", currentLevel.toString());
          }
        } catch (error) {
          console.error("Failed to load progress from database:", error);
          // Fallback to localStorage
          currentLevel = parseInt(localStorage.getItem("level_number") || "1");
        }
      } else {
        currentLevel = parseInt(localStorage.getItem("level_number") || "1");
      }

      // Initialize levels based on current level from database
      const totalLevels = 5;
      const initialLevels: Level[] = [];
      for (let i = 1; i <= totalLevels; i++) {
        initialLevels.push({
          id: i,
          name: `Level ${i}`,
          status: i <= currentLevel ? "unlocked" : "locked",
          score: i < currentLevel ? 100 : 0
        });
      }

      setLevels(initialLevels);
      setLoading(false);
    };

    loadProgress();
  }, []);

  if (loading) {
    return (
      <div className="beginner-levels-page">
        <div className="beginner-levels-container">
          <p style={{ color: "white", textAlign: "center" }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Handle level click - navigate to Beginner component with level parameter
  const handleLevelClick = (levelId: number, status: LevelStatus) => {
    if (status === "locked") return;
    // Navigate to Beginner with level parameter - mode will default to learning
    navigate(`/beginner?level=${levelId}&mode=lesson`);
  };

  return (
    <div className="beginner-levels-page">
      <div className="beginner-levels-container">
        <h1 className="beginner-levels-title">Beginner Levels</h1>
        <p className="beginner-levels-subtitle">Complete each level to unlock the next</p>

        <div className="levels-grid">
          {levels.map((level) => (
            <div key={level.id} className="level-card">
              <div className="level-card-header">
                <h3 className="level-name">{level.name}</h3>
                {level.status === "completed" && (
                  <span className="level-score">{level.score}%</span>
                )}
              </div>

              {level.status === "locked" ? (
                <div className="level-locked">
                  <span className="lock-icon">🔒</span>
                  <p className="lock-text">Locked</p>
                </div>
              ) : (
                <div className="level-unlocked">
                  {level.status === "completed" && (
                    <span className="completed-badge">✓ Completed</span>
                  )}
                  <button
                    className="play-button"
                    onClick={() => handleLevelClick(level.id, level.status)}
                  >
                    <span className="play-icon">▶</span>
                    <span>Play</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="back-button"
          onClick={() => navigate("/home")}
        >
          ← Back to Tiers
        </button>
      </div>
    </div>
  );
}
