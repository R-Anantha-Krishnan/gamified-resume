import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import Phaser from 'phaser'
import GameScene from './phaser/GameScene'
import type { Achievement } from '../types/achievement'

interface Props {
  achievements: Achievement[]
  isAutoPlay: boolean
  isModalOpen: boolean
  collectedIds: string[]
  onAchievementCollected: (achievement: Achievement) => void
  onSectionChange: (section: string) => void
  onGameComplete: () => void
}

function GameCanvas({
  achievements,
  isAutoPlay,
  isModalOpen,
  collectedIds,
  onAchievementCollected,
  onSectionChange,
  onGameComplete,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<GameScene | null>(null)
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

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setAutoPlay(isAutoPlay)
    }
  }, [isAutoPlay])

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
    <div className="game-wrapper">
      <div className="game-canvas" ref={containerRef} />
      <div
        className="gesture-overlay"
        onPointerDown={handleGestureStart}
        onPointerMove={handleGestureMove}
        onPointerUp={handleGestureEnd}
        onPointerCancel={handleGestureEnd}
        onPointerLeave={handleGestureEnd}
      />
    </div>
  )
}

export default GameCanvas
