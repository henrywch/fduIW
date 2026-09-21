// 空想花庭 — unified motion engine
// Vigil shader (night) → dawn (theme) → Illuminated Walk → Living Wall
(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isDark = function () { return root.getAttribute("data-theme") === "dark"; };

  /* ============ locale page-turn ============
     zh→en turns from the left hinge (codex); en→zh from the right (thread-bound
     books open on the right). State passes through sessionStorage so the
     destination page can lift the leaf the same way it was laid down. */
  var LANG_TURN_KEY = "hds-locale-turn";
  function makeSheet(hinge, cls, word) {
    var pt = document.createElement("div");
    pt.className = "pageturn " + hinge + " " + cls;
    pt.innerHTML =
      '<div class="sheet">' +
        '<svg class="leaf-mark" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(-18 32 32)"/></svg>' +
        (word ? '<div class="leaf-word">' + word + "</div>" : "") +
        '<div class="shade"></div>' +
      "</div>";
    document.body.appendChild(pt);
    return pt;
  }

  // departure: intercept the language toggle
  document.querySelectorAll("a.toggle-btn").forEach(function (a) {
    var label = (a.textContent || "").trim();
    if (label !== "EN" && label !== "中") return;
    if (reduced) return;
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var toEn = label === "EN";
      try { sessionStorage.setItem(LANG_TURN_KEY, toEn ? "lift-left" : "lift-right"); } catch (_) {}
      var pt = makeSheet(toEn ? "hinge-left" : "hinge-right",
                         toEn ? "cover-left" : "cover-right",
                         toEn ? "HORTUS&nbsp;DE&nbsp;ESCAPISMO" : "空 想 花 庭");
      var href = a.getAttribute("href");
      var done = false;
      function go() { if (!done) { done = true; location.href = href; } }
      pt.querySelector(".sheet").addEventListener("animationend", go);
      setTimeout(go, 900); // fallback if animation is throttled away
    });
  });

  // arrival: lift the leaf laid down on the way here
  var turnIn = null;
  try { turnIn = sessionStorage.getItem(LANG_TURN_KEY); } catch (_) {}
  // head script may mirror it onto <html> to suppress the flash before JS runs
  if (!turnIn && root.hasAttribute("data-turn-in")) turnIn = root.getAttribute("data-turn-in");
  if (turnIn && root.classList.contains("turn-arrive")) {
    root.classList.remove("turn-arrive");
    root.removeAttribute("data-turn-in");
    try { sessionStorage.removeItem(LANG_TURN_KEY); } catch (_) {}
    if (!reduced) {
      var lift = makeSheet(turnIn === "lift-left" ? "hinge-left" : "hinge-right", turnIn);
      setTimeout(function () { lift.remove(); }, 900);
    }
  }

  /* ============ theme toggle (circular reveal) ============ */
  var dayTarget = isDark() ? 0 : 1, dayNow = dayTarget;
  function hdsSetDay() { dayTarget = isDark() ? 0 : 1; }

  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function (ev) {
      var next = isDark() ? "light" : "dark";
      var apply = function () {
        root.setAttribute("data-theme", next);
        localStorage.setItem("hds-theme", next);
        hdsSetDay();
      };
      if (document.startViewTransition && !reduced) {
        var x = ev.clientX, y = ev.clientY;
        var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        var vt = document.startViewTransition(apply);
        vt.ready.then(function () {
          root.animate(
            { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + r + "px at " + x + "px " + y + "px)"] },
            { duration: 420, easing: "ease-out", pseudoElement: "::view-transition-new(root)" }
          );
        });
      } else apply();
    });
  }

  /* ============ vigil shader (home only) ============ */
  var glc = document.getElementById("gl");
  var vigil = document.querySelector(".vigil");
  if (glc && vigil) {
    var gl = glc.getContext("webgl");
    var mouse = [0.5, 0.5];
    if (gl && !reduced) {
      var vsrc = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
      var fsrc = [
        "precision highp float;",
        "uniform vec2 r;uniform float t;uniform vec2 m;uniform float d;",
        "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
        "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
        " return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}",
        "float fbm(vec2 p){float v=0.,a=.5;",
        " for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.05+vec2(1.7,9.2);a*=.5;}return v;}",
        "void main(){",
        " vec2 uv=gl_FragCoord.xy/r; vec2 q=uv*vec2(r.x/r.y,1.);",
        " vec2 drift=vec2(t*.02,-t*.008);",
        " float n=fbm(q*2.2+drift+fbm(q*3.5-drift*1.6)*.9);",
        " float panes=abs(fract(n*7.)-.5)*2.;",
        " float lead=smoothstep(.90,1.,panes);",
        // night: nave indigo -> emerald -> candle gold
        " vec3 indigo=vec3(.086,.102,.149),green=vec3(.30,.44,.32),gold=vec3(.88,.76,.48);",
        " vec3 cN=mix(indigo,green,smoothstep(.25,.65,n));",
        " cN=mix(cN,gold,smoothstep(.62,.85,n));",
        // day: vellum -> willow -> lateran gold, lead brightens
        " vec3 dayGold=vec3(.79,.64,.36);",
        " vec3 cD=mix(vec3(.925,.905,.87),vec3(.58,.66,.52),smoothstep(.2,.62,n));",
        " cD=mix(cD,dayGold,smoothstep(.6,.88,n));",
        " vec3 col=mix(cN,cD,d);",
        " float dist=distance(uv,m);",
        " col+=gold*exp(-dist*6.5)*.35*(1.-d*.7);",
        " col+=dayGold*exp(-dist*8.)*.25*d;",
        // lead lines: near-black at night, warm brown ink by day
        " vec3 leadN=vec3(.04,.045,.07), leadD=vec3(.32,.27,.19);",
        " col=mix(col,mix(leadN,leadD,d),lead*.65);",
        // vignette only keeps its grip at night
        " col*=mix(1.-.35*distance(uv,vec2(.5)),1.,d);",
        " col+=(hash(gl_FragCoord.xy+t)-.5)*.03;",
        " gl_FragColor=vec4(col,1.);}"
      ].join("\n");
      function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vsrc));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fsrc));
      gl.linkProgram(prog); gl.useProgram(prog);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var uR = gl.getUniformLocation(prog, "r"),
          uT = gl.getUniformLocation(prog, "t"),
          uM = gl.getUniformLocation(prog, "m"),
          uD = gl.getUniformLocation(prog, "d");
      function size() {
        glc.width = innerWidth * devicePixelRatio;
        glc.height = innerHeight * devicePixelRatio;
        gl.viewport(0, 0, glc.width, glc.height);
      }
      size(); addEventListener("resize", size);
      var t0 = performance.now(), glVisible = true;
      (function frame() {
        if (glVisible || Math.abs(dayNow - dayTarget) > 0.002) {
          dayNow += (dayTarget - dayNow) * 0.05;
          gl.uniform2f(uR, glc.width, glc.height);
          gl.uniform1f(uT, (performance.now() - t0) / 1000);
          gl.uniform2f(uM, mouse[0], mouse[1]);
          gl.uniform1f(uD, glVisible ? dayNow : dayTarget); // seamless handoff when scrolled past
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        requestAnimationFrame(frame);
      })();
      // pause shading when the walk fully covers the vigil
      addEventListener("scroll", function () {
        glVisible = window.scrollY < innerHeight * 1.4;
      }, { passive: true });
    } else {
      glc.style.background = isDark()
        ? "radial-gradient(ellipse at 50% 30%, #2a2f42, #161A26)"
        : "radial-gradient(ellipse at 50% 30%, #fdf9ee, #F4EFE3)";
    }
    addEventListener("pointermove", function (e) {
      mouse[0] = e.clientX / innerWidth; mouse[1] = 1 - e.clientY / innerHeight;
    });

    /* ---------- station-to-station scroll (desktop; touch uses CSS snap) ----------
       One gesture = one station. Full-viewport transitions feel comfortable at
       600–900ms (fullPage.js ships 700ms; Lenis-class lerp lands in the same
       band), so each carry runs 850ms with easeOutCubic and locks input while
       moving. */
    if (matchMedia("(pointer: fine)").matches && !reduced) {
      var stations = [];
      ["section.vigil", ".doorway", ".epilogue"].forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (el) { stations.push(el); });
      });
      stations.push(document.querySelector(".site-footer"));
      stations = stations.filter(Boolean);

      var DURATION = 850, animating = false, stops = [];
      function measure() {
        var maxY = document.documentElement.scrollHeight - innerHeight;
        stops = stations
          // offsetTop is relative to the nearest positioned ancestor (.walk) —
          // rect is not, so this stays correct however the page is structured
          .map(function (el) { return el.getBoundingClientRect().top + window.scrollY; })
          .concat([maxY])
          .map(function (y) { return Math.max(0, Math.min(y, maxY)); })
          .sort(function (a, b) { return a - b; });
      }
      measure();
      addEventListener("load", measure);
      addEventListener("resize", measure);
      function nearestStop() {
        var y = window.scrollY, best = 0, bd = Infinity;
        stops.forEach(function (s, i) { var d = Math.abs(s - y); if (d < bd) { bd = d; best = i; } });
        return best;
      }
      function carry(dir) {
        if (animating) return;
        var from = nearestStop();
        var to = from + dir;
        if (to < 0 || to >= stops.length) return;
        var y0 = window.scrollY, y1 = stops[to];
        if (Math.abs(y1 - y0) < 4) return;
        animating = true;
        var htmlEl = document.documentElement;
        htmlEl.style.scrollBehavior = "auto";
        var t0 = performance.now();
        (function step(now) {
          var k = Math.min((now - t0) / DURATION, 1);
          var e2 = 1 - Math.pow(1 - k, 3); // easeOutCubic
          window.scrollTo(0, y0 + (y1 - y0) * e2);
          if (k < 1) requestAnimationFrame(step);
          else { animating = false; htmlEl.style.scrollBehavior = ""; }
        })(performance.now());
      }
      addEventListener("wheel", function (e) {
        if (Math.abs(e.deltaY) < 12) return;
        e.preventDefault();
        if (!animating) carry(e.deltaY > 0 ? 1 : -1);
      }, { passive: false });
      addEventListener("keydown", function (e) {
        var next = { PageDown: 1, ArrowDown: 1, " ": 1, PageUp: -1, ArrowUp: -1 }[e.key];
        if (e.key === "Home") { e.preventDefault(); window.scrollTo(0, 0); return; }
        if (e.key === "End") { e.preventDefault(); window.scrollTo(0, document.documentElement.scrollHeight); return; }
        if (next !== undefined && !e.metaKey && !e.ctrlKey) { e.preventDefault(); carry(next); }
      });
      window.__homeStops = stops; // debug handle
    }

    /* ---------- the dawn: vigil lifts away as you scroll ---------- */
    var content = document.querySelector(".vigil-content");
    var cue = document.querySelector(".scroll-cue");
    var header = document.querySelector(".site-header");
    var petalC = document.getElementById("petals"), shade = document.querySelector(".vigil-shade");
    var eased = window.scrollY;
    (function pump() {
      eased += (window.scrollY - eased) * 0.12;
      var k = Math.min(eased / (innerHeight * 0.92), 1);
      if (content) {
        content.style.transform = "translateY(" + (-eased * 0.42) + "px) scale(" + (1 - k * 0.06) + ")";
        content.style.opacity = 1 - k * 1.1;
      }
      if (cue) cue.style.opacity = Math.max(0, 1 - eased / 200);
      if (header) header.classList.toggle("over-abyss", eased < innerHeight * 0.6);
      if (petalC) petalC.style.opacity = 1 - k;
      if (shade) shade.style.opacity = 1 - k * 0.6;
      requestAnimationFrame(pump);
    })();

    /* ---------- petals over the vigil ----------
       sakura-petal silhouettes (notched tip, rounded lobes) in gold / blush /
       madder; two depth bands (far = small·dim·slow); shared low-frequency
       weather sine + scroll-velocity gusts lerped back to calm */
    var px = petalC.getContext("2d"), P = [];
    var pDpr = Math.min(devicePixelRatio || 1, 2);
    function sizeP() {
      petalC.width = Math.round(innerWidth * pDpr); petalC.height = Math.round(innerHeight * pDpr);
      px.setTransform(pDpr, 0, 0, pDpr, 0, 0);
    }
    sizeP(); addEventListener("resize", sizeP);
    function pcol() {
      var k = Math.random();
      return k < 0.6 ? "rgba(224,192,122," : k < 0.85 ? "rgba(242,226,216," : "rgba(205,122,100,";
    }
    function spawnPetal(init, far) {
      var r = far ? 1.3 + Math.random() * 1.6 : 2.6 + Math.random() * 3.1;
      return {
        far: far,
        baseX: Math.random() * innerWidth, driftX: 0,
        y: init ? Math.random() * innerHeight : -24,
        r: r,
        vy: (far ? 0.22 : 0.4) + Math.random() * 0.25 + r * 0.09,  // fall speed tied to size
        amp: far ? 12 + Math.random() * 12 : 24 + Math.random() * 16,
        fq: 0.35 + Math.random() * 0.5, ph: Math.random() * 6.2832,
        rot: Math.random() * 6.2832, vr: (Math.random() - 0.5) * 0.02,
        wq: 0.5 + Math.random() * 0.7, wph: Math.random() * 6.2832,
        col: pcol(),
        a: far ? 0.1 + Math.random() * 0.12 : 0.22 + Math.random() * 0.18
      };
    }
    var N_NEAR = reduced ? 0 : (innerWidth < 720 ? 4 : 9), N_FAR = reduced ? 0 : (innerWidth < 720 ? 8 : 15);
    for (var i = 0; i < N_NEAR + N_FAR; i++) P.push(spawnPetal(true, i >= N_NEAR));
    if (P.length) {
      var lastT = performance.now(), gust = 0, lastScr = window.scrollY;
      (function petalFrame(now) {
        now = now || performance.now();
        if (petalC.style.opacity !== "0") {
          var dt = Math.min((now - lastT) / 16.7, 3);      // clamp: no lurch after a background tab
          gust += (Math.max(-2.2, Math.min(2.2, (window.scrollY - lastScr) * 0.028)) - gust) * 0.06 * dt;
          var weather = Math.sin(now / 1000 * 0.22) * 0.22, t = now / 1000;
          px.clearRect(0, 0, innerWidth, innerHeight);
          P.forEach(function (p, i) {
            p.y += p.vy * dt;
            p.driftX += (weather + gust) * (p.far ? 0.35 : 1) * dt;
            var x = p.baseX + Math.sin(t * p.fq + p.ph) * p.amp + p.driftX;
            p.rot += (p.vr + Math.sin(t * p.wq + p.wph) * 0.006) * dt;   // slow secondary wobble
            if (p.y > innerHeight + 24) { P[i] = spawnPetal(false, p.far); return; }
            if (x < -60) p.driftX += innerWidth + 120; else if (x > innerWidth + 60) p.driftX -= innerWidth + 120;
            // sakura petal: notched tip, rounded lobes, tumble-squish blade, faint vein
            var sq = 0.5 + 0.5 * Math.abs(Math.cos(t * 0.6 * p.wq + p.wph));
            var w = p.r * 0.85 * sq, nd = p.r * 0.16;
            px.save(); px.translate(x, p.y); px.rotate(p.rot);
            px.globalAlpha = 0.6 + 0.4 * sq;
            px.fillStyle = p.col + p.a + ")";
            px.beginPath();
            px.moveTo(0, -p.r + nd);
            px.bezierCurveTo(w * 0.65, -p.r * 1.08, w * 1.25, -p.r * 0.3, w * 0.8, p.r * 0.28);
            px.bezierCurveTo(w * 0.55, p.r * 0.72, w * 0.2, p.r * 0.95, 0, p.r);
            px.bezierCurveTo(-w * 0.2, p.r * 0.95, -w * 0.55, p.r * 0.72, -w * 0.8, p.r * 0.28);
            px.bezierCurveTo(-w * 1.25, -p.r * 0.3, -w * 0.65, -p.r * 1.08, 0, -p.r + nd);
            px.fill();
            px.globalAlpha = (0.6 + 0.4 * sq) * 0.35;
            px.strokeStyle = "rgba(122,88,52,1)"; px.lineWidth = 0.6;
            px.beginPath(); px.moveTo(0, p.r * 0.85); px.quadraticCurveTo(w * 0.1, p.r * 0.1, 0, -p.r * 0.55); px.stroke();
            px.restore();
          });
        }
        lastT = now;
        lastScr = window.scrollY;
        requestAnimationFrame(petalFrame);
      })(performance.now());
    }
  } // end vigil

  /* ============ kinetic split title ============ */
  document.querySelectorAll("[data-kinetic]").forEach(function (el) {
    var raw = el.textContent;
    el.innerHTML = raw.split("").map(function (c, i) {
      return '<span class="ch" style="--i:' + i + '">' + (c === " " ? "&nbsp;" : c) + "</span>";
    }).join("");
  });

  /* ============ text scramble ============ */
  var POOL = "ΛVΞΓΘXΦΨΩ花庭律法共感圣徒荒野耕种·—01";
  function scramble(el, fin, dur) {
    var start = performance.now(), D = dur || 650;
    (function tick(now) {
      var k = Math.min((now - start) / D, 1), n = Math.floor(fin.length * k), s = fin.slice(0, n);
      for (var i = n; i < fin.length; i++) {
        var ch = fin[i];
        s += (ch === " " || ch === "·") ? ch : POOL[(Math.random() * POOL.length) | 0];
      }
      el.textContent = s;
      if (k < 1) requestAnimationFrame(tick);
    })(performance.now());
  }
  if (!reduced) {
    document.querySelectorAll("[data-scramble]").forEach(function (el) {
      var target = el.dataset.scramble || el.textContent.trim();
      el.dataset.scramble = target;
      var host = el.closest(".living") || el.closest(".door") || el;
      host.addEventListener("pointerenter", function () { scramble(el, target); });
    });
  }
  var ticker = document.querySelector("[data-ticker]");
  if (ticker && !reduced) {
    var msgs = ticker.dataset.ticker.split("||"), mi = 0;
    ticker.textContent = msgs[0];
    setInterval(function () {
      mi = (mi + 1) % msgs.length;
      scramble(ticker, msgs[mi], 1200);
    }, 6000);
  }

  /* ============ golden-spark cursor trail (living wall pages) ============
     baked kirakira sprites (tapered concave rays + hot core, per the lab
     research), stroke-exact spawns every ~7px of movement inside the rAF loop,
     fixed 80-slot ring buffer; fine pointers only, native cursor untouched */
  var pollen = document.getElementById("pollen");
  if (pollen && !reduced && (matchMedia("(pointer: fine)").matches || matchMedia("(any-pointer: fine)").matches)) {
    var c2 = pollen.getContext("2d");
    var cDpr = Math.min(devicePixelRatio || 1, 2);
    function sizeC() {
      pollen.width = Math.round(innerWidth * cDpr); pollen.height = Math.round(innerHeight * cDpr);
      c2.setTransform(cDpr, 0, 0, cDpr, 0, 0);
      c2.globalCompositeOperation = "lighter";   // sparks add light over the dark garden
    }
    sizeC(); addEventListener("resize", sizeC);
    var SPK = (function () {
      var variants = [{ R: 22, h: 0.5 }, { R: 22, h: 0.7 }, { R: 15, h: 0.55 }, { R: 15, h: 0.68 }];
      return variants.map(function (v) {
        var s = document.createElement("canvas"); s.width = s.height = 48;
        var g = s.getContext("2d"), cx = 24, cy = 24, k = 0.18 * v.R;
        var bg = g.createRadialGradient(cx, cy, 0, cx, cy, 24);
        bg.addColorStop(0, "rgba(235,205,150,0.22)"); bg.addColorStop(1, "rgba(235,205,150,0)");
        g.fillStyle = bg; g.fillRect(0, 0, 48, 48);
        g.fillStyle = "rgba(255,230,180,0.9)";
        g.beginPath();
        g.moveTo(cx, cy - v.R);
        g.quadraticCurveTo(cx + k, cy - k, cx + v.R * v.h, cy);
        g.quadraticCurveTo(cx + k, cy + k, cx, cy + v.R * 0.8);
        g.quadraticCurveTo(cx - k, cy + k, cx - v.R * v.h, cy);
        g.quadraticCurveTo(cx - k, cy - k, cx, cy - v.R);
        g.fill();
        var cg = g.createRadialGradient(cx, cy, 0, cx, cy, 4);
        cg.addColorStop(0, "rgba(255,247,230,0.95)"); cg.addColorStop(1, "rgba(255,220,150,0)");
        g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fill();
        return s;
      });
    })();
    var RING = 80, slots = [], head = 0, si;
    for (si = 0; si < RING; si++) slots.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, decay: 0.02, rot: 0, rotV: 0, spr: 0, glint: false, sz: 4 });
    function puff(x, y, dx, dy) {
      var p = slots[head]; head = (head + 1) % RING;              // overwrite the oldest spark
      var glint = Math.random() < 0.12;                           // rare larger grow-shrink glints
      p.x = x + (Math.random() - 0.5) * 5; p.y = y + (Math.random() - 0.5) * 5;
      p.vx = dx * 0.12 + (Math.random() - 0.5) * 0.7;             // inherit a whiff of cursor velocity
      p.vy = dy * 0.12 + (Math.random() - 0.5) * 0.7 - 0.25;
      p.life = 1;
      p.decay = 1 / (42 + Math.random() * 24);                    // 0.7 – 1.1 s of visible life
      p.rot = Math.random() * Math.PI * 2;
      p.rotV = (Math.random() - 0.5) * (glint ? 0.035 : 0.018);
      p.spr = (Math.random() * SPK.length) | 0;
      p.glint = glint;
      p.sz = glint ? 5.5 + Math.random() * 2.5 : 3.2 + Math.random() * 2.4;
    }
    var tX = -1, tY = -1, sX = -1, sY = -1, have = false;
    addEventListener("pointermove", function (e) { tX = e.clientX; tY = e.clientY; have = true; }, { passive: true });
    var lastD = performance.now();
    (function dust(now) {
      now = now || performance.now();
      var dt = Math.min((now - lastD) / 16.7, 3); lastD = now;
      if (have) {
        if (sX < 0) { sX = tX; sY = tY; }
        var steps = 0, dx, dy, d;
        for (;;) {
          dx = tX - sX; dy = tY - sY; d = Math.hypot(dx, dy);
          if (d < 7) break;
          sX += dx * (7 / d); sY += dy * (7 / d);
          puff(sX, sY, dx, dy);
          if (++steps >= 24) { sX = tX; sY = tY; break; }        // pointer warped: just catch up
        }
      }
      c2.clearRect(0, 0, innerWidth, innerHeight);
      for (var i = 0; i < RING; i++) {
        var p = slots[i];
        if (p.life <= 0) continue;
        p.life -= p.decay * dt;
        if (p.life <= 0) { p.life = 0; continue; }
        var age = 1 - p.life;
        p.vx *= Math.pow(0.96, dt); p.vy = p.vy * Math.pow(0.96, dt) - 0.012 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.rotV * dt;
        var tw = 0.75 + 0.25 * Math.sin(i * 1.7 + age * 22);     // twinkle
        var alpha = Math.min(age / 0.06, 1) * Math.pow(1 - age, 1.6) * tw;
        // motes scale in fast; glints run the symmetric grow-shrink that reads as a twinkle
        var sc = p.glint
          ? Math.pow(Math.sin(Math.PI * Math.min(age, 0.999)), 0.7) * (p.sz / 24)
          : Math.min(age / 0.15, 1) * (p.sz / 24);
        if (sc <= 0.02 || alpha <= 0.004) continue;
        c2.globalAlpha = Math.min(1, alpha);
        c2.save(); c2.translate(p.x, p.y); c2.rotate(p.rot);
        c2.drawImage(SPK[p.spr], -24 * sc, -24 * sc, 48 * sc, 48 * sc);
        c2.restore();
      }
      requestAnimationFrame(dust);
    })(performance.now());
  } else if (pollen) {
    pollen.remove();   // no trace layer at all on touch or reduced motion
  }

  /* ============ magnetic 3d tilt ============ */
  if (!reduced) {
    document.querySelectorAll(".living, .door").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          "perspective(800px) rotateY(" + x * 9 + "deg) rotateX(" + -y * 7 + "deg) translateY(-4px)";
      });
      card.addEventListener("pointerleave", function () {
        card.style.transition = "transform .6s cubic-bezier(.19,1,.22,1), border-color .3s, box-shadow .3s";
        card.style.transform = "";
        setTimeout(function () { card.style.transition = ""; }, 600);
      });
    });
  }

  /* ============ dropline / ring reveal ============ */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
  }, { threshold: 0.3 });
  document.querySelectorAll(".chapter, .door, .chron-item, .reveal-manual").forEach(function (el) { io.observe(el); });

  if (!CSS.supports || !CSS.supports("animation-timeline", "view()")) {
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("on"); io2.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { io2.observe(el); });
  }

  /* ============ living wall filter (multi-label: a work may sit in several cats) ============ */
  var seeds = document.querySelectorAll(".seed");
  if (seeds.length) {
    seeds.forEach(function (s) {
      s.addEventListener("click", function () {
        seeds.forEach(function (o) { o.classList.remove("active"); });
        s.classList.add("active");
        var f = s.dataset.f;
        document.querySelectorAll(".living[data-f]").forEach(function (p) {
          var cats = (p.dataset.f || "").split(/\s+/);
          var show = f === "all" || cats.indexOf(f) !== -1;
          p.classList.toggle("gone", !show);
          p.classList.remove("bloom");
          if (show) { void p.offsetWidth; p.classList.add("bloom"); }
        });
      });
    });
  }

  /* detail pages: slim header never uses difference blend */
  if (!vigil) {
    var h = document.querySelector(".site-header");
    if (h) h.classList.remove("over-abyss");
  }
})();
