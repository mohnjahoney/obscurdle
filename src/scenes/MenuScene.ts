import Phaser from "phaser"
import type { ModeId } from "../modes/ObscuringMode"
import { MENU_MODE_IDS } from "../modes/registry"
import { markMenuHistory, markPlayHistory, playModeFromHistory } from "../navigation/browserHistory"
import { GlobalNavigation } from "../navigation/GlobalNavigation"
import { ModeIconTile, modeTilePosition } from "../presentation/ModeIconTile"
import { GAME_LAYOUT } from "../style/layout"
import { GAME_MOTION } from "../style/motion"
import { configureLogicalCamera, RENDER_SCALE } from "../style/rendering"

type SplashPhase = "typing" | "blinking" | "erasing" | "blank" | "revealing" | "settling" | "menu"
const TITLE = "OBSCURDLE"
const TYPE_CADENCE = [0.19, 0.11, 0.16, 0.09, 0.22, 0.13, 0.18, 0.1]

export class MenuScene extends Phaser.Scene {
  private phase: SplashPhase = "typing"
  private phaseElapsed = 0
  private nextActionAt = 0.3
  private typed = 0
  private blinkCount = 0
  private erased = 0
  private titleText!: Phaser.GameObjects.Text
  private cursor!: Phaser.GameObjects.Rectangle
  private blackout!: Phaser.GameObjects.Rectangle

  constructor() { super("menu") }

  create(): void {
    markMenuHistory()
    configureLogicalCamera(this)
    this.add.rectangle(GAME_LAYOUT.width / 2, GAME_LAYOUT.height / 2, GAME_LAYOUT.width, GAME_LAYOUT.height, 0xffffff)
    this.titleText = this.add.text(28, 235, "", {
      fontFamily: "'Courier New', monospace", fontSize: "42px", color: "#111111", resolution: RENDER_SCALE,
    }).setOrigin(0, 0.5)
    this.cursor = this.add.rectangle(28, 235, 4, 45, 0x111111).setOrigin(0, 0.5)
    this.blackout = this.add.rectangle(GAME_LAYOUT.width / 2, GAME_LAYOUT.height / 2, GAME_LAYOUT.width, GAME_LAYOUT.height, 0x000000).setAlpha(0).setDepth(5)
    this.titleText.setDepth(6)
    this.cursor.setDepth(7)
  }

  update(_time: number, deltaMs: number): void {
    if (this.phase === "menu") return
    this.phaseElapsed += deltaMs / 1000
    if (this.phase === "typing") this.updateTyping()
    else if (this.phase === "blinking") this.updateBlinking()
    else if (this.phase === "erasing") this.updateErasing()
    else if (this.phase === "blank") this.updateBlank()
    else if (this.phase === "revealing") this.updateReveal()
    else if (this.phase === "settling") this.updateSettling()
    this.updateCursor()
  }

  private updateTyping(): void {
    if (this.phaseElapsed < this.nextActionAt) return
    this.titleText.setText(TITLE.slice(0, this.typed + 1))
    this.typed += 1
    this.nextActionAt = this.phaseElapsed + TYPE_CADENCE[this.typed - 1]!
    if (this.typed === TITLE.length) {
      this.phase = "blinking"; this.phaseElapsed = 0; this.nextActionAt = 0.22
    }
  }

  private updateBlinking(): void {
    if (this.phaseElapsed < this.nextActionAt) return
    this.blinkCount += 1
    this.nextActionAt = this.phaseElapsed + 0.22
    if (this.blinkCount >= 6) {
      this.phase = "erasing"; this.phaseElapsed = 0; this.nextActionAt = 0.32
    }
  }

  private updateErasing(): void {
    if (this.phaseElapsed < this.nextActionAt) return
    this.erased += 1
    this.titleText.setText(TITLE.slice(0, TITLE.length - this.erased))
    if (this.erased >= TITLE.length) { this.phase = "blank"; this.phaseElapsed = 0; return }
    this.nextActionAt = this.phaseElapsed + 0.32 - (this.erased / TITLE.length) * 0.26
  }

  private updateBlank(): void {
    if (this.phaseElapsed < 0.5) return
    this.phase = "revealing"; this.phaseElapsed = 0
    this.titleText.setText(TITLE).setColor("#ffffff").setOrigin(0.5, 0.5).setX(GAME_LAYOUT.width / 2)
  }

  private updateReveal(): void {
    const progress = Math.min(1, this.phaseElapsed / 1.65)
    this.blackout.setAlpha(progress)
    this.titleText.setAlpha(0.04 + progress * 0.16)
    if (progress >= 1) { this.phase = "settling"; this.phaseElapsed = 0 }
  }

  private updateSettling(): void {
    if (this.phaseElapsed < 0.5) return
    this.phase = "menu"
    this.createModeMenu()
  }

  private updateCursor(): void {
    const titleLeft = this.phase === "revealing" || this.phase === "settling" || this.phase === "menu"
      ? GAME_LAYOUT.width / 2 - this.titleText.width / 2
      : 28
    this.cursor.x = titleLeft + this.titleText.width + 4
    const blinkOn = Math.floor(this.phaseElapsed / 0.34) % 2 === 0
    this.cursor.setVisible(blinkOn || this.phase === "revealing" || this.phase === "settling" || this.phase === "menu")
    this.cursor.setFillStyle(this.phase === "revealing" || this.phase === "settling" || this.phase === "menu" ? 0xffffff : 0x111111)
  }

  private createModeMenu(): void {
    MENU_MODE_IDS.forEach((modeId, index) => {
      const position = modeTilePosition(index)
      const tile = new ModeIconTile(this, position.x, position.y, {
        modeId, dark: true, onPress: () => this.startGame(modeId),
      })
      tile.setDepth(8).setAlpha(0)
      this.tweens.add({ targets: tile, alpha: 1, duration: 420, delay: index * 45, ease: "Sine.easeOut" })
    })
    this.add.text(GAME_LAYOUT.width / 2, GAME_LAYOUT.menu.noteY, "SELECT AN ADDITION", {
      fontFamily: "'Courier New', monospace", fontSize: "11px", color: "#8d8d8d", letterSpacing: 2, resolution: RENDER_SCALE,
    }).setOrigin(0.5).setDepth(8)
    new GlobalNavigation(this)
    window.addEventListener("popstate", this.handlePopState)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener("popstate", this.handlePopState))
  }

  private startGame(modeId: ModeId): void {
    markPlayHistory(modeId)
    this.cameras.main.fadeOut(GAME_MOTION.scene.fadeDuration)
    this.time.delayedCall(GAME_MOTION.scene.fadeDuration, () => this.scene.start("play", { modeId }))
  }

  private readonly handlePopState = (event: PopStateEvent): void => {
    const modeId = playModeFromHistory(event.state)
    if (modeId) this.scene.start("play", { modeId })
  }
}
