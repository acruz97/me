/**
 * Neural network background: a WebGL2 recreation of an MNIST forward-pass /
 * backprop visualisation that reads the sequence 1, ABC, 3, ABC, 5, ABC on repeat.
 *
 * One cycle (8 s) per character:
 *   0.0  a handwritten character dissolves into the input dot-matrix
 *   1.0  a scan line sweeps the image and sample points are marked
 *   1.3  signals shoot from the image to the input column, then each layer fires
 *        in turn (comets travel along edges, neurons ripple and stay lit)
 *   2.5  output bars grow and the prediction appears in the readout
 *   3.35 the loss marker flashes and turns red
 *   3.7  backprop: a red wave flows back layer by layer to the image, which fills
 *        with gradient noise
 *   5.4  weight update: random edges flash cyan and pink
 *   6.4  everything fades, the character dissolves out, and the input sits empty
 *
 * The network reads one character per cycle: 1, A, B, C, 3, A, B, C, 5, A, B, C,
 * then loops. The readout builds up "ABC" one letter at a time.
 *
 * Performance: zero dependencies and four instanced draw calls per frame. All
 * animation is evaluated on the GPU from a time uniform; the CPU rebuilds a few
 * small instance buffers once per cycle. DPR is capped, rendering pauses while the
 * tab is hidden, and prefers-reduced-motion gets a single static frame.
 */

export type NeuralBackgroundOptions = {
  /** Render one static frame at this cycle time (seconds) instead of animating. */
  frozenAt?: number;
  /** Start at this sequence item and character position (mainly for testing). */
  seq?: [itemIndex: number, charPos: number];
};

const CYCLE = 8.0;
const GRID = 28; // MNIST resolution
const L_SIZES = [16, 16, 16, 13];
const GAP = new Set([7, 8]); // input-column slots replaced by an ellipsis
const INPUT_EDGES = 20;
const FANOUT = 5;
const PARTICLES = 45;
const LABEL_PX = 11; // output label font size (CSS px)

// Timeline, mirrored in the GLSL below.
const F0 = 1.3, FS = 0.3, FD = 0.3;
const B0 = 3.7, BD = 0.3, BS = 0.35;
const fStart = (k: number) => F0 + k * FS;
const bStart = (k: number) => B0 + BD + (3 - k) * BS;

// What the network reads, one character per cycle, on repeat.
const SEQ: string[] = ['1', 'ABC', '3', 'ABC', '5', 'ABC'];
// Output classes: digits plus the letters the network is shown.
const CLASSES = '0123456789ABC';
const N_OUT = CLASSES.length;

const HAND_FONTS = ['"Ink Free"', '"Segoe Print"', '"Bradley Hand"', '"Comic Sans MS"', 'cursive', 'system-ui'];
const UI_FONT = '"Segoe UI Variable Display", "Segoe UI", Inter, "SF Pro Display", system-ui, sans-serif';

// ---------------------------------------------------------------------------
// GLSL (all coordinates in CSS pixels)
// ---------------------------------------------------------------------------

const HEADER = `#version 300 es
precision highp float;
`;

const COMMON = `
uniform vec2 uRes;
uniform float uDpr, uT, uClock, uIntensity, uColW, uOutFade, uNodeR;
uniform vec2 uMouse;
uniform vec3 cLine, cRing, cBlue, cCyan, cWhite, cRed, cPink, cInk;

const float F0 = 1.3, FS = 0.3, FD = 0.3;
const float T_PRED = 2.85, T_LOSS = 3.35, B0 = 3.7, BD = 0.3, BS = 0.35;
const float T_UPD0 = 5.4, T_UPD1 = 6.4, T_FADE0 = 6.4, T_FADE1 = 7.1, T_OUT = 6.9;

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float h2(float a, float b) { return hash(a * 12.9898 + b * 78.233); }
float fStart(float k) { return F0 + k * FS; }
float fireAt(float l) { return fStart(l) + FD; }
float bStart(float k) { return B0 + BD + (3.0 - k) * BS; }
float redAt(float l) { return l > 2.5 ? B0 + BD : bStart(l + 1.0) + BD; }
float fade() { return 1.0 - smoothstep(T_FADE0, T_FADE1, uT); }
vec4 toClip(vec2 p) { vec2 c = p / uRes * 2.0 - 1.0; return vec4(c.x, -c.y, 0.0, 1.0); }
`;

const FRAG_COMMON = `
float colAtten() {
  float dx = abs(gl_FragCoord.x / uDpr - uRes.x * 0.5);
  return 1.0 - 0.8 * (1.0 - smoothstep(uColW, uColW + 140.0, dx));
}
// anti-aliased coverage of a shape whose distance d is inside radius r
float cov(float d, float r) {
  float a = 0.5 / uDpr + 0.2;
  return 1.0 - smoothstep(r - a, r + a, d);
}
vec4 pm(vec3 c, float a) { return vec4(c * a, a); }
vec4 over(vec4 t, vec4 b) { return t + b * (1.0 - t.a); }
vec4 finish(vec4 c) {
  c = clamp(c, 0.0, 1.0);
  c.rgb = min(c.rgb, vec3(c.a));
  return c * uIntensity * colAtten();
}
`;

// ----- lines: edges, bars, borders, scan line -----
const LINE_VS = `
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aSeg;
layout(location = 2) in vec4 aMeta; // kind, seed, s, ex
out float vU;
out float vV;
out float vLen;
flat out vec4 vMeta;
const float HW = 5.0;
void main() {
  vec2 a = aSeg.xy, b = aSeg.zw;
  if (aMeta.x > 8.5) { // scan line sweeps down the image box
    float sw = clamp((uT - 0.95) / 0.4, 0.0, 1.0) * aMeta.w;
    a.y += sw; b.y += sw;
  }
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

const LINE_FS = `
in float vU;
in float vV;
in float vLen;
flat in vec4 vMeta;
out vec4 o;
void main() {
  float kind = vMeta.x, sd = vMeta.y, s = vMeta.z, ex = vMeta.w;
  float av = abs(vV);
  float px = vU * vLen;
  // soft end caps so segments don't overhang their endpoints
  float ends = cov(max(-px, px - vLen), 0.6);
  float thin = cov(av, 0.55) * ends;
  float thick = cov(av, 1.2) * ends;
  float glow = exp(-av * av * 0.3) * ends;
  float fo = fade();
  vec4 base = vec4(0.0), hi = vec4(0.0);

  if (kind < 3.5) {                      // k = 0 image->L0, 1..3 layer edges
    float k = kind;
    if (k > 0.5) base = pm(cLine, 0.5 * thin);
    float head = (uT - fStart(k)) / FD;
    float fOn = step(0.25, s) * step(0.0, head) * step(vU, head);
    float fA = fOn * (0.35 + 0.45 * s);
    if (k < 0.5) fA *= 1.0 - smoothstep(fireAt(0.0) + 0.3, fireAt(0.0) + 0.7, uT);
    float comet = fOn * step(head, 1.08) * exp(-(head - vU) * vLen / 14.0);
    float bh = 1.0 - (uT - bStart(k)) / BD;
    float bOn = step(0.15, ex) * step(bh, 1.0) * step(bh, vU);
    float bA = bOn * (0.3 + 0.45 * ex);
    if (k < 0.5) bA *= 1.0 - smoothstep(redAt(-1.0) + 0.2, redAt(-1.0) + 0.7, uT);
    float bComet = bOn * step(-0.08, bh) * exp(-(vU - bh) * vLen / 14.0);
    if (fOn > 0.0) hi = pm(mix(cBlue, cCyan, comet), max(fA * thin, comet * (thin + 0.8 * glow)));
    if (bOn > 0.0 && bA + bComet > 0.0) hi = pm(mix(cRed, cPink, bComet), max(bA * thin, bComet * (thin + 0.8 * glow)));
    float win = step(T_UPD0, uT) * step(uT, T_UPD1) * step(0.5, k);
    float flick = win * step(0.93, h2(sd, floor(uClock * 7.0)));
    if (flick > 0.5) hi = pm(h2(sd, 3.0) > 0.5 ? cCyan : cPink, thick + 0.6 * glow);
    hi *= fo;
  } else if (kind < 4.5) {               // probability bars
    float grow = smoothstep(fireAt(3.0), fireAt(3.0) + 0.35, uT);
    float L = max(2.0, grow * s * vLen);
    float on = step(0.001, grow) * cov(av, 1.5) * cov(max(-px, px - L), 0.8);
    float pred = step(0.5, ex);
    hi = pm(mix(cBlue, cCyan, pred), (on * (0.55 + 0.45 * pred) + pred * glow * 0.35 * step(px, L)) * step(0.001, grow)) * fo;
  } else if (kind < 5.5) {               // loss marker -> outputs
    float h = (uT - B0) / BD;
    float on = step(0.0, h) * step(vU, h);
    float comet = on * step(h, 1.08) * exp(-(h - vU) * vLen / 14.0);
    hi = pm(mix(cRed, cPink, comet), max(on * 0.45 * thin, comet * (thin + 0.8 * glow))) * fo;
  } else if (kind < 6.5) {               // dotted connectors
    float dd = length(vec2(mod(px, 6.0) - 3.0, av));
    base = pm(cLine, 0.55 * cov(dd, 0.8) * ends);
  } else if (kind < 8.5) {               // box borders
    base = pm(cRing, 0.55 * thin);
  } else {                               // scan line
    float on = smoothstep(0.93, 0.98, uT) * (1.0 - smoothstep(1.3, 1.36, uT));
    hi = pm(cCyan, (thin + 0.7 * glow) * on);
  }
  o = finish(over(hi, base));
}
`;

// ----- sprites: image dots, nodes, markers, loss marker -----
const SPRITE_VS = `
layout(location = 0) in vec3 aPos;  // x, y, size (CSS px)
layout(location = 1) in vec4 aMeta; // kind, a, b, seed
flat out vec4 vMeta;
flat out float vSize;
flat out vec2 vP;
void main() {
  gl_PointSize = aPos.z * uDpr;
  vSize = aPos.z;
  vMeta = aMeta;
  vP = aPos.xy;
  gl_Position = toClip(aPos.xy);
}
`;

const SPRITE_FS = `
flat in vec4 vMeta;
flat in float vSize;
flat in vec2 vP;
out vec4 o;
void main() {
  float kind = vMeta.x, a = vMeta.y, b = vMeta.z, sd = vMeta.w;
  vec2 p = (gl_PointCoord - 0.5) * vSize;
  float r = length(p);
  float fo = fade();
  vec4 base = vec4(0.0), hi = vec4(0.0);

  if (kind < 0.5) {                      // input image dot
    float c = vSize;
    float appear = smoothstep(0.0, 0.12, uT - h2(sd, 1.0) * 0.45);
    float vanish = 1.0 - smoothstep(0.0, 0.12, uT - (T_OUT + h2(sd, 2.0) * 0.5));
    base = pm(cLine, 0.45 * cov(r, c * 0.1));
    float ink = a * appear * vanish;
    base = over(pm(cInk, cov(r, c * (0.16 + 0.3 * a)) * step(0.04, ink) * min(1.0, 0.35 + ink)), base);
    float t0 = redAt(-1.0);
    float dens = smoothstep(t0, t0 + 0.15, uT) * (1.0 - smoothstep(t0 + 0.4, T_OUT + 0.4, uT));
    float fr = floor(uClock * 12.0);
    if (step(1.0 - 0.5 * dens, h2(sd + b * 0.37, fr)) > 0.5)
      hi = pm(h2(sd, fr + 3.0) > 0.3 ? mix(cRed, cPink, h2(sd, fr)) : cInk, 0.95 * cov(r, c * 0.36));
  } else if (kind < 1.5) {               // neuron
    float act = a, l = b, R = uNodeR;
    float m = 1.0 - smoothstep(20.0, 90.0, length(vP - uMouse));
    float ring = cov(abs(r - R), 0.7);
    float fillS = cov(r, R - 2.4);
    base = pm(mix(cRing, cBlue, m * 0.7), ring * (0.8 + 0.2 * m));
    float on = step(fireAt(l), uT) * step(0.3, act);
    float tf = uT - fireAt(l);
    float halo = exp(-r * r / (R * R * 1.6));
    float rip = on * step(tf, 0.5) * cov(abs(r - (R + tf * R * 4.0)), 0.8) * (1.0 - tf / 0.5);
    float g = h2(sd, 5.0);
    float rd = step(redAt(l), uT);
    float tr = uT - redAt(l);
    float rrip = rd * step(tr, 0.5) * step(0.5, g) * cov(abs(r - (R + tr * R * 4.0)), 0.8) * (1.0 - tr / 0.5);
    vec4 h = vec4(0.0);
    if (on > 0.5) {
      float flash = exp(-tf * 6.0);
      h = over(pm(mix(cBlue, cCyan, flash), max(ring, fillS * (0.5 + 0.5 * act))), pm(cBlue, halo * (0.25 + 0.5 * flash)));
      h = over(pm(cCyan, rip), h);
    }
    if (rd > 0.5) {
      float flash = exp(-tr * 6.0);
      h = over(pm(mix(cRed, cPink, flash), max(ring, fillS * step(0.35, g) * 0.9)), pm(cRed, halo * 0.35 * flash));
      h = over(pm(cPink, rrip), h);
    }
    hi = h * fo;
  } else if (kind < 2.5) {               // sample-point marker
    float d = max(abs(p.x), abs(p.y));
    float sq = cov(abs(d - 3.0), 0.6);
    float t0 = 0.95 + a * 0.018;
    float t1 = redAt(-1.0) - 0.15;
    if (step(t0, uT) * step(uT, fireAt(0.0) + 0.35) > 0.5) hi = pm(cCyan, sq);
    if (step(t1, uT) * step(uT, t1 + 0.6) > 0.5) hi = pm(cPink, sq);
  } else if (kind < 5.5) {               // loss marker
    float d = abs(p.x) + abs(p.y);
    float t = uT - T_LOSS;
    float outline = cov(abs(d - 6.5), 0.75);
    float ctr = cov(d, 2.6);
    float glow = exp(-d * 0.25);
    base = pm(cRing, 0.5 * outline);
    if (t >= 0.0) {
      float flash = exp(-t * 5.0);
      float ripple = step(t, 0.45) * cov(abs(d - (6.5 + t * 22.0)), 0.8) * (1.0 - t / 0.45);
      vec3 col = mix(cRed, cWhite, flash);
      hi = over(pm(cPink, ripple), pm(col, max(outline, ctr * 0.9) + glow * (0.2 + 0.5 * flash))) * fo;
    }
  } else {                               // ellipsis dots
    base = pm(cRing, 0.9 * cov(r, 1.1));
  }
  o = finish(over(hi, base));
}
`;

// ----- glyphs: output labels and the readout (anti-aliased text atlas) -----
const GLYPH_VS = `
layout(location = 0) in vec2 aCorner; // 0..1, y down
layout(location = 1) in vec3 aPos;    // centre x, y, cell size (CSS px)
layout(location = 2) in vec4 aMeta;   // class index, row (0 label / 1 readout), flag, seed
out vec2 vUV;
flat out vec4 vMeta;
void main() {
  vUV = aCorner;
  vMeta = aMeta;
  gl_Position = toClip(aPos.xy + (aCorner - 0.5) * aPos.z);
}
`;

const GLYPH_FS = `
uniform sampler2D uAtlas;
uniform vec4 uAtlasInfo; // atlas w, h, small cell, big cell (device px)
in vec2 vUV;
flat in vec4 vMeta;
out vec4 o;
void main() {
  float ch = vMeta.x, row = vMeta.y, flag = vMeta.z;
  float cell = row < 0.5 ? uAtlasInfo.z : uAtlasInfo.w;
  float y0 = row < 0.5 ? 0.0 : uAtlasInfo.z;
  vec2 uv = (vec2(ch * cell, y0) + vUV * cell) / uAtlasInfo.xy;
  float a = texture(uAtlas, uv).a;
  float fo = fade();
  vec4 c;
  if (row < 0.5) {                       // output label
    float lit = step(fireAt(3.0), uT) * flag * fo;
    c = over(pm(cWhite, a * lit), pm(cRing, a * 0.85));
  } else {                               // readout character (flag 1 = earlier, 2 = current)
    float keep = mix(1.0, fo, uOutFade);
    float vis = flag > 1.5 ? smoothstep(T_PRED, T_PRED + 0.25, uT) : 0.9;
    c = pm(flag > 1.5 ? cCyan : mix(cBlue, cCyan, 0.55), a * vis * keep);
  }
  o = finish(c);
}
`;

// ----- particles: soft sparks travelling along edges -----
const PART_VS = `
layout(location = 0) in vec4 aSeg;
layout(location = 1) in vec4 aMeta; // red, start, dur, seed
flat out vec4 vMeta;
flat out float vU;
void main() {
  float u = (uT - aMeta.y) / aMeta.z;
  vMeta = aMeta;
  vU = u;
  if (u < 0.0 || u > 1.0) { gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 0.0, 1.0); return; }
  vec2 a = aSeg.xy, b = aSeg.zw, d = b - a;
  vec2 n = normalize(vec2(-d.y, d.x) + 1e-5);
  float spread = (hash(aMeta.w * 3.1) - 0.5) * 16.0 * sin(u * 3.14159);
  gl_PointSize = (hash(aMeta.w * 7.3) > 0.75 ? 5.0 : 3.5) * uDpr;
  gl_Position = toClip(mix(a, b, u) + n * spread);
}
`;

const PART_FS = `
flat in vec4 vMeta;
flat in float vU;
out vec4 o;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float hh = hash(vMeta.w * 5.7);
  vec3 c = vMeta.x > 0.5 ? mix(cRed, cPink, hh) : mix(cBlue, cCyan, hh);
  o = finish(pm(c, (1.0 - smoothstep(0.2, 1.0, r)) * 0.9 * (1.0 - 0.5 * vU)));
}
`;

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

type Vec3 = [number, number, number];
const COLOR_KEYS = ['cLine', 'cRing', 'cBlue', 'cCyan', 'cWhite', 'cRed', 'cPink', 'cInk'] as const;
type Theme = Record<(typeof COLOR_KEYS)[number], Vec3> & { gain: number };

const DARK: Theme = {
  cLine: [0.16, 0.24, 0.48],
  cRing: [0.3, 0.42, 0.8],
  cBlue: [0.18, 0.45, 1.0],
  cCyan: [0.45, 0.88, 1.0],
  cWhite: [0.95, 0.97, 1.0],
  cRed: [0.95, 0.2, 0.36],
  cPink: [1.0, 0.5, 0.68],
  cInk: [0.95, 0.96, 1.0],
  gain: 1.0,
};

const LIGHT: Theme = {
  cLine: [0.6, 0.66, 0.82],
  cRing: [0.45, 0.52, 0.72],
  cBlue: [0.12, 0.32, 0.9],
  cCyan: [0.0, 0.55, 0.85],
  cWhite: [0.08, 0.1, 0.2],
  cRed: [0.85, 0.12, 0.32],
  cPink: [0.9, 0.25, 0.5],
  cInk: [0.1, 0.12, 0.2],
  gain: 0.7,
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

type Pt = [number, number];
type Edge = { k: number; s: number; d: number; seed: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function createNeuralBackground(
  canvas: HTMLCanvasElement,
  opts: NeuralBackgroundOptions = {},
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
  const frozenAt = opts.frozenAt ?? 2.95;

  // ----- topology (fixed for the session) -----
  const realCount = (l: number) => (l === 0 ? L_SIZES[0] - GAP.size : L_SIZES[l]);
  const edges: Edge[] = [];
  for (let k = 1; k <= 3; k++) {
    const srcN = realCount(k - 1);
    const dstN = realCount(k);
    const hit = new Set<number>();
    for (let s = 0; s < srcN; s++) {
      const picks = new Set<number>();
      while (picks.size < Math.min(FANOUT, dstN)) picks.add(Math.floor(Math.random() * dstN));
      picks.forEach((d) => {
        hit.add(d);
        edges.push({ k, s, d, seed: Math.random() * 97 });
      });
    }
    for (let d = 0; d < dstN; d++) {
      if (!hit.has(d)) edges.push({ k, s: Math.floor(Math.random() * srcN), d, seed: Math.random() * 97 });
    }
  }

  // ----- per-cycle state -----
  let seqIdx = opts.seq?.[0] ?? 0;
  let charPos = opts.seq?.[1] ?? 0;
  let cls = CLASSES.indexOf(SEQ[seqIdx][charPos]);
  let outFade = 1;
  let cycle = -1;
  let image: Float32Array = new Float32Array(GRID * GRID);
  let acts: number[][] = [];
  let probs: number[] = [];
  let grads: number[] = [];
  let samples: { px: number; node: number; seed: number }[] = [];
  let partSeeds: number[] = [];

  // ----- layout state (CSS pixels) -----
  let W = 1;
  let H = 1;
  let dpr = 1;
  let portrait = false;
  let nodePos: Pt[][] = [];
  let gapDots: Pt[] = [];
  let img = { x0: 0, y0: 0, c: 1 };
  let labelPos: Pt[] = [];
  let barStart: Pt[] = [];
  let barEnd: Pt[] = [];
  let predC: Pt = [0, 0];
  let diamond: Pt = [0, 0];
  let readoutPx = 28;
  let nodeR = 6;

  let mouse: Pt = [-1e5, -1e5];
  let raf = 0;
  let t0 = performance.now();
  let lost = false;
  let theme: Theme = darkMq.matches ? DARK : LIGHT;
  let layoutDirty = true;
  let buffersDirty = true;

  // ----- GL resources -----
  type ProgName = 'line' | 'sprite' | 'part' | 'glyph';
  type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
  let progs: Record<ProgName, Prog> | null = null;
  let vaos: Record<ProgName, WebGLVertexArrayObject> | null = null;
  let bufs: WebGLBuffer[] = [];
  let lineBuf: WebGLBuffer | null = null;
  let spriteBuf: WebGLBuffer | null = null;
  let partBuf: WebGLBuffer | null = null;
  let glyphBuf: WebGLBuffer | null = null;
  let atlasTex: WebGLTexture | null = null;
  let atlas = { w: 1, h: 1, small: 1, big: 1, adv: 16, key: '' };
  let counts = { line: 0, sprite: 0, part: 0, glyph: 0 };

  // ----- handwritten character rasteriser (MNIST-style 28x28) -----
  const big = document.createElement('canvas');
  big.width = big.height = 112;
  const bctx = big.getContext('2d')!;
  const small = document.createElement('canvas');
  small.width = small.height = GRID;
  const sctx = small.getContext('2d', { willReadFrequently: true })!;

  function rasterChar(ch: string): Float32Array {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, 112, 112);
    bctx.translate(56 + rand(-5, 5), 58 + rand(-4, 4));
    bctx.rotate(rand(-0.22, 0.22));
    bctx.transform(1, 0, rand(-0.3, 0.12), 1, 0, 0);
    const s = rand(0.85, 1.0);
    bctx.scale(s, s);
    bctx.font = `${pick(['600', '700', '800'])} 80px ${pick(HAND_FONTS)}, sans-serif`;
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillStyle = bctx.strokeStyle = '#fff';
    bctx.lineJoin = 'round';
    bctx.lineWidth = rand(5, 9);
    bctx.strokeText(ch, 0, 0);
    bctx.fillText(ch, 0, 0);
    sctx.clearRect(0, 0, GRID, GRID);
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(big, 0, 0, GRID, GRID);
    const data = sctx.getImageData(0, 0, GRID, GRID).data;
    const out = new Float32Array(GRID * GRID);
    let max = 1e-3;
    for (let i = 0; i < out.length; i++) max = Math.max(max, (out[i] = data[i * 4 + 3] / 255));
    for (let i = 0; i < out.length; i++) out[i] = Math.min(1, Math.pow(out[i] / max, 0.9) * 1.15);
    return out;
  }

  // ----- text atlas: crisp digits for labels (row 0) and the glowing readout (row 1) -----
  function buildAtlas() {
    const key = `${dpr}|${readoutPx}`;
    if (atlas.key === key && atlasTex) return;
    const smallCell = Math.ceil(LABEL_PX * 1.6 * dpr);
    const bigCell = Math.ceil(readoutPx * 1.7 * dpr);
    const c = document.createElement('canvas');
    c.width = bigCell * N_OUT;
    c.height = smallCell + bigCell;
    const ctx = c.getContext('2d')!;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = `500 ${LABEL_PX * dpr}px ${UI_FONT}`;
    for (let i = 0; i < N_OUT; i++) ctx.fillText(CLASSES[i], i * smallCell + smallCell / 2, smallCell / 2 + dpr * 0.5);
    ctx.font = `600 ${readoutPx * dpr}px ${UI_FONT}`;
    const adv = (Math.max(...[...CLASSES].map((ch) => ctx.measureText(ch).width)) / dpr) * 1.06;
    ctx.shadowColor = 'rgba(255,255,255,0.85)';
    ctx.shadowBlur = 10 * dpr;
    for (let i = 0; i < N_OUT; i++) ctx.fillText(CLASSES[i], i * bigCell + bigCell / 2, smallCell + bigCell / 2 + dpr);
    ctx.shadowBlur = 0;
    for (let i = 0; i < N_OUT; i++) ctx.fillText(CLASSES[i], i * bigCell + bigCell / 2, smallCell + bigCell / 2 + dpr);

    if (!atlasTex) atlasTex = gl!.createTexture();
    gl!.bindTexture(gl!.TEXTURE_2D, atlasTex);
    gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, c);
    gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    atlas = { w: c.width, h: c.height, small: smallCell, big: bigCell, adv, key };
  }

  // ----- cycle -----
  function newCycle(next: number) {
    if (next > 0 && cycle >= 0) {
      charPos++;
      if (charPos >= SEQ[seqIdx].length) {
        seqIdx = (seqIdx + 1) % SEQ.length;
        charPos = 0;
      }
    }
    cycle = next;
    const ch = SEQ[seqIdx][charPos];
    cls = CLASSES.indexOf(ch);
    outFade = charPos === SEQ[seqIdx].length - 1 ? 1 : 0;
    image = rasterChar(ch);

    acts = L_SIZES.map((_, l) =>
      Array.from({ length: realCount(l) }, (_, i) => {
        if (l === 3) return i === cls ? 1 : rand(0.05, 0.5);
        const on = Math.random() < (l === 0 ? 0.6 : 0.45);
        return on ? rand(0.5, 1) : rand(0, 0.2);
      }),
    );
    probs = Array.from({ length: N_OUT }, (_, i) => (i === cls ? rand(0.85, 1) : rand(0.02, 0.12)));
    grads = edges.map(() => (Math.random() < 0.75 ? rand(0.2, 1) : rand(0, 0.12)));

    const lit: number[] = [];
    image.forEach((v, i) => v > 0.6 && lit.push(i));
    if (!lit.length) lit.push((GRID * GRID) >> 1);
    samples = Array.from({ length: INPUT_EDGES }, () => ({
      px: pick(lit),
      node: Math.floor(Math.random() * realCount(0)),
      seed: Math.random() * 97,
    }));
    partSeeds = Array.from({ length: PARTICLES * 9 }, () => Math.random());
    buffersDirty = true;
  }

  // ----- layout -----
  function layout() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, W < 720 ? 1.5 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    portrait = H > W * 1.1;
    const alongLen = portrait ? H : W;
    const acrossLen = portrait ? W : H;
    const P = (a: number, c: number): Pt => (portrait ? [c, a] : [a, c]);
    const along = portrait ? [0.25, 0.38, 0.51, 0.64] : [0.26, 0.41, 0.56, 0.71];

    const sp = Math.max(12, (acrossLen * 0.72) / 15);
    nodeR = Math.max(3.5, Math.min(8, sp * 0.19));
    nodePos = [];
    gapDots = [];
    L_SIZES.forEach((n, l) => {
      const span = sp * (n - 1);
      const layer: Pt[] = [];
      for (let i = 0; i < n; i++) {
        const c = acrossLen / 2 - span / 2 + i * sp;
        const a = alongLen * along[l];
        if (l === 0 && GAP.has(i)) {
          if (i === 7) for (let j = 0; j < 3; j++) gapDots.push(P(a, c + sp * 0.5 + (j - 1) * 6));
          continue;
        }
        layer.push(P(a, c));
      }
      nodePos.push(layer);
    });

    // input image
    const c = Math.min(alongLen * 0.13, acrossLen * 0.32) / GRID;
    const box = c * GRID;
    const ic = P(alongLen * 0.1, acrossLen / 2);
    img = { x0: ic[0] - box / 2, y0: ic[1] - box / 2, c };

    // outputs: labels + bars
    const dir: Pt = portrait ? [0, 1] : [1, 0];
    const barLen = Math.max(20, alongLen * 0.035);
    labelPos = [];
    barStart = [];
    barEnd = [];
    nodePos[3].forEach(([x, y]) => {
      const off = nodeR + 11;
      labelPos.push([x + dir[0] * off, y + dir[1] * off]);
      const bx = x + dir[0] * (off + 10);
      const by = y + dir[1] * (off + 10);
      barStart.push([bx, by]);
      barEnd.push([bx + dir[0] * barLen, by + dir[1] * barLen]);
    });

    readoutPx = acrossLen >= 700 ? 30 : 22;
    predC = P(alongLen * 0.86, acrossLen / 2);
    const boxH = readoutPx * 1.25 + 20;
    diamond = portrait ? [predC[0] + acrossLen * 0.3, predC[1]] : [predC[0], predC[1] + boxH / 2 + 3 * sp];

    gl!.viewport(0, 0, canvas.width, canvas.height);
    buildAtlas();
    layoutDirty = false;
    buffersDirty = true;
  }

  // ----- instance buffers (rebuilt once per cycle / resize) -----
  function buildBuffers() {
    const L: number[] = [];
    const line = (a: Pt, b: Pt, kind: number, seed: number, s: number, ex: number) =>
      L.push(a[0], a[1], b[0], b[1], kind, seed, s, ex);
    const rect = (x0: number, y0: number, x1: number, y1: number, kind: number) => {
      line([x0, y0], [x1, y0], kind, 0, 0, 0);
      line([x1, y0], [x1, y1], kind, 0, 0, 0);
      line([x1, y1], [x0, y1], kind, 0, 0, 0);
      line([x0, y1], [x0, y0], kind, 0, 0, 0);
    };

    edges.forEach((e, i) => {
      line(nodePos[e.k - 1][e.s], nodePos[e.k][e.d], e.k, e.seed, acts[e.k - 1][e.s] * acts[e.k][e.d], grads[i]);
    });
    const pixPos = (idx: number): Pt => [
      img.x0 + ((idx % GRID) + 0.5) * img.c,
      img.y0 + (Math.floor(idx / GRID) + 0.5) * img.c,
    ];
    samples.forEach((sm) => line(pixPos(sm.px), nodePos[0][sm.node], 0, sm.seed, 1, 0.8));
    for (let i = 0; i < N_OUT; i++) {
      line(barStart[i], barEnd[i], 4, i, probs[i], i === cls ? 1 : 0);
      line(diamond, nodePos[3][i], 5, i, 1, 0);
      const e = barEnd[i];
      line(portrait ? [e[0], e[1] + 6] : [e[0] + 6, e[1]], diamond, 6, i, 0, 0);
    }
    const box = img.c * GRID;
    rect(img.x0 - 6, img.y0 - 6, img.x0 + box + 6, img.y0 + box + 6, 7);
    line([img.x0 - 2, img.y0], [img.x0 + box + 2, img.y0], 9, 0, 0, box);

    // readout sized to the current Fibonacci number
    const text = SEQ[seqIdx];
    const tw = text.length * atlas.adv;
    const rh = readoutPx * 1.25;
    rect(predC[0] - tw / 2 - 14, predC[1] - rh / 2 - 10, predC[0] + tw / 2 + 14, predC[1] + rh / 2 + 10, 8);

    // sprites
    const S: number[] = [];
    const sprite = (x: number, y: number, size: number, kind: number, a: number, b: number, seed: number) =>
      S.push(x, y, size, kind, a, b, seed);
    for (let i = 0; i < GRID * GRID; i++) {
      const p = pixPos(i);
      sprite(p[0], p[1], img.c, 0, image[i], i, Math.random() * 97);
    }
    nodePos.forEach((layer, l) =>
      layer.forEach(([x, y], i) => sprite(x, y, nodeR * 7, 1, acts[l][i], l, Math.random() * 97)),
    );
    samples.forEach((sm, i) => {
      const p = pixPos(sm.px);
      sprite(p[0], p[1], 10, 2, i, 0, sm.seed);
    });
    sprite(diamond[0], diamond[1], 64, 5, 0, 0, 0);
    gapDots.forEach(([x, y]) => sprite(x, y, 4, 6, 0, 0, 0));

    // glyphs
    const G: number[] = [];
    labelPos.forEach(([x, y], i) => G.push(x, y, atlas.small / dpr, i, 0, i === cls ? 1 : 0, 0));
    for (let ci = 0; ci <= charPos; ci++) {
      const x = predC[0] - tw / 2 + (ci + 0.5) * atlas.adv;
      G.push(x, predC[1], atlas.big / dpr, CLASSES.indexOf(text[ci]), 1, ci === charPos ? 2 : 1, 0);
    }

    // particles
    const Pp: number[] = [];
    let ps = 0;
    const nextSeed = () => partSeeds[ps++ % partSeeds.length];
    const emit = (pool: [Pt, Pt][], red: number, start: number, dur: number) => {
      if (!pool.length) return;
      for (let i = 0; i < PARTICLES; i++) {
        const [a, b] = pool[Math.floor(nextSeed() * pool.length)];
        Pp.push(a[0], a[1], b[0], b[1], red, start + nextSeed() * dur * 0.8, dur * (0.5 + nextSeed() * 0.6) + 0.1, nextSeed() * 97);
      }
    };
    emit(samples.map((sm) => [pixPos(sm.px), nodePos[0][sm.node]] as [Pt, Pt]), 0, fStart(0), FD);
    for (let k = 1; k <= 3; k++) {
      const fwd = edges.filter((e) => e.k === k && acts[k - 1][e.s] * acts[k][e.d] >= 0.25);
      emit(fwd.map((e) => [nodePos[k - 1][e.s], nodePos[k][e.d]] as [Pt, Pt]), 0, fStart(k), FD);
    }
    emit(nodePos[3].map((p) => [diamond, p] as [Pt, Pt]), 1, B0, BD);
    for (let k = 3; k >= 1; k--) {
      const bwd = edges.filter((e, i) => e.k === k && grads[i] >= 0.15);
      emit(bwd.map((e) => [nodePos[k][e.d], nodePos[k - 1][e.s]] as [Pt, Pt]), 1, bStart(k), BD);
    }
    emit(samples.map((sm) => [nodePos[0][sm.node], pixPos(sm.px)] as [Pt, Pt]), 1, bStart(0), BD);

    const upload = (b: WebGLBuffer | null, data: number[]) => {
      gl!.bindBuffer(gl!.ARRAY_BUFFER, b);
      gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(data), gl!.DYNAMIC_DRAW);
    };
    upload(lineBuf, L);
    upload(spriteBuf, S);
    upload(partBuf, Pp);
    upload(glyphBuf, G);
    counts = { line: L.length / 8, sprite: S.length / 7, part: Pp.length / 8, glyph: G.length / 7 };
    buffersDirty = false;
  }

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

  const UNIFORMS = ['uRes', 'uDpr', 'uT', 'uClock', 'uIntensity', 'uColW', 'uOutFade', 'uNodeR', 'uMouse', 'uAtlas', 'uAtlasInfo', ...COLOR_KEYS];

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

  function pointVao(buf: WebGLBuffer, sizeA: number, sizeB: number) {
    const vao = gl!.createVertexArray()!;
    gl!.bindVertexArray(vao);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buf);
    const stride = (sizeA + sizeB) * 4;
    attrib(0, sizeA, stride, 0, 0);
    attrib(1, sizeB, stride, sizeA * 4, 0);
    return vao;
  }

  function initGL() {
    progs = {
      line: program(LINE_VS, LINE_FS),
      sprite: program(SPRITE_VS, SPRITE_FS),
      part: program(PART_VS, PART_FS),
      glyph: program(GLYPH_VS, GLYPH_FS),
    };
    const corners = buffer(new Float32Array([0, -1, 1, -1, 0, 1, 0, 1, 1, -1, 1, 1]));
    const quad = buffer(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
    lineBuf = buffer(new Float32Array(8));
    spriteBuf = buffer(new Float32Array(7));
    partBuf = buffer(new Float32Array(8));
    glyphBuf = buffer(new Float32Array(7));

    const lineVao = gl!.createVertexArray()!;
    gl!.bindVertexArray(lineVao);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, corners);
    attrib(0, 2, 8, 0, 0);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, lineBuf);
    attrib(1, 4, 32, 0, 1);
    attrib(2, 4, 32, 16, 1);

    const glyphVao = gl!.createVertexArray()!;
    gl!.bindVertexArray(glyphVao);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, quad);
    attrib(0, 2, 8, 0, 0);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, glyphBuf);
    attrib(1, 3, 28, 0, 1);
    attrib(2, 4, 28, 12, 1);

    vaos = {
      line: lineVao,
      sprite: pointVao(spriteBuf, 3, 4),
      part: pointVao(partBuf, 4, 4),
      glyph: glyphVao,
    };
    gl!.bindVertexArray(null);

    gl!.disable(gl!.DEPTH_TEST);
    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
    atlasTex = null;
    atlas.key = '';
    layoutDirty = true;
    buffersDirty = true;
  }

  function destroyGL() {
    if (!progs || !vaos) return;
    for (const p of Object.values(progs)) gl!.deleteProgram(p.p);
    for (const v of Object.values(vaos)) gl!.deleteVertexArray(v);
    for (const b of bufs) gl!.deleteBuffer(b);
    if (atlasTex) gl!.deleteTexture(atlasTex);
    atlasTex = null;
    bufs = [];
    progs = null;
    vaos = null;
  }

  // ----- frame -----
  function setUniforms(prog: Prog, t: number, clock: number, intensity: number, colW: number) {
    const u = prog.u;
    gl!.useProgram(prog.p);
    gl!.uniform2f(u.uRes, W, H);
    gl!.uniform1f(u.uDpr, dpr);
    gl!.uniform1f(u.uT, t);
    gl!.uniform1f(u.uClock, clock);
    gl!.uniform1f(u.uIntensity, intensity);
    gl!.uniform1f(u.uColW, colW);
    gl!.uniform1f(u.uOutFade, outFade);
    gl!.uniform1f(u.uNodeR, nodeR);
    gl!.uniform2f(u.uMouse, mouse[0], mouse[1]);
    gl!.uniform1i(u.uAtlas, 0);
    gl!.uniform4f(u.uAtlasInfo, atlas.w, atlas.h, atlas.small, atlas.big);
    for (const key of COLOR_KEYS) gl!.uniform3fv(u[key], theme[key]);
  }

  function draw(name: ProgName, mode: number, count: number, t: number, clock: number, intensity: number, colW: number) {
    if (!count) return;
    setUniforms(progs![name], t, clock, intensity, colW);
    gl!.bindVertexArray(vaos![name]);
    if (name === 'line' || name === 'glyph') gl!.drawArraysInstanced(mode, 0, 6, count);
    else gl!.drawArrays(mode, 0, count);
  }

  function render(now: number) {
    if (lost || !progs || !vaos) return;
    if (cycle < 0) newCycle(0);
    if (layoutDirty) layout();

    const elapsed = (now - t0) / 1000;
    let t = frozenAt;
    if (!frozen) {
      const c = Math.floor(elapsed / CYCLE);
      if (c !== cycle) newCycle(c);
      t = elapsed - c * CYCLE;
    }
    if (buffersDirty) buildBuffers();

    const scrollFade = 1 - 0.5 * Math.min(1, window.scrollY / (window.innerHeight * 0.8));
    const intensity = theme.gain * scrollFade * (W < 720 ? 0.45 : 1);
    const colW = W > 900 ? 384 + 24 : -1e5;

    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, atlasTex);
    draw('line', gl!.TRIANGLES, counts.line, t, elapsed, intensity, colW);
    draw('part', gl!.POINTS, counts.part, t, elapsed, intensity, colW);
    draw('sprite', gl!.POINTS, counts.sprite, t, elapsed, intensity, colW);
    draw('glyph', gl!.TRIANGLES, counts.glyph, t, elapsed, intensity, colW);
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
  const onPointer = (e: PointerEvent) => {
    mouse = e.pointerType === 'mouse' ? [e.clientX, e.clientY] : [-1e5, -1e5];
  };
  const onPointerLeave = () => (mouse = [-1e5, -1e5]);
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
    initGL();
    start();
  };

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  darkMq.addEventListener('change', onTheme);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  try {
    initGL();
  } catch (err) {
    console.warn('[neural-bg] disabled:', err);
    return () => {};
  }
  t0 = performance.now();
  start();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointer);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    darkMq.removeEventListener('change', onTheme);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    if (!lost) destroyGL();
    delete canvas.dataset.ready;
  };
}
