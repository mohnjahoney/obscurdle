import Phaser from "phaser"
import { flashlightDistribution } from "../../modes/flashlight/distributions/registry"
import { FLASHLIGHT_CONFIG } from "../../modes/flashlight/flashlightConfig"
import { FlashlightDebugControls } from "../../modes/flashlight/FlashlightDebugControls"
import {
  buildFlashlightConeFragmentShader,
  buildFlashlightFragmentShader,
} from "../../modes/flashlight/flashlightShader"
import { GAME_LAYOUT } from "../../style/layout"
import { RENDER_SCALE } from "../../style/rendering"
import type { FlashlightEffectPresentationModel } from "../model/PresentationModel"

let nextFlashlightMaskId = 0

interface FlashlightEffectRendererHandlers {
  onControlChange?(name: string, value: number): void
}

export class FlashlightEffectRenderer {
  private maskShader?: Phaser.GameObjects.Shader
  private coneShader?: Phaser.GameObjects.Shader
  private coneCamera?: Phaser.Cameras.Scene2D.Camera
  private mainCamera?: Phaser.Cameras.Scene2D.Camera
  private cameraFilter?: Phaser.Filters.ParallelFilters
  private debugControls?: FlashlightDebugControls

  constructor(
    private readonly scene: Phaser.Scene,
    private presentation: FlashlightEffectPresentationModel,
    private readonly handlers: FlashlightEffectRendererHandlers = {},
  ) {
    this.create()
  }

  get distribution(): string {
    return this.presentation.distribution
  }

  apply(presentation: FlashlightEffectPresentationModel): void {
    this.presentation = presentation
    this.maskShader?.renderImmediate()
    this.refreshConeCameraExclusions()
  }

  destroy(): void {
    if (this.cameraFilter && this.mainCamera) {
      this.mainCamera.filters.internal.remove(this.cameraFilter)
      this.cameraFilter = undefined
    }
    this.maskShader?.destroy()
    this.maskShader = undefined

    if (this.coneCamera) {
      const cameraId = this.coneCamera.id
      for (const gameObject of this.scene.children.list) {
        gameObject.cameraFilter &= ~cameraId
      }
      this.scene.cameras.remove(this.coneCamera)
      this.coneCamera = undefined
    }
    this.coneShader?.destroy()
    this.coneShader = undefined
    this.debugControls?.destroy()
    this.debugControls = undefined
    this.mainCamera = undefined
  }

  private create(): void {
    if (this.scene.game.renderer.type !== Phaser.WEBGL) return

    const distribution = flashlightDistribution(this.presentation.distribution)
    const initialConeInformation =
      this.presentation.uniformOverrides.uSpillStrength ??
      distribution.uniforms.uSpillStrength
    if (
      FLASHLIGHT_CONFIG.debugConeInformationControl.enabled &&
      typeof initialConeInformation === "number"
    ) {
      const debugConfig = FLASHLIGHT_CONFIG.debugConeInformationControl
      this.debugControls = new FlashlightDebugControls({
        initialValue: initialConeInformation,
        minimum: debugConfig.minimum,
        maximum: debugConfig.maximum,
        step: debugConfig.step,
        onChange: (value) => {
          this.handlers.onControlChange?.("uSpillStrength", value)
        },
      })
    }
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
    const maskTextureKey =
      `obscurdle-flashlight-mask-${nextFlashlightMaskId++}`

    const setMainLightUniforms = (
      setUniform: (name: string, value: unknown) => void,
    ) => {
      const sourceX =
        FLASHLIGHT_CONFIG.sourceX +
        (this.presentation.target[0] - 0.5) *
          FLASHLIGHT_CONFIG.sourceHorizontalFollow

      setUniform("uSource", [sourceX, FLASHLIGHT_CONFIG.sourceY])
      setUniform("uTarget", this.presentation.target)
      setUniform("uTime", this.presentation.timeSeconds)
      setUniform("uViewportAspect", GAME_LAYOUT.width / GAME_LAYOUT.height)

      for (const [name, value] of Object.entries(distribution.uniforms)) {
        setUniform(
          name,
          this.presentation.uniformOverrides[name] ?? value,
        )
      }
    }

    this.maskShader = this.scene.add
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
            setUniform("uKeyboardLightSourceWidth", keyboardLight.sourceWidth)
            setUniform("uKeyboardLightTargetWidth", keyboardLight.targetWidth)
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

    this.mainCamera = this.scene.cameras.main
    this.cameraFilter =
      this.mainCamera.filters.internal.addParallelFilters()
    this.cameraFilter.top.addMask(maskTextureKey)
    this.cameraFilter.bottom.addBlur(
      FLASHLIGHT_CONFIG.darkBlurQuality,
      FLASHLIGHT_CONFIG.darkBlurPixels * RENDER_SCALE,
      FLASHLIGHT_CONFIG.darkBlurPixels * RENDER_SCALE,
      FLASHLIGHT_CONFIG.darkBlurStrength,
      0xffffff,
      FLASHLIGHT_CONFIG.darkBlurSteps,
    )
    const darkColor = this.cameraFilter.bottom.addColorMatrix().colorMatrix
    darkColor.saturate(-FLASHLIGHT_CONFIG.darkDesaturation)
    darkColor.brightness(1 - FLASHLIGHT_CONFIG.darkness, true)
    this.cameraFilter.blend.blendMode = Phaser.BlendModes.NORMAL
    this.cameraFilter.blend.amount = 1

    this.coneShader = this.scene.add.shader(
      {
        name: `obscurdleFlashlightVisualCone-${distribution.id}`,
        fragmentSource: buildFlashlightConeFragmentShader(distribution),
        setupUniforms: (
          setUniform: (name: string, value: unknown) => void,
        ) => {
          setMainLightUniforms(setUniform)
          setUniform("uVisualConeColor", FLASHLIGHT_CONFIG.visualConeColor)
        },
      },
      GAME_LAYOUT.width / 2,
      GAME_LAYOUT.height / 2,
      GAME_LAYOUT.width,
      GAME_LAYOUT.height,
    )
    this.coneShader.setBlendMode(Phaser.BlendModes.NORMAL)
    const mainCamera = this.mainCamera
    mainCamera.ignore(this.coneShader)
    this.coneCamera = this.scene.cameras.add(
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
    this.refreshConeCameraExclusions()
  }

  private refreshConeCameraExclusions(): void {
    if (!this.coneCamera || !this.coneShader) return
    this.coneCamera.ignore(
      this.scene.children.list.filter(
        (gameObject) => gameObject !== this.coneShader,
      ),
    )
  }
}
