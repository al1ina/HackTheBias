import "./Home.css"
import { useState } from "react"
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

  // Get tier unlock status from localStorage
  const getCompletedTiers = (): string[] => {
    const stored = localStorage.getItem("home_progress");
    if (stored) {
      const data = JSON.parse(stored);
      return data.completedTiers || [];
    }
    return [];
  };

  const [completedTiers] = useState<string[]>(getCompletedTiers());

  const baseLessons = [
    { id: 1, icon: "⭐", label: "Beginner" },
    { id: 2, icon: "⭐", label: "Intermediate" },
    { id: 3, icon: "⭐", label: "Expert" },
    { id: 4, icon: "🏆", label: "Pro" },
  ]

  // Determine tier unlock status based on previous tier completion
  const getTierStatus = (tierId: number): LessonStatus => {
    if (tierId === 1) return "current"; // Beginner always unlocked
    const previousTierName = ["beginner", "intermediate", "expert"][tierId - 2];
    return completedTiers.includes(previousTierName) ? "current" : "locked";
  };

  const lessons: Lesson[] = baseLessons.map((lesson) => ({
    ...lesson,
    status: getTierStatus(lesson.id),
  }))

  // Calculate progress based on completed tiers
  const completedTierCount = completedTiers.length;
  const rawProgress = (completedTierCount / (lessons.length - 1)) * 100
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

  const username = localStorage.getItem("username") || "User";

  return (
    <div className="page-bg">
      <ProfileMenu username={username} onSignOut={handleSignOut} />
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

                  <div className="duoLabel">{l.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
