# Mobile adaptation research — 空想花庭 (phones + tablets)

Collected by agent-swarm research (5 threads: repo audit, responsive CSS architecture, touch
interaction, mobile performance + CJK typography, reference implementations). Context: Astro 5.13
static MPA, zh-CN at root + `/en/`, one stylesheet `public/css/site.css` (~837 lines), one vanilla
script `public/js/site.js` (~609 lines), deployed to Tencent EdgeOne Pages for a **phone-majority,
mainland-CN audience** — including in-app WebViews (WeChat X5 kernel, UC, QQ browser) that trail
Chromium by several major versions. This document records findings so future work can cite sources
without re-searching. Companion to `docs/fx-research.md`.

## Thread A — Repo audit: what phones hit today

Baseline that already works (keep these patterns): viewport meta present
(`src/layouts/Base.astro:40`); `100vh` + `100dvh` double declarations on `.doorway`/`.epilogue`
(`site.css:61, 221-222`); CSS scroll-snap gated to `(pointer: coarse)` while JS gesture-snap is
gated to `pointer: fine` (`site.css:56-60`, `site.js:182`); `prefers-reduced-motion` kill-switch
(`site.css:831-837` + `site.js:6`); pollen cursor canvas removed on touch (`site.js:470-472`);
petals DPR-capped and thinned <720px (`site.js:267,293`); wall images lazy-loaded; en/ pages are
structural mirrors of zh (same bugs, no new ones).

### Blockers

| # | Defect | Location | Why it breaks |
|---|---|---|---|
| B1 | **Members wall ignores its own responsive rules** | `src/pages/members.astro:24`, `src/pages/en/members.astro:24` vs `site.css:517-519` | Inline `style="column-count:4;max-width:1100px"` outranks the 960px→2 / 600px→1 media queries → 4 columns at every width; ≈57px-wide cards at 360px vs an 84px avatar (`site.css:565`). Broken on phones AND tablets. Fix: move to a class (`.wall-quad`) the media queries own, or `column-width: 220px; column-count: auto`. |
| B2 | **Fixed header wraps and covers page titles ≤430px** | `site.css:127-129` (fixed), `:159` (nav `flex-wrap: wrap`), `:480` (fixed `padding-top: 4.5rem`) | EN brand "Hortus de Escapismo" + halo ≈210–230px, nav links + 中/EN + ◐ pills ≈340–380px → nav wraps to 2–4 rows, header grows past the reserved padding, wall-page h1 slides under it. zh wraps at 360px too. |
| B3 | **Google Fonts render-blocking + unreliable in mainland CN** | `Base.astro:45-46` | `fonts.googleapis.com` is intermittently blocked/slow on mainland networks; a pending stylesheet blocks first paint. Preconnect also targets the wrong origin (binaries come from `fonts.gstatic.com`). Zero-code fix verified by direct curl: Google's official CN mirrors `fonts.googleapis.cn` / `fonts.gstatic.cn` return 200 with working slices. Belt-and-braces: self-host woff2 slices. |
| B4 | **Hero WebGL shader runs at uncapped devicePixelRatio** | `site.js:146-150` | `glc.width = innerWidth * devicePixelRatio` — a 430×932 @DPR 3 phone shades ~3.6 Mpx × 5-octave domain-warped fbm at 60fps. The repo's own research prescribed DPR-cap + half-res (`fx-research.md:48-51`); never implemented. Petals canvas already caps at 2 (`site.js:267`). |

### Major

| # | Defect | Location | Fix sketch |
|---|---|---|---|
| M1 | **Mandatory scroll-snap can trap content on short/landscape phones** | `site.css:56-60` + `.doorway` min-height 100dvh + 10vh padding (`:220-227`) | Snap area taller than viewport + `snap-stop: always` = unreachable content. Carve out `@media (pointer: coarse) and (max-height: 500px)` → `scroll-snap-type: none`, shorten paddings, hide `.scroll-cue`. Sources: [MDN scroll-snap-stop](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-stop), [MDN scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type). |
| M2 | **Tap targets below minimums** | nav links ≈28px (`site.css:160`), `.toggle-btn` ≈33px (`:166-176`), `.seed` ≈34px (`:502-513`), `.living.center .more` ≈22px (`:595-608`), `.cardfloat .close` ≈36px box (`:650-655`), footer links ≈27px (`:736`) | WCAG 2.2 SC 2.5.8 floor 24×24px (AA), Apple HIG 44pt, Material 48dp. Grow hit area via padding or `::after` bleed under `(pointer: coarse)` — no visual change. |
| M3 | **Touch pointers get mouse effects; hover sticks** | `site.js:475-490` (tilt, no pointer gate), `:363-365` (scramble on `pointerenter`), `site.css:539` (`.living:hover img` zoom), `:193-198` (`.scatter:hover`) | Gate CSS flourishes in `@media (hover hover) and (pointer: fine)`; gate JS tilt with `matchMedia("(pointer: fine)")` — the pattern already exists at `site.js:382`. See [MDN @media/hover](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover) ("sticky hover" on touch). |
| M4 | **Gallery payload is original-resolution art; no responsive images** | `public/assets/image/` (7MB; trantor.jpg 1.7MB, cyber-fortune-telling.png 1.6MB, midnight-broadcast.jpg 1.1MB @2374²); `works.astro:52,63`; `[slug].astro:20` shows a 1.4MB PNG at 320px CSS width | No `srcset/sizes/width/height` → bandwidth + CLS. Astro 5.13 fix: `astro:assets` `<Image layout="constrained">` (build-time WebP/AVIF, width/height, hashed URLs — suits EdgeOne static). See [Astro images](https://docs.astro.build/en/guides/images/). |
| M5 | **vh/dvh inconsistency; no safe-area support** | `.vigil` bare `100vh` (`site.css:243`); no `viewport-fit=cover` (`Base.astro:40`) | Hero taller than the visible port on mobile Safari; `env(safe-area-inset-*)` is 0 without `viewport-fit=cover`. Add the dvh/svh line, viewport meta → `width=device-width, initial-scale=1, viewport-fit=cover`, pad header/`.scroll-cue`/footer with `env()`. [MDN viewport units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage-units) · [MDN env()](https://developer.mozilla.org/en-US/docs/Web/CSS/env). |
| M6 | **Un-guarded `color-mix()`** | `site.css:334, 373, 391-392, 555-556, 689` | WeChat X5 / UC / QQ kernels often trail Chrome 111 → whole declaration invalid; worst case `.medium-tag` loses its dark backing and petal-colored text sits unreadably on busy artwork. Add a plain-color declaration before each color-mix line (cascade fallback) or `@supports`. [caniuse color-mix](https://caniuse.com/mdn-css_types_color_color-mix). |

**iPad note:** 768–1024px is otherwise clean — `.wall` drops to 2 columns at ≤960px, the door grid
`minmax(240px,42%) 1fr` holds ≥721px, the header fits. The only tablet breakage is B1 (members),
plus iPads land in the coarse-pointer snap path even with a trackpad attached (acceptable; the M1
gutter applies).

### Polish

- **P1** `.scatter` `white-space: nowrap` EN sentences (~73 chars ≈390px) clip at ≤400px, masked by `body{overflow-x:hidden}` — drop nowrap or hide the longest lines (`site.css:182-199`, `en/index.astro:20-25`).
- **P2** `pump()` rAF writes styles every frame forever on home even after the hero is off-screen (`site.js:248-260`) — gate by the `glVisible` flag.
- **P3** `mix-blend-mode: difference` header over live WebGL + `backdrop-filter: blur(10px)` (`site.css:139-146, 134-135`) forces expensive compositing on phone GPUs — consider an opaque `--header-bg` swap on coarse pointers.
- **P4** View-transition cross-fade survives reduced-motion: `::view-transition-*` pseudos aren't matched by the `*, *::before, *::after` reset (`site.css:765-768, 832`) — add an explicit `::view-transition-old/new(root) { animation: none }`.
- **P5** No `theme-color` meta for Android status-bar tint ([MDN theme-color](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color)).
- **P6** `.cardfloat .stem` hides all scrollbars (`site.css:643-646`) — no scroll affordance on touch; add a bottom fade when overflow exists (deliberate design per commit log — flag, don't insist).
- **P7** `.living.center .tags { flex-wrap: nowrap; overflow: hidden }` (`site.css:580`) clips extra tags on phones — horizontal scroll is kinder.
- **P8** Footer QR is a 96px placeholder div, not a scannable image (`src/components/Footer.astro:53`).

## Thread B — Responsive CSS architecture (the retrofit doctrine)

### Media query syntax: keep classic `min/max-width`

Range syntax (`@media (720px <= width <= 1024px)`) is Baseline-2023, but **an engine that can't
parse it drops the entire rule silently**. With a desktop-first cascade, a dropped phone rule =
desktop layout on phones — the worst failure mode for WeChat-X5-era WebViews. Classic syntax parses
in every mobile browser since ~2012. Never use `only screen and` (an IE-era no-op).
[MDN: Using media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries).

### Breakpoint strategy: keep the existing notches, add a height axis

Content-based, not device-based ([web.dev Learn Design: media queries](https://web.dev/learn/design/media-queries)). The repo's existing notches
already map to a three-band model — formalize, don't reinvent:

| Band | Widths | Covers | What changes |
|---|---|---|---|
| Phone | ≤600px (existing) | 320–430px phones, folded foldables (~400) | 1-col `.wall`, stacked `.door`, compact nav, scatter fixes |
| Large-phone margin | 601–720 (existing) | big phones | door stack, scatter shrink (already present) |
| Tablet / unfolded foldable | 721–1024 (960 notch exists) | iPad portrait 744/768/810/820/834, unfolded foldables ~670–900 CSS px | 2-col `.wall`; eyeball the `.door` split |
| Desktop / tablet landscape | ≥1025 | iPad landscape 1024–1366 | current design unchanged |

Add `(orientation: landscape)` + `(max-height: 500px)` rules for phone landscape (shorten
paddings, hide `.scroll-cue`, relax snap — see M1). **Foldables**: do NOT build on
`@media (horizontal-viewport-segments)` / `env(viewport-segment-*)` — Media Queries L5,
Chromium-only, not Baseline ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/horizontal-viewport-segments)). Deep-linking
unfolded widths into a fluid tablet band IS the foldable story.

### Fluid type & spacing

`clamp(MIN, vw+rem, MAX)` is Baseline-2020; the middle term must combine a viewport unit with a rem
term so both zoom and resize behave ([MDN clamp()](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp)). Retrofit:

- Tokenize in the existing `:root` block: `--fs-display: clamp(2.75rem, 6vw + 1rem, 5rem)` —
  delivers PLAN.md's 60–80px desktop spec, ~44px floor on phones; replaces `.vigil-title`'s 6.2rem
  (99px) cap (`site.css:256`) and feeds `.wall-head h1` (`:483`).
- Convert the large vh paddings to svh-based clamps — `.chapter { padding: 9vh 0 }` (`:311`),
  `.wall-head` (`:482`), `.doorway { padding: 10vh 1.5rem }` (`:227`) → e.g.
  `padding: clamp(2.5rem, 8svh, 5rem) 0`, so landscape phones (~375px tall) don't blow out.
- Chinese glyphs are square — vw-fluidity behaves identically zh/en; Latin display (`.vigil-latin`,
  `:277`) can share the tokens.

### Container queries: component-intrinsic decisions only

Baseline since Feb 2023 ([MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)).
"Media queries answer *how big is the viewport*; container queries answer *how big is the slot this
component landed in*."

- Good fit: `.living` wall cards — avatar size, stem density, tag tuck keyed off the card's own
  width (`.living { container-type: inline-size }`; the multicol column provides the width from
  outside, satisfying the containment requirement). Same card then reads right in 3-col, 2-col and
  1-col without touching the masonry rules.
- Keep media queries for: header/nav, `.wall` column-count itself, snap behavior, hero type — all
  genuinely viewport questions.
- CN caveat: pre-Safari-16/Chrome-105 WebViews ignore `@container` (silent no-op). Safe posture:
  author the small/mobile card as the base style, enhance up inside the query — exactly MDN's own
  fallback advice.

### Dynamic viewport units & the 100vh problem

On mobile, bare `100vh` is sized for a *retracted* toolbar, so hero content bleeds under the URL
bar on load. The CSSWG answer: `svh` (small, always-visible), `lvh` (large), `dvh` (dynamic) —
Baseline 2022 ([web.dev: viewport units](https://web.dev/blog/viewport-units)). For THIS site: **`100svh` for the snap stations**
(`.vigil`, `.doorway`, `.epilogue`) — dvh resizes in a visible jump while scrolling, and the home
page programmatically snap-scrolls across full-viewport stations constantly; svh keeps geometry
stable and everything above the fold. Keep the `100vh` first declaration as the legacy fallback.

### Safe areas (notched phones)

`env(safe-area-inset-*)` is **0 unless the viewport meta has `viewport-fit=cover`** ([MDN viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Viewport_meta_element)).
Apply at: fixed `.site-header` (top, plus all four sides for landscape notch), `.site-footer`
(bottom, home-indicator zone), `.scroll-cue { bottom: calc(2rem + env(safe-area-inset-bottom, 0px)) }`,
and the JS-clamped `.cardfloat` margins (`site.js:562-565`). Never set `maximum-scale` /
`user-scalable=no` — iOS ignores it and it harms accessibility.

### Responsive images & what Astro 5 offers

Plain-HTML baseline ([web.dev responsive images](https://web.dev/learn/design/responsive-images)): `max-inline-size:100%`, always set
`width`/`height` (CLS), `loading="lazy"` below the fold (already present), `srcset` width
descriptors REQUIRE a matching `sizes`.

- Files in `public/` are copied as-is, never optimized — the current state.
- `<Image>`/`<Picture>` from `astro:assets` process `src/` imports at build time (Sharp) → perfect
  for EdgeOne static: hashed URLs, inferred `width`/`height`, WebP default.
- **`layout` prop (astro ≥5.10, we ship 5.13)**: `layout="constrained" | "full-width"` auto-generates
  `srcset` + `sizes`; `<Picture formats={['avif','webp']}>` adds format fallback.
- Collections: swap `cover: z.string()` → the `image()` schema helper (`src/content.config.ts:14`),
  `cover: "./cover.png"` relative to each md file; then `<Image src={d.cover}/>` works in
  `[slug].astro`.
- Payoff estimate: a 380px column needs ~760px@2x ≈ 80–150KB WebP — versus 1.1–1.7MB originals.
  Wall `sizes`: `(min-width:1240px) 380px, (min-width:960px) 33vw, (min-width:600px) 46vw, calc(100vw - 3rem)`.
- Zero-refactor alternative: `tools/sync_works.mjs` already owns the registry pipeline — it could
  emit `*-480/-960/-1600` derivatives + hand-written srcset. You re-implement what `<Image>` gives
  free, but no content restructuring.

### Interaction media features

- `prefers-reduced-motion`: fully wired already; keep.
- `@media (hover: hover) and (pointer: fine)`: gate ALL decorative hover ([MDN @media/hover](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover)).
  `.scatter` hover-illumination is currently the only way to read those lines — under `(hover: none)`
  raise the resting opacity, or tie illumination to taps.
- `pointer: coarse/fine`: already the correct pivot for snap vs JS scroll and pollen. Extend to the
  magnetic tilt. iPads with a mouse report `any-pointer: fine` while `pointer` stays `coarse` — they
  keep touch snap AND could get tilt if gated on `any-pointer: fine` (the pollen gate at
  `site.js:382` already uses this).

### Recommended file architecture (one stylesheet, no build step)

1. Fix B1/B4-class bugs first.
2. Declare fluid type/spacing tokens in `:root` (theming already works this way over `[data-theme]`).
3. Optional high-leverage: CSS `@layer base, components, overrides` (Baseline 2022) so mobile rules
   win by position, not specificity fights.
4. Append a clearly delimited `######## responsive ########` zone at the END of `site.css` —
   container contexts, then ≤1024, ≤720, ≤600, then the height/hover/safe-area blocks.
   Smallest-screens-last reads naturally in a desktop-first file.

## Thread C — Touch & interaction adaptation (per feature)

### Global touch rules (do once, every feature benefits)

1. **Gate hover behind `@media (hover: hover)`.** On touch UAs `:hover` fires as an emulated hover
   on first tap — it can swallow the first tap or leave a stuck state. Wrap `.living:hover`,
   `.door:hover`, `.scatter:hover` (`site.css:193-198, 366, 452, 537-542, 609`) and mirror in JS:
   `matchMedia("(pointer: fine)")` on the tilt block (`site.js:475-490`).
2. **Tap-target floor** (computed from `site.css`):

   | Control | Rule | Hit height | Action |
   |---|---|---|---|
   | `.toggle-btn` (中/EN, ◐) | `site.css:166-176` | ~33px | pad to 44px on touch |
   | `.site-nav > a` | `:159-162` | ~28px | pad to 36–44px on touch |
   | `.seed` chips | `:502-514` | ~34px | pad ≥36px; keep `flex-wrap: wrap` (wrap beats horizontal scroll) |
   | `.living.center .more` | `:595-609` | ~25px | pad ≥36px — it's the ONLY way to read a truncated bio |
   | `.cardfloat .close` | `:650-656` | ~34px | 44×44 hit area, glyph unchanged |

   Standards: [Apple HIG 44pt](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [Material 48dp](https://m3.material.io/foundations/accessible-design/overview) · [WCAG 2.2 SC 2.5.8 (24×24 AA floor)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
3. **Tap feedback**: add `:active` states (scale(0.98) / border flash) on `.living`, `.seed`,
   `.toggle-btn`, `.door` FIRST, then `-webkit-tap-highlight-color: transparent` (MDN explicitly
   says only remove the highlight when replacing it). Add `touch-action: manipulation` on
   interactive elements to kill the double-tap-zoom click delay.
   [MDN tap-highlight](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-tap-highlight-color) · [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action).
4. **Sticky + overflow landmines**: `position: sticky` sticks relative to the nearest scroll
   container — any ancestor `overflow: hidden/auto/scroll` defeats it. `body{overflow-x:hidden}`
   propagates to the viewport so it's safe today, but prefer `overflow-x: clip` on `html` (creates
   no scroll container) if touching this. `overflow-x: hidden` only MASKS leaks — audit proactively.
   [MDN position](https://developer.mozilla.org/en-US/docs/Web/CSS/position) · [CSS-Tricks: finding/fixing overflow](https://css-tricks.com/findingfixing-unintended-body-overflow/).

### Works wall + planned petal-ring tooltip (PLAN.md:168)

- The tooltip is **redundant on touch** — `.stem` already permanently shows title · author · genre.
  Gate the petal ring behind `@media (hover: hover)`, make no touch substitute (the card content IS
  the tooltip). Optional ornament: one-shot petal bloom on first viewport entry via the existing
  IntersectionObserver `.on` pattern (`site.js:493-496`).
- **Never two-tap activation** (tap 1 = show tip, tap 2 = follow link) — the card's only job is
  reaching the work; NN/g counts the extra action as pure cost.
- Kill the hover img zoom and tilt on `pointer: coarse`; a subtle `:active { translateY(-2px) }`
  keeps tactility.

### Lightbox for paintings (PLAN.md:177, not yet built)

- Model: **full-screen `<dialog>` with `.showModal()`** — free backdrop, Esc, top layer; style
  `::backdrop` in the palette tokens. Later unify the cardfloat overlay onto the same primitive
  (today's float doesn't trap focus or inert the wall — an a11y gap per the [ARIA dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)).
- Gestures (PhotoSwipe convention): swipe L/R = prev/next, **drag-down = close**, pinch zoom retained
  (never disable). `touch-action: pan-y` on the stage lets vertical scroll become the dismiss
  gesture natively. Dismiss threshold >25% height or velocity >0.5px/ms. Wire Android hardware back
  via history. Reference: [PhotoSwipe](https://photoswipe.com/).
- iOS scroll lock: `body.style.overflow = "hidden"` does NOT fully contain scroll on iOS Safari —
  use `overscroll-behavior: contain` on the overlay AND the position-preserving fixed-body trick
  (`position: fixed; top: -{scrollY}px`, restore on close).
  [CSS-Tricks: prevent page scrolling when a modal is open](https://css-tricks.com/prevent-page-scrolling-when-a-modal-is-open/).
- The thumbnail→lightbox View-Transition zoom is already proven in the codebase (theme toggle,
  `site.js:75-86`); treat it as enhancement — WeChat X5 kernels lag on VT support.

### Header nav: keep inline, DON'T hamburger

NN/g's quantified study: hidden nav cuts mobile navigation use ~1.5× (57% vs 86%), and their rule —
**"4 or fewer top-level links: display them visibly."** This site has exactly 4 + 2 toggles.
[nngroup.com/articles/hamburger-menus](https://www.nngroup.com/articles/hamburger-menus/).

At ≤600px: shrink header padding and nav gap (~0.6rem), font ~0.85rem, `flex-wrap: nowrap`, brand
text `display: none` (halo glyph remains the home link). Bottom bar rejected: wrong for a
read-and-leave gallery, fights the home page's mandatory scroll-snap and the iOS home-indicator
safe area. If the IA ever grows past ~5 links: "combo nav" (keep 花庭/住客名录 visible, rest under a
菜单 button) — NN/g's best-scoring hidden pattern.

### Activities sticky year rail (PLAN.md:159-160)

Reality check: `src/content/activities/` holds 4 files; a rail earns its place at ≥12 entries /
≥3 years. Ranked for this site:

1. **Inline year separators in the flow** ('2025 · MMXXV' hairline rows — manuscript voice, zero
   JS). Recommended NOW.
2. **Sticky year chip under the header** (small gold pill updated via IntersectionObserver,
   `rootMargin: -64px 0px -70% 0px`) once entries grow — WeChat-article style, no overlay conflicts.
3. Desktop ≥900px side rail: convert `.chronicle`'s left gutter into a 2-col grid with
   `position: sticky; top: 5rem` per year-group — but mind the overflow-ancestor trap above.
   Avoid a persistent side rail on phones: ~2.5rem of a 360px column squishes the CJK measure.

### Member-card expand overlay (built: `site.js:505-583`, `site.css:613-656`)

Mostly fine on touch (click activation, veil/close paths work). Fix list: iOS-safe scroll lock per
the lightbox section; `.close` 44×44 padding; `overscroll-behavior: contain` on `.cardfloat .stem`
(reaching the bio's end currently slings the page behind); bottom-fade scroll affordance where the
scrollbar is hidden.

### CSS-columns masonry on phones

Column-major flow reads down column 1 then column 2 — fine for the deliberately shuffled 花庭，
wrong for anything chronological (the chronicle correctly isn't columned — keep it that way).
`grid-template-rows: masonry` is still not interoperable (Chrome argues for `display: masonry`) —
**stay on CSS columns** ([MDN masonry](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Masonry_layout) · [Chrome blog](https://developer.chrome.com/blog/masonry)).
Options at ≤600px: 1 column (current, restores natural reading order) vs 2 columns at ~170–240px
item width (Pinterest phone convention). For the members 花名册 keep 1–2 columns; cards must never
drop below ~160px. Filter re-flow (`site.js:586-602`) pops hard in 1 column — extend the `.bloom`
class into a cheap 200ms FLIP fade.

### Finding horizontal overflow systematically

1. DevTools device mode at 360px; hover nodes — Chrome outlines scrollable overflow; or the walker:
   `[].forEach.call(document.querySelectorAll("*"), e => e.offsetWidth > document.documentElement.offsetWidth && console.log(e))`.
2. `body{overflow-x:hidden}` masks the scrollbar — on touch devices the page can still be
   drag-scrolled into the void. Suspects here: `.scatter` (absolute + nowrap), 3D-tilt transformed
   cards (transforms contribute to scrollable overflow on some engines), future lightbox captions.

## Thread D — Mobile performance & CJK typography

### Webfonts (Noto Serif SC) for mainland-CN mobile

- Google's CSS2 API already slices CJK by `unicode-range`: Noto Serif SC @2 weights ≈ 202
  `@font-face` slices; the browser fetches only glyphs on the page — typical 100–300KB/page.
  [Google CJK webfont docs](https://developers.google.com/fonts/docs/getting_started) · [MDN unicode-range](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range).
- **CN reliability is the real issue.** Curl-verified this run: `fonts.googleapis.cn` returns 200
  and its CSS points at `fonts.gstatic.cn` (slice downloads 200, ~2.7KB each) — Google's official
  mainland-reachable mirror. Minimal fix: swap hosts in `Base.astro:45-46`.
- Stronger: self-host slices — [cn-font-split (中文网字计划)](https://chinese-font.netlify.app/) cuts local
  Noto Serif SC into unicode-range woff2 slices; or `pyftsubset` ([fonttools](https://fonttools.readthedocs.io/) · [web.dev: reduce webfont size](https://web.dev/articles/reduce-webfont-size)).
  Cormorant Garamond + JetBrains Mono are ~40KB woff2 each — self-hosting removes all third-party
  DNS+TLS from first paint. Keep `font-display: swap`; consider preloading only the slice covering
  the hero title 「空想花庭」([web.dev font best practices](https://web.dev/articles/font-best-practices)).
- **Fallback stack bug** (`site.css:67`): Android has neither Songti SC nor SimSun — today it falls
  to bare `serif` which often maps to a sans on Android (书卷气尽失). Fixed stack:
  `"Noto Serif SC", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", "STSong", "SimSun", serif`
  — Android 11+ ships 思源宋体 (Noto Serif CJK SC), so the serif voice survives a dead webfont.
- Body settings already compliant: 1.08rem / line-height 2.05 / justify (`site.css:709`) is good
  CJK mobile book typography; justify is well-behaved on narrow CJK columns (no hyphenation needed;
  give EN pages `hyphens: auto`).

### Image payload

Lazy-loading exists (`works.astro:52,63`) but no `width/height` (CLS), no `decoding="async"`, no
srcset. Minimum-viable without pipeline change: pre-compress to WebP q≈80 at max-width 1200 + 600
and hand-write srcset; proper fix is Thread B's `astro:assets` migration.
[MDN lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading) · [web.dev image CWV](https://web.dev/articles/optimize-cwv-images).

### Animation/graphics cost on phones (three layers audited)

- **WebGL vigil shader** (`#gl`, `site.js:90-175`): 5-octave fbm + per-pixel hash; DPR uncapped
  (`:146-150`) → ~3.6 Mpx/60fps on DPR-3 phones. Fix per `fx-research.md`: `min(dpr, 1.5) * 0.75`
  internal resolution + CSS upscale (the canvas is already `width/height: 100%`, `site.css:105-110`)
  → pixel fill rate cut to ~1/4–1/6, visually indistinguishable for blurry value noise.
- **Petal canvas** (`#petals`, `site.js:262-334`): already DPR-capped, mobile counts reduced; real
  residual cost is the per-frame fullscreen clearRect + layer composite (~3 Mpx upload at DPR 2).
- **Pollen cursor** (`#pollen`): zero cost on phones (removed on coarse pointers + CSS
  `display: none`, `site.js:470-472`, `site.css:114`). No change.
- **Degradation ladder** (add a capability probe near `site.js:6`):
  ```js
  var conn = navigator.connection || {};
  var saveData = !!conn.saveData;
  var weakSoC = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  ```
  `prefers-reduced-motion` → current static fallbacks (already good);
  `saveData || weakSoC` → GL replaced by the existing static-gradient path (`site.js:168-172`),
  petals → ≤6 far. Caveat: `deviceMemory`/`saveData` are Chromium-only — iOS Safari has neither
  ([MDN deviceMemory](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory)); on iOS use a 1s rAF sample:
  avg frame interval >25ms (<40fps) → degrade. Stop all rAF on `pagehide`/`visibilitychange`
  ([MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)).

### Testing workflow from Windows (ranked by ROI)

1. **Real phone over LAN** (0 cost, primary): `npm run dev -- --host` ([Astro CLI --host](https://docs.astro.build/en/reference/cli-reference/#--host)),
   phone on same Wi-Fi → `http://<PC-IP>:4321` (allow inbound 4321 in Windows Firewall once).
2. **USB remote debugging**: Android Chrome → `chrome://inspect` — real console + perf traces for
   the WebGL shader. [Chrome remote debugging](https://developer.chrome.com/docs/devtools/remote-debugging).
3. **DevTools device emulation** (fast iteration, NOT verification): documented limits — CPU
   throttle ≠ GPU shader cost (the vigil shader always looks smooth emulated), and CJK system-font
   fallbacks (思源宋体/Songti) can't be emulated. [Chrome device mode](https://developer.chrome.com/docs/devtools/device-mode).
4. **Playwright device regression**: `devices: ['iPhone 13', 'Pixel 7']` + `reducedMotion` +
   `colorScheme` params cover theme/degrade paths; but its WebKit ≠ iOS Safari WebView, and it has
   no built-in network throttling. [Playwright emulation](https://playwright.dev/docs/emulation).
5. **Cloud real devices** (when testing CN ROMs matters): BrowserStack Live for overseas devices;
   Tencent [WeTest](https://wetest.qq.com/) for 华为/小米/荣耀 + WeChat built-in WebView (X5) — strongly
   recommended at least once, since club traffic arrives via WeChat shares.

## Thread E — Reference implementations, CJK/EN mobile typography, platform capabilities

### How the references do it

- **Pinterest Gestalt masonry** ([docs](https://gestalt.pinterest.systems/web/masonry)): measurement-based
  with a measurement store; explicitly forbids items changing height after first render (no
  late-loading content, no hover-grow that reflows). Our hover zoom is GPU-composited `transform`
  (safe), but the filter `.gone` reflow is the documented trap — fine at 4 cards, needs care at 40.
  Their phone convention: 2 columns at ~170–240px item width, 8–12px gutters.
- **PhotoSwipe** ([photoswipe.com](https://photoswipe.com/)) is the de-facto touch-lightbox reference:
  pinch-to-zoom **with dynamic srcset upgrade during zoom**, double-tap zoom, vertical drag to
  dismiss, edge swipe between items, captions below/beside the image (v5 moved captions to a plugin
  for a11y) — never a hard overlay bar over the image. Don't block pinch zoom to feel "app-like".
- **Toyhouse**: cite its *data model* (per PLAN.md:175), not its mobile UX — desktop-first Bootstrap,
  cramped phone grids; a cautionary reference. (Not re-verified this run.)

### Bilingual CJK/EN mobile typography

- **Line height**: [W3C CLReq line gap](https://w3c.github.io/clreq/#line_gap) prescribes a line gap of
  50–100% of the character frame → **line-height 1.5–2.0 for Chinese body**. Ours: body 1.85,
  chapbook 2.05 — compliant; the weak spot is `.stem p` at 1.75 with a 0.85rem font. CLReq also: no
  inter-paragraph spacing in Chinese book typography — use the 2em indent (the chapbook already
  does, `site.css:710`).
- **Line-breaking rules** ([CLReq prohibition rules](https://w3c.github.io/clreq/#prohibition_rules_for_line_start_and_line_end)): closing
  punctuation must not start a line, opening brackets must not end one. Browsers honor this **only
  if `lang` is correct** (`zh-CN` is set, `Base.astro:37` ✓). Add `line-break: strict` on zh block
  text; NEVER `word-break: break-all` on CJK.
- **New CSS i18n primitives** ([Chrome: 4 new CSS i18n features](https://developer.chrome.com/blog/css-i18n-features)):
  `text-autospace: ideograph-alpha ideograph-numeric` auto-inserts the CJK↔Latin gap our metadata
  rows hand-simulate — but it's **additive with letter-spacing** (we set 0.14em tracking), so test
  before applying; `text-spacing-trim` trims fullwidth-punctuation space so wrapped 「lines align
  (default-on in current Chrome); `word-break: auto-phrase` is Japanese-only for now.
- **Centered CJK + letter-spacing**: tracking adds space after the last glyph too, so centered CJK
  titles sit visibly off-center — compensate with matching `text-indent`/`padding-left`, or scope
  tracking to `.latin` spans only. (`wall-head h1` 0.16em, `.vine` captions 0.45em, `.vigil-latin` 0.5em.)
- **Size floors**: CJK ≥14px body, mono numerals ≥12px; our 0.62–0.68rem metadata rows (~10–11px)
  fail this on phones. `font-variant: small-caps` is a no-op on CJK glyphs — harmless, but don't
  rely on it to differentiate zh labels.

### What Astro 5 itself offers

- **Native cross-document View Transitions** (what we use via `@view-transition { navigation: auto }`,
  `site.css:765`): [Chrome 126+](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document),
  [Safari 18.2 (iOS 18.2, Dec 2024)](https://webkit.org/blog/16301/webkit-features-in-safari-18-2/) — same-origin only, >4s loads
  auto-skip, unsupported engines simply skip → safe progressive enhancement. Watch the double-fire
  with the custom pageturn overlay on locale switches (root crossfade + sheet); coerce types or name
  elements to keep one motion.
- **`<ClientRouter />`**: adds SPA transitions + prefetch for older iOS, BUT turns the site into an
  SPA — `site.js` binds on first DOM and would silently break wall filters/bios after the first
  client nav unless restructured around `astro:page-load`. Not worth it now.
- **Prefetch** (`prefetch: true` in config): use `defaultStrategy: 'tap'` or `'viewport'` — Astro
  automatically degrades to tap on data-saver/slow connections, the right default for CN mobile data
  ([docs](https://docs.astro.build/en/guides/prefetch/)).
- **Dev toolbar Audit app**: flags per-page perf/a11y issues during dev — run it at small viewports;
  it catches the tiny text/targets class of bugs ([docs](https://docs.astro.build/en/guides/dev-toolbar/)).
- **EdgeOne note**: repo-side srcset (astro:assets) is deterministic and portable; EdgeOne's
  CDN-side image adaptation exists but is a platform lock-in.

## Anti-patterns to avoid (mobile, this stack)

1. Mandatory scroll-snap over taller-than-viewport sections (landscape phones → trapped content).
2. Hover-as-only-reveal (scatter lines, scramble, tilt — pointer-dependent with no tap path).
3. Bare `100vh` without an svh/dvh fallback.
4. Inline styles that outrank responsive breakpoints (the members wall `column-count:4`).
5. Full-resolution originals as grid thumbnails; images without `width`/`height` (CLS) or `srcset`.
6. Column-major masonry for chronological content (fine for the shuffled 花庭； never for 活动志).
7. Disabling pinch zoom (`maximum-scale`, `user-scalable=no`) to feel app-like.
8. Sub-12px CJK metadata / sub-24px touch targets.
9. Scroll-jacking on touch (wheel-hijack correctly stays `pointer: fine`-gated — keep CSS-snap-only on touch).
10. Double transitions: native cross-document VT + the manual pageturn sheet firing together.
11. `<ClientRouter />` without re-architecting `site.js` around `astro:page-load`.
12. `word-break: break-all` or blanket `letter-spacing` on CJK body text.

## Suggested fix order & acceptance matrix

**Order**: B1 (one-line class change) → B2 (mobile nav) → B4 (DPR cap + half-res GL) → B3 (font
host swap; self-host slices later) → M5 (dvh + viewport-fit + safe areas) → M2 (tap targets) →
M4 (astro:assets images) → M3 (hover gates) → M1 / M6 → polish (P1–P8) + fluid-type tokens.

**Acceptance matrix**: 320 / 360 / 375 / 390 / 430 widths; iPad Mini 744 & iPad 810 portrait, iPad
Pro 11" 834 + landscape 1194; one unfoldable approximation (~720×900); short-viewport pass
(360×640 landscape); zh + en locales; light + dark themes; `prefers-reduced-motion` on; WeChat
in-app browser on one mid-range Android (WeTest if no device at hand). Every gate: `npm run build`
+ `npm run check` clean, no horizontal drag-scroll into the void, first tap never swallowed.

## Sources

- MDN — [media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries) · [container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) · [viewport units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage-units) · [env()](https://developer.mozilla.org/en-US/docs/Web/CSS/env) · [viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Viewport_meta_element) · [clamp()](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp) · [@media hover](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover) · [@media pointer](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer) · [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) · [-webkit-tap-highlight-color](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-tap-highlight-color) · [overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) · [scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type) · [scroll-snap-stop](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-stop) · [masonry](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Masonry_layout) · [position](https://developer.mozilla.org/en-US/docs/Web/CSS/position) · [unicode-range](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range) · [font-family](https://developer.mozilla.org/en-US/docs/Web/CSS/font-family) · [line-break](https://developer.mozilla.org/en-US/docs/Web/CSS/line-break) · [text-autospace](https://developer.mozilla.org/en-US/docs/Web/CSS/text-autospace) · [hyphens](https://developer.mozilla.org/en-US/docs/Web/CSS/hyphens) · [lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading) · [deviceMemory](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory) · [saveData](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData) · [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) · [theme-color](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color) · [horizontal-viewport-segments](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/horizontal-viewport-segments)
- web.dev — [viewport units](https://web.dev/blog/viewport-units) · [Learn: media queries](https://web.dev/learn/design/media-queries) · [Learn: responsive images](https://web.dev/learn/design/responsive-images) · [font best practices](https://web.dev/articles/font-best-practices) · [optimize webfont loading](https://web.dev/articles/optimize-webfont-loading) · [reduce webfont size](https://web.dev/articles/reduce-webfont-size) · [prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) · [image CWV](https://web.dev/articles/optimize-cwv-images) · [Baseline](https://web.dev/baseline)
- Astro — [images](https://docs.astro.build/en/guides/images/) · [view transitions](https://docs.astro.build/en/guides/view-transitions/) · [prefetch](https://docs.astro.build/en/guides/prefetch/) · [dev toolbar](https://docs.astro.build/en/guides/dev-toolbar/) · [CLI --host](https://docs.astro.build/en/reference/cli-reference/#--host)
- Standards — [WCAG 2.2 SC 2.5.8](https://www.w3.org/TR/WCAG22/#target-size-minimum) · [Apple HIG accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [Material accessible design](https://m3.material.io/foundations/accessible-design/overview) · [W3C CLReq](https://w3c.github.io/clreq/) · [ARIA APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) · [Media Queries L4](https://www.w3.org/TR/mediaqueries-4/) · [Media Queries L5 viewport segments](https://www.w3.org/TR/mediaqueries-5/#mf-horizontal-viewport-segments) · [CSS Containment L3](https://www.w3.org/TR/css-contain-3/#container-queries) · [caniuse color-mix](https://caniuse.com/mdn-css_types_color_color-mix)
- Vendors/blogs — [Chrome cross-document VT](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document) · [Chrome CSS i18n features](https://developer.chrome.com/blog/css-i18n-features) · [Chrome masonry post](https://developer.chrome.com/blog/masonry) · [Chrome remote debugging](https://developer.chrome.com/docs/devtools/remote-debugging) · [Chrome device mode](https://developer.chrome.com/docs/devtools/device-mode) · [WebKit Safari 18.2](https://webkit.org/blog/16301/webkit-features-in-safari-18-2/) · [WebKit Safari 17.4](https://webkit.org/blog/14776/webkit-features-in-safari-17-4/) · [NN/g hamburger menus](https://www.nngroup.com/articles/hamburger-menus/) · [CSS-Tricks overflow](https://css-tricks.com/findingfixing-unintended-body-overflow/) · [CSS-Tricks modal scroll lock](https://css-tricks.com/prevent-page-scrolling-when-a-modal-is-open/) · [CSS-Tricks viewport units](https://css-tricks.com/the-trick-to-viewport-units-on-mobile/) · [Google CJK webfonts](https://developers.google.com/fonts/docs/getting_started) · [cn-font-split 中文网字计划](https://chinese-font.netlify.app/) · [fonttools](https://fonttools.readthedocs.io/)
- References — [Pinterest Gestalt masonry](https://gestalt.pinterest.systems/web/masonry) · [PhotoSwipe](https://photoswipe.com/) · [Playwright emulation](https://playwright.dev/docs/emulation) · [BrowserStack test devices](https://www.browserstack.com/test-devices) · [腾讯 WeTest](https://wetest.qq.com/)

Caveats: WebSearch was unavailable during research (auth); external facts were verified by direct
fetch or live curl (fonts.googleapis.cn / fonts.gstatic.cn 200-verified). w3.org / apple.com /
m3.material.io block scrapers — cited at canonical URLs from stable prior knowledge. Toyhouse mobile
behavior asserted from prior knowledge, not re-verified. The audit's header-width numbers are
computed estimates from font metrics — worth one real-device pass at 360px/390px (zh + en) before
and after the header work.
