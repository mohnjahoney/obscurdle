import Phaser from "phaser"
import { GAME_LAYOUT } from "../../style/layout"
import { RENDER_SCALE } from "../../style/rendering"
import type { ModeContext, ObscuringMode } from "../ObscuringMode"
import { flashlightDistribution } from "./distributions/registry"
import type { FlashlightUniformValue } from "./FlashlightDistribution"
import { FLASHLIGHT_CONFIG } from "./flashlightConfig"
import { FlashlightDebugControls } from "./FlashlightDebugControls"
import {
  buildFlashlightConeFragmentShader,
  buildFlashlightFragmentShader,
} from "./flashlightShader"

interface AimPoint {
  x: number
  y: number
}

let nextFlashlightMaskId = 0

export class FlashlightMode implements ObscuringMode {
  private maskShader?: Phaser.GameObjects.Shader
  private coneShader?: Phaser.GameObjects.Shader
  private coneCamera?: Phaser.Cameras.Scene2D.Camera
  private cameraFilter?: Phaser.Filters.ParallelFilters
  private debugControls?: FlashlightDebugControls
  private scene?: Phaser.Scene
  private draggingTouch = false
  private lastUpdateAt = 0
  private readonly target: AimPoint = {
    x: FLASHLIGHT_CONFIG.initialTarget[0],
    y: FLASHLIGHT_CONFIG.initialTarget[1],
  }
  private readonly desiredTarget: AimPoint = {
    x: FLASHLIGHT_CONFIG.initialTarget[0],
    y: FLASHLIGHT_CONFIG.initialTarget[1],
  }
  private readonly uniformOverrides = new Map<
    string,
    FlashlightUniformValue
  >()

  start(context: ModeContext): void {
    this.stop(context)
    this.scene = context.scene
    this.lastUpdateAt = context.scene.time.now

    if (context.scene.game.renderer.type !== Phaser.WEBGL) return

    const distribution = flashlightDistribution(
      FLASHLIGHT_CONFIG.distribution,
    )
    const keyboardBottom =
      GAME_LAYOUT.keyboard.top +
      GAME_LAYOUT.keyboard.keyHeight * 3 +
      GAME_LAYOUT.keyboard.rowGap * 2
    const keyboardCenterY =
      (GAME_LAYOUT.keyboard.top + keyboardBottom) / 2 / GAME_LAYOUT.height
    const keyboardLight = FLASHLIGHT_CONFIG.keyboardLight
    const keyboardLightRise =
      Math.tan(Phaser.Math.DegToRad(keyboardLight.angleDegrees)) *
      (keyboardLight.targetX - keyboardLight.sourceX) *
      (GAME_LAYOUT.width / GAME_LAYOUT.height)
    const keyboardLightSourceY = keyboardCenterY - keyboardLightRise / 2
    const keyboardLightTargetY = keyboardCenterY + keyboardLightRise / 2

    const maskTextureKey = `obscurdle-flashlight-mask-${nextFlashlightMaskId++}`
    const setMainLightUniforms = (
      setUniform: (name: string, value: unknown) => void,
    ) => {
      const sourceX =
        FLASHLIGHT_CONFIG.sourceX +
        (this.target.x - 0.5) *
          FLASHLIGHT_CONFIG.sourceHorizontalFollow

      setUniform("uSource", [sourceX, FLASHLIGHT_CONFIG.sourceY])
      setUniform("uTarget", [this.target.x, this.target.y])
      setUniform("uTime", context.scene.time.now / 1_000)
      setUniform(
        "uViewportAspect",
        GAME_LAYOUT.width / GAME_LAYOUT.height,
      )

      for (const [name, value] of Object.entries(
        distribution.uniforms,
      )) {
        setUniform(name, this.uniformOverrides.get(name) ?? value)
      }
    }

    this.maskShader = context.scene.add
      .shader(
        {
          name: `obscurdleFlashlight-${distribution.id}`,
          fragmentSource: buildFlashlightFragmentShader(distribution),
          setupUniforms: (
            setUniform: (name: string, value: unknown) => void,
          ) => {
            setMainLightUniforms(setUniform)
            setUniform("uKeyboardLightSource", [
              keyboardLight.sourceX,
              keyboardLightSourceY,
            ])
            setUniform("uKeyboardLightTarget", [
              keyboardLight.targetX,
              keyboardLightTargetY,
            ])
            setUniform(
              "uKeyboardLightSourceWidth",
              keyboardLight.sourceWidth,
            )
            setUniform(
              "uKeyboardLightTargetWidth",
              keyboardLight.targetWidth,
            )
            setUniform("uKeyboardLightPenumbra", keyboardLight.penumbra)
            setUniform("uKeyboardLightIntensity", keyboardLight.intensity)
          },
        },
        GAME_LAYOUT.width / 2,
        GAME_LAYOUT.height / 2,
        GAME_LAYOUT.width,
        GAME_LAYOUT.height,
      )
    this.maskShader
      .setRenderToTexture(maskTextureKey)
      .removeFromDisplayList()
    this.maskShader.renderImmediate()

    this.cameraFilter =
      context.scene.cameras.main.filters.internal.addParallelFilters()
    this.cameraFilter.top.addMask(maskTextureKey)
    this.cameraFilter.bottom.addBlur(
      FLASHLIGHT_CONFIG.darkBlurQuality,
      FLASHLIGHT_CONFIG.darkBlurPixels * RENDER_SCALE,
      FLASHLIGHT_CONFIG.darkBlurPixels * RENDER_SCALE,
      FLASHLIGHT_CONFIG.darkBlurStrength,
      0xffffff,
      FLASHLIGHT_CONFIG.darkBlurSteps,
    )
    const darkColor =
      this.cameraFilter.bottom.addColorMatrix().colorMatrix
    darkColor.saturate(-FLASHLIGHT_CONFIG.darkDesaturation)
    darkColor.brightness(1 - FLASHLIGHT_CONFIG.darkness, true)
    this.cameraFilter.blend.blendMode = Phaser.BlendModes.NORMAL
    this.cameraFilter.blend.amount = 1

    this.coneShader = context.scene.add.shader(
      {
        name: `obscurdleFlashlightVisualCone-${distribution.id}`,
        fragmentSource: buildFlashlightConeFragmentShader(distribution),
        setupUniforms: (
          setUniform: (name: string, value: unknown) => void,
        ) => {
          setMainLightUniforms(setUniform)
          setUniform(
            "uVisualConeColor",
            FLASHLIGHT_CONFIG.visualConeColor,
          )
        },
      },
      GAME_LAYOUT.width / 2,
      GAME_LAYOUT.height / 2,
      GAME_LAYOUT.width,
      GAME_LAYOUT.height,
    )
    this.coneShader.setBlendMode(Phaser.BlendModes.NORMAL)
    const mainCamera = context.scene.cameras.main
    mainCamera.ignore(this.coneShader)
    this.coneCamera = context.scene.cameras.add(
      mainCamera.x,
      mainCamera.y,
      mainCamera.width,
      mainCamera.height,
      false,
      "flashlight-visual-cone",
    )
    this.coneCamera
      .setZoom(mainCamera.zoom)
      .setScroll(mainCamera.scrollX, mainCamera.scrollY)
    this.refreshConeCameraExclusions(context.scene)

    const initialConeInformation =
      distribution.uniforms.uSpillStrength
    if (
      FLASHLIGHT_CONFIG.debugConeInformationControl.enabled &&
      typeof initialConeInformation === "number"
    ) {
      const debugConfig =
        FLASHLIGHT_CONFIG.debugConeInformationControl
      this.debugControls = new FlashlightDebugControls({
        initialValue: initialConeInformation,
        minimum: debugConfig.minimum,
        maximum: debugConfig.maximum,
        step: debugConfig.step,
        onChange: (value) => {
          this.uniformOverrides.set("uSpillStrength", value)
        },
      })
    }

    context.scene.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      this.handlePointerDown,
      this,
    )
    context.scene.input.on(
      Phaser.Input.Events.POINTER_MOVE,
      this.handlePointerMove,
      this,
    )
    context.scene.input.on(
      Phaser.Input.Events.POINTER_UP,
      this.handlePointerUp,
      this,
    )
  }

  onGuessSubmitted(): void {}

  update(context: ModeContext): void {
    if (!this.maskShader || !this.coneShader) return

    const now = context.scene.time.now
    const delta = Math.min(Math.max(now - this.lastUpdateAt, 0), 50)
    const blend = 1 - Math.exp(-delta / FLASHLIGHT_CONFIG.aimSmoothingMs)
    this.target.x = Phaser.Math.Linear(
      this.target.x,
      this.desiredTarget.x,
      blend,
    )
    this.target.y = Phaser.Math.Linear(
      this.target.y,
      this.desiredTarget.y,
      blend,
    )
    this.lastUpdateAt = now
    this.maskShader.renderImmediate()
    this.refreshConeCameraExclusions(context.scene)
  }

  stop(context: ModeContext): void {
    const scene = this.scene ?? context.scene
    scene.input.off(
      Phaser.Input.Events.POINTER_DOWN,
      this.handlePointerDown,
      this,
    )
    scene.input.off(
      Phaser.Input.Events.POINTER_MOVE,
      this.handlePointerMove,
      this,
    )
    scene.input.off(
      Phaser.Input.Events.POINTER_UP,
      this.handlePointerUp,
      this,
    )
    if (this.cameraFilter) {
      scene.cameras.main.filters.internal.remove(this.cameraFilter)
      this.cameraFilter = undefined
    }
    this.maskShader?.destroy()
    this.maskShader = undefined
    if (this.coneCamera) {
      const cameraId = this.coneCamera.id
      for (const gameObject of scene.children.list) {
        gameObject.cameraFilter &= ~cameraId
      }
      scene.cameras.remove(this.coneCamera)
      this.coneCamera = undefined
    }
    this.coneShader?.destroy()
    this.coneShader = undefined
    this.debugControls?.destroy()
    this.debugControls = undefined
    this.uniformOverrides.clear()
    this.scene = undefined
    this.draggingTouch = false
  }

  private refreshConeCameraExclusions(scene: Phaser.Scene): void {
    if (!this.coneCamera || !this.coneShader) return

    this.coneCamera.ignore(
      scene.children.list.filter(
        (gameObject) => gameObject !== this.coneShader,
      ),
    )
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch) {
      this.draggingTouch =
        pointer.worldY < GAME_LAYOUT.keyboard.top
      if (this.draggingTouch) this.aimAt(pointer, true)
      return
    }

    this.aimAt(pointer, false)
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch) {
      if (this.draggingTouch && pointer.isDown) this.aimAt(pointer, true)
      return
    }

    this.aimAt(pointer, false)
  }

  private handlePointerUp(): void {
    this.draggingTouch = false
  }

  private aimAt(pointer: Phaser.Input.Pointer, offsetForTouch: boolean): void {
    const touchOffset = offsetForTouch
      ? FLASHLIGHT_CONFIG.touchOffsetY
      : 0

    this.desiredTarget.x = Phaser.Math.Clamp(
      pointer.worldX / GAME_LAYOUT.width,
      0.02,
      0.98,
    )
    this.desiredTarget.y = Phaser.Math.Clamp(
      (pointer.worldY - touchOffset) / GAME_LAYOUT.height,
      0.04,
      0.96,
    )
  }
}
