import Phaser from "phaser"
import type { ModeId } from "../modes/ObscuringMode"
import { MENU_MODE_IDS } from "../modes/registry"
import { markMenuHistory, markPlayHistory, playModeFromHistory } from "../navigation/browserHistory"
import { ModeIconTile, modeTilePosition } from "../presentation/ModeIconTile"
import { GAME_LAYOUT } from "../style/layout"
import { GAME_STYLE } from "../style/gameStyle"
import { configureLogicalCamera, RENDER_SCALE } from "../style/rendering"

type SplashPhase =
  | "cursor"
  | "typing"
  | "preErasing"
  | "erasing"
  | "erasePause"
  | "blank"
  | "revealing"
  | "invertedHold"
  | "returning"
  | "settling"
  | "menu"
type MenuSceneData = {
  skipIntro?: boolean
}
const TITLE = "OBSCURDLE"
const CURSOR_WAIT = 0.4
const CURSOR_BLINK_PERIOD = 0.34
const CURSOR_BLINKS_BEFORE_TYPING = 2
const REVEAL_DURATION = 1.65
const INVERTED_HOLD_DURATION = 1
const RETURN_DURATION = 2.25
const SKIP_DURATION = 0.75
const BUTTON_FADE_DELAY = 0.12
const TITLE_LIGHT = { r: 248, g: 244, b: 232 }
const TITLE_DARK = { r: 33, g: 31, b: 26 }

export class MenuScene extends Phaser.Scene {
  private phase: SplashPhase = "cursor"
  private phaseElapsed = 0
  private nextActionAt = 0
  private typed = 0
  private erased = 0
  private titleText!: Phaser.GameObjects.Text
  private cursor!: Phaser.GameObjects.Graphics
  private blackout!: Phaser.GameObjects.Rectangle
  private titleStartX = 0
  private modeTiles: ModeIconTile[] = []
  private introInputBound = false
  private returnStartBlackoutAlpha = 1
  private returnDuration = RETURN_DURATION
  private cursorStaticElapsed = 0
  private cursorLastX = 0

  constructor() { super("menu") }

  create(data: MenuSceneData = {}): void {
    markMenuHistory()
    configureLogicalCamera(this)
    this.add.rectangle(GAME_LAYOUT.width / 2, GAME_LAYOUT.height / 2, GAME_LAYOUT.width, GAME_LAYOUT.height, GAME_STYLE.color.paper)
    const directMenu = data.skipIntro === true
    const titleY = directMenu ? GAME_LAYOUT.masthead.titleY : 235
    this.titleText = this.add.text(0, titleY, TITLE, {
      fontFamily: "'Courier New', monospace",
      fontSize: `${directMenu ? GAME_STYLE.type.titleSize : 42}px`,
      color: GAME_STYLE.textColor.ink,
      resolution: RENDER_SCALE,
    }).setOrigin(0, 0.5)
    this.titleStartX = GAME_LAYOUT.width / 2 - this.titleText.width / 2
    this.titleText.setX(this.titleStartX)
    this.titleText.setDepth(6)

    if (directMenu) {
      this.phase = "menu"
      this.titleText.setAlpha(0.14)
      this.createModeMenu(true, 0, false)
      return
    }

    this.titleText.setText("")
    this.cursor = this.add.graphics().setPosition(this.titleStartX, 235)
    this.drawCursor(GAME_STYLE.color.ink)
    this.blackout = this.add.rectangle(GAME_LAYOUT.width / 2, GAME_LAYOUT.height / 2, GAME_LAYOUT.width, GAME_LAYOUT.height, GAME_STYLE.color.overlay).setAlpha(0).setDepth(5)
    this.cursor.setDepth(7)
    this.cursorLastX = this.cursor.x
    this.bindIntroInput()
  }

  update(_time: number, deltaMs: number): void {
    if (this.phase === "menu") return
    this.phaseElapsed += deltaMs / 1000
    if (this.phase === "cursor") this.updateIntroCursor()
    else if (this.phase === "typing") this.updateTyping()
    else if (this.phase === "preErasing") this.updatePreErasing()
    else if (this.phase === "erasing") this.updateErasing()
    else if (this.phase === "erasePause") this.updateErasePause()
    else if (this.phase === "blank") this.updateBlank()
    else if (this.phase === "revealing") this.updateReveal()
    else if (this.phase === "invertedHold") this.updateInvertedHold()
    else if (this.phase === "returning") this.updateReturning()
    else if (this.phase === "settling") this.updateSettling()
    this.updateCursor(deltaMs / 1000)
  }

  private updateIntroCursor(): void {
    const blinkDuration = CURSOR_BLINK_PERIOD * 2
    const afterWait = Math.max(0, this.phaseElapsed - CURSOR_WAIT)
    if (afterWait >= blinkDuration * CURSOR_BLINKS_BEFORE_TYPING) {
      this.phase = "typing"
      this.phaseElapsed = 0
      this.nextActionAt = 0
      return
    }
  }

  private updateTyping(): void {
    if (this.phaseElapsed < this.nextActionAt) return
    this.titleText.setText(TITLE.slice(0, this.typed + 1))
    this.typed += 1
    this.resetCursorStaticTime()
    if (this.typed === 1 || this.typed === 6) this.nextActionAt = this.phaseElapsed + 0.5
    else if (this.typed < 6) this.nextActionAt = this.phaseElapsed + 0.1
    else if (this.typed < TITLE.length) this.nextActionAt = this.phaseElapsed + 0.06
    else {
      this.phase = "preErasing"
      this.phaseElapsed = 0
    }
  }

  private updatePreErasing(): void {
    if (this.phaseElapsed < 0.6) return
    this.phase = "erasing"
    this.phaseElapsed = 0
    this.nextActionAt = 0
  }

  private updateErasing(): void {
    if (this.phaseElapsed < this.nextActionAt) return
    this.erased += 1
    this.titleText.setText(TITLE.slice(0, TITLE.length - this.erased))
    this.resetCursorStaticTime()
    if (this.erased >= TITLE.length) { this.phase = "blank"; this.phaseElapsed = 0; return }
    if (this.erased === 1) {
      this.phase = "erasePause"
      this.phaseElapsed = 0
      return
    }
    this.nextActionAt = this.phaseElapsed + 0.1
  }

  private updateErasePause(): void {
    if (this.phaseElapsed < 0.4) return
    this.phase = "erasing"
    this.phaseElapsed = 0
    this.nextActionAt = 0
  }

  private updateBlank(): void {
    this.cursor.setVisible(false)
    this.titleText.setAlpha(Math.max(0, 1 - this.phaseElapsed / 0.16))
    if (this.phaseElapsed < 0.2) return
    this.phase = "revealing"; this.phaseElapsed = 0
    this.titleText.setText(TITLE).setColor(GAME_STYLE.textColor.paperLight).setAlpha(0.14)
  }

  private updateReveal(): void {
    const progress = Math.min(1, this.phaseElapsed / REVEAL_DURATION)
    this.blackout.setAlpha(progress)
    this.titleText.setAlpha(0.14)
    if (progress >= 1) {
      this.phase = "invertedHold"
      this.phaseElapsed = 0
    }
  }

  private updateInvertedHold(): void {
    this.blackout.setAlpha(1)
    this.titleText.setColor(GAME_STYLE.textColor.paperLight).setAlpha(0.14)
    if (this.phaseElapsed < INVERTED_HOLD_DURATION) return
    this.phase = "returning"
    this.phaseElapsed = 0
    this.returnStartBlackoutAlpha = 1
    this.returnDuration = RETURN_DURATION
    this.createModeMenu(true, BUTTON_FADE_DELAY)
  }

  private updateReturning(): void {
    const progress = Math.min(1, this.phaseElapsed / this.returnDuration)
    const eased = Phaser.Math.Easing.Sine.InOut(progress)
    this.blackout.setAlpha(this.returnStartBlackoutAlpha * (1 - eased))
    this.titleText
      .setColor(mixColor(TITLE_LIGHT, TITLE_DARK, eased))
      .setAlpha(0.14)
      .setY(235 + (GAME_LAYOUT.masthead.titleY - 235) * eased)
    this.modeTiles.forEach(tile => tile.setPaletteMix(1))
    if (progress >= 1) {
      this.phase = "settling"
      this.phaseElapsed = 0
    }
  }

  private updateSettling(): void {
    if (this.phaseElapsed < 0.5) return
    this.phase = "menu"
    this.titleText
      .setColor(GAME_STYLE.textColor.ink)
      .setAlpha(0.14)
      .setY(GAME_LAYOUT.masthead.titleY)
    this.cursor.setVisible(false)
    this.unbindIntroInput()
  }

  private updateCursor(deltaSeconds: number): void {
    const cursorAtStart = this.phase === "cursor" || this.phase === "blank" || this.phase === "revealing" || this.phase === "returning" || this.phase === "settling"
    const nextX = cursorAtStart ? this.titleStartX : this.titleStartX + this.titleText.width + 4
    if (nextX !== this.cursorLastX) {
      this.cursorLastX = nextX
      this.cursorStaticElapsed = 0
    } else {
      this.cursorStaticElapsed += deltaSeconds
    }
    this.cursor.x = nextX
    const cursorGone = this.phase === "blank" || this.phase === "revealing" || this.phase === "invertedHold" || this.phase === "returning" || this.phase === "settling" || this.phase === "menu"
    if (cursorGone) {
      this.cursor.setVisible(false)
      return
    }
    const blinkElapsed = Math.max(0, this.cursorStaticElapsed - CURSOR_WAIT)
    const blinkOn = Math.floor(blinkElapsed / CURSOR_BLINK_PERIOD) % 2 === 0
    this.cursor.setVisible(blinkOn)
    this.drawCursor(this.phase === "revealing" || this.phase === "invertedHold" ? GAME_STYLE.color.paperLight : GAME_STYLE.color.ink)
  }

  private drawCursor(color: number): void {
    this.cursor.clear()
    this.cursor.fillStyle(color, 1)
    this.cursor.fillRoundedRect(0, -22.5, 4, 45, 1.5)
  }

  private resetCursorStaticTime(): void {
    this.cursorStaticElapsed = 0
  }

  private createModeMenu(inverted: boolean, fadeDelay = 0, animate = true): void {
    MENU_MODE_IDS.forEach((modeId, index) => {
      const position = modeTilePosition(index)
      const tile = new ModeIconTile(this, position.x, position.y, {
        modeId, dark: inverted, onPress: () => this.startGame(modeId),
      })
      tile.setDepth(8).setAlpha(animate ? 0 : 1)
      this.modeTiles.push(tile)
      if (animate) {
        this.tweens.add({ targets: tile, alpha: 1, duration: 420, delay: fadeDelay + index * 45, ease: "Sine.easeOut" })
      }
    })
    window.addEventListener("popstate", this.handlePopState)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener("popstate", this.handlePopState))
  }

  private bindIntroInput(): void {
    if (this.introInputBound) return
    this.introInputBound = true
    this.input.keyboard?.on("keydown", this.handleIntroInput, this)
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleIntroInput, this)
  }

  private unbindIntroInput(): void {
    if (!this.introInputBound) return
    this.introInputBound = false
    this.input.keyboard?.off("keydown", this.handleIntroInput, this)
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleIntroInput, this)
  }

  private readonly handleIntroInput = (): void => {
    if (this.phase === "menu" || this.phase === "returning" || this.phase === "settling") return
    this.phase = "returning"
    this.phaseElapsed = 0
    this.returnStartBlackoutAlpha = this.blackout.alpha
    this.returnDuration = SKIP_DURATION
    this.titleText.setText(TITLE).setColor(GAME_STYLE.textColor.ink)
    this.resetCursorStaticTime()
    if (this.modeTiles.length === 0) this.createModeMenu(true)
    this.modeTiles.forEach(tile => {
      tile.setAlpha(1)
    })
  }

  private startGame(modeId: ModeId): void {
    markPlayHistory(modeId)
    this.scene.start("play", { modeId })
  }

  private readonly handlePopState = (event: PopStateEvent): void => {
    const modeId = playModeFromHistory(event.state)
    if (modeId) this.scene.start("play", { modeId })
  }
}

function mixColor(
  from: { r: number; g: number; b: number },
  to: { r: number; g: number; b: number },
  amount: number,
): string {
  const channel = (start: number, end: number): number => Math.round(start + (end - start) * amount)
  return `rgb(${channel(from.r, to.r)}, ${channel(from.g, to.g)}, ${channel(from.b, to.b)})`
}
