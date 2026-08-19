import Phaser from "phaser"
import { Puzzle, type PuzzleStatus, type SubmitFailureReason } from "../core/Puzzle"
import { BundledWordSource } from "../core/words"
import type { ModeContext, ModeId, ObscuringMode } from "../modes/ObscuringMode"
import { modeDefinition } from "../modes/registry"
import {
  markPlayHistory,
  menuStateFromHistory,
} from "../navigation/browserHistory"
import { BoardRenderer } from "../presentation/board/BoardRenderer"
import type { BoardPresentationId } from "../presentation/board/BoardPresentation"
import { BoardPresentationToggle } from "../presentation/board/BoardPresentationToggle"
import { resolveLetterBasePlacement } from "../presentation/board/boardLayout"
import { editorialWord } from "../presentation/board/editorialEvaluation"
import {
  loadBoardPresentation,
  saveBoardPresentation,
} from "../presentation/board/boardPreference"
import { Button } from "../presentation/Button"
import { SceneEffectRenderer } from "../presentation/effects/SceneEffectRenderer"
import { KeyboardView } from "../presentation/KeyboardView"
import { PaperBackdrop } from "../presentation/PaperBackdrop"
import { KeyboardPresentationToggle } from "../presentation/keyboard/KeyboardPresentationToggle"
import type { KeyboardPresentationId } from "../presentation/keyboard/KeyboardPresentation"
import {
  loadKeyboardPresentation,
  saveKeyboardPresentation,
} from "../presentation/keyboard/keyboardPreference"
import { buildPresentation } from "../presentation/model/buildPresentation"
import type { PresentationConfiguration } from "../presentation/model/PresentationConfiguration"
import type {
  MastheadPresentationModel,
  PresentationModel,
} from "../presentation/model/PresentationModel"
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
  private board!: BoardRenderer
  private sceneEffects!: SceneEffectRenderer
  private keyboardView!: KeyboardView
  private keyboardPresentation: KeyboardPresentationId = "digital"
  private boardPresentation: BoardPresentationId = "tiles"
  private presentationConfiguration!: PresentationConfiguration
  private keyboardToggle!: KeyboardPresentationToggle
  private boardToggle!: BoardPresentationToggle
  private messageText!: Phaser.GameObjects.Text
  private messageTimer?: Phaser.Time.TimerEvent
  private acceptingInput = true
  private modeId: ModeId = "plain"
  private mode!: ObscuringMode
  private modeContext!: ModeContext

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
    this.puzzle = new Puzzle(wordSource.chooseAnswer(), wordSource.allowedWords())
    this.keyboardPresentation = loadKeyboardPresentation()
    this.boardPresentation = loadBoardPresentation()
    this.presentationConfiguration = {
      board: this.boardPresentation,
      keyboard: this.keyboardPresentation,
    }
    this.mode = modeDefinition(this.modeId).create()
    this.modeContext = {
      scene: this,
      boardPresentation: () => this.presentationConfiguration.board,
      letterBasePlacementAt: (row, column) => {
        const puzzle = this.puzzle.snapshot()
        const submittedGuess = puzzle.guesses[row]
        const word = submittedGuess
          ? this.presentationConfiguration.board === "bare"
            ? editorialWord(submittedGuess.word, submittedGuess.evaluation)
            : submittedGuess.word
          : row === puzzle.guesses.length
            ? this.presentationConfiguration.board === "bare"
              ? editorialWord(puzzle.currentGuess)
              : puzzle.currentGuess
            : ""
        return resolveLetterBasePlacement(
          this.presentationConfiguration.board,
          row,
          column,
          word,
        )
      },
    }
    this.mode.start(this.modeContext)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.mode.stop(this.modeContext)
    })
    const initialPresentation = this.currentPresentation()

    if (initialPresentation.page.kind === "paper") {
      new PaperBackdrop(this)
    }

    this.createMasthead(initialPresentation.masthead)
    this.board = this.createBoard(initialPresentation.board.kind)
    this.board.apply(initialPresentation.board)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.board.destroy()
    })

    this.keyboardView = this.createKeyboard(
      initialPresentation.keyboard.kind,
    )
    this.keyboardView.apply(initialPresentation.keyboard)
    this.keyboardToggle = new KeyboardPresentationToggle(
      this,
      this.keyboardPresentation,
      (presentationId) => this.setKeyboardPresentation(presentationId),
    )
    this.boardToggle = new BoardPresentationToggle(
      this,
      this.boardPresentation,
      (presentationId) => this.setBoardPresentation(presentationId),
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

    this.sceneEffects = this.createSceneEffects()
    this.sceneEffects.apply(initialPresentation.effect)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sceneEffects.destroy()
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
    const presentationChanged = this.mode.update(this.modeContext, deltaMs)
    if (presentationChanged) this.applyCurrentPresentation()
  }

  private createMasthead(
    presentation: MastheadPresentationModel,
  ): Phaser.GameObjects.Text {
    const title = this.add
      .text(
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.masthead.titleY,
        presentation.title,
        {
          fontFamily: GAME_STYLE.type.displayFamily,
          fontSize: `${GAME_STYLE.type.tileSize}px`,
          fontStyle: "bold",
          color: GAME_STYLE.textColor.ink,
          resolution: RENDER_SCALE,
        },
      )
      .setOrigin(0.5, 0.5)

    return title
  }

  private typeLetter(letter: string): void {
    if (
      !this.acceptingInput ||
      !this.puzzle.typeLetter(letter)
    ) {
      return
    }
    this.applyCurrentPresentation()
  }

  private createKeyboard(
    presentationId: KeyboardPresentationId,
  ): KeyboardView {
    return new KeyboardView(
      this,
      {
        onLetter: (letter) => this.typeLetter(letter),
        onEnter: () => this.submit(),
        onBackspace: () => this.backspace(),
      },
      presentationId,
    )
  }

  private createBoard(presentationId: BoardPresentationId): BoardRenderer {
    return new BoardRenderer(this, presentationId, {
      onLetterLegible: (row, column) => {
        if (this.mode.onLetterLegible?.(row, column)) {
          this.applyCurrentPresentation()
        }
      },
    })
  }

  private createSceneEffects(): SceneEffectRenderer {
    return new SceneEffectRenderer(this, this.board, {
      onControlChange: (name, value) => {
        if (this.mode.onSceneEffectControlChange?.(name, value)) {
          this.applyCurrentPresentation()
        }
      },
    })
  }

  private setKeyboardPresentation(
    presentationId: KeyboardPresentationId,
  ): void {
    if (presentationId === this.keyboardPresentation) return

    this.keyboardPresentation = presentationId
    this.presentationConfiguration = {
      ...this.presentationConfiguration,
      keyboard: presentationId,
    }
    saveKeyboardPresentation(presentationId)
    this.keyboardView.destroy()
    this.keyboardView = this.createKeyboard(presentationId)
    this.keyboardView.apply(this.currentPresentation().keyboard)
    this.keyboardToggle.setSelection(presentationId)
  }

  private setBoardPresentation(
    presentationId: BoardPresentationId,
  ): void {
    if (presentationId === this.boardPresentation) return

    this.boardPresentation = presentationId
    this.presentationConfiguration = {
      ...this.presentationConfiguration,
      board: presentationId,
    }
    saveBoardPresentation(presentationId)

    const presentation = this.currentPresentation()
    this.sceneEffects.destroy()
    this.board.destroy()
    this.board = this.createBoard(presentation.board.kind)
    this.board.apply(presentation.board)
    this.sceneEffects = this.createSceneEffects()
    this.sceneEffects.apply(presentation.effect)
    this.boardToggle.setSelection(presentationId)
  }

  private backspace(): void {
    if (
      !this.acceptingInput ||
      !this.puzzle.backspace()
    ) {
      return
    }
    this.applyCurrentPresentation()
  }

  private submit(): void {
    if (!this.acceptingInput) return

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

    this.mode.onGuessSubmitted?.(this.modeContext, result.row)
    this.applyCurrentPresentation()
    this.acceptingInput = result.status === "playing"
    this.scheduleResult(result.status, result.guess.word.length)
  }

  private eraseRejectedGuess(): void {
    this.acceptingInput = false
    const letterCount = this.puzzle.currentGuess.length

    for (let index = 0; index < letterCount; index += 1) {
      this.time.delayedCall(
        GAME_MOTION.tile.invalidEraseStepMs * (index + 1),
        () => {
          this.puzzle.backspace()
          this.applyCurrentPresentation()

          if (index === letterCount - 1) {
            this.acceptingInput = true
          }
        },
      )
    }
  }

  private currentPresentation(): PresentationModel {
    return buildPresentation(
      this.puzzle.snapshot(),
      this.presentationConfiguration,
      this.mode.presentationState(),
      this.time.now,
    )
  }

  private applyCurrentPresentation(): void {
    const presentation = this.currentPresentation()
    this.sceneEffects.apply(presentation.effect)
    this.board.apply(presentation.board)
    this.keyboardView.apply(presentation.keyboard)
  }

  private scheduleResult(status: PuzzleStatus, wordLength: number): void {
    const revealDuration =
      GAME_MOTION.tile.inkBloom.duration +
      GAME_MOTION.tile.revealStagger * (wordLength - 1)

    this.time.delayedCall(revealDuration, () => {
      if (status !== "playing") this.showResult(status)
    })
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
      this.applyCurrentPresentation()

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
    if (menuStateFromHistory(event.state)) {
      this.scene.start("menu")
    }
  }
}
