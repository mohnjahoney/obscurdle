import Phaser from "phaser"
import { GAME_LAYOUT } from "../../style/layout"
import { RENDER_SCALE } from "../../style/rendering"
import type { ModeContext, ObscuringMode } from "../ObscuringMode"
import { candleBurnStateAt, type CandleBurnState } from "./candleBurn"
import { CANDLELIGHT_CONFIG } from "./candlelightConfig"
import {
  sampleCandleSource,
  type CandleSourceSample,
} from "./candleSource"
import {
  buildCandleGlowFragmentShader,
  buildCandleMaskFragmentShader,
  buildCandleSmokeFragmentShader,
} from "./candlelightShader"

let nextCandleMaskId = 0

export class CandlelightMode implements ObscuringMode {
  private maskShader?: Phaser.GameObjects.Shader
  private glowShader?: Phaser.GameObjects.Shader
  private smokeShader?: Phaser.GameObjects.Shader
  private glowCamera?: Phaser.Cameras.Scene2D.Camera
  private cameraFilter?: Phaser.Filters.ParallelFilters
  private fallbackShade?: Phaser.GameObjects.Rectangle
  private scene?: Phaser.Scene
  private startedAt = 0
  private noiseSeed = 0
  private state: CandleBurnState = candleBurnStateAt(0)
  private source: CandleSourceSample = sampleCandleSource(
    0,
    this.state,
    0,
  )

  start(context: ModeContext): void {
    this.stop(context)
    this.scene = context.scene
    this.startedAt = context.scene.time.now
    this.noiseSeed = Math.random() * 10_000
    this.state = candleBurnStateAt(0)
    this.source = sampleCandleSource(0, this.state, this.noiseSeed)

    if (context.scene.game.renderer.type !== Phaser.WEBGL) {
      this.fallbackShade = context.scene.add
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

    const maskTextureKey =
      `obscurdle-candle-mask-${nextCandleMaskId++}`
    const setupFieldUniforms = (
      setUniform: (name: string, value: unknown) => void,
    ) => {
      setUniform("uSourceCenter", this.source.center)
      setUniform("uSourceRadius", this.source.sigma)
      setUniform("uSourceBrightness", this.source.brightness)
      setUniform(
        "uViewportAspect",
        GAME_LAYOUT.width / GAME_LAYOUT.height,
      )
    }

    this.maskShader = context.scene.add.shader(
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

    this.cameraFilter =
      context.scene.cameras.main.filters.internal.addParallelFilters()
    this.cameraFilter.top.addMask(maskTextureKey)
    this.cameraFilter.bottom.addBlur(
      CANDLELIGHT_CONFIG.darkBlurQuality,
      CANDLELIGHT_CONFIG.darkBlurPixels * RENDER_SCALE,
      CANDLELIGHT_CONFIG.darkBlurPixels * RENDER_SCALE,
      CANDLELIGHT_CONFIG.darkBlurStrength,
      0xffffff,
      CANDLELIGHT_CONFIG.darkBlurSteps,
    )
    const darkColor =
      this.cameraFilter.bottom.addColorMatrix().colorMatrix
    darkColor.saturate(-CANDLELIGHT_CONFIG.darkDesaturation)
    darkColor.brightness(1 - CANDLELIGHT_CONFIG.darkness, true)
    this.cameraFilter.blend.blendMode = Phaser.BlendModes.NORMAL
    this.cameraFilter.blend.amount = 1

    this.glowShader = context.scene.add.shader(
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
          setUniform("uResolvedWarmth", this.source.warmth)
          setUniform(
            "uGlowAlpha",
            Phaser.Math.Linear(
              color.initialOverlayAlpha,
              color.finalOverlayAlpha,
              this.state.warmth,
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

    this.smokeShader = context.scene.add.shader(
      {
        name: "obscurdleCandleSmoke",
        fragmentSource: buildCandleSmokeFragmentShader(),
        setupUniforms: (
          setUniform: (name: string, value: unknown) => void,
        ) => {
          setupFieldUniforms(setUniform)
          const smoke = CANDLELIGHT_CONFIG.smoke
          setUniform("uTime", context.scene.time.now / 1_000)
          setUniform("uNoiseSeed", this.noiseSeed)
          setUniform("uSmokeAmount", this.state.smokeAmount)
          setUniform("uSmokeSputter", this.state.smokeSputter)
          setUniform(
            "uSmokeTemporalAmount",
            this.source.smokeTemporalAmount,
          )
          setUniform("uSmokeColor", smoke.color)
          setUniform(
            "uSmokeMaximumAlpha",
            smoke.maximumOverlayAlpha,
          )
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

    const mainCamera = context.scene.cameras.main
    mainCamera.ignore([this.glowShader, this.smokeShader])
    this.glowCamera = context.scene.cameras.add(
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
    this.refreshGlowCameraExclusions(context.scene)
  }

  onGuessSubmitted(): void {}

  update(context: ModeContext): void {
    const elapsed = context.scene.time.now - this.startedAt
    this.state = candleBurnStateAt(elapsed)
    this.source = sampleCandleSource(
      elapsed / 1_000,
      this.state,
      this.noiseSeed,
    )

    if (this.fallbackShade) {
      this.fallbackShade.setAlpha(
        Phaser.Math.Linear(
          CANDLELIGHT_CONFIG.fallbackInitialShadeAlpha,
          1,
          1 - this.state.sourceBrightnessBaseline,
        ),
      )
      return
    }

    this.maskShader?.renderImmediate()
    this.refreshGlowCameraExclusions(context.scene)
  }

  stop(context: ModeContext): void {
    const scene = this.scene ?? context.scene

    if (this.cameraFilter) {
      scene.cameras.main.filters.internal.remove(this.cameraFilter)
      this.cameraFilter = undefined
    }
    this.maskShader?.destroy()
    this.maskShader = undefined

    if (this.glowCamera) {
      const cameraId = this.glowCamera.id
      for (const gameObject of scene.children.list) {
        gameObject.cameraFilter &= ~cameraId
      }
      scene.cameras.remove(this.glowCamera)
      this.glowCamera = undefined
    }
    this.glowShader?.destroy()
    this.glowShader = undefined
    this.smokeShader?.destroy()
    this.smokeShader = undefined
    this.fallbackShade?.destroy()
    this.fallbackShade = undefined
    this.scene = undefined
  }

  private refreshGlowCameraExclusions(scene: Phaser.Scene): void {
    if (!this.glowCamera || !this.glowShader || !this.smokeShader) {
      return
    }

    this.glowCamera.ignore(
      scene.children.list.filter(
        (gameObject) =>
          gameObject !== this.glowShader &&
          gameObject !== this.smokeShader,
      ),
    )
  }
}
