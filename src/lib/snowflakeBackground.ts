/**
 * Snowflake background: a six-fold crystal whose arms grow out to the edges of
 * the screen, then loop, plus gentle snowfall. Rendered with WebGL2. Two looks:
 * 'emblem' (default) is a bold, ornate, symmetrical original design shaped by a
 * five-wave rhythm with A-B-C subwaves; 'dendrite' is a natural branching crystal.
 *
 * Each 14 s cycle (the emblem grows in five Elliott waves and dissolves in an
 * A-B-C correction; see the Elliott wave timing notes in the shader):
 *   0.2  the crystal grows outward from a hexagonal core, with side branches and
 *        sub-branches sprouting as the growth front passes (like real dendrites)
 *   7.2  the growth front reaches the far edge of the screen
 *   7.4  fully formed, it slowly rotates while waves of light shimmer outward
 *   9.5  it dissolves from the tips inward into drifting ice particles
 *  11.0  a new, differently shaped crystal begins to grow
 *
 * The crystal fades with distance from its centre (never fully to zero, so you
 * can see it reach the edges) and is dimmed behind the content column, so page
 * text stays readable.
 *
 * Performance: zero dependencies and a handful of instanced draw calls per frame.
 * Crystal geometry is generated once per cycle on the CPU; all animation is
 * evaluated on the GPU from time uniforms. DPR is capped, rendering pauses while
 * the tab is hidden, and prefers-reduced-motion gets a single static frame.
 */

export type SnowflakeVariant = 'emblem' | 'dendrite';

export type SnowflakeBackgroundOptions = {
  /** Render one static frame at this cycle time (seconds) instead of animating. */
  frozenAt?: number;
  /**
   * 'emblem': bold, ornate, symmetrical crystal with glowing neon strokes, shaped
   * by a five-wave rhythm on the main arms and A-B-C on the minor arms.
   * 'dendrite': a natural, randomly branching ice crystal.
   */
  variant?: SnowflakeVariant;
};

const CYCLE = 14.0;
const GROW0 = 0.2; // growth start
const GROW_LEN = 7.8; // seconds for the five-wave growth to reach full size
const HOLD0 = 8.0;
const DIS0 = 10.2; // dissolve start (A-B-C correction)
const DIS_LEN = 2.0;
const PARTICLES = 320;

// ---------------------------------------------------------------------------
// GLSL (CSS-pixel coordinates)
// ---------------------------------------------------------------------------

const HEADER = `#version 300 es
precision highp float;
`;

const COMMON = `
uniform vec2 uRes;
uniform float uDpr, uT, uClock, uIntensity, uColW, uAtten;
uniform vec2 uCenter;
uniform float uFadeR; // radial fade radius in CSS px (0 = no radial fade)
uniform float uScale, uRot, uMaxD;
uniform float uSeasons; // 1 = tint the cycle through the four seasons
uniform float uElliott; // 1 = grow in five waves and dissolve in A-B-C (emblem)
uniform vec3 cIce, cGlow, cBright;

const float GROW0 = ${GROW0.toFixed(2)}, GROW_LEN = ${GROW_LEN.toFixed(2)}, HOLD0 = ${HOLD0.toFixed(2)};
const float DIS0 = ${DIS0.toFixed(2)}, DIS_LEN = ${DIS_LEN.toFixed(2)};

float hash(float n) { return fract(sin(n) * 43758.5453123); }
vec4 toClip(vec2 p) { vec2 c = p / uRes * 2.0 - 1.0; return vec4(c.x, -c.y, 0.0, 1.0); }
vec2 place(vec2 local) {
  float c = cos(uRot), s = sin(uRot);
  return uCenter + mat2(c, s, -s, c) * local * uScale;
}
// ---- Elliott wave timing ----
// Growth follows a five-wave impulse built on common Elliott wave guidelines:
//   wave 1 advances; wave 2 is a sharp, quick, deep pullback (61.8% of wave 1);
//   wave 3 is the longest and strongest (1.618 x wave 1, in both reach and time);
//   wave 4 is a slower, shallow sideways pullback (38.2% of wave 3), alternating
//   with wave 2; wave 5 equals wave 1 in reach but runs on fading momentum.
// Time units (Fibonacci): 1, 0.618, 1.618, 1, 0.618. Reach levels are normalised
// so wave 5 ends at full size.
const float EW_U = GROW_LEN / 4.854;
const float EW_L1 = 0.4198, EW_L2 = 0.1604, EW_L3 = 0.8396, EW_L4 = 0.5802;
const float EW_T1 = GROW0 + EW_U, EW_T2 = EW_T1 + 0.618 * EW_U, EW_T3 = EW_T2 + 1.618 * EW_U;
const float EW_T4 = EW_T3 + EW_U, EW_T5 = EW_T4 + 0.618 * EW_U;
// The dissolve is an A-B-C correction: A falls to half size, B rebounds 61.8% of
// A, and C (1.618 x A) takes it to nothing. Time units: 1, 0.618, 1.
const float ABC_U = DIS_LEN / 2.618;
const float ABC_A = 0.5, ABC_B = 0.809;
const float ABC_T1 = DIS0 + ABC_U, ABC_T2 = ABC_T1 + 0.618 * ABC_U, ABC_T3 = ABC_T2 + ABC_U;

float ease(float a, float b, float x) { return smoothstep(a, b, x); }
float invEase(float y) { y = clamp(y, 0.0, 1.0); return 0.5 - sin(asin(1.0 - 2.0 * y) / 3.0); }
// current reach of the growth front (0..1 of the crystal)
float ewReach(float t) {
  if (t < EW_T1) return EW_L1 * ease(GROW0, EW_T1, t);
  if (t < EW_T2) return mix(EW_L1, EW_L2, ease(EW_T1, EW_T2, t));
  if (t < EW_T3) return mix(EW_L2, EW_L3, ease(EW_T2, EW_T3, t));
  if (t < EW_T4) return mix(EW_L3, EW_L4, ease(EW_T3, EW_T4, t));
  return mix(EW_L4, 1.0, ease(EW_T4, EW_T5, t));
}
// furthest reach so far (pullbacks leave a ghost of what was reached)
float ewPeak(float t) {
  if (t >= EW_T1 && t < EW_T2) return EW_L1;
  if (t >= EW_T3 && t < EW_T4) return EW_L3;
  return max(ewReach(t), t >= EW_T4 ? EW_L3 : (t >= EW_T2 ? EW_L1 : 0.0));
}
// momentum of the advancing front: strongest in wave 3, fading in wave 5
float ewMomentum(float t) {
  if (t < EW_T1) return 0.8;
  if (t < EW_T2) return 0.0;
  if (t < EW_T3) return 1.0;
  if (t < EW_T4) return 0.0;
  return 0.5;
}
// first time the front reaches normalised distance n
float ewFirst(float n) {
  if (n <= EW_L1) return mix(GROW0, EW_T1, invEase(n / EW_L1));
  if (n <= EW_L3) return mix(EW_T2, EW_T3, invEase((n - EW_L2) / (EW_L3 - EW_L2)));
  return mix(EW_T4, EW_T5, invEase((n - EW_L4) / (1.0 - EW_L4)));
}
// remaining size during the A-B-C dissolve
float abcRemain(float t) {
  if (t < DIS0) return 1.0;
  if (t < ABC_T1) return mix(1.0, ABC_A, ease(DIS0, ABC_T1, t));
  if (t < ABC_T2) return mix(ABC_A, ABC_B, ease(ABC_T1, ABC_T2, t));
  return mix(ABC_B, 0.0, ease(ABC_T2, ABC_T3, t));
}
// first time the dissolve passes normalised distance n
float abcFirst(float n) {
  if (n > ABC_A) return mix(DIS0, ABC_T1, invEase((1.0 - n) / (1.0 - ABC_A)));
  return mix(ABC_T2, ABC_T3, invEase((ABC_B - n) / ABC_B));
}

float growTime(float d) {
  if (uElliott > 0.5) return ewFirst(clamp(d / uMaxD, 0.0, 1.0));
  return GROW0 + d / uMaxD * GROW_LEN;
}
// The central star's two triangles: the ascending one traces in while the crystal
// grows, the descending one while it reaches fullness; they complete each other at
// the peak, then unwind in reverse as it dissolves.
const float STAR_PEAK = HOLD0 + 0.9;
// tips dissolve first, the core last
float dissolveTime(float d) {
  if (uElliott > 0.5) return abcFirst(clamp(d / uMaxD, 0.0, 1.0));
  return DIS0 + (1.0 - d / uMaxD) * DIS_LEN;
}
`;

const FRAG_COMMON = `
float colAtten() {
  float dx = abs(gl_FragCoord.x / uDpr - uRes.x * 0.5);
  return 1.0 - uAtten * (1.0 - smoothstep(uColW, uColW + 140.0, dx));
}
// Fade with distance from the crystal's centre (to a faint floor, so the arms can
// still be seen reaching the edges) so the page text stays readable.
float radial() {
  if (uFadeR <= 0.0) return 1.0;
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  return 0.18 + 0.82 * exp(-pow(length(p - uCenter) / uFadeR, 1.6));
}
float cov(float d, float r) {
  float a = 0.5 / uDpr + 0.2;
  return 1.0 - smoothstep(r - a, r + a, d);
}
vec4 pm(vec3 c, float a) { return vec4(c * a, a); }
vec4 over(vec4 t, vec4 b) { return t + b * (1.0 - t.a); }
// A subtle tint that follows the cycle through the four seasons: spring while it
// grows, summer at fullness, autumn as it dissolves, winter at rest.
vec3 seasonal(vec3 col) {
  if (uSeasons < 0.5) return col;
  float gEnd = GROW0 + GROW_LEN, dEnd = DIS0 + DIS_LEN;
  float spring = smoothstep(0.0, 2.0, uT) * (1.0 - smoothstep(gEnd - 1.0, gEnd, uT));
  float summer = smoothstep(gEnd - 1.0, gEnd, uT) * (1.0 - smoothstep(DIS0 - 0.4, DIS0 + 0.2, uT));
  float autumn = smoothstep(DIS0 - 0.4, DIS0 + 0.2, uT) * (1.0 - smoothstep(dEnd - 0.3, dEnd + 0.4, uT));
  float winter = max(0.0, 1.0 - spring - summer - autumn);
  vec3 tint = spring * vec3(0.5, 1.0, 0.8) + summer * vec3(1.0, 0.86, 0.55)
            + autumn * vec3(1.0, 0.56, 0.3) + winter * vec3(0.62, 0.8, 1.0);
  float amount = spring * 0.45 + summer * 0.6 + autumn * 0.7 + winter * 0.35;
  float lum = dot(col, vec3(0.3, 0.5, 0.2));
  return mix(col, tint * lum * 1.4, amount);
}
vec4 finish(vec4 c) {
  c = clamp(c, 0.0, 1.0);
  c.rgb = min(c.rgb, vec3(c.a));
  return c * uIntensity * colAtten() * radial();
}
`;

// ----- crystal branches -----
const SEG_VS = `
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aSeg;   // local p0, p1 (crystal radius = 1)
layout(location = 2) in vec4 aMeta;  // d0, d1 (path distance from centre), width, seed
out float vU;
out float vV;
out float vLen;
flat out vec4 vMeta;
const float HW = 7.0; // room for the soft glow around each line
void main() {
  vec2 a = place(aSeg.xy), b = place(aSeg.zw);
  vec2 d = b - a;
  float len = max(length(d), 1e-3);
  vec2 dir = d / len;
  vec2 n = vec2(-dir.y, dir.x);
  vec2 p = a - dir * 2.0 + (d + dir * 4.0) * aCorner.x + n * aCorner.y * HW;
  vU = (aCorner.x * (len + 4.0) - 2.0) / len;
  vV = aCorner.y * HW;
  vLen = len;
  vMeta = aMeta;
  gl_Position = toClip(p);
}
`;

const SEG_FS = `
in float vU;
in float vV;
in float vLen;
flat in vec4 vMeta;
out vec4 o;
void main() {
  float d0 = vMeta.x, d1 = vMeta.y, w = vMeta.z, sd = vMeta.w;
  float px = vU * vLen;
  float av = abs(vV);
  float dAlong = mix(d0, d1, clamp(vU, 0.0, 1.0));

  float front, alive;
  if (d0 < -0.5) {
    // central star triangle: d0 = -1 ascending / -2 descending; d1..sd = fraction
    // of the triangle's perimeter this edge covers
    bool asc = d0 > -1.5;
    float f = mix(d1, sd, clamp(vU, 0.0, 1.0));
    float drawT0 = asc ? GROW0 : GROW0 + GROW_LEN;
    float drawT1 = asc ? GROW0 + GROW_LEN : STAR_PEAK;
    float p = clamp((uT - drawT0) / (drawT1 - drawT0), 0.0, 1.0);
    float e = clamp((uT - DIS0 - (asc ? 0.5 : 0.0)) / 1.0, 0.0, 1.0); // descending unwinds first
    alive = step(f, p) * step(0.0001, p) * step(e, f);
    front = step(f, p) * step(p, 0.999) * exp(-(p - f) * 3.0 * vLen / 14.0);
    front = max(front, step(STAR_PEAK, uT) * exp(-(uT - STAR_PEAK) * 2.5)); // completion flash
    dAlong = 0.0;
  } else if (uElliott > 0.5) {
    // five-wave growth: visible up to the current reach; ground given back in a
    // pullback stays as a faint ghost until the next impulse wave reclaims it
    float n = dAlong / uMaxD;
    float P = ewReach(uT), M = ewPeak(uT);
    float lit = smoothstep(-0.004, 0.004, P - n);
    float ghost = (1.0 - lit) * step(n, M) * 0.28;
    front = lit * exp(-max(P - n, 0.0) * 28.0) * ewMomentum(uT);
    // A-B-C dissolve: B's rebound comes back at reduced strength
    float Rm = abcRemain(uT);
    float keep = smoothstep(-0.004, 0.004, Rm - n);
    if (uT > ABC_T1 && n > ABC_A) keep *= 0.55;
    alive = (lit + ghost) * keep * step(GROW0, uT);
  } else {
    // growth: this fragment exists once the front has passed it
    float tb = growTime(dAlong);
    float grown = smoothstep(tb, tb + 0.08, uT);
    front = exp(-max(uT - tb, 0.0) * 5.0) * step(tb, uT);
    // dissolve
    float gone = smoothstep(dissolveTime(dAlong), dissolveTime(dAlong) + 0.35, uT);
    alive = grown * (1.0 - gone);
  }
  if (alive <= 0.0) discard;

  // end caps
  // hairline: never drawn thinner than 1px; sub-pixel widths fade instead
  float hw = max(w * 0.5, 0.5);
  float ends = cov(max(-px, px - vLen), hw);
  float core = cov(av, hw) * ends * min(w, 1.0);
  float glow = exp(-av * av / (0.8 + w * w * 1.6)) * ends;
  if (uElliott > 0.5) {
    // emblem: the thinnest line a screen can show, one device pixel wide, kept
    // bright enough to stay visible; finer details are slightly dimmer
    float dp = 0.5 / uDpr;
    ends = 1.0 - smoothstep(-dp, dp, max(-px, px - vLen));
    core = (1.0 - smoothstep(0.0, 2.0 * dp, av)) * ends * clamp(0.45 + w, 0.55, 1.0);
    glow = exp(-av * av / 0.5) * ends;
  }

  // shimmer: waves of light travel outward while the crystal is formed
  float hold = smoothstep(HOLD0 - 0.5, HOLD0 + 0.3, uT) * (1.0 - smoothstep(DIS0 - 0.4, DIS0, uT));
  float wave = fract((uT - HOLD0) / 2.2) * uMaxD * 1.25 - 0.1;
  float shimmer = hold * exp(-pow((dAlong - wave) / 0.05, 2.0));
  float twinkle = 0.85 + 0.15 * sin(uClock * 1.3 + sd * 6.283);

  vec3 col = mix(cIce, cBright, clamp(front * 0.9 + shimmer * 0.8, 0.0, 1.0));
  // neon: thick strokes get a bright inner line and a wider halo
  float thickness = smoothstep(1.0, 2.2, w);
  col = mix(col, cBright, thickness * 0.55 * cov(av, w * 0.2));
  float halo = exp(-av * av / (w * w * 2.2 + 2.0)) * ends * thickness;
  float glowBase = uElliott > 0.5 ? 0.06 : 0.18;
  float a = core * (0.55 + 0.35 * twinkle) + glow * (glowBase + 0.6 * front + 0.4 * shimmer);
  // tinted halo composited under the stroke (keeps the glow blue rather than grey)
  float ha = halo * (0.07 + 0.16 * shimmer) * (1.0 - core);
  col = (col * a + cGlow * ha) / max(a + ha, 1e-4);
  a += ha;
  o = finish(pm(seasonal(col), a * alive));
}
`;

// ----- sprites: branch tips, core gem, dissolve particles -----
const SPRITE_VS = `
layout(location = 0) in vec4 aData; // local x, y, kind, d (path distance)
layout(location = 1) in vec4 aVel;  // local velocity x, y, size, seed
flat out vec4 vData;
flat out vec4 vVel;
flat out float vAge;
void main() {
  vData = aData;
  vVel = aVel;
  float kind = aData.z, d = aData.w;
  vec2 local = aData.xy;
  float size = aVel.z;
  vAge = 0.0;
  if (kind > 1.5) {                    // dissolve particle
    float t0 = dissolveTime(d);
    float age = uT - t0;
    vAge = age;
    if (age < 0.0 || age > 2.2) { gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 0.0, 1.0); return; }
    vec2 p = place(local) + aVel.xy * age * 60.0;
    p.y += age * age * 14.0;           // settle downward
    p.x += sin(age * 3.0 + aVel.w * 6.283) * 6.0;
    gl_PointSize = size * uDpr;
    gl_Position = toClip(p);
    return;
  }
  gl_PointSize = size * uDpr;
  gl_Position = toClip(place(local));
}
`;

const SPRITE_FS = `
flat in vec4 vData;
flat in vec4 vVel;
flat in float vAge;
out vec4 o;
void main() {
  float kind = vData.z, d = vData.w;
  vec2 p = (gl_PointCoord - 0.5) * vVel.z;
  float r = length(p);
  vec4 c = vec4(0.0);
  if (kind < 0.5) {                    // branch tip: flashes as the growth front arrives
    float tb = growTime(d);
    float age = uT - tb;
    if (age < 0.0) discard;
    float gone = smoothstep(dissolveTime(d), dissolveTime(d) + 0.25, uT);
    if (uElliott > 0.5) {
      // tips follow the same five-wave reach and A-B-C dissolve as the lines:
      // pulled back in waves 2 and 4 (faint ghost), rebounding weakly in B
      float n = d / uMaxD;
      float lit = smoothstep(-0.008, -0.001, ewReach(uT) - n);
      float ghost = (1.0 - lit) * step(n, ewPeak(uT) + 0.001) * 0.28;
      float keep = smoothstep(-0.008, -0.001, abcRemain(uT) - n);
      if (uT > ABC_T1 && n > ABC_A) keep *= 0.55;
      gone = 1.0 - (lit + ghost) * keep;
    }
    float flash = exp(-age * 3.0);
    float star = max(cov(abs(p.x), 0.45) * cov(abs(p.y), vVel.z * 0.5 * flash), cov(abs(p.y), 0.45) * cov(abs(p.x), vVel.z * 0.5 * flash));
    float dot = uElliott > 0.5 ? cov(r, 0.55) * 0.75 : cov(r, 1.3);
    float halo = exp(-r * r / (uElliott > 0.5 ? 7.0 : 18.0)) * (uElliott > 0.5 ? 0.12 + 0.5 * flash : 0.25 + 0.75 * flash);
    c = pm(mix(cIce, cBright, 0.4 + 0.6 * flash), max(max(dot, star * flash), halo) * (1.0 - gone));
  } else if (kind < 1.5) {             // core gem
    float tb = GROW0;
    float on = smoothstep(tb, tb + 0.3, uT) * (1.0 - smoothstep(DIS0 + DIS_LEN, DIS0 + DIS_LEN + 0.4, uT));
    float pulse = 0.75 + 0.25 * sin(uClock * 2.0);
    float halo = exp(-r * r / (vVel.z * vVel.z * 0.05));
    c = pm(mix(cGlow, cBright, 0.5), (cov(r, 2.2) + halo * 0.6 * pulse) * on);
  } else {                             // dissolve particle
    float fadeA = 1.0 - smoothstep(0.8, 2.2, vAge);
    float soft = 1.0 - smoothstep(0.3, 1.0, r / (vVel.z * 0.5));
    c = pm(mix(cIce, cBright, hash(vVel.w * 3.3)), soft * fadeA * 0.9);
  }
  c.rgb = c.a > 0.0 ? seasonal(c.rgb / c.a) * c.a : c.rgb;
  o = finish(c);
}
`;

// ----- ambient snowfall -----
const SNOW_VS = `
layout(location = 0) in vec4 aSnow; // x0 (0..1), y0 (0..1), speed (px/s), size
layout(location = 1) in vec2 aSway; // phase, depth (0..1)
flat out float vSize;
flat out float vDepth;
void main() {
  float h = uRes.y + 40.0;
  float y = mod(aSnow.y * h + uClock * aSnow.z, h) - 20.0;
  float x = aSnow.x * uRes.x + sin(uClock * (0.3 + 0.5 * aSway.y) + aSway.x * 6.283) * (8.0 + 18.0 * aSway.y);
  vSize = aSnow.w;
  vDepth = aSway.y;
  gl_PointSize = aSnow.w * uDpr;
  gl_Position = toClip(vec2(x, y));
}
`;

const SNOW_FS = `
flat in float vSize;
flat in float vDepth;
out vec4 o;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.18 + 0.4 * vDepth);
  o = finish(pm(mix(cIce, cBright, vDepth), a));
}
`;

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

type Vec3 = [number, number, number];
type Theme = { cIce: Vec3; cGlow: Vec3; cBright: Vec3; gain: number };

const DARK: Theme = {
  cIce: [0.45, 0.66, 1.0],
  cGlow: [0.45, 0.88, 1.0],
  cBright: [0.92, 0.97, 1.0],
  gain: 1.0,
};

const LIGHT: Theme = {
  cIce: [0.16, 0.36, 0.86],
  cGlow: [0.0, 0.5, 0.82],
  cBright: [0.05, 0.18, 0.55],
  gain: 0.75,
};

// ---------------------------------------------------------------------------
// Crystal generation (one arm, replicated with 6-fold rotation + mirror)
// ---------------------------------------------------------------------------

type Pt = [number, number];
type Seg = { a: Pt; b: Pt; d0: number; d1: number; w: number; f1?: number };
type Tip = { p: Pt; d: number };

function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

const COS60 = 0.5;
const SIN60 = Math.sqrt(3) / 2;

/**
 * An original emblem-style crystal: bold, ornate and strictly six-fold symmetric.
 * Main arms carry five chevron pairs sized like a five-wave impulse (1, 3, 5 long,
 * with 3 the longest; 2 and 4 short pullbacks) and end in a spearhead with a fine
 * needle. Minor arms between them carry three chevrons (A, B, C) and end in an
 * arrowhead. A six-pointed star frames the core. `sizePx` is the main-arm length.
 */
function generateEmblem(seed: number, sizePx = 345) {
  const rnd = makeRng(seed);
  const r = (a: number, b: number) => a + rnd() * (b - a);
  const k = 1;
  const W = (px: number) => px * k;
  const dir = (deg: number): Pt => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];

  // small per-cycle variation keeps each emblem distinct but always balanced
  const chevAngle = r(52, 62);
  const waveLen = [0.15, 0.08, 0.22, 0.08, 0.13].map((v) => v * r(0.9, 1.1));
  const main: Seg[] = [];
  const mainTips: Tip[] = [];
  const core = 0.075;
  const add = (list: Seg[], a: Pt, b: Pt, d0: number, w: number) => {
    const d1 = d0 + Math.hypot(b[0] - a[0], b[1] - a[1]);
    list.push({ a, b, d0, d1, w });
    return d1;
  };

  // main arm: trunk with five chevrons, spearhead, needle
  const positions = [0.2, 0.33, 0.46, 0.59, 0.72].map((v) => v + r(-0.01, 0.01));
  let prev = core;
  for (let i = 0; i < 5; i++) {
    const t = positions[i];
    add(main, [prev, 0], [t, 0], prev, W(0.62));
    prev = t;
    const L = waveLen[i];
    const cd = dir(chevAngle);
    const e: Pt = [t + cd[0] * L, cd[1] * L];
    add(main, [t, 0], e, t, W(0.48));
    mainTips.push({ p: e, d: t + L });
    // impulse waves (1, 3, 5) get a feather barb running outward
    if (i % 2 === 0) {
      const m: Pt = [t + cd[0] * L * 0.5, cd[1] * L * 0.5];
      const fl = L * 0.38;
      const f: Pt = [m[0] + fl, m[1]];
      add(main, m, f, t + L * 0.5, W(0.36));
      mainTips.push({ p: f, d: t + L * 0.5 + fl });
    }
  }
  add(main, [prev, 0], [0.84, 0], prev, W(0.62));
  // spearhead (rhombus) with an inner spine, then a fine needle
  const sw = r(0.03, 0.042);
  add(main, [0.84, 0], [0.9, sw], 0.84, W(0.44));
  add(main, [0.9, sw], [0.975, 0], 0.9, W(0.44));
  add(main, [0.865, 0], [0.95, 0], 0.87, W(0.3));
  add(main, [0.975, 0], [1.0, 0], 0.975, W(0.3));
  mainTips.push({ p: [1.0, 0], d: 1.0 });

  // minor arm (between main arms): three chevrons A, B, C and an arrowhead cap
  const minor: Seg[] = [];
  const minorTips: Tip[] = [];
  const mLen = r(0.46, 0.52);
  const abc = [0.08, 0.05, 0.08].map((v) => v * r(0.9, 1.1));
  const mPos = [0.24, 0.32, 0.4].map((v) => v * (mLen / 0.5));
  prev = core * 1.4;
  for (let i = 0; i < 3; i++) {
    const t = mPos[i];
    add(minor, [prev, 0], [t, 0], prev, W(0.44));
    prev = t;
    const cd = dir(chevAngle);
    const e: Pt = [t + cd[0] * abc[i], cd[1] * abc[i]];
    add(minor, [t, 0], e, t, W(0.42));
    minorTips.push({ p: e, d: t + abc[i] });
  }
  add(minor, [prev, 0], [mLen, 0], prev, W(0.44));
  add(minor, [mLen, 0], [mLen - 0.035, 0.028], mLen, W(0.42));
  minorTips.push({ p: [mLen, 0], d: mLen });

  // six-pointed star around the core (half-edges, mirrored into a full star)
  // central six-pointed star, built as two separate triangles so each can trace
  // itself in on its own (see the star logic in the shader)
  const starSegs: Seg[] = [];
  const rc = core * 0.95;
  for (const [tri, offset] of [[1, 0], [2, 60]] as const) {
    for (let e = 0; e < 3; e++) {
      const a = dir(offset + e * 120);
      const b = dir(offset + (e + 1) * 120);
      // d0 = -tri marks a star edge; d1 / w-slot carry this edge's perimeter fraction
      starSegs.push({ a: [a[0] * rc, a[1] * rc], b: [b[0] * rc, b[1] * rc], d0: -tri, d1: e / 3, w: W(0.42), f1: (e + 1) / 3 });
    }
  }

  const out: Seg[] = [];
  const outTips: Tip[] = [];
  const rot = (p: Pt, ang: number, mirror: boolean): Pt => {
    const y = mirror ? -p[1] : p[1];
    const c = Math.cos(ang), sn = Math.sin(ang);
    return [p[0] * c - y * sn, p[0] * sn + y * c];
  };
  const replicate = (segs: Seg[], tips: Tip[], offset: number) => {
    for (let n = 0; n < 6; n++) {
      const ang = offset + (n * Math.PI) / 3;
      for (const mirror of [false, true]) {
        for (const g of segs) {
          if (mirror && g.a[1] === 0 && g.b[1] === 0) continue;
          out.push({ ...g, a: rot(g.a, ang, mirror), b: rot(g.b, ang, mirror) });
        }
        for (const tp of tips) {
          if (mirror && tp.p[1] === 0) continue;
          outTips.push({ p: rot(tp.p, ang, mirror), d: tp.d });
        }
      }
    }
  };
  replicate(main, mainTips, 0);
  replicate(minor, minorTips, Math.PI / 6);
  const maxD = Math.max(...out.map((g) => g.d1));
  out.push(...starSegs);
  return { segs: out, tips: outTips, maxD };
}

/**
 * Keeps the proportions of the original design (small hexagonal core, side
 * branches up to ~240 px) while the arms grow as long as the screen needs:
 * `sizePx` is the arm length in CSS px, and branches are spaced along the whole
 * arm so it reads as a longer version of the original feathered arm.
 */
function generateCrystal(seed: number, sizePx = 345) {
  const rnd = makeRng(seed);
  const r = (a: number, b: number) => a + rnd() * (b - a);
  const segs: Seg[] = [];
  const tips: Tip[] = [];
  const u = (v: number) => v / sizePx; // CSS px -> crystal units
  const core = u(r(34, 55));

  // hexagonal core plate: two concentric rings (half-edges, mirrored later)
  for (const k of [1, 0.55]) {
    const rr = core * k;
    segs.push({ a: [rr, 0], b: [rr * 0.75, rr * 0.433], d0: 0, d1: 0.02, w: 1.1 });
  }

  // trunk with evenly spread side branches (about one every 80-95 px)
  const nBranches = Math.max(4, Math.round((sizePx * (0.93 - core)) / r(80, 95)));
  let prev = 0;
  const addTrunk = (to: number) => {
    segs.push({ a: [prev, 0], b: [to, 0], d0: prev, d1: to, w: 1.7 });
    prev = to;
  };
  const style = rnd(); // < 0.35 feathery, otherwise fern-like
  const maxL = u(240) * (style < 0.35 ? 0.6 : 1);
  for (let i = 0; i < nBranches; i++) {
    const t = core + u(20) + (0.93 - core - u(20)) * ((i + r(0.2, 0.8)) / nBranches);
    if (t - prev < u(30)) continue;
    addTrunk(t);
    // full-length branches along the arm, tapering over the last stretch to the tip
    const taper = Math.min(1, (1 - t) / Math.max(0.12, u(300)));
    const L = maxL * r(0.5, 1) * taper + u(12);
    const b: Pt = [t + L * COS60, L * SIN60];
    segs.push({ a: [t, 0], b, d0: t, d1: t + L, w: 1.25 });
    tips.push({ p: b, d: t + L });
    // sub-branches run parallel to the trunk, pointing outward
    const nSub = Math.floor(r(0, 3.4));
    for (let j = 0; j < nSub; j++) {
      const s = r(0.25, 0.75);
      const sp: Pt = [t + L * s * COS60, L * s * SIN60];
      const l = L * (1 - s) * r(0.3, 0.6);
      const e: Pt = [sp[0] + l, sp[1]];
      const ds = t + L * s;
      segs.push({ a: sp, b: e, d0: ds, d1: ds + l, w: 0.95 });
      tips.push({ p: e, d: ds + l });
    }
  }
  addTrunk(1);
  tips.push({ p: [1, 0], d: 1 });
  // small spear at the tip
  const sp = u(r(14, 28));
  segs.push({ a: [1 - sp * 1.6, 0], b: [1 - sp * 1.6 + sp * COS60, sp * SIN60], d0: 1 - sp * 1.6, d1: 1 - sp * 0.8, w: 1.1 });

  // replicate: 6 rotations x mirror across the arm axis
  const out: Seg[] = [];
  const outTips: Tip[] = [];
  let maxD = 0;
  const rot = (p: Pt, ang: number, mirror: boolean): Pt => {
    const y = mirror ? -p[1] : p[1];
    const c = Math.cos(ang), s = Math.sin(ang);
    return [p[0] * c - y * s, p[0] * s + y * c];
  };
  for (let k = 0; k < 6; k++) {
    const ang = (k * Math.PI) / 3;
    for (const mirror of [false, true]) {
      for (const g of segs) {
        if (mirror && g.a[1] === 0 && g.b[1] === 0) continue; // on the axis already
        out.push({ ...g, a: rot(g.a, ang, mirror), b: rot(g.b, ang, mirror) });
        maxD = Math.max(maxD, g.d1);
      }
      for (const tp of tips) {
        if (mirror && tp.p[1] === 0) continue;
        outTips.push({ p: rot(tp.p, ang, mirror), d: tp.d });
      }
    }
  }
  return { segs: out, tips: outTips, maxD };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

type Crystal = {
  cycle: number;
  segBuf: WebGLBuffer | null;
  spriteBuf: WebGLBuffer | null;
  segVao: WebGLVertexArrayObject | null;
  spriteVao: WebGLVertexArrayObject | null;
  segCount: number;
  spriteCount: number;
  maxD: number;
  center: Pt;
  scale: number;
  genScale: number;
  rot0: number;
  spin: number;
};

export function createSnowflakeBackground(
  canvas: HTMLCanvasElement,
  opts: SnowflakeBackgroundOptions = {},
): () => void {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  });
  if (!gl) return () => {};

  const reduceMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  const frozen = opts.frozenAt !== undefined || reduceMotionMq.matches;
  const frozenAt = opts.frozenAt ?? 8.0;
  const variant: SnowflakeVariant = opts.variant ?? 'emblem';

  let W = 1;
  let H = 1;
  let dpr = 1;
  let raf = 0;
  let t0 = performance.now();
  let lost = false;
  let theme: Theme = darkMq.matches ? DARK : LIGHT;
  let layoutDirty = true;
  let fadeR = 400;

  type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
  let progs: { seg: Prog; sprite: Prog; snow: Prog } | null = null;
  let bufs: WebGLBuffer[] = [];
  let vaos: WebGLVertexArrayObject[] = [];
  let snowVao: WebGLVertexArrayObject | null = null;
  let snowBuf: WebGLBuffer | null = null;
  let snowCount = 0;
  let corners: WebGLBuffer | null = null;

  const crystal: Crystal = {
    cycle: -1,
    segBuf: null,
    spriteBuf: null,
    segVao: null,
    spriteVao: null,
    segCount: 0,
    spriteCount: 0,
    maxD: 1,
    center: [0, 0],
    scale: 100,
    genScale: 0,
    rot0: 0,
    spin: 0,
  };

  // ----- GL helpers -----
  function compile(type: number, src: string) {
    const sh = gl!.createShader(type)!;
    gl!.shaderSource(sh, src);
    gl!.compileShader(sh);
    if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
      const log = gl!.getShaderInfoLog(sh);
      gl!.deleteShader(sh);
      throw new Error(`Shader compile failed: ${log}`);
    }
    return sh;
  }

  const UNIFORMS = ['uRes', 'uDpr', 'uT', 'uClock', 'uIntensity', 'uColW', 'uAtten', 'uCenter', 'uFadeR', 'uScale', 'uRot', 'uMaxD', 'uSeasons', 'uElliott', 'cIce', 'cGlow', 'cBright'];

  function program(vs: string, fs: string): Prog {
    const p = gl!.createProgram()!;
    const v = compile(gl!.VERTEX_SHADER, HEADER + COMMON + vs);
    const f = compile(gl!.FRAGMENT_SHADER, HEADER + COMMON + FRAG_COMMON + fs);
    gl!.attachShader(p, v);
    gl!.attachShader(p, f);
    gl!.linkProgram(p);
    gl!.deleteShader(v);
    gl!.deleteShader(f);
    if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) throw new Error(`Link failed: ${gl!.getProgramInfoLog(p)}`);
    const u: Prog['u'] = {};
    for (const name of UNIFORMS) u[name] = gl!.getUniformLocation(p, name);
    return { p, u };
  }

  function buffer(data: BufferSource) {
    const b = gl!.createBuffer()!;
    gl!.bindBuffer(gl!.ARRAY_BUFFER, b);
    gl!.bufferData(gl!.ARRAY_BUFFER, data, gl!.DYNAMIC_DRAW);
    bufs.push(b);
    return b;
  }

  function attrib(loc: number, size: number, stride: number, offset: number, divisor: number) {
    gl!.enableVertexAttribArray(loc);
    gl!.vertexAttribPointer(loc, size, gl!.FLOAT, false, stride, offset);
    gl!.vertexAttribDivisor(loc, divisor);
  }

  function initGL() {
    progs = {
      seg: program(SEG_VS, SEG_FS),
      sprite: program(SPRITE_VS, SPRITE_FS),
      snow: program(SNOW_VS, SNOW_FS),
    };
    corners = buffer(new Float32Array([0, -1, 1, -1, 0, 1, 0, 1, 1, -1, 1, 1]));
    const c = crystal;
    c.segBuf = buffer(new Float32Array(8));
    c.spriteBuf = buffer(new Float32Array(8));
    c.segVao = gl!.createVertexArray()!;
    gl!.bindVertexArray(c.segVao);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, corners);
    attrib(0, 2, 8, 0, 0);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, c.segBuf);
    attrib(1, 4, 32, 0, 1);
    attrib(2, 4, 32, 16, 1);
    c.spriteVao = gl!.createVertexArray()!;
    gl!.bindVertexArray(c.spriteVao);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, c.spriteBuf);
    attrib(0, 4, 32, 0, 0);
    attrib(1, 4, 32, 16, 0);
    vaos.push(c.segVao, c.spriteVao);
    c.cycle = -1;

    snowBuf = buffer(new Float32Array(6));
    snowVao = gl!.createVertexArray()!;
    gl!.bindVertexArray(snowVao);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, snowBuf);
    attrib(0, 4, 24, 0, 0);
    attrib(1, 2, 24, 16, 0);
    vaos.push(snowVao);
    gl!.bindVertexArray(null);

    gl!.disable(gl!.DEPTH_TEST);
    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
    layoutDirty = true;
  }

  function destroyGL() {
    if (!progs) return;
    for (const p of Object.values(progs)) gl!.deleteProgram(p.p);
    for (const v of vaos) gl!.deleteVertexArray(v);
    for (const b of bufs) gl!.deleteBuffer(b);
    bufs = [];
    vaos = [];
    progs = null;
  }

  // ----- geometry -----
  function buildCrystal(c: Crystal, cycle: number) {
    c.cycle = cycle;
    c.genScale = c.scale;
    const seed = Math.floor(Math.random() * 1e9) + cycle * 7919;
    const { segs, tips, maxD } =
      variant === 'emblem' ? generateEmblem(seed, c.scale) : generateCrystal(seed, c.scale);
    c.maxD = maxD;
    c.rot0 = Math.random() * Math.PI;
    c.spin = (Math.random() < 0.5 ? -1 : 1) * 0.02;

    const S: number[] = [];
    segs.forEach((g, i) => S.push(g.a[0], g.a[1], g.b[0], g.b[1], g.d0, g.d1, g.w, g.f1 ?? i * 0.618));
    const growing = segs.filter((g) => g.d0 >= 0); // dissolve dust comes from the arms, not the star
    const P: number[] = [];
    tips.forEach((tp) => P.push(tp.p[0], tp.p[1], 0, tp.d, 0, 0, 12, Math.random()));
    P.push(0, 0, 1, 0, 0, 0, 40, 0); // core gem
    for (let i = 0; i < PARTICLES; i++) {
      const g = growing[Math.floor(Math.random() * growing.length)];
      const u = Math.random();
      const x = g.a[0] + (g.b[0] - g.a[0]) * u;
      const y = g.a[1] + (g.b[1] - g.a[1]) * u;
      const len = Math.hypot(x, y) || 1;
      const sp = 0.4 + Math.random() * 0.9;
      P.push(x, y, 2, g.d0 + (g.d1 - g.d0) * u, (x / len) * sp, (y / len) * sp, 2 + Math.random() * 2.5, Math.random());
    }

    gl!.bindBuffer(gl!.ARRAY_BUFFER, c.segBuf);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(S), gl!.DYNAMIC_DRAW);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, c.spriteBuf);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(P), gl!.DYNAMIC_DRAW);
    c.segCount = S.length / 8;
    c.spriteCount = P.length / 8;
  }

  function layout() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, W < 720 ? 1.5 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);

    // The centre sits beside the content, and the arms grow out to the far corner
    // of the screen before the cycle loops.
    const portrait = H > W * 1.1;
    const c = crystal;
    if (variant === 'emblem') {
      // The emblem is seen whole: it grows until its spear tips reach the top and
      // bottom of the screen (the sides on phones), to the right of the content.
      if (portrait) {
        // Phones: like desktop, the emblem sits at the right edge with part of it
        // off-screen, fading out well before the left side where text starts.
        c.scale = Math.min(H * 0.3, W * 0.78);
        c.center = [W * 1.02, H * 0.16];
        fadeR = c.scale * 0.6;
      } else {
        c.scale = H * 0.5;
        c.center = [Math.max(W * 0.8, W - c.scale * 0.6), H * 0.5];
        fadeR = c.scale * 0.95;
      }
    } else {
      c.center = portrait ? [W * 0.82, H * 0.1] : [W * 0.84, H * 0.3];
      c.scale = Math.hypot(Math.max(c.center[0], W - c.center[0]), Math.max(c.center[1], H - c.center[1]));
      fadeR = portrait ? W * 0.6 : Math.min(W, H) * 0.55;
    }
    // regenerate early only for big size changes (not the mobile address bar)
    if (c.genScale && Math.abs(c.scale / c.genScale - 1) > 0.25) c.cycle = -1;

    // ambient snowfall
    const n = Math.round(Math.min(160, (W * H) / 9000));
    const D: number[] = [];
    for (let i = 0; i < n; i++) {
      const depth = Math.random();
      D.push(Math.random(), Math.random(), 10 + depth * 28, 1.5 + depth * 2.5, Math.random(), depth);
    }
    gl!.bindBuffer(gl!.ARRAY_BUFFER, snowBuf);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(D), gl!.DYNAMIC_DRAW);
    snowCount = n;
    layoutDirty = false;
  }

  // ----- frame -----
  function setUniforms(prog: Prog, t: number, clock: number, intensity: number, colW: number, atten: number, c?: Crystal) {
    const u = prog.u;
    gl!.useProgram(prog.p);
    gl!.uniform2f(u.uRes, W, H);
    gl!.uniform1f(u.uDpr, dpr);
    gl!.uniform1f(u.uT, t);
    gl!.uniform1f(u.uClock, clock);
    gl!.uniform1f(u.uIntensity, intensity);
    gl!.uniform1f(u.uColW, colW);
    gl!.uniform1f(u.uAtten, atten);
    gl!.uniform1f(u.uFadeR, c ? fadeR : 0);
    if (c) {
      gl!.uniform2f(u.uCenter, c.center[0], c.center[1]);
      gl!.uniform1f(u.uScale, c.scale);
      gl!.uniform1f(u.uRot, c.rot0 + clock * c.spin);
      gl!.uniform1f(u.uMaxD, c.maxD);
      gl!.uniform1f(u.uSeasons, variant === 'emblem' ? 1 : 0);
      gl!.uniform1f(u.uElliott, variant === 'emblem' ? 1 : 0);
    }
    gl!.uniform3fv(u.cIce, theme.cIce);
    gl!.uniform3fv(u.cGlow, theme.cGlow);
    gl!.uniform3fv(u.cBright, theme.cBright);
  }

  function render(now: number) {
    if (lost || !progs) return;
    if (layoutDirty) layout();
    const elapsed = (now - t0) / 1000;
    // phones: quieter overall, and nearly gone once you scroll into the content
    const phone = W < 720;
    const scrolled = Math.min(1, window.scrollY / (window.innerHeight * (phone ? 0.5 : 0.8)));
    const scrollFade = 1 - (phone ? 0.8 : 0.5) * scrolled;
    const intensity = theme.gain * scrollFade * (phone ? (variant === 'emblem' ? 0.26 : 0.5) : 1);
    const colW = W > 900 ? 384 + 24 : -1e5;

    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);

    setUniforms(progs.snow, 0, elapsed, intensity, colW, 0.5);
    gl!.bindVertexArray(snowVao);
    gl!.drawArrays(gl!.POINTS, 0, snowCount);

    const c = crystal;
    const cyc = frozen ? 0 : Math.floor(elapsed / CYCLE);
    if (cyc !== c.cycle) buildCrystal(c, cyc);
    const t = frozen ? frozenAt : elapsed - cyc * CYCLE;
    const clock = frozen ? 0 : elapsed;

    setUniforms(progs.seg, t, clock, intensity, colW, 0.8, c);
    gl!.bindVertexArray(c.segVao);
    gl!.drawArraysInstanced(gl!.TRIANGLES, 0, 6, c.segCount);

    setUniforms(progs.sprite, t, clock, intensity, colW, 0.8, c);
    gl!.bindVertexArray(c.spriteVao);
    gl!.drawArrays(gl!.POINTS, 0, c.spriteCount);

    gl!.bindVertexArray(null);
    canvas.dataset.ready = 'true';
  }

  function loop(now: number) {
    render(now);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frozen ? render : loop);
  }

  // ----- events -----
  const onResize = () => {
    layoutDirty = true;
    if (frozen) start();
  };
  const onTheme = () => {
    theme = darkMq.matches ? DARK : LIGHT;
    if (frozen) start();
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
  };
  const onRestored = () => {
    lost = false;
    bufs = [];
    vaos = [];
    initGL();
    start();
  };

  window.addEventListener('resize', onResize, { passive: true });
  darkMq.addEventListener('change', onTheme);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  try {
    initGL();
  } catch (err) {
    console.warn('[snowflake-bg] disabled:', err);
    return () => {};
  }
  t0 = performance.now();
  start();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    darkMq.removeEventListener('change', onTheme);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    if (!lost) destroyGL();
    delete canvas.dataset.ready;
  };
}
