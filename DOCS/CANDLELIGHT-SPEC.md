# Candlelight Illumination Specification

Status: draft for review and manual editing.

This document specifies the intended Candlelight mode behavior. It deliberately
describes the model independently of the current implementation so that the
implementation can be rebuilt from the approved specification.

## Core constraint

There is exactly one functional illumination shape at every instant: a
radially symmetric two-dimensional Gaussian.

There must not be a separate broad-pulse field, secondary light source,
spatially varying reveal term, or pixel-position noise in the illumination
function.

For a screen point `p = (x, y)` and time `t`:

```text
d(p, t) = aspect-corrected distance from p to center(t)

illumination(p, t) =
  clamp(
    brightness(t) × exp(-0.5 × (d(p, t) / sigma(t))²),
    0,
    1
  )
```

The aspect correction must make equal distances appear equal on screen despite
the tall viewport.

Consequences:

- Illumination is highest at `center(t)`.
- At any fixed instant it decreases monotonically with distance from that
center.
- `sigma(t)` controls the radial scale.
- At `distance = sigma`, the Gaussian has about 60.7% of its central intensity.
- The 50% intensity radius is `sigma × sqrt(2 ln 2)`, or approximately
`1.177 × sigma`.
- The Gaussian has no hard boundary. Very small values may be treated as zero
for rendering efficiency, but that must not introduce a visible edge or
another illumination shape.



## Primary time-varying parameters

The illumination model has only three spatial/intensity parameters:

```text
sourceCenter(t)     = (x, y)
sourceRadius(t)     = sigma
sourceBrightness(t) = scalar intensity
```

Each parameter consists of:

1. A slowly changing phase baseline.
2. A smooth stochastic-looking variation around that baseline.

No parameter may jump discontinuously.

### Center

```text
sourceCenter(t) =
  sourceCenterBaseline(t)
  + sourceCenterWiggleAmplitude(t)
    × centerNoise(t / sourceCenterWiggleTimeScale(t))
```

Configuration:

- `sourceCenterBaseline`
- `sourceCenterWiggleAmplitude`
- `sourceCenterWiggleTimeScale`

The x and y signals should be decorrelated. Center motion should remain a
smaller effect than brightness or radius variation, but it should remain
present throughout the burn.

### Radial scale

```text
sourceRadius(t) =
  sourceRadiusBaseline(t)
  × positiveRadiusVariation(t)
```

Conceptually:

```text
positiveRadiusVariation(t) =
  exp(
    sourceRadiusWiggleAmplitude(t)
    × radiusNoise(t / sourceRadiusWiggleTimeScale(t))
  )
```

Configuration:

- `sourceRadiusBaseline`
- `sourceRadiusWiggleAmplitude`
- `sourceRadiusWiggleTimeScale`

Using a multiplicative positive variation prevents a negative or zero radius.

`sigma` and the longest perceptible reach of the light are not independent
shapes. They are both consequences of this single Gaussian and therefore scale
together naturally.

For tuning and diagnostics, the UI may report both:

```text
sourceRadiusSigma = sigma
sourceRadiusAt50Percent = 1.177 × sigma
```



### Brightness

```text
sourceBrightness(t) =
  clamp(
    sourceBrightnessBaseline(t)
    × (
      1
      + sourceBrightnessWiggleAmplitude(t)
        × brightnessNoise(
            t / sourceBrightnessWiggleTimeScale(t)
          )
    ),
    0,
    1
  )
```

Configuration:

- `sourceBrightnessBaseline`
- `sourceBrightnessWiggleAmplitude`
- `sourceBrightnessWiggleTimeScale`

Brightness variation changes the height of the Gaussian but never its radial
ordering.

## Temporal signals

Randomness must be smooth, frame-rate independent, and reproducible within a
game. The illumination model must not depend directly on a particular noise
algorithm.

Requirements:

- Never call unfiltered random values once per frame.
- Give center x, center y, radius, brightness, fast brightness texture, color,
  and smoke independent channels unless an intentional correlation is
  configured.
- Signals may be seeded once per game so each game feels different.
- Value continuity is required.
- First-derivative continuity is strongly preferred.
- The result should contain partial predictability without becoming periodic.
- Sampling the same seed, channel, and time must always return the same value.
- The result must not depend on the number or timing of rendered frames.

`WiggleTimeScale` means the approximate time over which a signal changes
substantially. It is not a strict period.

### Replaceable noise provider

Noise generation is a separate module behind a small conceptual interface:

```text
SmoothNoiseProvider.sample(
  seed,
  channel,
  continuousTime
) -> value in [-1, 1]
```

The candle model owns the physical interpretation of the sample. The noise
provider knows nothing about candle phases, radius, brightness, color, or
screen position. Replacing the provider must not require changing the burn
model or Gaussian illumination function.

The renderer may implement the provider in GLSL rather than JavaScript, but it
must preserve the same separation: the shader builder receives a noise-provider
source module that defines the normalized sampling function.

Candidate providers include:

- smooth value noise from seeded random control points;
- gradient noise;
- a filtered stochastic process;
- a mixture of incommensurate oscillators.

The initial implementation should use smooth value noise because it is small,
deterministic, inexpensive in a fragment shader, and easy to replace.

### Initial smooth-value-noise construction

For a given channel and continuous noise time `q`:

1. Compute the neighboring integer control-point indices `floor(q)` and
   `floor(q) + 1`.
2. Hash `(gameSeed, channel, controlPointIndex)` to obtain two deterministic
   values in `[-1, 1]`.
3. Interpolate between them using `smootherstep`:

   ```text
   s(u) = 6u^5 - 15u^4 + 10u^3
   ```

   where `u = fract(q)`.
4. Return the interpolated normalized value.

This construction is continuous and has zero first derivative at every
control point. Changing `WiggleTimeScale` changes how quickly the model moves
through noise time:

```text
q = elapsedSeconds / WiggleTimeScale
```

The implementation should reserve stable, named numeric channels rather than
scattering unexplained offsets through rendering code.

### Changing noise character across phases

Changing a time scale abruptly would change the phase of the sampled signal
and could cause a visual jump. Phase transitions therefore use two continuous
samples and crossfade their results:

```text
variation(t) =
  mix(
    noise(channelA, t / previousTimeScale),
    noise(channelB, t / nextTimeScale),
    smoothPhaseTransition(t)
  )
```

The amplitude is interpolated independently. This makes the transition from
small, fast movement to large, slow movement continuous.

When both slow excursions and fast flicker are desired, as in Phase 4, the
parameter's variation may be a normalized blend of two noise bands:

```text
parameterNoise(t) =
  normalize(
    slowWeight(t) × slowNoise(t)
    + fastWeight(t) × fastNoise(t)
  )
```

These are temporal components of the same parameter model, not separate
illumination fields. The final `sourceRadius(t)` and
`sourceBrightness(t)` are each evaluated once and are then supplied to the one
Gaussian.

Radius and brightness normally use decorrelated channels. Near the end, they
may smoothly acquire a shared slow-noise component. Positive shared excursions
then make the existing Gaussian simultaneously brighter and broader, producing
brief readable moments without a pulse scheduler or secondary light.

## Color

Color is visual presentation, not an additional illumination source.

The source has a baseline color temperature that becomes warmer through the
phases, plus a small smooth temporal variation:

```text
sourceColor(t) =
  colorAlongBurnCurve(t)
  + sourceColorWiggleAmplitude(t)
    × colorNoise(t / sourceColorWiggleTimeScale(t))
```

Configuration:

- `sourceColorCool`
- `sourceColorWarm`
- `sourceColorWiggleAmplitude`
- `sourceColorWiggleTimeScale`

Color variation should be subtler than brightness variation. It should look
like flame-temperature movement, not hue cycling.

## Phase timing

With normalized burn progress from `0` to `1`:


| Phase   | Progress    | Share of total time |
| ------- | ----------- | ------------------- |
| Phase 1 | `0.00–0.25` | 25%                 |
| Phase 2 | `0.25–0.75` | 50%                 |
| Phase 3 | `0.75–0.95` | 20%                 |
| Phase 4 | `0.95–1.00` | 5%                  |


These boundaries describe centers of behavioral transitions, not hard mode
switches. Parameter curves must crossfade smoothly around them.

Recommended implementation:

- Store parameter targets at phase boundaries.
- Interpolate with `smootherstep`, cubic splines, or another curve with
continuous velocity.
- For parameters whose character changes, crossfade between independent
temporal signals instead of changing a signal's frequency abruptly.
- Avoid a visible pause or plateau exactly at a phase boundary.



## Phase 1: stable candle

Intent:

- Board is mostly illuminated.
- Fluctuations are relatively rapid but small.
- Light radius changes very little.
- Center wiggle is present but restrained.
- Color is yellow-neutral rather than strongly warm.
- Only the smallest suggestion of smoke is visible.

Parameter character:


| Parameter                         | Phase 1 behavior                 |
| --------------------------------- | -------------------------------- |
| `sourceCenterBaseline`            | Fixed off-screen candle position |
| `sourceCenterWiggleAmplitude`     | Small                            |
| `sourceCenterWiggleTimeScale`     | Short-to-medium                  |
| `sourceRadiusBaseline`            | Largest                          |
| `sourceRadiusWiggleAmplitude`     | Very small                       |
| `sourceRadiusWiggleTimeScale`     | Short                            |
| `sourceBrightnessBaseline`        | High                             |
| `sourceBrightnessWiggleAmplitude` | Small                            |
| `sourceBrightnessWiggleTimeScale` | Short                            |
| Color                             | Mildly warm                      |
| Smoke                             | Barely present                   |




## Phase 2: long decline

Intent:

- This is the longest phase.
- The illuminated area decreases gradually across the entire phase.
- Brightness declines gradually, without suddenly collapsing the visible
gradient.
- Flickers move toward larger and less frequent behavior.
- Color becomes warmer, but not extreme.
- Smoke appears occasionally rather than continuously.

Parameter character:


| Parameter                         | Phase 2 behavior           |
| --------------------------------- | -------------------------- |
| `sourceCenterWiggleAmplitude`     | Small, slowly increasing   |
| `sourceCenterWiggleTimeScale`     | Gradually lengthening      |
| `sourceRadiusBaseline`            | Gradual sustained decrease |
| `sourceRadiusWiggleAmplitude`     | Gradually increasing       |
| `sourceRadiusWiggleTimeScale`     | Gradually lengthening      |
| `sourceBrightnessBaseline`        | Gentle sustained decrease  |
| `sourceBrightnessWiggleAmplitude` | Gradually increasing       |
| `sourceBrightnessWiggleTimeScale` | Gradually lengthening      |
| Color                             | Moderately warmer          |
| Smoke                             | Occasional wisps           |


The outer gradient must remain broad. Dimming must not make the Gaussian appear
to collapse into a sharply bounded pool.

## Phase 3: unstable low candle

Intent:

- Radius continues decreasing toward its minimum.
- Baseline brightness continues decreasing.
- Color becomes distinctly warm.
- Flicker magnitude increases.
- Slow changes and sputters dominate over the early rapid wiggle.
- Smoke is persistent and noticeable.

Parameter character:


| Parameter                         | Phase 3 behavior     |
| --------------------------------- | -------------------- |
| `sourceCenterWiggleAmplitude`     | Moderate             |
| `sourceCenterWiggleTimeScale`     | Longer and irregular |
| `sourceRadiusBaseline`            | Approaches minimum   |
| `sourceRadiusWiggleAmplitude`     | Moderate-to-large    |
| `sourceRadiusWiggleTimeScale`     | Long                 |
| `sourceBrightnessBaseline`        | Low                  |
| `sourceBrightnessWiggleAmplitude` | Large                |
| `sourceBrightnessWiggleTimeScale` | Long                 |
| Color                             | Very warm trend      |
| Smoke                             | Persistent           |




## Phase 4: final sputtering

Intent:

- Baseline radius is at its minimum.
- Baseline brightness is low.
- Color is at its warmest.
- Strong fast flicker is present.
- Large, irregular positive excursions emerge on an approximately two-second
  time scale.
- During a large positive excursion, the same Gaussian becomes broad and
  bright enough that most letters are briefly readable.
- The candle extinguishes smoothly at the end.

There is still only one Gaussian illumination source and no separate pulse
concept. The behavior comes from Phase 4 values of the existing model:

```text
sourceRadiusWiggleAmplitude       = large
sourceRadiusWiggleTimeScale       ≈ 2 seconds
sourceBrightnessWiggleAmplitude   = large
sourceBrightnessWiggleTimeScale   ≈ 2 seconds
radiusBrightnessNoiseCorrelation  = high
sourceFastFlickerAmplitude        = large
sourceFastFlickerTimeScale        = short
```

The approximately two-second behavior is a noise time scale, not a period or
event interval. Its irregular crests should feel pulse-like, but there are no
scheduled pulses, pulse envelopes, pulse multipliers, or additional shader
fields. Fast flicker is a higher-frequency temporal component of brightness
and is applied before the one final brightness value enters the Gaussian.

Center wiggle continues throughout. The shared slow component used by radius
and brightness may be correlated strongly enough that its positive excursions
briefly reveal a sizeable portion of the board. Negative excursions make the
same source smaller and dimmer. All amplitudes, time scales, band weights, and
correlation values transition smoothly into Phase 4.



## Smoke

Smoke is not illumination and must never alter the reveal mask.

It is a separate material overlay with its own shape and motion:

- Faint in Phase 1.
- Intermittent in Phase 2.
- Persistent in Phase 3.
- Persistent, stronger, and sputtery in Phase 4.
- Spatially irregular behavior is allowed because smoke is not a light field.

Smoke should read as drifting particulate material rather than distant light.
It may darken illuminated paper, catch a small amount of candle color, or use
subtle opacity variation.

Temporary diagnostic requirement:

```text
smokeDebugColor: blue
```

The blue color is intentionally non-final and exists only to make the smoke
shape and motion easy to evaluate.

## Initial tuning table

These are starting points, not approved final values. Editing this table should
be sufficient to communicate the desired behavior before implementation.

All center amplitudes are normalized screen-space distances. Radius and
brightness wiggle amplitudes are fractional.


| Parameter                         | Phase 1  | Phase 2 end | Phase 3 end | Phase 4  |
| --------------------------------- | -------- | ----------- | ----------- | -------- |
| `sourceCenterWiggleAmplitude`     | `0.008`  | `0.014`     | `0.025`     | `0.030`  |
| `sourceCenterWiggleTimeScale`     | `0.30 s` | `0.65 s`    | `1.60 s`    | `0.22 s` |
| `sourceRadiusBaseline` (`sigma`)  | `0.61`   | `0.45`      | `0.38`      | `0.38`   |
| `sourceRadiusWiggleAmplitude`     | `0.015`  | `0.045`     | `0.10`      | `0.75`   |
| `sourceRadiusWiggleTimeScale`     | `0.25 s` | `0.80 s`    | `2.00 s`    | `2.00 s` |
| `sourceBrightnessBaseline`        | `1.00`   | `0.72`      | `0.42`      | `0.34`   |
| `sourceBrightnessWiggleAmplitude` | `0.04`   | `0.12`      | `0.32`      | `1.10`   |
| `sourceBrightnessWiggleTimeScale` | `0.18 s` | `0.85 s`    | `2.40 s`    | `2.00 s` |
| `sourceFastFlickerAmplitude`      | `0.015`  | `0.03`      | `0.06`      | `0.28`   |
| `sourceFastFlickerTimeScale`      | `0.10 s` | `0.14 s`    | `0.20 s`    | `0.11 s` |
| `radiusBrightnessNoiseCorrelation` | `0.00` | `0.10`      | `0.35`      | `0.90`   |
| `sourceColorWiggleAmplitude`      | `0.015`  | `0.025`     | `0.05`      | `0.08`   |
| `sourceColorWiggleTimeScale`      | `0.45 s` | `0.90 s`    | `1.80 s`    | `0.30 s` |




## Invariants for implementation and tests

The rebuilt model should have automated tests for these invariants:

1. For any fixed time, illumination never increases as distance from
  `sourceCenter(t)` increases.
2. There is exactly one spatial illumination function.
3. Phase 4 contains no pulse subsystem or secondary illumination field;
  pulse-like moments emerge only from the configured noise amplitudes, time
  scales, band weights, and radius/brightness correlation.
4. `sourceRadius(t)` is always positive.
5. `sourceBrightness(t)` always remains within `[0, 1]`.
6. Parameter values are continuous across all phase boundaries.
7. Center, radius, brightness, and color signals remain continuous from frame
  to frame.
8. Smoke never contributes to the reveal mask.
9. The final extinction reaches zero smoothly.



## Out of scope for this revision

- Angle-dependent edge irregularity.
- Multiple candles.
- Secondary reflected light sources.
- Shadows cast by page or board geometry.
- Final smoke color and compositing treatment.
