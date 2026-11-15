/* Lern-Parken – Interaktionen
   Prinzipien (Apple "Designing Fluid Interfaces"):
   - Feedback auf pointerdown, 1:1-Tracking beim Ziehen
   - Federn statt fester Dauer, jederzeit unterbrechbar
   - Loslass-Geschwindigkeit wird an die Feder übergeben, Momentum wird projiziert
*/
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var COLORS = ['#e0306a', '#6b3fa0', '#4caf50', '#7ec8e3', '#f5d93b', '#f08a2b', '#5b6bd6', '#ff7ddc'];

  /* ------------------------------------------------------------------
     Deterministischer Zufall – Konfetti sieht bei jedem Laden gleich aus
     ------------------------------------------------------------------ */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6d2b79f5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------
     Statisches Konfetti, verteilt wie auf der gedruckten Karte:
     dichter Streifen oben, Haufen unten rechts, vereinzelt dazwischen.
     ------------------------------------------------------------------ */
  var CONFETTI_PRESETS = {
    card: { seed: 7, count: 85, unit: 'cqi', size: 2.6, spread: 0.75 },
    join: { seed: 11, count: 80, unit: 'px', size: 14 }
  };

  function scatter(el) {
    var preset = CONFETTI_PRESETS[el.dataset.confetti];
    if (!preset) return;
    var r = rng(preset.seed);
    var html = '';
    for (var i = 0; i < preset.count; i++) {
      var zone = r();
      var x, y;
      if (zone < 0.45) {            // oben – dichter Rand, nach unten ausdünnend
        x = r() * 100;
        y = Math.pow(r(), 2.2) * 26;
      } else if (zone < 0.85) {     // unten rechts – Haufen
        x = 100 - Math.pow(r(), 1.6) * 55 * (preset.spread || 1);
        y = 100 - Math.pow(r(), 1.8) * 38 * (preset.spread || 1);
      } else {                      // unten links, vereinzelt
        x = r() * 45;
        y = 100 - Math.pow(r(), 2) * 12;
      }
      var w = preset.size * (0.55 + r() * 0.6);
      var h = w * (0.45 + r() * 0.35);
      var rot = Math.round(r() * 180 - 90);
      var c = COLORS[Math.floor(r() * COLORS.length)];
      var o = (0.75 + r() * 0.25).toFixed(2);
      html += '<i style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%;width:' +
        w.toFixed(2) + preset.unit + ';height:' + h.toFixed(2) + preset.unit +
        ';background:' + c + ';opacity:' + o + ';transform:translate(-50%,-50%) rotate(' + rot + 'deg)"></i>';
    }
    el.innerHTML = html;
  }

  document.querySelectorAll('[data-confetti]').forEach(scatter);

  /* ------------------------------------------------------------------
     Hero: dauerhaft rieselndes Konfetti
     - langsam, damit der Text lesbar bleibt
     - läuft nur, solange der Hero sichtbar und der Tab aktiv ist
     - bei "Bewegung reduzieren" ein stehendes Bild
     ------------------------------------------------------------------ */
  (function heroConfetti() {
    var cv = document.querySelector('.hero-confetti');
    if (!cv) return;
    var hero = cv.parentElement;
    var c = cv.getContext('2d');
    var W = 0, H = 0, pieces = [], raf = 0, last = 0;
    var visible = true;
    var r = rng(3);

    function makePiece(y) {
      var w = 7 + r() * 8;
      return {
        x: r() * W,
        y: y,
        w: w,
        h: w * (0.45 + r() * 0.3),
        fall: 22 + r() * 38,              // px/s
        swayAmp: 8 + r() * 22,
        swayFreq: 0.4 + r() * 0.7,
        phase: r() * Math.PI * 2,
        rot: r() * Math.PI * 2,
        vr: (r() - 0.5) * 2.4,
        flip: r() * Math.PI * 2,
        vf: 1.5 + r() * 3.5,              // Flattern um die eigene Achse
        color: COLORS[Math.floor(r() * COLORS.length)],
        alpha: 0.7 + r() * 0.3
      };
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = hero.getBoundingClientRect();
      var oldW = W || rect.width;
      W = rect.width; H = rect.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = Math.round(Math.min(110, Math.max(30, W * H / 11000)));
      pieces.forEach(function (p) { p.x = p.x / oldW * W; });
      while (pieces.length < target) pieces.push(makePiece(r() * (H + 40) - 20));
      pieces.length = target;
      draw(0);
    }

    function draw(dt) {
      c.clearRect(0, 0, W, H);
      for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        if (dt) {
          p.y += p.fall * dt;
          p.phase += p.swayFreq * dt;
          p.rot += p.vr * dt;
          p.flip += p.vf * dt;
          if (p.y > H + 20) {
            var n = makePiece(-20);
            n.y = -20 - r() * 40;
            pieces[i] = p = n;
          }
        }
        var x = p.x + Math.sin(p.phase) * p.swayAmp;
        c.save();
        c.globalAlpha = p.alpha;
        c.translate(x, p.y);
        c.rotate(p.rot);
        c.scale(1, Math.cos(p.flip));
        c.fillStyle = p.color;
        c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        c.restore();
      }
    }

    function tick(now) {
      var dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      draw(dt);
      raf = requestAnimationFrame(tick);
    }

    function update() {
      var run = visible && !document.hidden && !reduceMotion.matches;
      if (run && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
    else window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        update();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', update);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', update);
    update();
  })();

  /* ------------------------------------------------------------------
     Feder (Apple-Parameter: damping ratio + response)
     ------------------------------------------------------------------ */
  function Spring(value, onUpdate) {
    this.x = value;
    this.v = 0;
    this.target = value;
    this.onUpdate = onUpdate;
    this.raf = 0;
    this.last = 0;
  }

  Spring.prototype.set = function (value) {
    this.stop();
    this.x = this.target = value;
    this.v = 0;
    this.onUpdate(value);
  };

  Spring.prototype.stop = function () {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  // Startet immer vom aktuellen (sichtbaren) Wert – nie vom Ziel.
  Spring.prototype.to = function (target, opts, velocity) {
    var self = this;
    this.target = target;
    if (typeof velocity === 'number') this.v = velocity;
    var response = opts.response, zeta = opts.damping;
    var k = Math.pow(2 * Math.PI / response, 2);
    var c = 4 * Math.PI * zeta / response;

    if (reduceMotion.matches) { this.set(target); return; }

    this.stop();
    this.last = performance.now();
    function step(now) {
      var dt = Math.min((now - self.last) / 1000, 1 / 30);
      self.last = now;
      // in kleinen Teilschritten integrieren – stabil auch bei steifen Federn
      var n = 4, h = dt / n;
      for (var i = 0; i < n; i++) {
        var a = -k * (self.x - self.target) - c * self.v;
        self.v += a * h;
        self.x += self.v * h;
      }
      if (Math.abs(self.x - self.target) < 0.01 && Math.abs(self.v) < 0.5) {
        self.x = self.target; self.v = 0;
        self.onUpdate(self.x);
        self.raf = 0;
        return;
      }
      self.onUpdate(self.x);
      self.raf = requestAnimationFrame(step);
    }
    this.raf = requestAnimationFrame(step);
  };

  /* Momentum-Projektion (aus Apples Beispielcode) */
  function project(velocity, decelerationRate) {
    return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
  }

  /* ------------------------------------------------------------------
     Die Karte: ziehen zum Umdrehen
     ------------------------------------------------------------------ */
  var card = document.querySelector('.flipcard');
  if (card) {
    var inner = card.querySelector('.flipcard-inner');
    var hint = document.querySelector('.card-hint');
    var press = 1;        // Skalierung beim Drücken
    var tiltX = 0;        // Kippen beim Ziehen nach oben/unten

    var render = function () {
      var a = angle.x;
      inner.style.transform =
        'rotateZ(' + (-4 + Math.sin(a * Math.PI / 180) * 2) + 'deg) ' +
        'rotateX(' + tiltX.toFixed(2) + 'deg) ' +
        'rotateY(' + a.toFixed(2) + 'deg) ' +
        'scale(' + pressSpring.x.toFixed(4) + ')';
      // Glanz wandert mit der Drehung
      var gloss = 60 - ((a % 360) + 360) % 180 / 180 * 80;
      inner.style.setProperty('--gloss', gloss.toFixed(1) + '%');
      var showingBack = Math.round(a / 180) % 2 !== 0;
      card.setAttribute('aria-pressed', showingBack ? 'true' : 'false');
    };

    var angle = new Spring(0, render);
    var pressSpring = new Spring(1, render);
    var tiltSpring = new Spring(0, function (v) { tiltX = v; render(); });

    var drag = null;
    var DEFAULT = { damping: 1, response: 0.45 };
    var MOMENTUM = { damping: 0.8, response: 0.45 };
    var PRESS = { damping: 1, response: 0.2 };

    function hideHint() {
      if (hint) hint.classList.add('is-hidden');
    }

    function nearestFace(a) {
      return Math.round(a / 180) * 180;
    }

    card.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      card.setPointerCapture(e.pointerId);
      angle.stop();                       // fangen, wo sie gerade ist
      pressSpring.to(0.975, PRESS);       // sofortiges Feedback
      drag = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startAngle: angle.x,
        moved: false,
        history: [{ x: e.clientX, t: e.timeStamp }]
      };
    });

    card.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.startX;
      var dy = e.clientY - drag.startY;
      if (!drag.moved && Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // Hysterese
      drag.moved = true;
      var width = card.getBoundingClientRect().width;
      // 1:1 – eine Kartenbreite ziehen = halbe Drehung
      angle.x = drag.startAngle + dx / width * 180;
      tiltX = Math.max(-12, Math.min(12, -dy / width * 30));
      tiltSpring.x = tiltX;
      render();
      drag.history.push({ x: e.clientX, t: e.timeStamp });
      while (drag.history.length > 2 && e.timeStamp - drag.history[0].t > 100) drag.history.shift();
      hideHint();
    });

    function release(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      pressSpring.to(1, PRESS);
      tiltSpring.to(0, DEFAULT);

      if (!d.moved) {
        if (cancelled) return;
        // Tippen: zur nächsten Seite, ohne Überschwingen
        angle.to(nearestFace(angle.x) + 180, DEFAULT);
        hideHint();
        return;
      }

      // Geschwindigkeit in Grad/s aus der jüngsten Bewegung
      var width = card.getBoundingClientRect().width;
      var first = d.history[0], last = d.history[d.history.length - 1];
      var dt = Math.max(1, last.t - first.t);
      var pxPerSec = (last.x - first.x) / dt * 1000;
      if (e.timeStamp - last.t > 80) pxPerSec = 0;   // Finger lag still
      var degPerSec = pxPerSec / width * 180;

      // Momentum projizieren, dann höchstens eine Seite weiter einrasten
      var projected = angle.x + project(degPerSec, 0.99);
      var target = nearestFace(projected);
      target = Math.max(d.startAngle - 180, Math.min(d.startAngle + 180, target));
      var hadMomentum = Math.abs(degPerSec) > 200;
      angle.to(target, hadMomentum ? MOMENTUM : DEFAULT, degPerSec);
    }

    card.addEventListener('pointerup', function (e) { release(e, false); });
    card.addEventListener('pointercancel', function (e) {
      if (drag) drag.moved = true;
      release(e, true);
    });

    // Tastatur: Enter/Leertaste
    card.addEventListener('click', function (e) {
      if (e.detail === 0) {
        angle.to(nearestFace(angle.x) + 180, DEFAULT);
        hideHint();
      }
    });

    // Einmal leicht anstupsen, damit man sieht: die Karte lebt
    if (!reduceMotion.matches) {
      setTimeout(function () {
        if (drag || angle.x !== 0) return;
        angle.to(0, { damping: 0.5, response: 0.6 }, -220);
      }, 1400);
    }
  }

  /* ------------------------------------------------------------------
     Konfetti-Burst – nur dort, wo es etwas zu feiern gibt
     ------------------------------------------------------------------ */
  var canvas = document.querySelector('.burst');
  var ctx = canvas && canvas.getContext('2d');
  var particles = [];
  var burstRaf = 0;

  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function burst(x, y) {
    if (!ctx || reduceMotion.matches) return;
    if (!burstRaf) resizeCanvas();
    var r = Math.random;
    for (var i = 0; i < 140; i++) {
      var angle = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.1;
      var speed = 500 + r() * 900;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 7 + r() * 7,
        h: 4 + r() * 4,
        rot: r() * Math.PI * 2,
        vr: (r() - 0.5) * 14,
        flip: r() * Math.PI * 2,
        vf: 6 + r() * 10,
        color: COLORS[Math.floor(r() * COLORS.length)],
        life: 0
      });
    }
    if (!burstRaf) {
      var last = performance.now();
      var tick = function (now) {
        var dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (var i = particles.length - 1; i >= 0; i--) {
          var p = particles[i];
          p.life += dt;
          p.vx *= Math.pow(0.12, dt);      // Luftwiderstand
          p.vy = p.vy * Math.pow(0.12, dt) + 1400 * dt;
          p.vy = Math.min(p.vy, 260);        // Papier sinkt langsam
          p.x += (p.vx + Math.sin(p.flip) * 40) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          p.flip += p.vf * dt;
          var alpha = Math.max(0, Math.min(1, 3.2 - p.life));
          if (alpha <= 0 || p.y > innerHeight + 40) { particles.splice(i, 1); continue; }
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.cos(p.flip));  // flattern
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
        if (particles.length) {
          burstRaf = requestAnimationFrame(tick);
        } else {
          burstRaf = 0;
          ctx.clearRect(0, 0, innerWidth, innerHeight);
        }
      };
      burstRaf = requestAnimationFrame(tick);
    }
  }

  if (canvas) window.addEventListener('resize', function () { if (burstRaf) resizeCanvas(); });

  var winner = document.querySelector('[data-celebrate]');
  if (winner) {
    var celebrate = function () {
      var b = winner.querySelector('.verdict').getBoundingClientRect();
      burst(b.left + b.width / 2, b.top + b.height / 2);
    };
    winner.addEventListener('click', celebrate);
    winner.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); celebrate(); }
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); setTimeout(celebrate, 250); }
      }, { threshold: 0.7 });
      io.observe(winner);
    }
  }

  /* ------------------------------------------------------------------
     Tutorials – Segmented Control, YouTube erst nach Klick (Datenschutz)
     ------------------------------------------------------------------ */
  var seg = document.querySelector('.segmented');
  var video = document.querySelector('.video');
  var caption = document.querySelector('.video-caption');
  var CAPTIONS = {
    vorwaerts: 'So parkt man richtig vorwärts.',
    parallel: 'So parkt man richtig parallel.',
    rueckwaerts: 'So parkt man richtig rückwärts.'
  };
  var currentVideo = 'UXHWheqWnzE';
  var videoLoaded = false;

  function embed(id, autoplay) {
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&playsinline=1' + (autoplay ? '&autoplay=1' : '');
    f.title = 'YouTube-Video: Tutorial';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    video.innerHTML = '';
    video.appendChild(f);
    videoLoaded = true;
  }

  function selectTab(btn) {
    var tabs = seg.querySelectorAll('[role=tab]');
    tabs.forEach(function (t, i) {
      var on = t === btn;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on) seg.style.setProperty('--i', i);
    });
    caption.textContent = CAPTIONS[btn.dataset.key];
    currentVideo = btn.dataset.video;
    if (videoLoaded) embed(currentVideo, false);
  }

  if (seg && video) {
    seg.addEventListener('click', function (e) {
      var btn = e.target.closest('[role=tab]');
      if (btn) selectTab(btn);
    });
    seg.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var tabs = Array.prototype.slice.call(seg.querySelectorAll('[role=tab]'));
      var i = tabs.indexOf(document.activeElement);
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      selectTab(next);
    });
    video.addEventListener('click', function (e) {
      if (e.target.closest('.video-poster')) embed(currentVideo, true);
    });
    document.querySelectorAll('[data-tutorial]').forEach(function (link) {
      link.addEventListener('click', function () {
        var btn = seg.querySelector('[data-key="' + link.dataset.tutorial + '"]');
        if (btn) selectTab(btn);
      });
    });
  }

  /* ------------------------------------------------------------------
     Navigation: Trennlinie erst, wenn Inhalt darunter liegt
     ------------------------------------------------------------------ */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------
     Bestell-Dialog
     ------------------------------------------------------------------ */
  var dialog = document.getElementById('order');
  if (dialog && dialog.showModal) {
    document.querySelectorAll('[data-open-order]').forEach(function (b) {
      b.addEventListener('click', function () { dialog.showModal(); });
    });
    // Klick auf den Hintergrund schließt
    dialog.addEventListener('click', function (e) {
      if (e.target !== dialog) return;
      var r = dialog.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dialog.close();
    });
    // Smart-Forms zeigt sein eigenes Overlay – der Dialog muss dafür aus dem Top-Layer
    var form = dialog.querySelector('.order-form');
    form.addEventListener('submit', function () { dialog.close(); });
    form.addEventListener('smart-form-sent', function () {
      form.reset();
      burst(innerWidth / 2, innerHeight * 0.6);
    });
  }
})();
