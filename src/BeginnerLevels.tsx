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

type TierType = "beginner" | "intermediate" | "expert" | "pro";

type BeginnerLevelsProps = {
  tierType?: TierType;
};

export default function BeginnerLevels({ tierType = "beginner" }: BeginnerLevelsProps) {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  // Load progress from database or localStorage
  useEffect(() => {
    const loadProgress = async () => {
      const userId = localStorage.getItem("user_id");
      const currentLevelType = localStorage.getItem("level_type") || "beginner";
      let currentLevel = 1;

      // Check if user has access to this tier
      const tierOrder = ["beginner", "intermediate", "expert", "pro"];
      const currentTierIndex = tierOrder.indexOf(currentLevelType);
      const requestedTierIndex = tierOrder.indexOf(tierType);
      
      if (requestedTierIndex > currentTierIndex) {
        // User hasn't unlocked this tier yet
        setLevels([]);
        setLoading(false);
        return;
      }

      // If viewing a tier that's been completed, show all as completed
      if (requestedTierIndex < currentTierIndex) {
        const allCompleted: Level[] = [];
        for (let i = 1; i <= 5; i++) {
          allCompleted.push({
            id: i,
            name: `Level ${i}`,
            status: "completed" as LevelStatus,
            score: 100
          });
        }
        setLevels(allCompleted);
        setLoading(false);
        return;
      }

      // Try to get from database first
      if (userId && currentLevelType === tierType) {
        try {
          const response = await fetch(`http://localhost:5001/user-progress?user_id=${userId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.level_type === tierType) {
              currentLevel = data.level_number || 1;
            } else {
              currentLevel = 1; // Different tier, start at level 1
            }
          }
        } catch (error) {
          console.error("Failed to load progress from database:", error);
          currentLevel = 1;
        }
      } else {
        currentLevel = 1;
      }

      // Initialize levels based on current level from database
      const totalLevels = 5;
      const initialLevels: Level[] = [];
      for (let i = 1; i <= totalLevels; i++) {
        initialLevels.push({
          id: i,
          name: `Level ${i}`,
          status: i < currentLevel ? "completed" as LevelStatus : (i === currentLevel ? "unlocked" : "locked"),
          score: i < currentLevel ? 100 : 0
        });
      }

      setLevels(initialLevels);
      setLoading(false);
    };

    loadProgress();
  }, [tierType]);

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
    // Navigate to the tier's lesson page
    const tierRoutes: Record<TierType, string> = {
      beginner: "/beginner",
      intermediate: "/intermediate",
      expert: "/expert",
      pro: "/pro"
    };
    navigate(`${tierRoutes[tierType]}?level=${levelId}&mode=lesson`);
  };

  const tierTitles: Record<TierType, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    expert: "Expert",
    pro: "Pro"
  };

  return (
    <div className="beginner-levels-page">
      <div className="beginner-levels-container">
        <h1 className="beginner-levels-title">{tierTitles[tierType]} Levels</h1>
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
