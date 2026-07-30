import Phaser from "phaser"
import type { ModeId } from "../modes/ObscuringMode"
import { MENU_MODE_IDS, modeDefinition } from "../modes/registry"
import { Button } from "../presentation/Button"
import { PaperBackdrop } from "../presentation/PaperBackdrop"
import { preloadPigmentTextures } from "../presentation/pigmentTextures"
import { GAME_STYLE } from "../style/gameStyle"
import { GAME_LAYOUT } from "../style/layout"
import { GAME_MOTION } from "../style/motion"
import { configureLogicalCamera, RENDER_SCALE } from "../style/rendering"

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("menu")
  }

  preload(): void {
    preloadPigmentTextures(this)
  }

  create(): void {
    configureLogicalCamera(this)
    new PaperBackdrop(this)

    this.add
      .text(GAME_LAYOUT.width / 2, GAME_LAYOUT.menu.kickerY, "THE DAILY WORD PUZZLE", {
        fontFamily: GAME_STYLE.type.bodyFamily,
        fontSize: `${GAME_STYLE.type.sectionSize}px`,
        fontStyle: "bold",
        color: GAME_STYLE.textColor.mutedInk,
        letterSpacing: 2,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_LAYOUT.width / 2, GAME_LAYOUT.menu.titleY, "OBSCURDLE", {
        fontFamily: GAME_STYLE.type.displayFamily,
        fontSize: `${GAME_STYLE.type.titleSize}px`,
        fontStyle: "bold",
        color: GAME_STYLE.textColor.ink,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)

    this.add
      .text(
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.menu.deckY,
        "The familiar word puzzle,\nwith less certainty.",
        {
          fontFamily: GAME_STYLE.type.displayFamily,
          fontSize: `${GAME_STYLE.type.dialogBodySize}px`,
          fontStyle: "italic",
          align: "center",
          lineSpacing: 5,
          color: GAME_STYLE.textColor.mutedInk,
          resolution: RENDER_SCALE,
        },
      )
      .setOrigin(0.5)

    this.add
      .text(
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.menu.descriptionY,
        "Find the hidden five-letter word in six tries.\nChoose how the printed clues can be seen.",
        {
          fontFamily: GAME_STYLE.type.bodyFamily,
          fontSize: `${GAME_STYLE.type.messageSize}px`,
          align: "center",
          lineSpacing: 7,
          color: GAME_STYLE.textColor.ink,
          resolution: RENDER_SCALE,
        },
      )
      .setOrigin(0.5)

    MENU_MODE_IDS.forEach((modeId, index) => {
      new Button(
        this,
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.menu.modeButtonStartY +
          index * GAME_LAYOUT.menu.modeButtonGap,
        modeDefinition(modeId).menuLabel,
        () => this.startGame(modeId),
        { inverted: index === 0 },
      )
    })

    this.add
      .text(
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.menu.noteY,
        "Use your keyboard, or tap the printed keys.",
        {
          fontFamily: GAME_STYLE.type.bodyFamily,
          fontSize: `${GAME_STYLE.type.footerSize}px`,
          color: GAME_STYLE.textColor.mutedInk,
          resolution: RENDER_SCALE,
        },
      )
      .setOrigin(0.5)

    this.input.keyboard?.on("keydown-ENTER", () => this.startGame("misprint"))
    this.cameras.main.fadeIn(GAME_MOTION.scene.fadeDuration)
  }

  private startGame(modeId: ModeId): void {
    this.cameras.main.fadeOut(GAME_MOTION.scene.fadeDuration)
    this.time.delayedCall(GAME_MOTION.scene.fadeDuration, () => {
      this.scene.start("play", { modeId })
    })
  }
}
