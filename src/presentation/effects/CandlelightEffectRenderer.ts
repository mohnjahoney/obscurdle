import Phaser from "phaser"
import { CANDLELIGHT_CONFIG } from "../../modes/candlelight/candlelightConfig"
import {
  buildCandleGlowFragmentShader,
  buildCandleMaskFragmentShader,
  buildCandleSmokeFragmentShader,
} from "../../modes/candlelight/candlelightShader"
import { GAME_LAYOUT } from "../../style/layout"
import { RENDER_SCALE } from "../../style/rendering"
import type { CandlelightEffectPresentationModel } from "../model/PresentationModel"

let nextCandleMaskId = 0

export class CandlelightEffectRenderer {
  private maskShader?: Phaser.GameObjects.Shader
  private glowShader?: Phaser.GameObjects.Shader
  private smokeShader?: Phaser.GameObjects.Shader
  private glowCamera?: Phaser.Cameras.Scene2D.Camera
  private mainCamera?: Phaser.Cameras.Scene2D.Camera
  private cameraFilter?: Phaser.Filters.ParallelFilters
  private fallbackShade?: Phaser.GameObjects.Rectangle

  constructor(
    private readonly scene: Phaser.Scene,
    private presentation: CandlelightEffectPresentationModel,
  ) {
    this.create()
  }

  apply(presentation: CandlelightEffectPresentationModel): void {
    this.presentation = presentation

    if (this.fallbackShade) {
      this.fallbackShade.setAlpha(
        Phaser.Math.Linear(
          CANDLELIGHT_CONFIG.fallbackInitialShadeAlpha,
          1,
          1 - presentation.burn.sourceBrightnessBaseline,
        ),
      )
      return
    }

    this.maskShader?.renderImmediate()
    this.refreshGlowCameraExclusions()
  }

  destroy(): void {
    if (this.cameraFilter && this.mainCamera) {
      this.mainCamera.filters.internal.remove(this.cameraFilter)
      this.cameraFilter = undefined
    }
    this.maskShader?.destroy()
    this.maskShader = undefined

    if (this.glowCamera) {
      const cameraId = this.glowCamera.id
      for (const gameObject of this.scene.children.list) {
        gameObject.cameraFilter &= ~cameraId
      }
      this.scene.cameras.remove(this.glowCamera)
      this.glowCamera = undefined
    }
    this.glowShader?.destroy()
    this.glowShader = undefined
    this.smokeShader?.destroy()
    this.smokeShader = undefined
    this.fallbackShade?.destroy()
    this.fallbackShade = undefined
    this.mainCamera = undefined
  }

  private create(): void {
    if (this.scene.game.renderer.type !== Phaser.WEBGL) {
      this.fallbackShade = this.scene.add
        .rectangle(
          GAME_LAYOUT.width / 2,
          GAME_LAYOUT.height / 2,
          GAME_LAYOUT.width,
          GAME_LAYOUT.height,
          0x000000,
          CANDLELIGHT_CONFIG.fallbackInitialShadeAlpha,
        )
        .setDepth(1_000)
      return
    }

    const maskTextureKey = `obscurdle-candle-mask-${nextCandleMaskId++}`
    const setupFieldUniforms = (
      setUniform: (name: string, value: unknown) => void,
    ) => {
      setUniform("uSourceCenter", this.presentation.source.center)
      setUniform("uSourceRadius", this.presentation.source.sigma)
      setUniform("uSourceBrightness", this.presentation.source.brightness)
      setUniform("uViewportAspect", GAME_LAYOUT.width / GAME_LAYOUT.height)
    }

    this.maskShader = this.scene.add.shader(
      {
        name: "obscurdleCandleMask",
        fragmentSource: buildCandleMaskFragmentShader(),
        setupUniforms: setupFieldUniforms,
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
      CANDLELIGHT_CONFIG.darkBlurQuality,
      CANDLELIGHT_CONFIG.darkBlurPixels * RENDER_SCALE,
      CANDLELIGHT_CONFIG.darkBlurPixels * RENDER_SCALE,
      CANDLELIGHT_CONFIG.darkBlurStrength,
      0xffffff,
      CANDLELIGHT_CONFIG.darkBlurSteps,
    )
    const darkColor = this.cameraFilter.bottom.addColorMatrix().colorMatrix
    darkColor.saturate(-CANDLELIGHT_CONFIG.darkDesaturation)
    darkColor.brightness(1 - CANDLELIGHT_CONFIG.darkness, true)
    this.cameraFilter.blend.blendMode = Phaser.BlendModes.NORMAL
    this.cameraFilter.blend.amount = 1

    this.glowShader = this.scene.add.shader(
      {
        name: "obscurdleCandleGlow",
        fragmentSource: buildCandleGlowFragmentShader(),
        setupUniforms: (
          setUniform: (name: string, value: unknown) => void,
        ) => {
          setupFieldUniforms(setUniform)
          const color = CANDLELIGHT_CONFIG.color
          setUniform("uGlowCoolColor", color.glowCool)
          setUniform("uGlowWarmColor", color.glowWarm)
          setUniform("uResolvedWarmth", this.presentation.source.warmth)
          setUniform(
            "uGlowAlpha",
            Phaser.Math.Linear(
              color.initialOverlayAlpha,
              color.finalOverlayAlpha,
              this.presentation.burn.warmth,
            ),
          )
        },
      },
      GAME_LAYOUT.width / 2,
      GAME_LAYOUT.height / 2,
      GAME_LAYOUT.width,
      GAME_LAYOUT.height,
    )
    this.glowShader.setBlendMode(Phaser.BlendModes.NORMAL)

    this.smokeShader = this.scene.add.shader(
      {
        name: "obscurdleCandleSmoke",
        fragmentSource: buildCandleSmokeFragmentShader(),
        setupUniforms: (
          setUniform: (name: string, value: unknown) => void,
        ) => {
          setupFieldUniforms(setUniform)
          const smoke = CANDLELIGHT_CONFIG.smoke
          setUniform("uTime", this.presentation.timeSeconds)
          setUniform("uNoiseSeed", this.presentation.noiseSeed)
          setUniform("uSmokeAmount", this.presentation.burn.smokeAmount)
          setUniform("uSmokeSputter", this.presentation.burn.smokeSputter)
          setUniform(
            "uSmokeTemporalAmount",
            this.presentation.source.smokeTemporalAmount,
          )
          setUniform("uSmokeColor", smoke.color)
          setUniform("uSmokeMaximumAlpha", smoke.maximumOverlayAlpha)
          setUniform("uSmokePlumeHeight", smoke.plumeHeight)
          setUniform("uSmokeBaseWidth", smoke.baseWidth)
          setUniform("uSmokeTopWidth", smoke.topWidth)
          setUniform("uSmokeDrift", smoke.drift)
          setUniform("uSmokeTurbulence", smoke.turbulence)
          setUniform("uSmokeRiseSpeed", smoke.riseSpeed)
        },
      },
      GAME_LAYOUT.width / 2,
      GAME_LAYOUT.height / 2,
      GAME_LAYOUT.width,
      GAME_LAYOUT.height,
    )
    this.smokeShader.setBlendMode(Phaser.BlendModes.NORMAL)

    const mainCamera = this.mainCamera
    mainCamera.ignore([this.glowShader, this.smokeShader])
    this.glowCamera = this.scene.cameras.add(
      mainCamera.x,
      mainCamera.y,
      mainCamera.width,
      mainCamera.height,
      false,
      "candlelight-glow",
    )
    this.glowCamera
      .setZoom(mainCamera.zoom)
      .setScroll(mainCamera.scrollX, mainCamera.scrollY)
    this.refreshGlowCameraExclusions()
  }

  private refreshGlowCameraExclusions(): void {
    if (!this.glowCamera || !this.glowShader || !this.smokeShader) return

    this.glowCamera.ignore(
      this.scene.children.list.filter(
        (gameObject) =>
          gameObject !== this.glowShader && gameObject !== this.smokeShader,
      ),
    )
  }
}
