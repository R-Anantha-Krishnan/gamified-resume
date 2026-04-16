import { useMemo, useState } from 'react'
import GameCanvas from './game/GameCanvas'
import AchievementModal from './components/AchievementModal'
import RecruiterToggle from './components/RecruiterToggle'
import Timeline from './components/Timeline'
import EndScreen from './components/EndScreen'
import { achievements, sections } from './data/achievements'
import type { Achievement } from './types/achievement'
import { useFullscreen } from './hooks/useFullscreen'
import './App.css'

function App() {
  const [collectedIds, setCollectedIds] = useState<string[]>([])
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null)
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [currentSection, setCurrentSection] = useState('School')
  const [isAwaitingFinalSequence, setIsAwaitingFinalSequence] = useState(false)
  const [finalSequenceTrigger, setFinalSequenceTrigger] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [gameInstanceKey, setGameInstanceKey] = useState(0)
  const { containerRef: fullscreenRef, isFullscreen, toggle: toggleFullscreen } = useFullscreen()

  const progress = useMemo(
    () => Math.min(1, collectedIds.length / achievements.length),
    [collectedIds.length]
  )

  const handleAchievementCollect = (achievement: Achievement) => {
    if (collectedIds.includes(achievement.id)) return

    setCollectedIds((previous) => {
      const nextCollected = [...previous, achievement.id]
      if (nextCollected.length >= achievements.length) {
        setIsAwaitingFinalSequence(true)
      }
      return nextCollected
    })

    if (achievement.isMajor) {
      setActiveAchievement(achievement)
    }
  }

  const handleCloseModal = () => {
    setActiveAchievement(null)
    if (isAwaitingFinalSequence) {
      setFinalSequenceTrigger((previous) => previous + 1)
      setIsAwaitingFinalSequence(false)
    }
  }

  const handleSectionChange = (section: string) => {
    setCurrentSection(section)
  }

  const handleFinalSequenceComplete = () => {
    setIsComplete(true)
  }

  const handleRestart = () => {
    setCollectedIds([])
    setActiveAchievement(null)
    setIsAwaitingFinalSequence(false)
    setFinalSequenceTrigger(0)
    setIsComplete(false)
    setCurrentSection('School')
    setGameInstanceKey((previous) => previous + 1)
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Gamified Resume</p>
          <h1>Interactive Career Journey</h1>
          <p className="subtitle">
            Auto-run platformer experience for recruiters — collect achievements from 1998 to 2026.
          </p>
        </div>
        <RecruiterToggle isAutoPlay={isAutoPlay} onToggle={setIsAutoPlay} />
      </header>

      <main className="content-grid">
        <section className="game-panel" ref={fullscreenRef}>
          <GameCanvas
            key={gameInstanceKey}
            achievements={achievements}
            isAutoPlay={isAutoPlay}
            isModalOpen={activeAchievement !== null}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            collectedIds={collectedIds}
            onAchievementCollected={handleAchievementCollect}
            onSectionChange={handleSectionChange}
            onGameComplete={() => {}}
            startFinalSequence={finalSequenceTrigger}
            onFinalSequenceComplete={handleFinalSequenceComplete}
          />
          <AchievementModal
            achievement={activeAchievement}
            onClose={handleCloseModal}
          />
          {isComplete && (
            <EndScreen
              collectedCount={collectedIds.length}
              totalCount={achievements.length}
              onRestart={handleRestart}
            />
          )}
        </section>

        <aside className="info-panel">
          <div className="status-card">
            <p className="section-label">Current Section</p>
            <h2>{currentSection}</h2>
            <p>{Math.round(progress * 100)}% timeline progress</p>
          </div>
          <div className="legend-card">
            <p className="section-label">Quick Tips</p>
            <ul>
              <li>Move with arrow keys or drag left and right on the game.</li>
              <li>Jump with space or drag upward on the game.</li>
              <li>Auto Play mode makes the demo recruiter-friendly.</li>
            </ul>
          </div>
        </aside>
      </main>

      <Timeline
        milestones={sections}
        collectedIds={collectedIds}
        progress={progress}
      />
    </div>
  )
}

export default App
