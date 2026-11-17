// Interactive Monte Carlo fan chart for the hero.
// Geometric Brownian motion over 10 years in monthly steps, starting at 100.
(function () {
  var canvas = document.getElementById("fan");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var $ = function (id) { return document.getElementById(id); };
  var muIn = $("mu"), sigIn = $("sigma"), nIn = $("paths"), rerun = $("rerun"), readout = $("fan-readout");

  var STEPS = 120, MAXN = 1000, DT = 1 / 12;
  var css = getComputedStyle(document.documentElement);
  var INK = css.getPropertyValue("--ink").trim() || "#0e2a47";
  var ACCENT = css.getPropertyValue("--accent").trim() || "#2563c9";
  var SLATE = css.getPropertyValue("--slate").trim() || "#51627a";
  var RULE = css.getPropertyValue("--rule").trim() || "#d8e0ec";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var Z, paths = [], p10 = [], p50 = [], p90 = [], lo = 0, hi = 0, hover = null, N = 400;

  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function draws() {
    Z = new Float32Array(MAXN * STEPS);
    for (var i = 0; i < Z.length; i++) Z[i] = gauss();
  }

  function simulate() {
    var mu = +(muIn ? muIn.value : 7) / 100, sig = +(sigIn ? sigIn.value : 15) / 100;
    N = +(nIn ? nIn.value : 400);
    var a = (mu - sig * sig / 2) * DT, b = sig * Math.sqrt(DT);
    paths = [];
    for (var i = 0; i < N; i++) {
      var p = new Float32Array(STEPS + 1), x = 0, off = i * STEPS;
      p[0] = 100;
      for (var t = 1; t <= STEPS; t++) { x += a + b * Z[off + t - 1]; p[t] = 100 * Math.exp(x); }
      paths.push(p);
    }
    p10 = []; p50 = []; p90 = []; lo = 100; hi = 100;
    var col = new Float32Array(N);
    for (var s = 0; s <= STEPS; s++) {
      for (var k = 0; k < N; k++) col[k] = paths[k][s];
      col.sort();
      var q = function (f) { return col[Math.floor(f * (N - 1))]; };
      p10.push(q(0.1)); p50.push(q(0.5)); p90.push(q(0.9));
      lo = Math.min(lo, q(0.02)); hi = Math.max(hi, q(0.98));
    }
    var padv = (hi - lo) * 0.04; lo -= padv; hi += padv;
  }

  var W, H, pad = { l: 18, r: 18, t: 22, b: 34 };
  function size() {
    var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function X(t) { return pad.l + (t / STEPS) * (W - pad.l - pad.r); }
  function Y(v) { return pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b); }
  function line(arr, upto) {
    ctx.beginPath(); ctx.moveTo(X(0), Y(arr[0]));
    for (var t = 1; t <= upto; t++) ctx.lineTo(X(t), Y(arr[t]));
  }
  function fmt(v) { return Math.round(v).toLocaleString(); }

  function draw(progress) {
    var upto = Math.max(1, Math.round(STEPS * progress));
    ctx.clearRect(0, 0, W, H);
    ctx.font = "12px 'Schibsted Grotesk', system-ui, sans-serif";

    ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.fillStyle = SLATE;
    for (var yr = 0; yr <= 10; yr += 2) {
      var gx = Math.round(X(yr * 12)) + 0.5;
      ctx.beginPath(); ctx.moveTo(gx, pad.t); ctx.lineTo(gx, H - pad.b); ctx.stroke();
      ctx.textAlign = yr === 0 ? "left" : yr === 10 ? "right" : "center";
      ctx.fillText(yr === 0 ? "Year 0" : yr === 10 ? "Year 10" : String(yr), gx, H - pad.b + 20);
    }
    var zy = Math.round(Y(100)) + 0.5;
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(pad.l, zy); ctx.lineTo(W - pad.r, zy); ctx.stroke(); ctx.setLineDash([]);

    ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.globalAlpha = Math.max(0.025, Math.min(0.08, 20 / N));
    for (var i = 0; i < N; i++) { line(paths[i], upto); ctx.stroke(); }
    ctx.globalAlpha = 1;

    ctx.beginPath(); ctx.moveTo(X(0), Y(p90[0]));
    for (var t = 1; t <= upto; t++) ctx.lineTo(X(t), Y(p90[t]));
    for (t = upto; t >= 0; t--) ctx.lineTo(X(t), Y(p10[t]));
    ctx.closePath(); ctx.fillStyle = ACCENT; ctx.globalAlpha = 0.16; ctx.fill(); ctx.globalAlpha = 1;

    ctx.strokeStyle = ACCENT; ctx.lineWidth = 2.5; line(p50, upto); ctx.stroke();

    ctx.textAlign = "left"; var lbl = "Start 100", lw = ctx.measureText(lbl).width;
    ctx.fillStyle = "rgba(244,247,252,0.9)"; ctx.fillRect(pad.l + 2, zy - 21, lw + 8, 16);
    ctx.fillStyle = SLATE; ctx.fillText(lbl, pad.l + 6, zy - 9);

    if (hover !== null && progress >= 1) {
      var hx = Math.round(X(hover)) + 0.5;
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(hx, pad.t); ctx.lineTo(hx, H - pad.b); ctx.stroke(); ctx.globalAlpha = 1;
      [p10, p90].forEach(function (a) {
        ctx.fillStyle = "#fff"; ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(X(hover), Y(a[hover]), 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(X(hover), Y(p50[hover]), 4.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(X(upto), Y(p50[upto]), 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function summary(t) {
    var label = t === STEPS ? "Year 10" : "Year " + (Math.round((t / 12) * 10) / 10);
    readout.textContent = label + ": median " + fmt(p50[t]) + ", 10th percentile " + fmt(p10[t]) + ", 90th percentile " + fmt(p90[t]);
  }

  var raf = null;
  function animate() {
    cancelAnimationFrame(raf);
    if (reduce) { draw(1); return; }
    var start = null, dur = 1400;
    var step = function (ts) {
      if (start === null) start = ts;
      var k = Math.min(1, (ts - start) / dur);
      draw(1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function update() {
    if (muIn) $("mu-out").textContent = muIn.value + "%";
    if (sigIn) $("sigma-out").textContent = sigIn.value + "%";
    if (nIn) $("n-out").textContent = nIn.value;
    simulate();
    cancelAnimationFrame(raf);
    draw(1);
    if (readout) summary(hover !== null ? hover : STEPS);
  }

  function pointer(e) {
    var r = canvas.getBoundingClientRect();
    var t = Math.round(((e.clientX - r.left - pad.l) / (W - pad.l - pad.r)) * STEPS);
    hover = Math.max(0, Math.min(STEPS, t));
    draw(1); if (readout) summary(hover);
  }
  canvas.addEventListener("pointermove", pointer);
  canvas.addEventListener("pointerdown", pointer);
  canvas.addEventListener("pointerleave", function () {
    hover = null; draw(1); if (readout) summary(STEPS);
  });

  [muIn, sigIn, nIn].forEach(function (el) { if (el) el.addEventListener("input", update); });
  if (rerun) rerun.addEventListener("click", function () {
    draws(); simulate(); hover = null; animate(); if (readout) summary(STEPS);
  });

  draws(); simulate(); size(); animate();
  if (readout) summary(STEPS);

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt); rt = setTimeout(function () { size(); draw(1); }, 120);
  });
})();
