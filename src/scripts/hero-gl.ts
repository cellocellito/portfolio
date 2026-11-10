// WebGL mark: the record's mark
// as liquid chrome. It reads the mark's own SVG path data, so the shape is the one the page carries. The
// metal pours in from the top, reflects a slowly drifting studio, and answers the pointer with light only (the shape never moves):
// the reflections slide as the pointer moves (a tilt), and the
// pointer carries a vermilion lamp that lights the flanks facing it. A track's rays turn to red metal when
// they are pointed at, or when the page is that track's case (the 'mark:lit' event, src/scripts/mark.ts).
// Pauses offscreen and in hidden tabs. If WebGL cannot start or is lost, the SVG drawing is shown instead
// (it stays hidden while the metal is pending: html.gl-pending, public/head.js).
const VS = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

// One-time field build on the GPU (a canvas blur filter is missing in older Safari): a separable
// Gaussian. R, the strokes thickened, gets a narrow blur (the tube); G, the strokes, a wide one (the
// pooling where strokes meet); B, the sharp mask, passes through (the finest tips).
const BLUR = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uDir;
uniform float uSr;
uniform float uSg;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / vec2(textureSize(uSrc, 0));
  float r = 0.0, wr = 0.0;
  for (int i = -12; i <= 12; i++) {
    float f = float(i);
    float w = exp(-f * f / (2.0 * uSr * uSr));
    r += w * texture(uSrc, uv + uDir * f).r;
    wr += w;
  }
  float g = 0.0, wg = 0.0;
  for (int i = -28; i < 28; i++) {
    float f = float(i) * 2.0 + 0.5;
    float w = exp(-f * f / (2.0 * uSg * uSg));
    g += w * texture(uSrc, uv + uDir * f).g;
    wg += w;
  }
  o = vec4(r / wr, g / wg, texture(uSrc, uv).b, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uLit; // R this page's own rays, G the rays being pointed at
uniform vec4 uBox;      // the drawing's box in canvas pixels: x, y (bottom-left), w, h
uniform vec2 uRes;
uniform vec2 uTexel;
uniform float uTime;
uniform float uReveal;
uniform vec2 uMouse;
uniform vec2 uTilt;     // -1..1, where the pointer is relative to the mark
uniform float uGlint;   // 0..1, pointer presence near the mark
uniform float uHov;     // 0..1, the pointed rays fading in and out
out vec4 outColor;
const vec3 ACCENT = vec3(1.0, 0.231, 0.129); // #FF3B21

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
vec2 toTex(vec2 p) { return vec2((p.x - uBox.x) / uBox.z, 1.0 - (p.y - uBox.y) / uBox.w); }
vec4 tap(vec2 tc) { return texture(uTex, tc) * step(0.0, tc.x) * step(tc.x, 1.0) * step(0.0, tc.y) * step(tc.y, 1.0); }
float field(vec4 s) { return s.r + 0.4 * s.g; }

// The studio the chrome reflects: a key light, a softbox, strip lights, a horizon, a dark floor and one
// narrow vermilion strip that swings across, shown only inside a band that travels down the form.
vec3 studio(vec3 r, float red) {
  float t = uTime * 0.05;
  float cs = cos(t), sn = sin(t);
  r.xz = vec2(cs * r.x - sn * r.z, sn * r.x + cs * r.z);
  float x = r.x, y = r.y;
  float front = smoothstep(0.55, 0.9, r.z);
  float kd = dot(r, normalize(vec3(-0.18, 0.22, 1.0)));
  float c = 0.03 + 1.15 * (0.25 * smoothstep(0.6, 0.9, kd) + smoothstep(0.93, 0.985, kd));
  c += 1.5 * smoothstep(0.12, 0.42, y) * (1.0 - 0.7 * exp(-pow((x - 0.06) / 0.05, 2.0))) * (1.0 - front);
  c += 0.9 * exp(-pow((y + 0.06) / 0.035, 2.0)) * (1.0 - front);
  c += 1.4 * exp(-pow((x + 0.66) / 0.07, 2.0)) * smoothstep(-0.5, 0.35, y) * (1.0 - front);
  c += 0.07 * smoothstep(-0.2, -0.9, y);
  vec3 col = vec3(c) * vec3(0.94, 0.96, 1.0);
  float sx = 0.62 + 0.5 * sin(uTime * 0.19);
  return col + ACCENT * 1.7 * red * exp(-pow((x - sx) / 0.05, 2.0)) * smoothstep(0.25, -0.45, y) * (1.0 - front);
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 tc0 = toTex(fc);
  float t = uTime;
  // the liquid moves: a slow warp of the whole shape, and edges that swell and thin as a ripple passes
  vec2 w = vec2(fbm(tc0 * vec2(4.0, 6.0) + vec2(0.0, t * 0.16)), fbm(tc0 * vec2(4.0, 6.0) + vec2(7.3, t * 0.16 + 3.1))) - 0.5;
  vec2 tc = tc0 + w * 0.009;
  vec2 dm = uMouse - fc;
  // the pour: top to bottom, with a ragged front
  float front = uReveal * 1.35 - 0.2;
  float nz = 0.06 * (vn(vec2(tc0.x * 16.0, t * 0.5)) - 0.5);
  float poured = smoothstep(front + 0.03, front - 0.09, tc0.y + nz);
  float th = 0.34 + 0.04 * (fbm(tc0 * 9.0 - vec2(0.0, t * 0.32)) - 0.5) + 0.012 * sin(t * 0.7);
  th = mix(1.4, th, poured);

  vec2 e = uTexel * 1.5;
  float f0 = field(tap(tc));
  float fx1 = field(tap(tc + vec2(e.x, 0.0))), fx0 = field(tap(tc - vec2(e.x, 0.0)));
  float fy1 = field(tap(tc + vec2(0.0, e.y))), fy0 = field(tap(tc - vec2(0.0, e.y)));
  float aa = fwidth(f0) * 0.8 + 1e-4;
  float inside = max(smoothstep(th - aa, th + aa, f0), tap(tc).b * poured * 0.9);
  // a round tube profile: each stroke's middle faces the visitor and its edges turn away
  float h0 = sqrt(max(f0 - th, 0.0));
  vec2 grad = vec2(sqrt(max(fx1 - th, 0.0)) - sqrt(max(fx0 - th, 0.0)), sqrt(max(fy0 - th, 0.0)) - sqrt(max(fy1 - th, 0.0)));
  grad /= 3.0 * uBox.z * uTexel.x;
  vec3 n = normalize(vec3(-grad * 2.6 * uBox.w / 300.0, 1.0));
  vec2 ctr = uBox.xy + 0.5 * uBox.zw;
  vec3 r = reflect(normalize(vec3((fc - ctr) / uRes.y * 0.45, -1.0)), n);
  // the tilt: the piece turns toward the pointer, so the studio slides across every stroke
  r.xy += uTilt * vec2(0.5, 0.36);
  r = normalize(r);
  float sweep = fract(t / 11.0) * 1.6 - 0.3; // one pass down the mark every 11 s
  vec3 col = studio(r, exp(-pow((tc0.y - sweep) / 0.16, 2.0)));
  col += vec3(2.4) * pow(max(dot(r, normalize(vec3(-0.45, 0.65, 0.6))), 0.0), 160.0);
  // the pointer's vermilion lamp: the flanks facing it light up red, a little white on the crests under it
  float near = exp(-dot(dm, dm) / pow(0.34 * uBox.w, 2.0));
  vec2 toM = dm / (length(dm) + 1e-3);
  float flank = 1.0 - n.z;
  float facing = max(dot(n.xy / (length(n.xy) + 1e-4), toM), 0.0);
  float rim = facing * smoothstep(0.03, 0.35, flank) * near * uGlint;
  col *= mix(0.6, 1.0, smoothstep(0.0, 0.10, h0));
  col = 1.0 - exp(-col * 1.3);
  col = mix(col, ACCENT, clamp(rim * 1.3, 0.0, 0.85));
  col += vec3(1.0, 0.9, 0.85) * 0.45 * pow(max(n.z, 0.0), 60.0) * near * near * uGlint;
  // lit rays turn to red metal: the shading stays, the highlights keep a little white
  vec4 L = texture(uLit, tc);
  float lit = clamp(max(L.r, L.g * uHov), 0.0, 1.0);
  vec3 red = col * vec3(1.0, 0.27, 0.15) * 1.3 + vec3(1.0, 0.8, 0.75) * pow(max(col.g, 0.0), 5.0) * 0.35;
  col = mix(col, red, lit);
  outColor = vec4(min(col, 1.0) * inside, inside); // premultiplied: unpoured pixels stay transparent
}`;

const TW = 640;
const TH = 960; // the mark's viewBox is 200 x 300
const SC = TW / 200;
const DILATE = 1.5; // viewBox units added around every path (the mark asks for less: data-dilate)
const SIGMA_TUBE = 1.2 * SC;
const SIGMA_POOL = 4.5 * SC;
const POUR_MS = 2000;
const BLEED = 0.08; // canvas margin around the drawing, for the lamp's rim light

type Canvas2D = CanvasRenderingContext2D;
const sheet = (): [HTMLCanvasElement, Canvas2D] => {
  const c = document.createElement('canvas');
  c.width = TW;
  c.height = TH;
  const g = c.getContext('2d');
  if (!g) throw new Error('no 2d context');
  g.fillStyle = '#000';
  g.fillRect(0, 0, TW, TH);
  g.globalCompositeOperation = 'lighter';
  g.setTransform(SC, 0, 0, SC, 0, 0);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  return [c, g];
};

// R: strokes thickened, G: strokes, B: the sharp mask. Unblurred; the GPU blurs R and G.
function buildMask(paths: string[], dilate: number): HTMLCanvasElement {
  const [c, g] = sheet();
  const pass = (color: string, width: number): void => {
    g.fillStyle = g.strokeStyle = color;
    g.lineWidth = width;
    for (const d of paths) {
      const p = new Path2D(d);
      g.fill(p, 'evenodd'); // the eye is a ring
      g.stroke(p);
    }
  };
  pass('#f00', dilate);
  pass('#0f0', 0.6);
  pass('#00f', 0.25);
  return c;
}

// the lit mask, on the same grid: R the page's own rays (path.here), G the rays pointed at
function buildLit(svg: SVGSVGElement, key: string | null, dilate: number): HTMLCanvasElement {
  const [c, g] = sheet();
  g.lineWidth = dilate + 1.2;
  const draw = (sel: string, color: string): void => {
    g.fillStyle = g.strokeStyle = color;
    for (const el of svg.querySelectorAll(sel)) {
      const p = new Path2D(el.getAttribute('d') ?? '');
      g.fill(p, 'evenodd');
      g.stroke(p);
    }
  };
  draw('path.here', '#f00');
  if (key) draw(`path[data-key="${key}"]`, '#0f0');
  return c;
}

// No status check here: with KHR_parallel_shader_compile the driver compiles off the main thread, and
// asking for COMPILE_STATUS right away would block until it is done.
function program(gl: WebGL2RenderingContext, fs: string): WebGLProgram {
  const p = gl.createProgram();
  for (const [type, src] of [
    [gl.VERTEX_SHADER, VS],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const sh = gl.createShader(type);
    if (!sh) throw new Error('createShader');
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(p, sh);
  }
  gl.linkProgram(p);
  return p;
}

const idle = (fn: () => void): void => {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 50);
};

// the metal cannot run: show the drawing (it was hidden so that only the pour would appear)
const fallback = (): void => document.documentElement.classList.remove('gl-pending');

export function start(svg: SVGSVGElement): void {
  const host = svg.parentElement;
  const paths = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? '').filter(Boolean);
  if (!host || !paths.length) return fallback();
  const canvas = document.createElement('canvas');
  canvas.className = 'sigil-gl';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, depth: false, stencil: false });
  if (!gl) return fallback();
  const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!hp || hp.precision < 23) return fallback(); // mediump broke the hash math on real phones (old site)

  let progs: [WebGLProgram, WebGLProgram];
  try {
    progs = [program(gl, BLUR), program(gl, FS)];
  } catch {
    return fallback();
  }
  // Start-up is split so no single task blocks the main thread: compile (above), wait for the link
  // without blocking, then build the field and mount in an idle slot.
  const ext = gl.getExtension('KHR_parallel_shader_compile') as { COMPLETION_STATUS_KHR: number } | null;
  const linked = (): void => {
    if (!progs.every((p) => gl.getProgramParameter(p, gl.LINK_STATUS))) return fallback();
    idle(() => run(svg, host, paths, canvas, gl, progs[0], progs[1]));
  };
  if (ext) {
    const poll = (): void => {
      if (progs.every((p) => gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR))) linked();
      else requestAnimationFrame(poll);
    };
    poll();
  } else linked();
}

function texture(gl: WebGL2RenderingContext, src: HTMLCanvasElement | null): WebGLTexture {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, TW, TH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// Two blur passes into textures; returns the finished field, or null if the GPU refuses a framebuffer.
function buildField(gl: WebGL2RenderingContext, blur: WebGLProgram, mask: HTMLCanvasElement): WebGLTexture | null {
  gl.useProgram(blur);
  const src = texture(gl, mask);
  const mid = texture(gl, null);
  const out = texture(gl, null);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, TW, TH);
  gl.uniform1i(gl.getUniformLocation(blur, 'uSrc'), 0);
  gl.uniform1f(gl.getUniformLocation(blur, 'uSr'), SIGMA_TUBE);
  gl.uniform1f(gl.getUniformLocation(blur, 'uSg'), SIGMA_POOL);
  const dir = gl.getUniformLocation(blur, 'uDir');
  let ok = true;
  for (const [from, to, dx, dy] of [
    [src, mid, 1 / TW, 0],
    [mid, out, 0, 1 / TH],
  ] as const) {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, to, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) ok = false;
    gl.bindTexture(gl.TEXTURE_2D, from);
    gl.uniform2f(dir, dx, dy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb);
  gl.deleteTexture(src);
  gl.deleteTexture(mid);
  if (!ok) {
    gl.deleteTexture(out);
    return null;
  }
  return out;
}

function run(
  svg: SVGSVGElement,
  host: HTMLElement,
  paths: string[],
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext,
  blur: WebGLProgram,
  prog: WebGLProgram,
): void {
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  for (const p of [blur, prog]) {
    const loc = gl.getAttribLocation(p, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }
  const dilate = Number(svg.dataset.dilate) || DILATE;
  let field: WebGLTexture | null;
  try {
    field = buildField(gl, blur, buildMask(paths, dilate));
  } catch {
    return fallback();
  }
  if (!field) return fallback();
  gl.useProgram(prog);
  const names = ['uTex', 'uLit', 'uBox', 'uRes', 'uTexel', 'uTime', 'uReveal', 'uMouse', 'uTilt', 'uGlint', 'uHov'] as const;
  const U = Object.fromEntries(names.map((k) => [k, gl.getUniformLocation(prog, k)])) as Record<
    (typeof names)[number],
    WebGLUniformLocation | null
  >;
  gl.uniform1i(U.uTex, 0);
  gl.uniform1i(U.uLit, 1);
  gl.uniform2f(U.uTexel, 1 / TW, 1 / TH);
  // the lit mask lives on texture unit 1 and is redrawn when the pointed track changes
  gl.activeTexture(gl.TEXTURE1);
  const litTex = texture(gl, buildLit(svg, null, dilate));
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, field);
  let hov = 0,
    hovTarget = 0;
  svg.addEventListener('mark:lit', (e) => {
    const key = (e as CustomEvent<string | null>).detail;
    hovTarget = key ? 1 : 0;
    if (!key) return;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, litTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildLit(svg, key, dilate));
    gl.activeTexture(gl.TEXTURE0);
    hov = 0;
  });

  svg.after(canvas);
  const coarse = matchMedia('(pointer: coarse)').matches;
  let cap = coarse ? 1.5 : 2; // DPR clamp; lowered if frames run slow
  let px = 1,
    W = 1,
    H = 1,
    box = [0, 0, 1, 1];
  const measure = (): void => {
    const s = svg.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    const bx = s.width * BLEED,
      by = s.height * BLEED;
    canvas.style.left = `${s.left - h.left - bx}px`;
    canvas.style.top = `${s.top - h.top - by}px`;
    canvas.style.width = `${s.width + 2 * bx}px`;
    canvas.style.height = `${s.height + 2 * by}px`;
    px = Math.min(devicePixelRatio || 1, cap);
    W = Math.max(1, Math.round((s.width + 2 * bx) * px));
    H = Math.max(1, Math.round((s.height + 2 * by) * px));
    canvas.width = W;
    canvas.height = H;
    gl.viewport(0, 0, W, H);
    box = [bx * px, by * px, s.width * px, s.height * px];
  };
  measure();

  // the pointer, in canvas pixels (y up), and the tilt and lamp it drives
  const m = { x: -1e5, y: -1e5, tx: -1e5, ty: -1e5, tiltX: 0, tiltY: 0, ttx: 0, tty: 0, glint: 0, tglint: 0 };
  const toCanvas = (e: PointerEvent): [number, number, DOMRect] => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (W / r.width), H - (e.clientY - r.top) * (H / r.height), r];
  };
  const onMove = (e: PointerEvent): void => {
    const [x, y, r] = toCanvas(e);
    m.ttx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth * 0.45)));
    m.tty = Math.max(-1, Math.min(1, -(e.clientY - (r.top + r.height / 2)) / (innerHeight * 0.45)));
    if (e.pointerType !== 'mouse') return;
    m.tx = x;
    m.ty = y;
    if (m.x < -1e4) {
      m.x = x;
      m.y = y;
    }
    const inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
    m.tglint = inside ? 1 : 0.35;
  };
  // touch: a tap on the mark holds the lamp there for a moment
  const onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') return;
    const [x, y, r] = toCanvas(e);
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    m.tx = m.x = x;
    m.ty = m.y = y;
    m.tglint = 1;
    setTimeout(() => (m.tglint = 0), 1200);
  };
  const onLeave = (): void => {
    m.ttx = m.tty = 0;
    m.tglint = 0;
  };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  // The pour starts on the first frame the mark is actually on screen.
  let t0 = -1,
    raf = 0,
    onScreen = false,
    poured = false,
    stopped = false,
    last = 0,
    slow = 0;
  const draw = (now: number): void => {
    raf = 0;
    if (stopped || !onScreen || document.hidden) return;
    if (t0 < 0) t0 = now;
    const dt = last ? now - last : 16;
    last = now;
    const clock = (now - t0) / 1000;
    // adaptive quality: when frames run slow for a while, render fewer pixels instead of giving up
    if (dt > 26 && cap > 1) {
      if (++slow > 40) {
        cap = 1;
        slow = 0;
        measure();
      }
    } else slow = Math.max(0, slow - 1);
    m.x += (m.tx - m.x) * 0.1;
    m.y += (m.ty - m.y) * 0.1;
    if (!coarse) {
      m.tiltX += (m.ttx - m.tiltX) * 0.06;
      m.tiltY += (m.tty - m.tiltY) * 0.06;
    } else {
      // phones: no hover, so the reflections sway slowly on their own
      m.tiltX = 0.3 * Math.sin(clock * 0.4);
      m.tiltY = 0.2 * Math.cos(clock * 0.31);
    }
    m.glint += (m.tglint - m.glint) * 0.08;
    hov += (hovTarget - hov) * 0.18;
    const rv = Math.min(1, (now - t0) / POUR_MS);
    gl.uniform4f(U.uBox, box[0] ?? 0, box[1] ?? 0, box[2] ?? 1, box[3] ?? 1);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uTime, clock);
    gl.uniform1f(U.uReveal, rv);
    gl.uniform2f(U.uMouse, m.x, m.y);
    gl.uniform2f(U.uTilt, m.tiltX, m.tiltY);
    gl.uniform1f(U.uGlint, m.glint);
    gl.uniform1f(U.uHov, hov);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (rv >= 1 && !poured) {
      poured = true;
      svg.classList.add('sigil-gl-on'); // the drawing steps back once the metal fills it
      document.documentElement.dataset.sigilGl = 'on';
    }
    raf = requestAnimationFrame(draw);
  };
  const kick = (): void => {
    if (!raf && !stopped) raf = requestAnimationFrame(draw);
  };
  const stop = (): void => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerdown', onDown);
    svg.classList.remove('sigil-gl-on');
    canvas.remove();
    delete document.documentElement.dataset.sigilGl;
    fallback();
  };

  const io = new IntersectionObserver((en) => {
    onScreen = en.some((e) => e.isIntersecting);
    last = 0;
    kick();
  });
  io.observe(canvas);
  document.addEventListener('visibilitychange', kick);
  canvas.addEventListener('webglcontextlost', () => {
    io.disconnect();
    stop();
  });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (e.matches) {
      io.disconnect();
      stop();
    }
  });
  let rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      measure();
      kick();
    }, 120);
  });
  kick();
}
