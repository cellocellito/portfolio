# design.md — CELLO.SYS

The design bible for the portfolio of Marcelo Ribeiro Lima ("Cello").
Every visual decision in the code traces back to a rule on this page. If code and
this file disagree, one of them is a bug.

---

## 1. Concept statement

**A 2008 machine dreaming in 2026 rendering quality.** The site is built on a single
tension held deliberately unresolved: the raw, aliased, honest texture of the old web —
bitmap type, Bayer dithering, scanlines, amber phosphor, hard 1px borders — executed
with the fluid craft of a modern award site: frosted glass panels, liquid scroll
choreography, a live shader atmosphere, generous negative space. The pixel layer is the
soul; the glass layer is the body. They are never blended into a compromise — a hard
aliased edge sits directly on top of a 14px backdrop blur, a stepped `steps(n)` ease
lives beside a long fluid cubic-bezier — because the collision *is* the identity.
The palette comes from amber phosphor terminals: warm charcoal that reads as an unlit
CRT, bone-white text like aged plastic, and one loud amber accent like a cursor that
never stopped blinking since 2008.

---

## 2. Color palette

| Role | Token | Hex | Usage |
|---|---|---|---|
| Background | `--bg` | `#100F0D` | Page base. Warm near-black ("unlit phosphor"). Never pure #000. |
| Surface | `--surface` | `#181613` | Opaque panels, chips, footer counter housing. |
| Surface 2 | `--surface-2` | `#1E1B17` | Hover state of surfaces, inset wells. |
| Glass | `--glass` | `rgba(24,22,19,0.55)` | Frosted panels over the shader/background. Always paired with `backdrop-filter: blur(14px) saturate(1.15)`. |
| Glass strong | `--glass-strong` | `rgba(24,22,19,0.82)` | Nav when scrolled; anywhere text needs extra contrast insurance. |
| Text primary | `--text` | `#EDE6D8` | Bone/ivory. Headings, key copy. The "loud neutral". |
| Text soft | `--text-soft` | `#CFC7B8` | Body paragraphs, project detail copy. |
| Text muted | `--muted` | `#948C7C` | Labels, HUD readouts, meta. ≥4.5:1 on bg and surface. |
| Accent | `--accent` | `#FFB000` | Amber phosphor. Links, indexes, CTAs, live data, the dither highlights in the shader. |
| Accent hover | `--accent-hover` | `#FFC94B` | Hover/active state of accent elements. |
| Line | `--line` | `#2C2820` | Hard 1px borders — the "pixel" borders. |
| Line soft | `--line-soft` | `#221F19` | Grid overlays, hairlines. |
| Line bright | `--line-bright` | `rgba(255,176,0,0.4)` | Border highlight on hover/focus-within of glass cards. |

**Accent justification:** amber `#FFB000` is the phosphor color of pre-web terminals —
it carries the cybercore ancestry natively, avoids both the acid-green "hacker" cliché
and every banned purple/blue-violet/neon-cyan direction, and holds WCAG AA (contrast
≈ 10:1 on `--bg`) even at small mono sizes.

Banned and absent: purple/violet/indigo/lavender, blue→purple gradients, cyan+magenta
pairs, pure `#000`, smooth pastel gradients, default-Tailwind-looking hues.

---

## 3. Typography system

Self-hosted (Fontsource woff2, latin subset, preloaded, `font-display: swap`).

| Role | Font | Weights | Rules |
|---|---|---|---|
| Display / hero wordmark | **Press Start 2P** | 400 | The single biggest visual event: the hero wordmark "CELLO", and nothing else. Chunky arcade-bitmap glyphs; advances ~1em/char, so the wordmark scale (`--fs-wordmark`) is tuned down to keep 5 characters on one line at every width. **Never used anywhere but the wordmark.** |
| Small pixel UI | **Silkscreen** | 400 | The fine pixel layer: nav logotype `CELLO.SYS`, section indexes, visitor-counter digits, 88×31 badges, the "+/×" card toggle glyph, the ADV badge. **Never body text. Never below 10px rendered size.** |
| Headings & body | **Space Grotesk** (variable 300–700) | 400–700 | h1 name line, h2/h3, paragraphs, the giant contact email. |
| Mono / HUD | **IBM Plex Mono** | 400 | Everything terminal: nav links, HUD readouts, labels ("PROBLEM/BUILT/OUTCOME"), chips, buttons, footer log ticker, micro-copy, the EN/BR switcher. Uppercase + `letter-spacing: 0.08–0.14em` when used as label. |

Two pixel fonts, two jobs: Press Start 2P is the loud arcade headline; Silkscreen is the quiet system chrome. Keeping them separate stops the pixel layer from reading as one monotype note.

**Scale** — modular, ratio ≈1.333 on a 16px base:
`12 / 14 / 16 / 18 / 21 / 28 / 38 / 50 / 67` px, plus two fluid display sizes:

- `--fs-wordmark: clamp(2.25rem, 11vw, 8rem)` — hero "CELLO" only (tuned for Press Start 2P's wide ~1em advance so 5 chars never wrap or overflow).
- `--fs-giant: clamp(1.7rem, 7vw, 5.5rem)` — contact email only (the loudest CTA on the page).

Mono micro-copy is 11–12px, uppercase. Body is 16px/1.65. Headings use Space Grotesk
500–600, tight (1.05–1.15) line-height.

---

## 4. Motion principles

Two motion dialects, matching the two material layers:

| Token | Value | Applies to |
|---|---|---|
| `--ease-fluid` | `cubic-bezier(0.22, 1, 0.36, 1)` | Glass layer: reveals, card lift, parallax, accordion content fade. |
| `--ease-inout` | `cubic-bezier(0.65, 0, 0.35, 1)` | Layout size changes: accordion height. |
| stepped | `steps(2)`–`steps(8)` | Pixel layer: wordmark entrance, "+"→"×" toggle, grain jitter, counter digits, badge hover inversion. Pixel elements never tween smoothly — they snap. |

**Duration scale:** `120ms` (micro/hover) · `240ms` (small transitions) · `600ms`
(scroll reveals) · `900ms` (hero load sequence). Nothing exceeds 1s except scrubbed
(scroll-linked) motion, which has no duration.

**On load (hero only, once):** kicker types on (terminal typing, stepped) → "CELLO"
characters snap up on an 8px grid with `steps()` → name/one-liner/CTAs slide-fade with
`--ease-fluid` stagger → HUD corners fade in last. Total ≤ 1.6s, content is in the DOM
and readable even if JS never runs. **Wall-clock failsafe:** because mobile browsers
throttle `requestAnimationFrame` during load, a 2.6s `setTimeout` force-reveals all
`[data-load]`/wordmark elements even if the rAF-driven timeline stalls — the intro can
never leave hero text stuck at opacity 0.

**On scroll:** one-shot reveals (`once: true`) for section headers, project cards,
chips, about/contact blocks; two scrubbed effects only — hero content parallax-out and
sigil divider line-draw; **exactly one pinned element** — the Selected Work left rail,
desktop ≥1024px only.

**On hover:** color/border swaps at 120ms, underline crawl on text links, icon
draw-play (useAnimations/Lottie), card border brighten + 2px lift, pixel elements
invert with `steps(2)`.

**Deliberately NOT animated:** body paragraphs and project detail copy (legibility),
the nav bar (always instant, always present), focus outlines (instant, always visible),
anything after the user opens a project (the content inside doesn't re-animate), no
preloader/splash of any kind, no cursor replacement (a custom cursor added no meaning
here — decision: skip it).

**`prefers-reduced-motion: reduce`:** Lenis off (native scroll), all GSAP
reveals/pins/scrubs skipped (content fully visible by default), shader scene replaced
by its static dithered fallback, Lottie icons static, grain static, ticker paused.

---

## 5. Component inventory

| Component | States |
|---|---|
| Nav bar | default (transparent) / scrolled (glass-strong + hairline). Collapses gracefully on mobile: link gaps tighten, `.SYS` drops ≤360px, never wraps to two lines |
| Nav link | idle / hover (amber + underline crawl) / focus-visible / active-section (`aria-current`, amber ■ marker — absolutely positioned so it never reflows the nav) |
| Language switcher (EN/BR) | mono `EN / BR` pill in the nav. Idle / hover / active (`aria-pressed`, amber). Swaps all reading content to Brazilian Portuguese, updates `<html lang>` + `<title>`, persists in localStorage, and auto-detects `pt` browsers on first visit. The terminal-HUD layer (coordinates, live clock, SYS.OK, the `// ...` kicker, `[OK]`/`[WARN]` log markers) deliberately stays English as texture. |
| Button — primary (`.btn--solid`) | idle (amber bg, dark text) / hover (accent-hover + 4px hard pixel shadow) / focus-visible / active (shadow collapses) |
| Button — ghost (`.btn--ghost`) | idle (1px line border) / hover (amber border + text) / focus-visible |
| Project card (glass) | closed / hover (line-bright border, −2px lift, corner brackets on) / open (`is-open`, amber index, "+"→"×") / focus-within |
| Stack chip | idle / hover (amber border, ivory text, −1px) / `.chip--adv` variant (amber bg + pixel "ADV" badge) |
| HUD readout | static label / live (clock, uptime — updates 1Hz, no tween) |
| Sigil divider | undrawn (dashoffset 100%) / drawn (scroll-scrubbed) |
| Contact email (the loudest CTA) | one line on desktop; on narrow screens breaks only between its two `.e-part` halves (`cello.official04` / `@gmail.com`), never mid-word — each half is a nowrap unit so the per-char SplitText reveal can't fragment the address |
| Social link (Lottie) | idle (frame 0) / hover-focus (plays forward) / leave (plays reverse) / fallback (static pixel SVG when Lottie unavailable) |
| Footer badge (88×31) | idle (bevel border) / hover (inverted, stepped) |
| Visitor counter | static digits in bevel cells + scanline film |
| Skip link | visually hidden / focus (visible, amber) |
| Scroll cue | idle blink (stepped) / hidden after first scroll |
| Log ticker | scrolling loop / paused (reduced motion) |

---

## 6. Texture & effects spec

| Effect | Implementation | Where |
|---|---|---|
| **Film grain** | Fixed full-viewport overlay, SVG `feTurbulence` data-URI tile (160px), `opacity: 0.05`, `mix-blend-mode: overlay`, `pointer-events: none`. Jitters via `steps(6)` keyframes on fine pointers only; static on touch/reduced-motion. | Entire site, topmost layer under nothing. |
| **Scanlines** | `repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 1px, transparent 1px 3px)` pseudo-element, opacity ≈ .5. | Hero scene only, plus the visitor-counter housing. Nowhere else — scarcity keeps it a texture, not a costume. |
| **Dithering (live)** | Three.js fullscreen shader: fbm noise quantized into 3 tone bands (`bg` / ember / amber) through an 8×8 Bayer matrix; rendered at ¼ resolution and upscaled with `image-rendering: pixelated` for chunky honest pixels. Field weighted to the lower-right "horizon", away from the content. **Requires `highp` float precision** — the fbm hash breaks under `mediump` on real mobile GPUs (renders near-black), so the fragment shader carries no precision qualifier and lets `ShaderMaterial` inject the GPU's max; `lowp`-only GPUs fall back to the static CSS dither. | Hero atmosphere. |
| **Hero scrim** | Gradient overlay above the scene (left→right and bottom→up charcoal fades): the atmosphere lives right/bottom, and text over the scene always keeps AA contrast — on every aspect ratio, including portrait. | Hero, above canvas/fallback, below content. |
| **Dithering (static)** | CSS checkerboard bands via `conic-gradient` tiles (8px cells) at 25% → 50% → 75% coverage — a stepped, aliased fade instead of a smooth gradient. | Hero bottom edge into the page; shader's no-JS/reduced-motion fallback. |
| **Glass** | `background: var(--glass)` + `backdrop-filter: blur(14px) saturate(1.15)` + 1px `--line` border + `inset 0 1px 0 rgba(255,255,255,.06)` top edge highlight (the "refraction" cue) + deep soft drop shadow. Radius is 2px — glass here is cut, not blobby. | Project cards, about HUD card, nav (scrolled). |
| **Grid overlay** | 1px `--line-soft` lines every 72px, radially masked so it dissolves toward edges. | Hero background, behind the shader's transparent regions. |
| **Sigil linework** | Thin (1px) sharp angular SVG strokes — cybersigilism-adjacent but restrained — drawn on scroll via dashoffset. **One `<path>` per divider** (a horizontal rule with a gap and a single distinct centre motif: diamond → chevrons → signal bars), so nothing overlaps at the midpoint. | Section dividers (between work/stack/about/contact). |
| **Pixel corner brackets** | Two 7px amber L-brackets (border pseudo-elements) that appear on card hover/open. | Project cards, about HUD card. |

---

## 7. Layout & structure

Single page. Max content width 1240px, side padding 24px (16px < 480px). Section
vertical rhythm `clamp(96px, 14vh, 176px)`. Sections in order:

1. **Hero** — full viewport. Shader canvas + grid + HUD corners (real Botucatu
   coordinates, live America/Sao_Paulo clock, status, sys tag). Wordmark "CELLO"
   (pixel) over full name (grotesk) — nickname as the oversized visual event.
   Two CTAs: `VIEW WORK` (solid) / `EMAIL ME` (ghost).
2. **Selected Work `/01`** — pinned left rail (desktop) + three expandable glass
   cards: problem → built → outcome + stack chips. First card open by default;
   all content in HTML (SEO/no-JS reads everything). One scroll from the top.
3. **Stack `/02`** — grouped mono chips, scannable in seconds. No progress bars.
4. **About `/03`** — two short paragraphs + HUD facts card (location, timezone,
   English C1 · TOEIC 870/990, remote status).
5. **Contact `/04`** — email as the loudest element on the page (giant type),
   GitHub/LinkedIn with useAnimations icons.
6. **Footer** — 2008-web easter eggs: visitor counter, 88×31 badges
   ("BEST VIEWED 1024×768", "POWERED BY n8n", "100% GRAIN"), system-log ticker,
   colophon.

Persistent minimal nav (fixed top): pixel logotype `CELLO.SYS`, four mono links,
live clock (desktop). No hamburger — four short links fit every viewport.

---

## 8. Engineering notes bound to design

- Vite + vanilla TypeScript + CSS. Heavy deps: GSAP (+ScrollTrigger, SplitText),
  Lenis, three.js only. Lottie (light build) + useAnimations data are lazy-loaded
  on idle; three.js is dynamically imported after load and never blocks content.
- Shader degrades: no WebGL / reduced motion / tiny `hardwareConcurrency` → static
  CSS dither fallback already painted underneath.
- Fonts: 3 woff2 files, latin subset, preloaded.
- A11y: semantic landmarks, skip link, `aria-expanded` accordions, `:focus-visible`
  amber outline (2px, offset 3px), AA contrast everywhere including on glass
  (glass panels darken via `--glass-strong` where text sits directly on shader).
- SEO: full meta/OG/Twitter set + JSON-LD Person. OG image (1200×630) generated
  at build time in the same palette/type system.
- Performance: JS (excl. three) well under 300KB gz; three async-chunked;
  Lighthouse mobile ≥ 90 target.
