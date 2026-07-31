import Phaser from "phaser"
import { Puzzle, type PuzzleStatus, type SubmitFailureReason } from "../core/Puzzle"
import { BundledWordSource } from "../core/words"
import type { ModeContext, ModeId, ObscuringMode } from "../modes/ObscuringMode"
import { modeDefinition } from "../modes/registry"
import {
  markPlayHistory,
  menuStateFromHistory,
} from "../navigation/browserHistory"
import { GlobalNavigation } from "../navigation/GlobalNavigation"
import { BoardView } from "../presentation/BoardView"
import { Button } from "../presentation/Button"
import { KeyboardView } from "../presentation/KeyboardView"
import { PaperBackdrop } from "../presentation/PaperBackdrop"
import { preloadPigmentTextures } from "../presentation/pigmentTextures"
import { GAME_STYLE } from "../style/gameStyle"
import { GAME_LAYOUT } from "../style/layout"
import { GAME_MOTION } from "../style/motion"
import { configureLogicalCamera, RENDER_SCALE } from "../style/rendering"

const wordSource = new BundledWordSource()

const FAILURE_MESSAGES: Record<SubmitFailureReason, string> = {
  incomplete: "Not enough letters",
  invalid: "Not in this edition's word list",
  complete: "This puzzle is complete",
}

interface PlaySceneData {
  modeId?: ModeId
}

export class PlayScene extends Phaser.Scene {
  private puzzle!: Puzzle
  private board!: BoardView
  private keyboardView!: KeyboardView
  private messageText!: Phaser.GameObjects.Text
  private messageTimer?: Phaser.Time.TimerEvent
  private acceptingInput = true
  private modeId: ModeId = "plain"
  private mode!: ObscuringMode
  private modeContext!: ModeContext
  private navigation!: GlobalNavigation
  private navigationOpen = false

  constructor() {
    super("play")
  }

  init(data: PlaySceneData): void {
    this.modeId = data.modeId ?? "plain"
    this.acceptingInput = true
  }

  preload(): void {
    preloadPigmentTextures(this)
  }

  create(): void {
    markPlayHistory(this.modeId)
    configureLogicalCamera(this)
    new PaperBackdrop(this)
    this.puzzle = new Puzzle(wordSource.chooseAnswer(), wordSource.allowedWords())

    const mastheadTitle = this.createMasthead()
    this.board = new BoardView(
      this,
      modeDefinition(this.modeId).boardPresentation,
    )
    this.mode = modeDefinition(this.modeId).create()
    this.modeContext = { scene: this, board: this.board }
    this.mode.start(this.modeContext)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.mode.stop(this.modeContext)
    })

    this.keyboardView = new KeyboardView(
      this,
      {
        onLetter: (letter) => this.typeLetter(letter),
        onEnter: () => this.submit(),
        onBackspace: () => this.backspace(),
      },
      modeDefinition(this.modeId).keyboardPresentation,
    )

    this.messageText = this.add
      .text(GAME_LAYOUT.width / 2, GAME_LAYOUT.status.y, "", {
        fontFamily: GAME_STYLE.type.bodyFamily,
        fontSize: `${GAME_STYLE.type.messageSize}px`,
        fontStyle: "italic",
        color: GAME_STYLE.textColor.mutedInk,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)

    this.add
      .text(
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.footer.y,
        `${modeDefinition(this.modeId).footerLabel}  ·  SIX GUESSES  ·  FIVE LETTERS`,
        {
          fontFamily: GAME_STYLE.type.bodyFamily,
          fontSize: `${GAME_STYLE.type.footerSize}px`,
          color: GAME_STYLE.textColor.faintInk,
          letterSpacing: 1,
          resolution: RENDER_SCALE,
        },
      )
      .setOrigin(0.5)

    this.navigation = new GlobalNavigation(this, {
      currentEdition: modeDefinition(this.modeId).mastheadLabel,
      hasProgress: () =>
        this.puzzle.currentGuess.length > 0 || this.puzzle.guesses.length > 0,
      onNewPuzzle: () => this.scene.restart(),
      onChooseEdition: () => this.scene.start("menu"),
      onOpenChange: (open) => {
        this.navigationOpen = open
      },
    })
    mastheadTitle
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.navigation.requestChooseEdition()
      })

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        this.submit()
      } else if (event.key === "Backspace" || event.key === "Delete") {
        this.backspace()
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        this.typeLetter(event.key)
      }
    })

    window.addEventListener("popstate", this.handlePopState)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("popstate", this.handlePopState)
    })
    this.cameras.main.fadeIn(GAME_MOTION.scene.fadeDuration)
  }

  update(_time: number, deltaMs: number): void {
    this.mode?.update(this.modeContext, deltaMs)
  }

  private createMasthead(): Phaser.GameObjects.Text {
    const title = this.add
      .text(GAME_LAYOUT.page.inset, GAME_LAYOUT.masthead.titleY, "OBSCURDLE", {
        fontFamily: GAME_STYLE.type.displayFamily,
        fontSize: `${GAME_STYLE.type.tileSize}px`,
        fontStyle: "bold",
        color: GAME_STYLE.textColor.ink,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0, 0.5)

    this.add
      .text(
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.masthead.deckY,
        "Keep the puzzle. Change what can be seen.",
        {
          fontFamily: GAME_STYLE.type.displayFamily,
          fontSize: `${GAME_STYLE.type.deckSize}px`,
          fontStyle: "italic",
          color: GAME_STYLE.textColor.mutedInk,
          resolution: RENDER_SCALE,
        },
      )
      .setOrigin(0.5)

    return title
  }

  private typeLetter(letter: string): void {
    if (
      this.navigationOpen ||
      !this.acceptingInput ||
      !this.puzzle.typeLetter(letter)
    ) {
      return
    }
    this.renderCurrentRow()
  }

  private backspace(): void {
    if (
      this.navigationOpen ||
      !this.acceptingInput ||
      !this.puzzle.backspace()
    ) {
      return
    }
    this.renderCurrentRow()
  }

  private submit(): void {
    if (this.navigationOpen || !this.acceptingInput) return

    const result = this.puzzle.submitGuess((context) => {
      return this.mode.transformSubmittedWord?.(context) ?? context.enteredWord
    })
    if (!result.ok) {
      this.showMessage(FAILURE_MESSAGES[result.reason])
      if (result.reason === "invalid") {
        this.eraseRejectedGuess()
      }
      return
    }

    this.mode.onGuessSubmitted(this.modeContext, result.row)
    const revealKeyboardByLetter =
      this.mode.keyboardRevealTiming === "letter-legible"
    this.board.revealRow(result.row, result.guess.evaluation, {
      word: result.guess.word,
      letterLegibleProgress: this.mode.letterLegibleProgress,
      onLetterLegible: revealKeyboardByLetter
        ? (column) => {
            const letter = result.guess.word[column]
            const evaluation = result.guess.evaluation[column]
            if (letter && evaluation) {
              this.keyboardView.applyLetterEvaluation(letter, evaluation)
            }
          }
        : undefined,
    })
    if (!revealKeyboardByLetter) {
      this.keyboardView.applyEvaluation(result.guess.word, result.guess.evaluation)
    }
    this.acceptingInput = result.status === "playing"

    const revealDuration =
      GAME_MOTION.tile.inkBloom.duration +
      GAME_MOTION.tile.revealStagger * (result.guess.word.length - 1)

    this.time.delayedCall(revealDuration, () => {
      if (result.status !== "playing") {
        this.showResult(result.status)
      }
    })
  }

  private renderCurrentRow(): void {
    this.board.renderCurrentGuess(this.puzzle.guesses.length, this.puzzle.currentGuess)
  }

  private eraseRejectedGuess(): void {
    this.acceptingInput = false
    const letterCount = this.puzzle.currentGuess.length

    for (let index = 0; index < letterCount; index += 1) {
      this.time.delayedCall(
        GAME_MOTION.tile.invalidEraseStepMs * (index + 1),
        () => {
          this.puzzle.backspace()
          this.board.renderCurrentGuess(
            this.puzzle.guesses.length,
            this.puzzle.currentGuess,
            false,
          )

          if (index === letterCount - 1) {
            this.acceptingInput = true
          }
        },
      )
    }
  }

  private showMessage(message: string): void {
    this.messageTimer?.remove()
    this.messageText.setText(message).setAlpha(1)
    this.messageTimer = this.time.delayedCall(GAME_MOTION.message.duration, () => {
      this.tweens.add({
        targets: this.messageText,
        alpha: 0,
        duration: GAME_MOTION.scene.fadeDuration,
        onComplete: () => this.messageText.setText("").setAlpha(1),
      })
    })
  }

  private showResult(status: PuzzleStatus): void {
    this.time.delayedCall(GAME_MOTION.dialog.delayAfterReveal, () => {
      this.mode.stop(this.modeContext)

      const overlay = this.add.rectangle(
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.height / 2,
        GAME_LAYOUT.width,
        GAME_LAYOUT.height,
        GAME_STYLE.color.overlay,
        GAME_STYLE.alpha.overlay,
      )
      overlay.setInteractive()

      const panel = this.add.rectangle(
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.dialog.y,
        GAME_LAYOUT.dialog.width,
        GAME_LAYOUT.dialog.height,
        GAME_STYLE.color.paperLight,
      )
      panel.setStrokeStyle(
        GAME_STYLE.dialog.borderWidth,
        GAME_STYLE.color.ink,
        GAME_STYLE.alpha.rule,
      )

      const title = this.add
        .text(
          GAME_LAYOUT.width / 2,
          GAME_LAYOUT.dialog.y + GAME_LAYOUT.dialog.titleOffsetY,
          status === "won" ? "Solved." : "Edition closed.",
          {
            fontFamily: GAME_STYLE.type.displayFamily,
            fontSize: `${GAME_STYLE.type.dialogTitleSize}px`,
            fontStyle: "bold",
            color: GAME_STYLE.textColor.ink,
            resolution: RENDER_SCALE,
          },
        )
        .setOrigin(0.5)

      const body = this.add
        .text(
          GAME_LAYOUT.width / 2,
          GAME_LAYOUT.dialog.y + GAME_LAYOUT.dialog.bodyOffsetY,
          status === "won"
            ? `You found it in ${this.puzzle.guesses.length} ${
                this.puzzle.guesses.length === 1 ? "guess" : "guesses"
              }.`
            : `The word was ${this.puzzle.answer}.`,
          {
            fontFamily: GAME_STYLE.type.bodyFamily,
            fontSize: `${GAME_STYLE.type.dialogBodySize}px`,
            color: GAME_STYLE.textColor.mutedInk,
            resolution: RENDER_SCALE,
          },
        )
        .setOrigin(0.5)

      const again = new Button(
        this,
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.dialog.y + GAME_LAYOUT.dialog.primaryButtonOffsetY,
        "ANOTHER PUZZLE",
        () => this.scene.restart(),
        { inverted: true, compact: true },
      )
      const menu = this.add
        .text(
          GAME_LAYOUT.width / 2,
          GAME_LAYOUT.dialog.y + GAME_LAYOUT.dialog.secondaryButtonOffsetY,
          "RETURN TO FRONT PAGE",
          {
            fontFamily: GAME_STYLE.type.bodyFamily,
            fontSize: `${GAME_STYLE.type.footerSize}px`,
            fontStyle: "bold",
            color: GAME_STYLE.textColor.mutedInk,
            resolution: RENDER_SCALE,
          },
        )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
      menu.on(Phaser.Input.Events.POINTER_DOWN, () => this.scene.start("menu"))

      const dialogObjects = [overlay, panel, title, body, again, menu]
      dialogObjects.forEach((object) => {
        object.setDepth(GAME_STYLE.depth.dialog)
        object.setAlpha(0)
        object.setScale(GAME_MOTION.dialog.startScale)
      })
      this.tweens.add({
        targets: dialogObjects,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: GAME_MOTION.dialog.enterDuration,
        ease: "Sine.Out",
      })

      this.input.keyboard?.once("keydown-ENTER", () => this.scene.restart())
    })
  }

  private readonly handlePopState = (event: PopStateEvent): void => {
    if (this.navigation.isOpen) {
      this.navigation.close()
      markPlayHistory(this.modeId)
      return
    }

    if (menuStateFromHistory(event.state)) {
      this.scene.start("menu")
    }
  }
}
