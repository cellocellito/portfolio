/**
 * The one restrained three.js scene (design.md §6): a fullscreen shader plane —
 * fbm noise quantized through an 8×8 Bayer matrix into three tone bands
 * (charcoal / ember / amber), rendered at ¼ resolution and upscaled with
 * image-rendering: pixelated. Pointer parallax; pauses offscreen/hidden.
 * Never runs under reduced motion (gated in main.ts); on any failure the
 * static CSS dither fallback stays.
 */
import { Camera, Mesh, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer } from 'three';

const RES_SCALE = 0.25;

const vertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// No explicit precision qualifier: ShaderMaterial injects the highest precision
// the GPU supports (highp on all modern phones). Hard-coding mediump here broke
// the hash()/fbm math on real mobile GPUs — the shader rendered near-black.
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}
/* ordered dither — Bayer via the recursive fract trick */
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  p += uMouse * vec2(0.10, 0.06);

  float t = uTime * 0.045;
  float n = fbm(p * 1.9 + vec2(t, -t * 0.6) + 1.4 * fbm(p * 3.1 - t));

  /* warmer toward the lower-right "horizon", vignetted edges */
  float shape = mix(0.28, 0.92, smoothstep(1.1, -0.1, uv.y) * smoothstep(0.05, 0.9, uv.x * 0.6 + 0.3));
  float v = n * shape;
  v *= smoothstep(1.35, 0.35, length(p));

  float d = (bayer8(gl_FragCoord.xy) - 0.5) * 0.26;
  float q = clamp(v + d, 0.0, 1.0);

  vec3 charcoal = vec3(0.051, 0.047, 0.041);  /* just under --bg */
  vec3 ember    = vec3(0.180, 0.128, 0.038);
  vec3 amber    = vec3(1.0, 0.690, 0.0);

  vec3 col = charcoal;
  col = mix(col, ember, step(0.44, q));
  col = mix(col, amber * 0.85, step(0.84, q));

  gl_FragColor = vec4(col, 1.0);
}
`;

export function initHeroScene(): void {
  const holder = document.querySelector<HTMLElement>('[data-scene]');
  if (!holder) return;
  // low-end heuristic: keep the static fallback instead
  if ((navigator.hardwareConcurrency ?? 4) < 3) return;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch {
    return;
  }

  // The fbm/Bayer math needs real high precision. If the GPU can't offer it,
  // keep the static CSS dither fallback rather than render a broken shader.
  if (renderer.capabilities.precision === 'lowp') {
    renderer.dispose();
    return;
  }

  const scene = new Scene();
  const camera = new Camera();
  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new Vector2(1, 1) },
    uMouse: { value: new Vector2(0, 0) },
  };
  const mesh = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false }),
  );
  mesh.frustumCulled = false;
  scene.add(mesh);

  renderer.setPixelRatio(1);
  const size = (): void => {
    const w = Math.max(1, Math.floor(holder.clientWidth * RES_SCALE));
    const h = Math.max(1, Math.floor(holder.clientHeight * RES_SCALE));
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  };
  size();
  holder.appendChild(renderer.domElement);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener(
    'pointermove',
    (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true },
  );

  let visible = true;
  new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
  }).observe(holder);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(size, 150);
  });

  const t0 = performance.now();
  const loop = (now: number): void => {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    uniforms.uMouse.value.set(mouse.x, mouse.y);
    uniforms.uTime.value = (now - t0) / 1000;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(loop);
  requestAnimationFrame(() => holder.classList.add('is-live'));
}
