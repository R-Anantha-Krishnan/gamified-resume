import Phaser from 'phaser'
import type { Achievement } from '../../types/achievement'

interface GameSceneOptions {
  achievements: Achievement[]
  autoPlay: boolean
  collectedIds: string[]
  onAchievementCollected: (achievement: Achievement) => void
  onSectionChange: (section: string) => void
  onGameComplete: () => void
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
  private currentSection = 'School'
  private isProcessingJump = false
  private moveDirection = 0
  private gestureDirection = 0
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private minorHighlightText?: Phaser.GameObjects.Text

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
    this.isPaused = false
  }

  stopGame() {
    this.isGameDone = true
    this.moveDirection = 0
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

    if (this.isGameDone) {
      this.player.setVelocityX(0)
      this.player.stop()
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
