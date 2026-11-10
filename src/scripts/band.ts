// The live dither band under the hero: a slow liquid field printed in grey 8x8 Bayer dots,
// dense at the top edge and dissolving downward. The pointer is a lens (the dots thicken around it, with a
// few vermilion sparks) and stirs the field; a scroll carries it along. It fills in from the left when it
// starts. One small WebGL2 canvas at half resolution (a 4 px cell is 2 canvas px, its dot 1); paused when
// the band is offscreen or the tab hidden. The printed band (public/textures/band.png) stays if this fails.
const VS = '#version 300 es\nin vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform vec2 uVel; uniform float uFlow; uniform float uIntro; uniform float uHot;
out vec4 o;
const vec3 GREY = vec3(0.561, 0.525, 0.482); // --muted
const vec3 BONE = vec3(0.925, 0.902, 0.863); // --ink
const vec3 ACC = vec3(1.0, 0.231, 0.129);    // --accent
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.55; for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.07 + vec2(7.1, 3.3); a *= 0.5; } return s; }
float b2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float b4(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
float b8(vec2 a){ return b4(0.5 * a) * 0.25 + b2(a); }
void main(){
  vec2 fc = floor(gl_FragCoord.xy);
  vec2 cell = floor(fc / 2.0);
  vec2 sub = fc - cell * 2.0;
  if (sub.x > 0.5 || sub.y < 0.5) { o = vec4(0.0); return; } // one dot per 2x2 cell
  vec2 c = cell * 2.0 + 1.0;
  float top = c.y / uRes.y; // 1 at the dense edge
  vec2 dm = c - uMouse;
  float R = 48.0;
  float g = exp(-dot(dm, dm) / (R * R)) * uHot;
  float t = uTime;
  // long liquid reflections: stretched, domain-warped noise; the pointer swirls it and drags it along
  vec2 p = vec2(c.x / 170.0 + uFlow, c.y / 24.0);
  p += vec2(-dm.y, dm.x) / R * g * 0.8 - uVel * g * 0.05;
  vec2 q = vec2(fbm(p * vec2(0.7, 1.0) + vec2(0.0, t * 0.07)), fbm(p * vec2(0.7, 1.0) + vec2(5.2, 1.3 - t * 0.06)));
  float f = fbm(p + 1.4 * q + vec2(t * 0.03, 0.0));
  float fall = pow(clamp(top, 0.0, 1.0), 1.6);
  float lum = clamp((f - 0.40) * 3.0, 0.0, 1.0) * fall + 0.14 * smoothstep(1.0 - 22.0 / uRes.y, 1.0, top);
  lum += g * (0.25 + 0.45 * fall); // the pointer is a lens: the dots thicken around it
  lum *= clamp((uIntro * 1.25 - c.x / uRes.x) * 6.0, 0.0, 1.0); // it fills in from the left
  float th = b8(cell);
  if (lum <= th) { o = vec4(0.0); return; }
  vec3 col = lum > th + 0.62 ? BONE * 0.9 : GREY;
  if (g > 0.3 && h21(cell + floor(t * 7.0)) > 0.9) col = ACC; // a few sparks right at the pointer
  o = vec4(col, 1.0);
}`;

export function startBand(): void {
  const band = document.querySelector<HTMLElement>('.dband');
  if (!band) return;
  const cv = document.createElement('canvas');
  cv.className = 'dband-gl';
  cv.setAttribute('aria-hidden', 'true');
  const gl = cv.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, depth: false, stencil: false });
  if (!gl) return;
  const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!hp || hp.precision < 23) return;
  const prog = gl.createProgram();
  for (const [type, src] of [
    [gl.VERTEX_SHADER, VS],
    [gl.FRAGMENT_SHADER, FS],
  ] as const) {
    const sh = gl.createShader(type);
    if (!sh) return;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const names = ['uRes', 'uTime', 'uMouse', 'uVel', 'uFlow', 'uIntro', 'uHot'] as const;
  const U = Object.fromEntries(names.map((k) => [k, gl.getUniformLocation(prog, k)])) as Record<
    (typeof names)[number],
    WebGLUniformLocation | null
  >;

  let W = 1,
    H = 1;
  const measure = (): void => {
    const r = band.getBoundingClientRect();
    W = Math.max(1, Math.ceil(r.width / 2));
    H = Math.max(1, Math.ceil(r.height / 2));
    cv.width = W;
    cv.height = H;
    gl.viewport(0, 0, W, H);
  };
  band.append(cv);
  band.classList.add('is-live');
  measure();

  const m = { cx: -1e4, cy: -1e4, x: -1e4, y: -1e4, vx: 0, vy: 0, px: 0, py: 0, hot: 0, thot: 0 };
  addEventListener(
    'pointermove',
    (e) => {
      m.cx = e.clientX;
      m.cy = e.clientY;
      m.thot = e.pointerType === 'mouse' ? 1 : 0.6;
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => (m.thot = 0));
  let raf = 0,
    t0 = 0,
    last = 0,
    flow = 0,
    sy = scrollY,
    visible = false;
  const draw = (now: number): void => {
    raf = 0;
    if (!visible || document.hidden) return;
    if (!t0) t0 = now;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    const r = band.getBoundingClientRect();
    const tx = (m.cx - r.left) / 2,
      ty = H - (m.cy - r.top) / 2;
    if (m.x < -9e3) {
      m.x = tx;
      m.y = ty;
    }
    m.x += (tx - m.x) * 0.18;
    m.y += (ty - m.y) * 0.18;
    m.vx += (m.x - m.px - m.vx) * 0.2;
    m.vy += (m.y - m.py - m.vy) * 0.2;
    m.px = m.x;
    m.py = m.y;
    m.hot += (m.thot - m.hot) * 0.06;
    const ds = scrollY - sy;
    sy = scrollY;
    flow += dt * 0.000035 + Math.abs(ds) * 0.0011; // a slow drift, carried faster by a scroll
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uTime, (now - t0) / 1000);
    gl.uniform2f(U.uMouse, m.x, m.y);
    gl.uniform2f(U.uVel, m.vx, m.vy);
    gl.uniform1f(U.uFlow, flow);
    gl.uniform1f(U.uIntro, Math.min(1, (now - t0) / 1700));
    gl.uniform1f(U.uHot, m.hot);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(draw);
  };
  const kick = (): void => {
    if (!raf) raf = requestAnimationFrame(draw);
  };
  new IntersectionObserver((en) => {
    visible = en.some((e) => e.isIntersecting);
    last = 0;
    kick();
  }).observe(band);
  document.addEventListener('visibilitychange', kick);
  addEventListener('resize', () => {
    measure();
    kick();
  });
  cv.addEventListener('webglcontextlost', () => {
    cv.remove();
    band.classList.remove('is-live');
  });
}
