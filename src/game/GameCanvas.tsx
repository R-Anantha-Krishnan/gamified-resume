import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import Phaser from 'phaser'
import GameScene from './phaser/GameScene'
import type { Achievement } from '../types/achievement'

interface Props {
  achievements: Achievement[]
  isAutoPlay: boolean
  isModalOpen: boolean
  isFullscreen: boolean
  onToggleFullscreen: () => void
  collectedIds: string[]
  onAchievementCollected: (achievement: Achievement) => void
  onSectionChange: (section: string) => void
  onGameComplete: () => void
  startFinalSequence: number
  onFinalSequenceComplete: () => void
}

function GameCanvas({
  achievements,
  isAutoPlay,
  isModalOpen,
  isFullscreen,
  onToggleFullscreen,
  collectedIds,
  onAchievementCollected,
  onSectionChange,
  onGameComplete,
  startFinalSequence,
  onFinalSequenceComplete,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<GameScene | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const hasTriggeredGestureJumpRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    const gameScene = new GameScene({
      achievements,
      autoPlay: isAutoPlay,
      collectedIds,
      onAchievementCollected,
      onSectionChange,
      onGameComplete,
      onFinalSequenceComplete,
    })

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1000,
      height: 560,
      backgroundColor: '#0f172a',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 1200 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.ScaleModes.FIT,
        autoCenter: Phaser.Scale.Center.CENTER_BOTH,
      },
      scene: [gameScene],
    }

    const game = new Phaser.Game(config)
    gameRef.current = game
    sceneRef.current = gameScene
    gameScene.setAutoPlay(isAutoPlay)

    return () => {
      game.destroy(true)
      gameRef.current = null
      sceneRef.current = null
    }
  }, [])

  // Rescale Phaser whenever the wrapper container is resized (fullscreen enter/exit, orientation change)
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const observer = new ResizeObserver(() => {
      const game = gameRef.current
      if (game) {
        game.scale.refresh()
      }
    })

    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setAutoPlay(isAutoPlay)
    }
  }, [isAutoPlay])

  useEffect(() => {
    if (sceneRef.current && startFinalSequence > 0) {
      sceneRef.current.startFinalSequence()
    }
  }, [startFinalSequence])

  // Pause autoplay during modal, resume with a delay after modal closes
  useEffect(() => {
    if (isModalOpen) {
      sceneRef.current?.pauseAutoPlay()
    } else {
      // Wait 1.5 seconds after modal closes before resuming movement
      const timer = setTimeout(() => {
        sceneRef.current?.resumeAutoPlay()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isModalOpen])

  useEffect(() => {
    const handleWindowBlur = () => {
      dragStartRef.current = null
      hasTriggeredGestureJumpRef.current = false
    }

    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [])

  const handleGestureStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartRef.current = { x: event.clientX, y: event.clientY }
    hasTriggeredGestureJumpRef.current = false
  }

  const handleGestureMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current
    if (!start) {
      return
    }

    const deltaX = event.clientX - start.x
    const deltaY = event.clientY - start.y

    if (!hasTriggeredGestureJumpRef.current && deltaY < -42) {
      sceneRef.current?.triggerJump()
      hasTriggeredGestureJumpRef.current = true
    }

    if (deltaX > 24) {
      sceneRef.current?.moveRight()
    } else if (deltaX < -24) {
      sceneRef.current?.moveLeft()
    } else {
      sceneRef.current?.stopMovement()
    }
  }

  const handleGestureEnd = () => {
    dragStartRef.current = null
    hasTriggeredGestureJumpRef.current = false
    sceneRef.current?.stopMovement()
  }

  return (
    <div className="game-wrapper" ref={wrapperRef}>
      <div className="game-canvas" ref={containerRef} />
      <div
        className="gesture-overlay"
        onPointerDown={handleGestureStart}
        onPointerMove={handleGestureMove}
        onPointerUp={handleGestureEnd}
        onPointerCancel={handleGestureEnd}
        onPointerLeave={handleGestureEnd}
      />
      <button
        className="fullscreen-btn"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
        title={isFullscreen ? 'Exit full screen' : 'Full screen'}
      >
        {isFullscreen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
            <path d="M3 16h3a2 2 0 0 1 2 2v3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V3h4" />
            <path d="M17 3h4v4" />
            <path d="M21 17v4h-4" />
            <path d="M7 21H3v-4" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default GameCanvas
