// Pointer dust: the band's dot field is everywhere on the page, but it is seen only around
// the pointer, and only while it moves; a moment after the pointer rests it fades and no more frames run.
// A small 2D canvas behind the content (motion.css .dust), fixed to the page's 4 px grid so the dots stay put
// while the lens moves over them. Grey at about a third, with a rare vermilion spark near the middle. Mouse
// and trackpad only; it skips the band (which has its own pointer lens).
const B8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43,
  1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
const hash = (x: number, y: number): number => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vn = (x: number, y: number): number => {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi;
  const u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi),
    b = hash(xi + 1, yi),
    c = hash(xi, yi + 1),
    d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

export function initDust(): void {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const R = 152,
    C = 4,
    N = (2 * R) / C;
  const cv = document.createElement('canvas');
  cv.className = 'dust';
  cv.setAttribute('aria-hidden', 'true');
  cv.width = cv.height = N * 2; // 2 css px per canvas px: a 4 px cell holds one 2 px dot
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(N * 2, N * 2);
  document.body.append(cv);
  const bands = [...document.querySelectorAll('.dband')];
  const s = { cx: -1e4, cy: -1e4, x: -1e4, y: -1e4, last: 0, pres: 0 };
  let raf = 0;
  const t0 = performance.now();
  const frame = (now: number): void => {
    raf = 0;
    let overBand = false;
    for (const b of bands) {
      const r = b.getBoundingClientRect();
      if (r.height && s.cx > r.left - 40 && s.cx < r.right + 40 && s.cy > r.top - 40 && s.cy < r.bottom + 40) overBand = true;
    }
    const target = !overBand && now - s.last < 650 ? 1 : 0;
    s.pres += (target - s.pres) * (target ? 0.14 : 0.06);
    if (s.x < -9e3) {
      s.x = s.cx;
      s.y = s.cy;
    }
    s.x += (s.cx - s.x) * 0.3;
    s.y += (s.cy - s.y) * 0.3;
    if (s.pres < 0.01 && !target) {
      cv.style.opacity = '0';
      return; // at rest: no more frames until the pointer moves again
    }
    cv.style.opacity = '1';
    const dx = s.x + scrollX,
      dy = s.y + scrollY; // page coordinates: the dots belong to the page, not to the pointer
    const ox = Math.floor((dx - R) / C) * C,
      oy = Math.floor((dy - R) / C) * C;
    cv.style.transform = `translate(${ox - scrollX}px, ${oy - scrollY}px)`;
    const t = (now - t0) / 1000,
      d = img.data,
      W2 = N * 2;
    d.fill(0);
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const gx = ox / C + i,
          gy = oy / C + j;
        const px = gx * C + 2 - dx,
          py = gy * C + 2 - dy;
        const dd = px * px + py * py;
        if (dd > R * R) continue;
        const g = Math.exp(-dd / (92 * 92)) * s.pres;
        // the same long, slow reflections as the band
        const f = 0.62 * vn(gx / 40 + t * 0.12, gy / 10) + 0.38 * vn(gx / 17 - t * 0.08, gy / 5 + 3.1);
        const lum = g * (0.2 + 0.8 * Math.min(1, Math.max(0, (f - 0.28) * 1.9))) * 0.7;
        if (lum <= ((B8[(gy & 7) * 8 + (gx & 7)] ?? 0) + 0.5) / 64) continue;
        const k = (j * 2 * W2 + i * 2) * 4;
        const spark = g > 0.5 && hash(gx * 7 + Math.floor(t * 6), gy) > 0.975;
        d[k] = spark ? 255 : 0x8f; // vermilion spark, or --muted
        d[k + 1] = spark ? 59 : 0x86;
        d[k + 2] = spark ? 33 : 0x7b;
        d[k + 3] = spark ? 140 : 80;
      }
    ctx.putImageData(img, 0, 0);
    raf = requestAnimationFrame(frame);
  };
  const stir = (): void => {
    s.last = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  };
  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      s.cx = e.clientX;
      s.cy = e.clientY;
      stir();
    },
    { passive: true },
  );
  // a scroll under a resting pointer moves the page under it, so the lens wakes too
  addEventListener('scroll', () => s.cx > -1e3 && stir(), { passive: true });
  document.documentElement.addEventListener('pointerleave', () => (s.last = 0));
}
