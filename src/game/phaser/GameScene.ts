import Phaser from 'phaser'
import type { Achievement } from '../../types/achievement'

interface GameSceneOptions {
  achievements: Achievement[]
  autoPlay: boolean
  collectedIds: string[]
  onAchievementCollected: (achievement: Achievement) => void
  onSectionChange: (section: string) => void
  onGameComplete: () => void
  onFinalSequenceComplete: () => void
}

export default class GameScene extends Phaser.Scene {
  private options: GameSceneOptions
  private player!: Phaser.Physics.Arcade.Sprite
  private playerHead?: Phaser.GameObjects.Image
  private bgm?: Phaser.Sound.BaseSound
  private collectibles?: Phaser.Physics.Arcade.Group
  private groundGroup?: Phaser.Physics.Arcade.StaticGroup
  private isAutoPlay = false
  private isPaused = false
  private isGameDone = false
  private finalSequenceActive = false
  private currentSection = 'School'
  private isProcessingJump = false
  private moveDirection = 0
  private gestureDirection = 0
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private minorHighlightText?: Phaser.GameObjects.Text
  private finalMusic?: Phaser.Sound.BaseSound

  constructor(options: GameSceneOptions) {
    super({ key: 'GameScene' })
    this.options = options
    this.isAutoPlay = options.autoPlay
  }

  init() {
    this.currentSection = 'School'
  }

  preload() {
    this.load.image('player-head-photo', '/player-head.png')
    this.load.audio('player-bgm', '/player-bgm.m4a')
    this.load.audio('final-bgm', '/Finish.mp3')
  }

  create() {
    this.createBackground()
    this.createLevelGeometry()
    this.createPlayerSprite()
    this.createCollectibles()
    this.createControls()
    this.createCamera()
    this.createSectionEvents()
    this.startBackgroundMusic()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopBackgroundMusic()
    })
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.stopBackgroundMusic()
    })
  }

  private startBackgroundMusic() {
    if (this.bgm?.isPlaying) {
      return
    }

    this.bgm = this.sound.add('player-bgm', {
      loop: true,
      volume: 0.35,
    })

    const played = this.bgm.play()
    if (!played) {
      // Browser autoplay policy may block audio until first user gesture.
      this.input.once('pointerdown', () => {
        if (!this.bgm?.isPlaying) {
          this.bgm?.play()
        }
      })
    }
  }

  private stopBackgroundMusic() {
    if (!this.bgm) {
      return
    }

    this.bgm.stop()
    this.bgm.destroy()
    this.bgm = undefined
  }

  setAutoPlay(value: boolean) {
    this.isAutoPlay = value
    if (!value) {
      this.moveDirection = 0
    }
  }

  pauseAutoPlay() {
    this.isPaused = true
    this.moveDirection = 0
  }

  resumeAutoPlay() {
    if (this.finalSequenceActive) {
      return
    }
    this.isPaused = false
  }

  stopGame() {
    this.isGameDone = true
    this.moveDirection = 0

    if (this.player) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body
      playerBody.stop()
      playerBody.setVelocity(0, 0)
      playerBody.setAcceleration(0, 0)
      playerBody.setAllowGravity(false)
      playerBody.setImmovable(true)
      playerBody.moves = false
    }
  }

  private createBackground() {
    const width = 4500
    const height = 560

    const colors = [0x0f172a, 0x134e4a, 0x312e81, 0x0f172a]
    for (let i = 0; i < 4; i += 1) {
      this.add.rectangle((i + 0.5) * (width / 4), height / 2, width / 4, height, colors[i])
    }

    this.add
      .rectangle(2250, 502, width, 116, 0x0f172a)
      .setDepth(5)
  }

  private createLevelGeometry() {
    const worldWidth = 4500
    this.physics.world.setBounds(0, 0, worldWidth, 560)
    this.cameras.main.setBounds(0, 0, worldWidth, 560)

    const groundTexture = this.make.graphics({ x: 0, y: 0 })
    groundTexture.fillStyle(0x334155, 1)
    groundTexture.fillRect(0, 0, 16, 16)
    groundTexture.generateTexture('ground-tile', 16, 16)

    const groundGroup = this.physics.add.staticGroup()
    groundGroup
      .create(2250, 544, 'ground-tile')
      .setDisplaySize(worldWidth, 32)
      .setOrigin(0.5, 0.5)
      .refreshBody()

    this.groundGroup = groundGroup
  }

  private createPlayerSprite() {
    const playerWidth = 66
    const playerHeight = 106

    const drawCharacterFrame = (graphics: Phaser.GameObjects.Graphics, legShift: number) => {
      graphics.clear()

      // Heroic comic silhouette: broad shoulders, V-taper torso, and stronger limbs.
      graphics.fillStyle(0x0ea5e9, 1)
      graphics.fillRoundedRect(10, 27, 46, 16, 8)
      graphics.fillRoundedRect(16, 40, 34, 33, 10)

      graphics.fillStyle(0x0284c7, 1)
      graphics.fillRoundedRect(20, 43, 26, 18, 8)
      graphics.fillRoundedRect(24, 61, 18, 12, 6)

      graphics.fillStyle(0xf8fafc, 1)
      graphics.fillCircle(10, 47, 6)
      graphics.fillCircle(56, 47, 6)

      graphics.lineStyle(7, 0xf8fafc, 1)
      graphics.beginPath()
      graphics.moveTo(13, 46)
      graphics.lineTo(6, 56)
      graphics.lineTo(9, 69)
      graphics.moveTo(53, 46)
      graphics.lineTo(60, 56)
      graphics.lineTo(57, 69)
      graphics.strokePath()

      graphics.fillStyle(0xf8fafc, 1)
      graphics.fillCircle(9, 70, 4)
      graphics.fillCircle(57, 70, 4)

      graphics.lineStyle(7, 0x2563eb, 1)
      graphics.beginPath()
      graphics.moveTo(26, 73)
      graphics.lineTo(21 + legShift, 100)
      graphics.moveTo(40, 73)
      graphics.lineTo(45 - legShift, 100)
      graphics.strokePath()

      graphics.fillStyle(0xfacc15, 1)
      graphics.fillRoundedRect(15 + legShift, 96, 16, 8, 3)
      graphics.fillRoundedRect(35 - legShift, 96, 16, 8, 3)
    }

    const textureA = this.make.graphics({ x: 0, y: 0 })
    drawCharacterFrame(textureA, -3)
    textureA.generateTexture('player-run-1', playerWidth, playerHeight)

    const textureB = this.make.graphics({ x: 0, y: 0 })
    drawCharacterFrame(textureB, 3)
    textureB.generateTexture('player-run-2', playerWidth, playerHeight)

    const textureClimb = this.make.graphics({ x: 0, y: 0 })
    drawCharacterFrame(textureClimb, 0)
    textureClimb.fillStyle(0x2563eb, 1)
    textureClimb.fillRect(18, 38, 12, 32)
    textureClimb.fillRect(12, 36, 8, 10)
    textureClimb.fillRect(38, 36, 8, 10)
    textureClimb.generateTexture('player-climb', playerWidth, playerHeight)

    this.player = this.physics.add.sprite(120, 415, 'player-run-1')
    this.player.setSize(36, 86)
    this.player.setOffset(15, 12)
    this.player.setCollideWorldBounds(true)
    this.player.setVisible(true)
    this.player.setDepth(10)
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    playerBody.setMaxVelocity(460, 980)
    playerBody.setDragX(40)

    this.anims.create({
      key: 'run',
      frames: [{ key: 'player-run-1' }, { key: 'player-run-2' }],
      frameRate: 10,
      repeat: -1,
    })

    this.anims.create({
      key: 'jump',
      frames: [{ key: 'player-run-1' }],
      frameRate: 1,
      repeat: 0,
    })

    this.anims.create({
      key: 'climb',
      frames: [{ key: 'player-climb' }],
      frameRate: 1,
      repeat: -1,
    })

    this.player.play('run')

    if (this.textures.exists('player-head-photo')) {
      const source = this.textures.get('player-head-photo').getSourceImage() as HTMLImageElement
      const desiredHeadWidth = 56
      const scale = source?.width ? desiredHeadWidth / source.width : 0.2

      this.playerHead = this.add
        .image(this.player.x, this.player.y - 52, 'player-head-photo')
        .setScale(scale)
        .setDepth(12)
    }

    if (this.groundGroup) {
      this.physics.add.collider(this.player, this.groundGroup)
    }
  }

  private createCollectibles() {
    this.collectibles = this.physics.add.group({ allowGravity: false })

    const majorCollectibleGraphic = this.make.graphics({ x: 0, y: 0 })
    majorCollectibleGraphic.fillStyle(0xfacc15, 1)
    majorCollectibleGraphic.fillCircle(14, 14, 14)
    majorCollectibleGraphic.lineStyle(3, 0xffffff, 0.9)
    majorCollectibleGraphic.strokeCircle(14, 14, 14)
    majorCollectibleGraphic.generateTexture('collectible-major', 28, 28)

    const secondaryCollectibleGraphic = this.make.graphics({ x: 0, y: 0 })
    secondaryCollectibleGraphic.fillStyle(0x38bdf8, 1)
    secondaryCollectibleGraphic.fillCircle(12, 12, 12)
    secondaryCollectibleGraphic.lineStyle(3, 0e7490, 0.9)
    secondaryCollectibleGraphic.strokeCircle(12, 12, 12)
    secondaryCollectibleGraphic.generateTexture('collectible-secondary', 24, 24)

    this.options.achievements.forEach((item) => {
      const collectibleTexture = item.isMajor ? 'collectible-major' : 'collectible-secondary'
      const collectible = this.physics.add.image(item.x, item.y, collectibleTexture)
      collectible.setInteractive()
      collectible.setData('achievement', item)
      collectible.setScale(item.isMajor ? 1.08 : 1)

      const body = collectible.body as Phaser.Physics.Arcade.Body
      body.setAllowGravity(false)
      body.setCircle(item.isMajor ? 18 : 16)
      body.setOffset(-4, -4)

      const yearColor = item.isMajor ? '#fde047' : '#7dd3fc'
      const yearLabel = this.add
        .text(item.x, item.y - 68, item.year, { fontSize: '22px', color: yearColor, fontStyle: '700' })
        .setOrigin(0.5)
      yearLabel.setStroke('#020617', 5)
      yearLabel.setShadow(0, 2, '#000000', 8, false, true)

      const titleColor = item.isMajor ? '#fef9c3' : '#bae6fd'
      const titleLabel = this.add
        .text(item.x, item.y + 40, item.title, {
          fontSize: '18px',
          color: titleColor,
          align: 'center',
          wordWrap: { width: 230 },
        })
        .setOrigin(0.5, 0)
      titleLabel.setStroke('#020617', 4)
      titleLabel.setShadow(0, 2, '#000000', 6, false, true)

      this.collectibles?.add(collectible)
    })

    this.physics.add.overlap(
      this.player,
      this.collectibles!,
      (_player, collected) => this.handleCollect(collected as Phaser.Physics.Arcade.Image),
      undefined,
      this
    )
  }

  private createControls() {
    this.cursors = this.input.keyboard?.createCursorKeys()
    this.input.keyboard?.on('keydown-SPACE', () => this.triggerJump())
  }

  private createCamera() {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)
    this.cameras.main.setLerp(0.12, 0.12)
    this.cameras.main.setZoom(1.12)
  }

  private createSectionEvents() {
    this.setSection('School')
  }

  update() {
    if (!this.player) {
      return
    }

    if (this.isGameDone && !this.finalSequenceActive) {
      this.player.setVelocityX(0)
      this.player.stop()
      if (this.playerHead) {
        this.playerHead.setPosition(this.player.x, this.player.y - 52)
      }
      return
    }

    if (this.finalSequenceActive) {
      if (this.playerHead) {
        this.playerHead.setPosition(this.player.x, this.player.y - 52)
      }
      this.updateBackground()
      this.maybeUpdateSection()
      return
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    if (this.isAutoPlay) {
      if (!this.isPaused) {
        this.moveDirection = 1
      } else {
        this.moveDirection = 0
      }
    } else if (this.cursors) {
      if (this.cursors.left?.isDown) {
        this.moveDirection = -1
      } else if (this.cursors.right?.isDown) {
        this.moveDirection = 1
      } else {
        // Fall back to gesture input when no key is pressed
        this.moveDirection = this.gestureDirection
      }
    }

    if (this.moveDirection === 1) {
      this.player.setVelocityX(260)
    } else if (this.moveDirection === -1) {
      this.player.setVelocityX(-180)
    } else {
      this.player.setVelocityX(0)
    }

    if (this.playerHead) {
      this.playerHead.setPosition(this.player.x, this.player.y - 52)
      if (this.moveDirection < 0) {
        this.playerHead.setFlipX(true)
      } else if (this.moveDirection > 0) {
        this.playerHead.setFlipX(false)
      }
    }

    if (playerBody.onFloor()) {
      if (this.moveDirection !== 0) {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'run') {
          this.player.play('run', true)
        }
      } else {
        this.player.stop()
      }
      this.isProcessingJump = false
    }

    this.updateBackground()
    this.maybeUpdateSection()

    if (this.isAutoPlay) {
      this.autoCollectNearby()
      this.autoPlayJump()
    }
  }

  private jump() {
    this.triggerJump()
  }

  private updateBackground() {
    const x = this.player.x
    let color = 0x155e75
    if (x > 1200 && x <= 2400) color = 0x312e81
    if (x > 2400 && x <= 3400) color = 0x0f172a
    if (x > 3400) color = 0x0f172a
    this.cameras.main.setBackgroundColor(color)
  }

  private maybeUpdateSection() {
    const x = this.player.x
    let section = 'School'
    if (x > 1200) section = 'College'
    if (x > 2400) section = 'Career'
    if (x > 3400) section = 'Coding'
    if (x > 3800) section = 'Zeus'
    if (section !== this.currentSection) {
      this.setSection(section)
    }
  }

  private setSection(section: string) {
    this.currentSection = section
    this.options.onSectionChange(section)
  }

  public triggerJump() {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    if (!playerBody.onFloor()) {
      return
    }
    this.player.setVelocityY(-610)
    this.player.play('jump', true)
    this.playTone(780, 0.08)
    this.isProcessingJump = true
  }

  private handleCollect(collected: Phaser.Physics.Arcade.Image) {
    const item = collected.getData('achievement') as Achievement
    if (!item) {
      return
    }

    collected.disableBody(true, true)
    collected.destroy()
    this.playTone(540, 0.12)

    if (!item.isMajor) {
      this.showMinorAchievementHighlight(item.title)
    }

    this.options.onAchievementCollected(item)

    const remaining = this.collectibles?.countActive(true) ?? 0
    if (remaining === 0) {
      this.stopGame()
      this.options.onGameComplete()
    }
  }

  public startFinalSequence() {
    if (this.finalSequenceActive) {
      return
    }

    this.finalSequenceActive = true
    this.isGameDone = true
    this.isPaused = true
    this.moveDirection = 0
    this.stopBackgroundMusic()
    this.playFinalMusic()

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    playerBody.stop()
    playerBody.setVelocity(0, 0)
    playerBody.setAllowGravity(false)
    playerBody.checkCollision.none = true
    playerBody.moves = false

    const centerX = 4300
    const centerY = 260

    this.cameras.main.stopFollow()
    this.cameras.main.pan(centerX, centerY, 900, 'Sine.easeInOut')
    this.cameras.main.zoomTo(1.07, 900)

    this.tweens.add({
      targets: this.player,
      x: centerX,
      y: centerY + 80,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => {
        this.playFinalCelebration(centerX, centerY)
      },
    })
  }

  private playFinalCelebration(centerX: number, centerY: number) {
    this.player.play('run', true)
    this.tweens.add({
      targets: this.player,
      y: centerY + 60,
      x: centerX - 10,
      angle: -6,
      duration: 280,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })

    this.tweens.add({
      targets: this.player,
      y: centerY + 72,
      duration: 700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })

    this.createCelebrationBackdrop(centerX, centerY)

    const burstEvent = this.time.addEvent({
      delay: 320,
      repeat: 16,
      callback: () => {
        const offsetX = centerX + Phaser.Math.Between(-360, 360)
        const offsetY = centerY + Phaser.Math.Between(-220, 140)
        this.createFirecrackerBurst(offsetX, offsetY)
      },
    })

    const titleText = this.add
      .text(centerX, centerY - 100, 'Career Victory', {
        fontSize: '42px',
        color: '#f8fafc',
        fontStyle: '800',
        stroke: '#0f172a',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(15)

    this.tweens.add({
      targets: titleText,
      alpha: 1,
      duration: 800,
      ease: 'Sine.easeIn',
    })

    this.time.delayedCall(6000, () => {
      burstEvent.remove(false)
      this.completeFinalSequence()
    })
  }

  private createCelebrationBackdrop(centerX: number, centerY: number) {
    const colors = [0x0f172a, 0x1e293b, 0x471b7a, 0x0f172a]
    for (let i = 0; i < 4; i += 1) {
      this.add
        .rectangle(centerX, centerY, 1100 - i * 160, 560 - i * 80, colors[i], 0.25)
        .setDepth(2)
    }

    const glowRing = this.add.circle(centerX, centerY, 220, 0xf472b6, 0.16).setDepth(3)
    const innerRing = this.add.circle(centerX, centerY, 156, 0x38bdf8, 0.12).setDepth(3)
    const sparkleRing = this.add.circle(centerX, centerY, 98, 0xffffff, 0.08).setDepth(4)

    this.tweens.add({
      targets: glowRing,
      scale: 1.16,
      alpha: 0.08,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    })
    this.tweens.add({
      targets: innerRing,
      alpha: 0.04,
      duration: 1400,
      yoyo: true,
      repeat: -1,
    })
    this.tweens.add({
      targets: sparkleRing,
      scale: 1.12,
      alpha: 0.02,
      duration: 900,
      yoyo: true,
      repeat: -1,
    })

    for (let i = 0; i < 5; i += 1) {
      const line = this.add.line(
        centerX,
        centerY,
        0,
        0,
        Phaser.Math.Between(-420, 420),
        Phaser.Math.Between(-220, 220),
        0xffffff,
        0.06
      )
      line.setLineWidth(2)
      line.setDepth(2)
      this.tweens.add({
        targets: line,
        alpha: 0,
        duration: 1500,
        delay: i * 120,
        onComplete: () => line.destroy(),
      })
    }
  }

  private createFirecrackerBurst(x: number, y: number) {
    const palette = [0xf87171, 0x38bdf8, 0x22c55e, 0xfacc15, 0xc084fc, 0xfa7b6e, 0xfb7185, 0x34d399]
    const count = Phaser.Math.Between(8, 16)

    for (let i = 0; i < count; i += 1) {
      const color = Phaser.Utils.Array.GetRandom(palette)
      const size = Phaser.Math.Between(6, 18)
      const piece = this.add.circle(x, y, size, color, 1).setDepth(11)
      const angle = Phaser.Math.DegToRad((360 / count) * i + Phaser.Math.Between(-24, 24))
      const distance = Phaser.Math.Between(120, 320)
      const duration = Phaser.Math.Between(900, 1300)
      this.tweens.add({
        targets: piece,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        scale: 0.05,
        alpha: 0,
        duration,
        ease: 'Cubic.easeOut',
        onComplete: () => piece.destroy(),
      })
    }

    const spark = this.add.star(x, y, 6, 8, 18, 0xffffff, 0.95).setDepth(12)
    this.tweens.add({
      targets: spark,
      scale: 0.45,
      alpha: 0,
      duration: 650,
      ease: 'Sine.easeOut',
      onComplete: () => spark.destroy(),
    })

    const miniSparkCount = Phaser.Math.Between(2, 4)
    for (let i = 0; i < miniSparkCount; i += 1) {
      const miniSpark = this.add.circle(x + Phaser.Math.Between(-28, 28), y + Phaser.Math.Between(-28, 28), 3, 0xffffff, 1).setDepth(12)
      this.tweens.add({
        targets: miniSpark,
        y: miniSpark.y - Phaser.Math.Between(40, 90),
        alpha: 0,
        duration: Phaser.Math.Between(600, 850),
        ease: 'Sine.easeOut',
        onComplete: () => miniSpark.destroy(),
      })
    }
  }

  private completeFinalSequence() {
    this.stopFinalMusic()
    this.options.onGameComplete()
    this.options.onFinalSequenceComplete()
  }

  private playFinalMusic() {
    this.finalMusic = this.sound.add('final-bgm', {
      loop: false,
      volume: 0.38,
    })

    const played = this.finalMusic.play()
    if (!played) {
      this.input.once('pointerdown', () => {
        if (!this.finalMusic?.isPlaying) {
          this.finalMusic?.play()
        }
      })
    }

    this.time.delayedCall(14000, () => {
      this.finalMusic?.stop()
    })
  }

  private stopFinalMusic() {
    if (!this.finalMusic) {
      return
    }

    this.finalMusic.stop()
    this.finalMusic.destroy()
    this.finalMusic = undefined
  }

  private showMinorAchievementHighlight(title: string) {
    this.minorHighlightText?.destroy()

    const startX = this.player.x
    const startY = this.player.y - 48
    const targetY = this.cameras.main.worldView.y + 28

    const label = this.add
      .text(startX, startY, `+ ${title}`, {
        fontSize: '26px',
        color: '#ffffff',
        backgroundColor: '#166534',
        padding: { x: 18, y: 12 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(60)
      .setAlpha(0.2)

    label.setStroke('#020617', 5)
    label.setShadow(0, 3, '#000000', 8, false, true)

    this.minorHighlightText = label

    this.tweens.add({
      targets: label,
      alpha: 1,
      y: targetY,
      duration: 1300,
      yoyo: false,
      onComplete: () => {
        this.tweens.add({
          targets: label,
          alpha: 0,
          y: targetY - 34,
          duration: 900,
          delay: 850,
          onComplete: () => {
            if (this.minorHighlightText === label) {
              this.minorHighlightText = undefined
            }
            label.destroy()
          },
        })
      },
    })
  }

  private autoPlayJump() {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    if (!this.collectibles || this.isProcessingJump || !playerBody.onFloor() || this.isPaused) {
      return
    }

    const upcoming = this.collectibles
      .getChildren()
      .map((child) => child as Phaser.Physics.Arcade.Image)
      .filter((sprite) => sprite.active && sprite.x > this.player.x)
      .sort((left, right) => left.x - right.x)[0]

    if (!upcoming) {
      return
    }

    const distanceToCollectible = upcoming.x - this.player.x
    const requiresJump = upcoming.y <= 336

    // Trigger a bit earlier for high collectibles to avoid missing milestones.
    if (requiresJump && distanceToCollectible >= 80 && distanceToCollectible <= 270) {
      this.jump()
    }
  }

  private autoCollectNearby() {
    if (!this.collectibles || this.isPaused) {
      return
    }

    const nearby = this.collectibles
      .getChildren()
      .map((child) => child as Phaser.Physics.Arcade.Image)
      .find((sprite) => {
        if (!sprite.active) {
          return false
        }

        const dx = Math.abs(sprite.x - this.player.x)
        const dy = Math.abs(sprite.y - this.player.y)
        return dx <= 64 && dy <= 140
      })

    if (nearby) {
      this.handleCollect(nearby)
    }
  }

  public moveLeft() {
    this.gestureDirection = -1
  }

  public moveRight() {
    this.gestureDirection = 1
  }

  public stopMovement() {
    this.gestureDirection = 0
  }

  private playTone(frequency: number, durationSeconds: number) {
    if (typeof window === 'undefined' || !window.AudioContext) {
      return
    }
    const context = new window.AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = frequency
    oscillator.type = 'triangle'
    oscillator.connect(gain)
    gain.connect(context.destination)
    gain.gain.value = 0.08
    oscillator.start()
    oscillator.stop(context.currentTime + durationSeconds)
    oscillator.onended = () => context.close()
  }
}
