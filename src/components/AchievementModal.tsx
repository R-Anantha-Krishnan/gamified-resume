import { useEffect, useRef } from 'react'
import type { Achievement } from '../types/achievement'

interface Props {
  achievement: Achievement | null
  onClose: () => void
}

function AchievementModal({ achievement, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!achievement) {
      return
    }

    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [achievement, onClose])

  if (!achievement) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="section-label">Achievement Unlocked</p>
        {achievement.logo && (
          <div className="modal-logo">
            <img src={achievement.logo} alt={`${achievement.section} logo`} />
          </div>
        )}
        <h2 id="achievement-modal-title">{achievement.title}</h2>
        <p className="modal-copy">{achievement.description}</p>
        <div className="modal-meta">
          <span>{achievement.year}</span>
          <span>{achievement.section}</span>
        </div>
        <button ref={closeButtonRef} className="button button-primary" onClick={onClose}>
          Continue journey
        </button>
      </div>
    </div>
  )
}

export default AchievementModal
