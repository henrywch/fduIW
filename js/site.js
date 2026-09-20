// 空想花庭 — unified motion engine
// Vigil shader (night) → dawn (theme) → Illuminated Walk → Living Wall
(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isDark = function () { return root.getAttribute("data-theme") === "dark"; };

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

    /* ---------- petals over the vigil ---------- */
    var px = petalC.getContext("2d"), P = [], N = reduced ? 0 : 18;
    function sizeP() { petalC.width = innerWidth; petalC.height = innerHeight; }
    sizeP(); addEventListener("resize", sizeP);
    function spawn(init) {
      return {
        x: Math.random() * innerWidth, y: init ? Math.random() * innerHeight : -20,
        r: 2.5 + Math.random() * 4, vy: 0.35 + Math.random() * 0.8,
        vx: (Math.random() - 0.5) * 0.4,
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.02,
        sway: Math.random() * Math.PI * 2,
        col: ["rgba(224,192,122,", "rgba(143,176,137,", "rgba(205,122,100,"][(Math.random() * 3) | 0],
        a: 0.18 + Math.random() * 0.3
      };
    }
    for (var i = 0; i < N; i++) P.push(spawn(true));
    (function petalFrame() {
      if (petalC.style.opacity !== "0") {
        px.clearRect(0, 0, petalC.width, petalC.height);
        P.forEach(function (p, i) {
          p.sway += 0.008; p.x += p.vx + Math.sin(p.sway) * 0.5; p.y += p.vy; p.rot += p.vr;
          if (p.y > innerHeight + 24) P[i] = spawn(false);
          px.save(); px.translate(p.x, p.y); px.rotate(p.rot);
          px.fillStyle = p.col + p.a + ")";
          px.beginPath(); px.ellipse(0, 0, p.r * 2, p.r, 0, 0, Math.PI * 2); px.fill();
          px.restore();
        });
      }
      requestAnimationFrame(petalFrame);
    })();
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

  /* ============ pollen cursor trail (living wall pages) ============ */
  var pollen = document.getElementById("pollen");
  if (pollen && !reduced) {
    var c2 = pollen.getContext("2d"), parts = [];
    function sizeC() { pollen.width = innerWidth; pollen.height = innerHeight; }
    sizeC(); addEventListener("resize", sizeC);
    addEventListener("pointermove", function (e) {
      if (parts.length < 120) {
        parts.push({
          x: e.clientX, y: e.clientY,
          vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2 - 0.4,
          life: 1, r: 1 + Math.random() * 2.2,
          col: ["224,192,122", "143,176,137", "205,122,100"][(Math.random() * 3) | 0]
        });
      }
    });
    (function dust() {
      c2.clearRect(0, 0, pollen.width, pollen.height);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        c2.beginPath();
        c2.fillStyle = "rgba(" + p.col + "," + p.life * 0.65 + ")";
        c2.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); c2.fill();
      }
      requestAnimationFrame(dust);
    })();
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

  /* ============ living wall filter ============ */
  var seeds = document.querySelectorAll(".seed");
  if (seeds.length) {
    seeds.forEach(function (s) {
      s.addEventListener("click", function () {
        seeds.forEach(function (o) { o.classList.remove("active"); });
        s.classList.add("active");
        var f = s.dataset.f;
        document.querySelectorAll(".living[data-f]").forEach(function (p) {
          var show = f === "all" || p.dataset.f === f;
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
