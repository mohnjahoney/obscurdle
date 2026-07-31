import Phaser from "phaser"
import { GAME_LAYOUT } from "../style/layout"
import { GAME_MOTION } from "../style/motion"
import { RENDER_SCALE } from "../style/rendering"
import { GAME_STYLE } from "../style/gameStyle"

interface GlobalNavigationOptions {
  currentEdition?: string
  hasProgress?: () => boolean
  onNewPuzzle?: () => void
  onChooseEdition?: () => void
  onOpenChange?: (open: boolean) => void
}

interface NavigationLink {
  container: Phaser.GameObjects.Container
  label: Phaser.GameObjects.Text
}

type NavigationView = "index" | "how-to-play" | "confirm"

export class GlobalNavigation extends Phaser.GameObjects.Container {
  private readonly ownerScene: Phaser.Scene
  private readonly options: GlobalNavigationOptions
  private readonly closedControl: Phaser.GameObjects.Container
  private readonly overlayLayer: Phaser.GameObjects.Container
  private readonly title: Phaser.GameObjects.Text
  private readonly subtitle: Phaser.GameObjects.Text
  private readonly indexView: Phaser.GameObjects.Container
  private readonly howToPlayView: Phaser.GameObjects.Container
  private readonly confirmView: Phaser.GameObjects.Container
  private readonly newPuzzleLink: NavigationLink
  private readonly chooseEditionLink: NavigationLink
  private readonly howToPlayLink: NavigationLink
  private readonly confirmLink: NavigationLink
  private pendingAction?: () => void
  private uiCamera?: Phaser.Cameras.Scene2D.Camera
  private openState = false

  constructor(scene: Phaser.Scene, options: GlobalNavigationOptions = {}) {
    super(scene, 0, 0)
    this.ownerScene = scene
    this.options = options
    scene.add.existing(this)
    this.setDepth(GAME_STYLE.depth.navigation)

    this.closedControl = this.createCornerControl("INDEX", () => this.open())
    this.add(this.closedControl)

    this.overlayLayer = scene.add.container(0, 0).setVisible(false)
    this.add(this.overlayLayer)

    const shade = scene.add
      .rectangle(
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.height / 2,
        GAME_LAYOUT.width,
        GAME_LAYOUT.height,
        GAME_STYLE.color.overlay,
        GAME_STYLE.alpha.navigationOverlay,
      )
      .setInteractive()
    shade.on(Phaser.Input.Events.POINTER_DOWN, () => this.close())

    const navigation = GAME_LAYOUT.navigation
    const panel = scene.add
      .rectangle(
        navigation.panelX,
        navigation.panelY,
        navigation.panelWidth,
        navigation.panelHeight,
        GAME_STYLE.color.paperLight,
      )
      .setStrokeStyle(
        GAME_STYLE.dialog.borderWidth,
        GAME_STYLE.color.ink,
        GAME_STYLE.alpha.rule,
      )
      .setInteractive()

    const closeControl = this.createCornerControl("CLOSE", () => this.close())

    const kicker = scene.add
      .text(GAME_LAYOUT.width / 2, navigation.kickerY, "OBSCURDLE", {
        fontFamily: GAME_STYLE.type.bodyFamily,
        fontSize: `${GAME_STYLE.type.footerSize}px`,
        fontStyle: "bold",
        color: GAME_STYLE.textColor.mutedInk,
        letterSpacing: 2,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)

    this.title = scene.add
      .text(GAME_LAYOUT.width / 2, navigation.titleY, "INDEX", {
        fontFamily: GAME_STYLE.type.displayFamily,
        fontSize: `${GAME_STYLE.type.dialogTitleSize}px`,
        fontStyle: "bold",
        color: GAME_STYLE.textColor.ink,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)

    this.subtitle = scene.add
      .text(GAME_LAYOUT.width / 2, navigation.subtitleY, "", {
        fontFamily: GAME_STYLE.type.displayFamily,
        fontSize: `${GAME_STYLE.type.sectionSize}px`,
        fontStyle: "italic",
        color: GAME_STYLE.textColor.mutedInk,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)

    this.indexView = scene.add.container(0, 0)
    this.howToPlayView = scene.add.container(0, 0)
    this.confirmView = scene.add.container(0, 0)

    this.createLink(
      this.indexView,
      navigation.linkStartY,
      "CONTINUE",
      () => this.close(),
    )
    this.newPuzzleLink = this.createLink(
      this.indexView,
      navigation.linkStartY + navigation.linkGap,
      "NEW PUZZLE",
      () =>
        this.requestDestructiveAction(
          "START A NEW PUZZLE",
          "The current puzzle will be set aside.",
          this.options.onNewPuzzle,
        ),
    )
    this.chooseEditionLink = this.createLink(
      this.indexView,
      navigation.linkStartY + navigation.linkGap * 2,
      "CHOOSE ANOTHER EDITION",
      () => this.requestChooseEdition(),
    )
    this.howToPlayLink = this.createLink(
      this.indexView,
      navigation.linkStartY + navigation.linkGap * 3,
      "HOW TO PLAY",
      () => this.showView("how-to-play"),
    )

    const howToPlayBody = scene.add
      .text(
        GAME_LAYOUT.width / 2,
        navigation.bodyY,
        [
          "Find the hidden five-letter word in six tries.",
          "",
          "Each submitted word is printed with clues:",
          "",
          "GREEN — correct letter and position",
          "GOLD — correct letter, different position",
          "GRAY — letter absent from the word",
          "",
          "Each edition changes how those clues can be seen.",
        ].join("\n"),
        {
          fontFamily: GAME_STYLE.type.bodyFamily,
          fontSize: `${GAME_STYLE.type.messageSize}px`,
          color: GAME_STYLE.textColor.ink,
          align: "left",
          lineSpacing: 7,
          wordWrap: { width: navigation.bodyWidth },
          resolution: RENDER_SCALE,
        },
      )
      .setOrigin(0.5, 0)
    this.howToPlayView.add(howToPlayBody)
    this.createLink(
      this.howToPlayView,
      navigation.panelY + navigation.panelHeight / 2 - 63,
      "BACK TO INDEX",
      () => this.showView("index"),
    )

    const confirmBody = scene.add
      .text(
        GAME_LAYOUT.width / 2,
        navigation.confirmBodyY,
        "",
        {
          fontFamily: GAME_STYLE.type.bodyFamily,
          fontSize: `${GAME_STYLE.type.dialogBodySize}px`,
          color: GAME_STYLE.textColor.mutedInk,
          align: "center",
          wordWrap: { width: navigation.bodyWidth },
          resolution: RENDER_SCALE,
        },
      )
      .setOrigin(0.5, 0)
    this.confirmView.add(confirmBody)
    this.confirmLink = this.createLink(
      this.confirmView,
      navigation.linkStartY + navigation.linkGap * 2,
      "CONTINUE",
      () => {
        const action = this.pendingAction
        this.pendingAction = undefined
        this.close()
        action?.()
      },
    )
    this.createLink(
      this.confirmView,
      navigation.linkStartY + navigation.linkGap * 3,
      "KEEP PLAYING",
      () => this.close(),
    )

    this.confirmView.setData("body", confirmBody)
    this.overlayLayer.add([
      shade,
      panel,
      closeControl,
      kicker,
      this.title,
      this.subtitle,
      this.indexView,
      this.howToPlayView,
      this.confirmView,
    ])

    this.newPuzzleLink.container.setVisible(Boolean(options.onNewPuzzle))
    this.chooseEditionLink.container.setVisible(
      Boolean(options.onChooseEdition),
    )
    if (!options.onNewPuzzle && !options.onChooseEdition) {
      this.howToPlayLink.container.setY(-navigation.linkGap * 2)
    }
    this.showView("index")
    this.setupUiCamera()

    scene.input.keyboard?.on("keydown-ESC", this.handleEscape, this)
    scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleSceneShutdown,
      this,
    )
  }

  get isOpen(): boolean {
    return this.openState
  }

  open(): void {
    if (this.openState) return
    this.openState = true
    this.closedControl.setVisible(false)
    this.showView("index")
    this.overlayLayer.setVisible(true).setAlpha(0)
    this.scene.tweens.add({
      targets: this.overlayLayer,
      alpha: 1,
      duration: GAME_MOTION.navigation.enterDuration,
      ease: "Sine.Out",
    })
    this.options.onOpenChange?.(true)
  }

  close(): void {
    if (!this.openState) return
    this.openState = false
    this.pendingAction = undefined
    this.scene.tweens.killTweensOf(this.overlayLayer)
    this.overlayLayer.setVisible(false).setAlpha(1)
    this.closedControl.setVisible(true)
    this.options.onOpenChange?.(false)
  }

  requestChooseEdition(): void {
    this.requestDestructiveAction(
      "CHOOSE ANOTHER EDITION",
      "The current puzzle will be set aside.",
      this.options.onChooseEdition,
    )
  }

  private requestDestructiveAction(
    confirmLabel: string,
    body: string,
    action: (() => void) | undefined,
  ): void {
    if (!action) return
    if (!this.options.hasProgress?.()) {
      this.close()
      action()
      return
    }

    this.pendingAction = action
    this.confirmLink.label.setText(confirmLabel)
    const confirmBody = this.confirmView.getData(
      "body",
    ) as Phaser.GameObjects.Text
    confirmBody.setText(body)
    this.showView("confirm")
  }

  private showView(view: NavigationView): void {
    this.indexView.setVisible(view === "index")
    this.howToPlayView.setVisible(view === "how-to-play")
    this.confirmView.setVisible(view === "confirm")

    if (view === "index") {
      this.title.setText("INDEX")
      this.subtitle.setText(
        this.options.currentEdition
          ? `CURRENT EDITION — ${this.options.currentEdition}`
          : "THE DAILY WORD PUZZLE",
      )
    } else if (view === "how-to-play") {
      this.title.setText("HOW TO PLAY")
      this.subtitle.setText("THE DAILY WORD PUZZLE")
    } else {
      this.title.setText("LEAVE THIS PUZZLE?")
      this.subtitle.setText("")
    }
  }

  private createCornerControl(
    label: string,
    onPress: () => void,
  ): Phaser.GameObjects.Container {
    const navigation = GAME_LAYOUT.navigation
    const container = this.scene.add.container(0, 0)
    const hitArea = this.scene.add
      .rectangle(
        navigation.indexX,
        navigation.indexY,
        navigation.indexHitWidth,
        navigation.indexHitHeight,
        GAME_STYLE.color.paperLight,
        0.94,
      )
      .setStrokeStyle(
        GAME_STYLE.rule.thin,
        GAME_STYLE.color.rule,
        GAME_STYLE.alpha.softRule,
      )
      .setInteractive({ useHandCursor: true })
    const text = this.scene.add
      .text(navigation.indexX, navigation.indexY, label, {
        fontFamily: GAME_STYLE.type.bodyFamily,
        fontSize: `${GAME_STYLE.type.footerSize}px`,
        fontStyle: "bold",
        color: GAME_STYLE.textColor.mutedInk,
        letterSpacing: 1,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)
    const rule = this.scene.add
      .rectangle(
        navigation.indexX,
        navigation.indexY + 10,
        navigation.indexHitWidth - 24,
        GAME_STYLE.rule.thin,
        GAME_STYLE.color.rule,
        GAME_STYLE.alpha.softRule,
      )

    hitArea.on(Phaser.Input.Events.POINTER_DOWN, onPress)
    container.add([hitArea, text, rule])
    return container
  }

  private createLink(
    parent: Phaser.GameObjects.Container,
    y: number,
    label: string,
    onPress: () => void,
  ): NavigationLink {
    const navigation = GAME_LAYOUT.navigation
    const container = this.scene.add.container(0, 0)
    const rule = this.scene.add.rectangle(
      GAME_LAYOUT.width / 2,
      y - navigation.linkHeight / 2,
      navigation.contentWidth,
      GAME_STYLE.rule.thin,
      GAME_STYLE.color.rule,
      GAME_STYLE.alpha.softRule,
    )
    const hitArea = this.scene.add
      .rectangle(
        GAME_LAYOUT.width / 2,
        y,
        navigation.contentWidth,
        navigation.linkHeight,
        GAME_STYLE.color.paperLight,
        0.001,
      )
      .setInteractive({ useHandCursor: true })
    const text = this.scene.add
      .text(GAME_LAYOUT.width / 2, y, label, {
        fontFamily: GAME_STYLE.type.bodyFamily,
        fontSize: `${GAME_STYLE.type.buttonSize}px`,
        fontStyle: "bold",
        color: GAME_STYLE.textColor.ink,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)

    hitArea.on(Phaser.Input.Events.POINTER_DOWN, onPress)
    container.add([rule, hitArea, text])
    parent.add(container)
    return { container, label: text }
  }

  private setupUiCamera(): void {
    const mainCamera = this.scene.cameras.main
    mainCamera.ignore(this)
    this.uiCamera = this.scene.cameras.add(
      mainCamera.x,
      mainCamera.y,
      mainCamera.width,
      mainCamera.height,
      false,
      "global-navigation",
    )
    this.uiCamera
      .setZoom(RENDER_SCALE)
      .centerOn(GAME_LAYOUT.width / 2, GAME_LAYOUT.height / 2)
    this.uiCamera.ignore(
      this.scene.children.list.filter((gameObject) => gameObject !== this),
    )
    this.scene.children.events.on(
      Phaser.Scenes.Events.ADDED_TO_SCENE,
      this.handleGameObjectAdded,
      this,
    )
  }

  private handleGameObjectAdded(gameObject: Phaser.GameObjects.GameObject): void {
    if (gameObject !== this) {
      this.uiCamera?.ignore(gameObject)
    }
  }

  private handleEscape(): void {
    if (this.openState) this.close()
  }

  private handleSceneShutdown(): void {
    this.ownerScene.input.keyboard?.off(
      "keydown-ESC",
      this.handleEscape,
      this,
    )
    this.ownerScene.children.events.off(
      Phaser.Scenes.Events.ADDED_TO_SCENE,
      this.handleGameObjectAdded,
      this,
    )
    if (this.uiCamera) {
      this.ownerScene.cameras.remove(this.uiCamera)
      this.uiCamera = undefined
    }
  }
}
