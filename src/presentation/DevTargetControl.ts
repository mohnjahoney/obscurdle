import Phaser from "phaser"
import {
  appendDevTargetLetter,
  devListChecking,
  devTarget,
  devTargetEnabled,
  removeDevTargetLetter,
  setDevTarget,
  toggleDevListChecking,
  toggleDevTarget,
} from "../core/devTarget"
import { WORD_LENGTH } from "../core/evaluateGuess"
import { GAME_STYLE } from "../style/gameStyle"
import { RENDER_SCALE } from "../style/rendering"

const BUTTON_SIZE = 34
const FIELD_WIDTH = 224
const FIELD_HEIGHT = 42
const TARGET_FIELD_X = 125
const TARGET_FIELD_Y = 480
const CONTROL_Y = TARGET_FIELD_Y
const TARGET_BUTTON_X = 314
const LIST_BUTTON_X = 358
const REVEAL_BUTTON_X = 402

export class DevTargetControl extends Phaser.GameObjects.Container {
  private readonly button: Phaser.GameObjects.Graphics
  private readonly listButton: Phaser.GameObjects.Graphics
  private readonly listLabel: Phaser.GameObjects.Text
  private readonly revealButton: Phaser.GameObjects.Graphics
  private readonly panel: Phaser.GameObjects.Container
  private readonly field: Phaser.GameObjects.Graphics
  private readonly valueText: Phaser.GameObjects.Text
  private readonly titleHitDebug: Phaser.GameObjects.Graphics
  private editing = false
  private panelOpen = false
  private revealTarget = false

  constructor(
    scene: Phaser.Scene,
    private readonly onTargetChanged: (target: string) => void,
    private readonly onListCheckingChanged: (enabled: boolean) => void,
    private readonly getTarget: () => string,
  ) {
    super(scene, 0, 0)
    scene.add.existing(this)
    this.setDepth(500)

    this.button = scene.add.graphics().setPosition(TARGET_BUTTON_X, CONTROL_Y)
    this.button.setInteractive(
      new Phaser.Geom.Rectangle(-BUTTON_SIZE / 2, -BUTTON_SIZE / 2, BUTTON_SIZE, BUTTON_SIZE),
      Phaser.Geom.Rectangle.Contains,
    )
    this.button.on(Phaser.Input.Events.POINTER_DOWN, () => {
      const active = toggleDevTarget()
      setDevTarget(this.getTarget())
      this.editing = active
      this.refresh()
    })

    this.listButton = scene.add.graphics().setPosition(LIST_BUTTON_X, CONTROL_Y)
    this.listButton.setInteractive(
      new Phaser.Geom.Rectangle(-BUTTON_SIZE / 2, -BUTTON_SIZE / 2, BUTTON_SIZE, BUTTON_SIZE),
      Phaser.Geom.Rectangle.Contains,
    )
    this.listButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.onListCheckingChanged(toggleDevListChecking())
      this.drawListButton(this.listButton)
    })
    this.listLabel = scene.add.text(LIST_BUTTON_X, CONTROL_Y - 28, "", {
      fontFamily: GAME_STYLE.type.bodyFamily,
      fontSize: "9px",
      fontStyle: "bold",
      color: GAME_STYLE.textColor.mutedInk,
      resolution: RENDER_SCALE,
    }).setOrigin(0.5)

    this.revealButton = scene.add.graphics().setPosition(REVEAL_BUTTON_X, CONTROL_Y)
    this.revealButton.setInteractive(
      new Phaser.Geom.Rectangle(-BUTTON_SIZE / 2, -BUTTON_SIZE / 2, BUTTON_SIZE, BUTTON_SIZE),
      Phaser.Geom.Rectangle.Contains,
    )
    this.revealButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.revealTarget = !this.revealTarget
      this.refresh()
    })
    this.panel = scene.add.container(TARGET_FIELD_X, TARGET_FIELD_Y)
    this.field = scene.add.graphics()
    this.field.setInteractive(
      new Phaser.Geom.Rectangle(-FIELD_WIDTH / 2, -FIELD_HEIGHT / 2, FIELD_WIDTH, FIELD_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    )
    this.field.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (devTargetEnabled()) this.editing = true
    })
    this.valueText = scene.add.text(0, -1, "", {
      fontFamily: GAME_STYLE.type.bodyFamily,
      fontSize: "18px",
      fontStyle: "bold",
      color: GAME_STYLE.textColor.ink,
      resolution: RENDER_SCALE,
    }).setOrigin(0.5)
    this.titleHitDebug = scene.add.graphics()
    this.titleHitDebug.setVisible(false)
    this.panel.add([this.field, this.valueText])
    this.add([
      this.button,
      this.listButton,
      this.listLabel,
      this.revealButton,
      this.panel,
      this.titleHitDebug,
    ])
    this.refresh()
  }

  attachToTitle(title: Phaser.GameObjects.Text): void {
    const titleText = "OBSCURDLE"
    const characterWidth = title.width / titleText.length
    const dIndex = titleText.indexOf("D")
    const hitRect = new Phaser.Geom.Rectangle(
      characterWidth * dIndex,
      0,
      characterWidth,
      title.height,
    )
    title.setInteractive(hitRect, Phaser.Geom.Rectangle.Contains)
    const bounds = title.getBounds()
    this.titleHitDebug
      .setPosition(bounds.x, bounds.y)
      // Keep the D hit area active while hiding its developer-only rectangle.
      .setVisible(false)
      .clear()
    this.titleHitDebug.fillStyle(GAME_STYLE.color.present, 0.16)
    this.titleHitDebug.fillRect(hitRect.x, hitRect.y, hitRect.width, hitRect.height)
    this.titleHitDebug.lineStyle(2, GAME_STYLE.color.present, 1)
    this.titleHitDebug.strokeRect(hitRect.x, hitRect.y, hitRect.width, hitRect.height)
    title.on(Phaser.Input.Events.POINTER_DOWN, () => this.togglePanel())
  }

  togglePanel(): void {
    this.panelOpen = !this.panelOpen
    if (!this.panelOpen) this.editing = false
    this.refresh()
  }

  handleLetter(letter: string): boolean {
    if (!this.editing || !devTargetEnabled()) return false
    appendDevTargetLetter(letter)
    if (devTarget().length === WORD_LENGTH) {
      this.editing = false
      this.onTargetChanged(devTarget())
    }
    this.refresh()
    return true
  }

  handleBackspace(): boolean {
    if (!this.editing || !devTargetEnabled()) return false
    removeDevTargetLetter()
    this.onTargetChanged(devTarget())
    this.refresh()
    return true
  }

  handleEnter(): boolean {
    if (!this.editing || !devTargetEnabled()) return false
    this.editing = false
    this.refresh()
    return true
  }

  private refresh(): void {
    const active = devTargetEnabled()
    this.button.setVisible(this.panelOpen)
    this.listButton.setVisible(this.panelOpen)
    this.listLabel.setVisible(this.panelOpen)
    this.revealButton.setVisible(this.panelOpen)
    this.panel.setVisible(this.panelOpen && (active || this.revealTarget))
    this.drawButton(active)
    this.drawListButton(this.listButton)
    this.drawRevealButton(this.revealButton)
    this.field.clear()
    this.field.fillStyle(GAME_STYLE.color.paperLight, 1)
    this.field.fillRoundedRect(-FIELD_WIDTH / 2, -FIELD_HEIGHT / 2, FIELD_WIDTH, FIELD_HEIGHT, 7)
    this.field.lineStyle(2, active ? GAME_STYLE.color.present : GAME_STYLE.color.rule, 1)
    this.field.strokeRoundedRect(-FIELD_WIDTH / 2, -FIELD_HEIGHT / 2, FIELD_WIDTH, FIELD_HEIGHT, 7)
    const fieldValue = active ? devTarget() || this.getTarget() : this.getTarget()
    this.valueText.setText(fieldValue || "TARGET")
    this.valueText.setColor(fieldValue ? GAME_STYLE.textColor.ink : GAME_STYLE.textColor.mutedInk)
  }

  private drawButton(active: boolean): void {
    this.button.clear()
    this.button.fillStyle(active ? GAME_STYLE.color.present : GAME_STYLE.color.paperLight, 1)
    this.button.fillRoundedRect(-BUTTON_SIZE / 2, -BUTTON_SIZE / 2, BUTTON_SIZE, BUTTON_SIZE, 7)
    this.button.lineStyle(2, GAME_STYLE.color.rule, 1)
    this.button.strokeRoundedRect(-BUTTON_SIZE / 2, -BUTTON_SIZE / 2, BUTTON_SIZE, BUTTON_SIZE, 7)
    this.button.lineStyle(1.8, GAME_STYLE.color.ink, 1)
    this.button.fillStyle(active ? GAME_STYLE.color.paperLight : GAME_STYLE.color.key, 1)
    this.button.fillCircle(0, 0, 10)
    this.button.strokeCircle(0, 0, 10)
    this.button.lineStyle(1.4, GAME_STYLE.color.present, 1)
    this.button.strokeCircle(0, 0, 6)
    this.button.fillStyle(GAME_STYLE.color.correct, 1)
    this.button.fillCircle(0, 0, 2.5)
  }

  private drawListButton(button: Phaser.GameObjects.Graphics): void {
    const active = devListChecking()
    this.listLabel.setText(active ? "LIST" : "ANY")
      .setColor(active ? GAME_STYLE.textColor.editorialPresent : GAME_STYLE.textColor.mutedInk)
    button.clear()
    button.fillStyle(active ? GAME_STYLE.color.present : GAME_STYLE.color.paperLight, 1)
    button.fillRoundedRect(-BUTTON_SIZE / 2, -BUTTON_SIZE / 2, BUTTON_SIZE, BUTTON_SIZE, 7)
    button.lineStyle(2, GAME_STYLE.color.rule, 1)
    button.strokeRoundedRect(-BUTTON_SIZE / 2, -BUTTON_SIZE / 2, BUTTON_SIZE, BUTTON_SIZE, 7)
    button.lineStyle(1.8, GAME_STYLE.color.ink, 1)
    button.beginPath()
    button.moveTo(-8, -8); button.lineTo(7, -8); button.lineTo(9, -5)
    button.moveTo(-8, -3); button.lineTo(6, -3)
    button.moveTo(-8, 2); button.lineTo(6, 2)
    button.moveTo(-8, 7); button.lineTo(4, 7)
    button.strokePath()
  }

  private drawRevealButton(button: Phaser.GameObjects.Graphics): void {
    button.clear()
    button.fillStyle(this.revealTarget ? GAME_STYLE.color.present : GAME_STYLE.color.paperLight, 1)
    button.fillRoundedRect(-BUTTON_SIZE / 2, -BUTTON_SIZE / 2, BUTTON_SIZE, BUTTON_SIZE, 7)
    button.lineStyle(2, GAME_STYLE.color.rule, 1)
    button.strokeRoundedRect(-BUTTON_SIZE / 2, -BUTTON_SIZE / 2, BUTTON_SIZE, BUTTON_SIZE, 7)
    button.lineStyle(1.8, GAME_STYLE.color.ink, 1)
    button.strokeEllipse(0, 0, 20, 12)
    button.fillStyle(this.revealTarget ? GAME_STYLE.color.correct : GAME_STYLE.color.present, 1)
    button.fillCircle(0, 0, 3)
    if (!this.revealTarget) {
      button.lineStyle(1.6, GAME_STYLE.color.ink, 1)
      button.beginPath()
      button.moveTo(-9, -9)
      button.lineTo(9, 9)
      button.strokePath()
    }
  }
}
