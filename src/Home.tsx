import "./Home.css"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

type LessonStatus = "current" | "locked" | "done"

type Lesson = {
  id: number
  icon: string
  label: string
  status: LessonStatus
}

export default function Home() {
  const navigate = useNavigate()

  const [selectedLevel, setSelectedLevel] = useState(1)
  const [completedLevel, setCompletedLevel] = useState(0)

  const baseLessons = [
    { id: 1, icon: "⭐", label: "Beginner" },
    { id: 2, icon: "⭐", label: "Intermediate" },
    { id: 3, icon: "⭐", label: "Expert" },
    { id: 4, icon: "🏆", label: "Pro" },
  ]

  const lessons: Lesson[] = baseLessons.map((lesson) => ({
    ...lesson,
    status:
      lesson.id <= completedLevel
        ? "done"
        : lesson.id === completedLevel + 1
        ? "current"
        : "locked",
  }))

  const rawProgress = (completedLevel / (lessons.length - 1)) * 100
  const progressPercent = rawProgress === 0 ? "8%" : `${rawProgress}%`

  const playableLevelId = completedLevel + 1

  // where each lesson should go:
  const levelRoutes: Record<number, string> = {
    1: "/beginner",
    2: "/intermediate",
    3: "/expert",
    4: "/pro",
  }

  return (
    <div className="page-bg">
      <div className="duoPath">
        <div className="duoTrack" style={{ ["--progress" as any]: progressPercent }}>
          <div className="duoFill" />

          <div className="duoNodes">
            {lessons.map((l) => {
              const isSelected = selectedLevel === l.id
              const isPlayable = l.id === playableLevelId

              return (
                <div key={l.id} style={{ textAlign: "center" }}>
                  <button
                    className="duoNodeBtn"
                    disabled={l.status === "locked"}
                    onClick={() => {
                      setSelectedLevel(l.id)
                      console.log("Open level:", l.id)

                      if (l.id === 1) navigate("/beginner")
                      if (l.id === 2) navigate("/intermediate")
                      if (l.id === 3) navigate("/expert")
                      if (l.id === 4) navigate("/pro")
                      // navigate(levelRoutes[l.id])
                    }}
                  >
                    <div
                      className={[
                        "duoNode",
                        isPlayable ? "duoNode--current" : "",
                        isSelected ? "duoNode--selected" : "",
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
