import "./Home.css"
import { useState } from "react"

type LessonStatus = "current" | "locked" | "done"

type Lesson = {
  id: number
  icon: string
  label: string
  status: LessonStatus
}

export default function Home() {
  const [selectedLevel, setSelectedLevel] = useState(1)   // what user clicked / is viewing
  const [completedLevel, setCompletedLevel] = useState(0) // progress only changes when exercises complete

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

  // progress depends ONLY on completedLevel (not clicks)
  const rawProgress = (completedLevel / (lessons.length - 1)) * 100
  const progressPercent = rawProgress === 0 ? "8%" : `${rawProgress}%`

  // Later: call this AFTER finishing exercises inside the level
  // Example use later: setCompletedLevel((prev) => Math.min(prev + 1, lessons.length - 1))
  const completeLevel = (levelId: number) => {
    // only allow completing the next playable level
    if (levelId === completedLevel + 1) {
      setCompletedLevel((prev) => Math.min(prev + 1, lessons.length - 1))
    }
  }

  const playableLevelId = completedLevel + 1

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

                      // Later, when user finishes exercises for this level:
                      // completeLevel(l.id)
                    }}
                  >
                    <div
                      className={[
                        "duoNode",
                        isPlayable ? "duoNode--current" : "",     // ring/float for the actual next level
                        isSelected ? "duoNode--selected" : "",   // separate style for what user clicked
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
