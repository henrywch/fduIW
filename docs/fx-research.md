# FX research notes — 空想花庭 ambient layers

Collected by agent-swarm research. Context: manuscript/monastery aesthetic — dark valor bg `#161A26`, vellum light `#F4EFE3`, gold `#C9A45C`. This document records the three research threads so future design decisions can cite sources without re-searching.

## Thread A — Where cutting-edge web UI is judged

| Platform | URL | Strongest at | Best browsable lists |
|---|---|---|---|
| Awwwards | https://www.awwwards.com | jury-scored creative-dev / GSAP / WebGL | Sites of the Day `…/websites/sites_of_the_day/` · WebGL experiences `…/websites/webgl-experiences/` · GSAP `…/websites/gsap/` · Interaction Design `…/websites/interaction-design/` · Collections `…/collections/` |
| FWA | https://thefwa.com | oldest archive; ambient full-screen WebGL | FWA of the Day / Month / Year + Cutting Edge Award |
| CSSDA | https://www.cssdesignawards.com | split scores UI/UX/Innovation | WOTD winners gallery `…/wotd-award-winners` |
| Webby | https://winners.webbyawards.com | mainstream aspiration / tone | `…/features-design/best-visual-design-aesthetic` |
| Codrops | https://tympanus.net/codrops | tutorials by the same devs who win awards | tag pages e.g. `…/tag/webgl/`; Webzibition (>2000 curated sites) |
| GSAP showcase | https://gsap.com/showcase | sites that prove the motion stack | also weekly "site of the week" |
| siteInspire | https://www.siteinspire.com | granular combinable tags (style × type × subject) | best for vellum + typographic counterpoints |

Caveats: FWA/CSSDA are JS-rendered/bot-gated (browse manually); no literal "petals" tag exists anywhere — all tags are tech-level (WebGL / GSAP / Interaction). Workflow that works: scan look → profile page → tech stack → Codrops/GSAP tutorial.

## Thread B — Exemplar sites

| Site | URL | What it does | What to steal |
|---|---|---|---|
| Lasting Petals of Palestine | https://www.awwwards.com/sites/lasting-petals-of-palestine | Awwwards HM; ambient memorial — one petal per name | one-petal-per-entity semantics; ambience as reverence, not decoration |
| NYT Snow Fall (2012) | https://www.nytimes.com/projects/2012/snow-fall/index.html | ambient weather fog in chapter headers of a 15k-word narrative | zone fx — ambient only in hero/chapter dividers, never in正文 |
| teamLab (JP) | https://www.teamlab.art/ | dark-field generative flower ecosystems | single luminous motif on near-black; petals drift in clusters with per-petal luminosity |
| Particle Love (KR) | http://particle-love.com/ | ~1M GPU particles flock to cursor | built-in Low/Med/High quality picker; attraction/relaxation physics |
| Bruno Simon | https://bruno-simon.com/ | drivable Three.js world | quality/renderer controls as first-class UI |
| Rauno Freiberg | https://rauno.me/ | reference for interaction craft | ~150px radius of influence, soft decay, perfect 60fps > spectacular-laggy |
| darkroom.engineering | https://darkroom.engineering/ | makers of Lenis | scroll-velocity feeds wind — smooth-scroll + ambient fx as one system |
| antfu.me + 100.antfu.me (CN) | https://antfu.me / https://100.antfu.me | particle intro + lab pages, quiet content pages | fx/content contract: spectacle lives in intro, never in正文 |

Caveat: ORIZURU.jp (WOW inc; the canonical JP dark-field crane site) was unreachable during research — check https://www.w0w.co.jp/en/works for an archived state. JS-canvas effects at these sites were not fetch-renderable in research; visual descriptions rely on quoted text + reputations.

## Thread C — Implementation techniques

### (1) Natural petal/leaf falls
- Sinusoidal sway (`x = baseX + A·sin(t·f + phase)`), slow secondary wobble on rotation, per-petal fall speed tied to size/opacity (far = small·dim·slow), 2–3 depth layers, shared low-frequency wind sine = "weather" not rain.
- References: [jhammann/sakura](https://github.com/jhammann/sakura) · [599316527/sakura-canvas](https://github.com/599316527/sakura-canvas) · [CodePen qBpVzxP](https://codepen.io/rudtjd2548/pen/qBpVzxP) (canvas ~100 petals w/ Petal class) · [CodePen jOeMMXg](https://codepen.io/BerylSky/pen/jOeMMXg) (CSS-only fallback) · [sonht1109/sakura-petal-falling-css](https://github.com/sonht1109/sakura-petal-falling-css) · [tsParticles snow preset](https://github.com/tsparticles/tsparticles/tree/main/presets/snow) · [CSS-Tricks particles](https://css-tricks.com/playing-with-particles-using-the-web-animations-api/)

### (2) Cursor trails, responsive not noisy
- rAF-sampled(not raw mousemove), velocity/distance-threshold spawn, ring buffer 40–80, age-fade `alpha *= 0.95`, native cursor never hidden, `pointer-events:none` overlay canvas, hide on coarse pointers.
- References: [Codrops Custom Cursor Effects](https://tympanus.net/codrops/2019/01/31/custom-cursor-effects/) · [14islands performant cursor writeup](https://medium.com/14islands/developing-a-performant-custom-cursor-89f1688a02eb) · [Effect.Labs](https://effect-labs.com/en/pages/cursors.html) · [Kirupa lerp smoothing](https://www.kirupa.com/canvas/mouse_follow_ease.htm)

### (3) WebGL fbm backgrounds + fallbacks
- [Book of Shaders ch.13 (fbm + domain warping)](https://thebookofshaders.com/13/) — the drifting-vellum-mist look is `fbm(st + fbm(st))`, cap octaves at 3–5, ½-res canvas upscale.
- Fallback ladder (progressive enhancement): WebGL up? → GPU detect per [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Detect_WebGL); else static noise PNG/CSS gradient; `prefers-reduced-motion` → frozen single frame (per [web.dev](https://web.dev/articles/prefers-reduced-motion) / MDN).

### Pitfalls (GPU budget / mobile / a11y)
- Fullscreen fbm is per-pixel × octaves → quarter-res + blur upscaling; rAF stops in background tabs (don't fake a smooth resume, re-sync `time` from `performance.now()`).
- Petal count ≤120 visible on mobile — overdraw is the cost, not count. Sprite atlases > per-frame gradients. DPR cap at 2.
- `alpha:false` on static-bg canvases where possible.

## Suggested build order for 空想花庭
1. quarter-res mist shader with warm-gold undertone + static frame fallback;
2. petal layer with 2 depth bands, gold/vellum palette, lerped wind from scroll velocity;
3. cursor halo ring with lerp, coarse-pointer hidden, velocity-threshold spawns;
4. quality toggle (low/med/high) in a small settings UI — cite Particle Love.
