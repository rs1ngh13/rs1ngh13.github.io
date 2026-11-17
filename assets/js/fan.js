// Hoverable Monte Carlo chart for the hero.
// Geometric Brownian motion over 10 years in monthly steps, starting at 100.
// Paths are colored with viridis by their final value.
(function () {
  var canvas = document.getElementById("fan");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var readout = document.getElementById("fan-readout");

  var N = 300, STEPS = 120, DT = 1 / 12, MU = 0.07, SIGMA = 0.15;
  var css = getComputedStyle(document.documentElement);
  var INK = css.getPropertyValue("--ink").trim() || "#0e2a47";
  var SLATE = css.getPropertyValue("--slate").trim() || "#51627a";
  var RULE = css.getPropertyValue("--rule").trim() || "#d8e0ec";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var VIRIDIS = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
  function viridis(f) {
    var x = Math.max(0, Math.min(1, f)) * (VIRIDIS.length - 1), i = Math.min(VIRIDIS.length - 2, Math.floor(x)), k = x - i;
    var a = VIRIDIS[i], b = VIRIDIS[i + 1];
    return "rgb(" + [0, 1, 2].map(function (j) { return Math.round(a[j] + (b[j] - a[j]) * k); }).join(",") + ")";
  }
  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  var paths = [], drift = (MU - SIGMA * SIGMA / 2) * DT, shock = SIGMA * Math.sqrt(DT);
  for (var i = 0; i < N; i++) {
    var p = new Float32Array(STEPS + 1), x = 0;
    p[0] = 100;
    for (var t = 1; t <= STEPS; t++) { x += drift + shock * gauss(); p[t] = 100 * Math.exp(x); }
    paths.push(p);
  }
  paths.sort(function (a, b) { return a[STEPS] - b[STEPS]; });
  var colors = paths.map(function (_, i) { return viridis(i / (N - 1)); });

  var p10 = [], p50 = [], p90 = [], lo = 100, hi = 100, col = new Float32Array(N);
  for (var s = 0; s <= STEPS; s++) {
    for (var k = 0; k < N; k++) col[k] = paths[k][s];
    col.sort();
    p10.push(col[Math.floor(0.1 * (N - 1))]); p50.push(col[Math.floor(0.5 * (N - 1))]); p90.push(col[Math.floor(0.9 * (N - 1))]);
    lo = Math.min(lo, col[Math.floor(0.01 * (N - 1))]); hi = Math.max(hi, col[Math.floor(0.99 * (N - 1))]);
  }
  var padv = (hi - lo) * 0.04; lo -= padv; hi += padv;

  var W, H, pad = { l: 18, r: 18, t: 22, b: 34 }, hover = null, done = false;
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

    ctx.lineWidth = 1; ctx.globalAlpha = 0.45;
    for (var i = 0; i < N; i++) { ctx.strokeStyle = colors[i]; line(paths[i], upto); ctx.stroke(); }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    line(p10, upto); ctx.stroke(); line(p90, upto); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 2.75; line(p50, upto); ctx.stroke();

    ctx.textAlign = "left"; var lbl = "Start 100", lw = ctx.measureText(lbl).width;
    ctx.fillStyle = "rgba(244,247,252,0.9)"; ctx.fillRect(pad.l + 2, zy - 21, lw + 8, 16);
    ctx.fillStyle = SLATE; ctx.fillText(lbl, pad.l + 6, zy - 9);

    if (hover !== null && progress >= 1) {
      var hx = Math.round(X(hover)) + 0.5;
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(hx, pad.t); ctx.lineTo(hx, H - pad.b); ctx.stroke(); ctx.globalAlpha = 1;
      [[p90, viridis(0.9)], [p50, viridis(0.5)], [p10, viridis(0.1)]].forEach(function (d) {
        ctx.fillStyle = d[1]; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(hover), Y(d[0][hover]), 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    } else {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(X(upto), Y(p50[upto]), 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function summary(t) {
    if (!readout) return;
    var label = t === STEPS ? "Year 10" : "Year " + (Math.round((t / 12) * 10) / 10);
    readout.textContent = label + ": median " + fmt(p50[t]) + ", 10th percentile " + fmt(p10[t]) + ", 90th percentile " + fmt(p90[t]);
  }

  function pointer(e) {
    var r = canvas.getBoundingClientRect();
    var t = Math.round(((e.clientX - r.left - pad.l) / (W - pad.l - pad.r)) * STEPS);
    hover = Math.max(0, Math.min(STEPS, t));
    summary(hover);
    if (done) draw(1);
  }
  canvas.addEventListener("pointermove", pointer);
  canvas.addEventListener("pointerdown", pointer);
  canvas.addEventListener("pointerleave", function () { hover = null; summary(STEPS); if (done) draw(1); });

  size(); summary(STEPS);
  if (reduce) { done = true; draw(1); }
  else {
    var start = null, dur = 1600;
    var step = function (ts) {
      if (start === null) start = ts;
      var k = Math.min(1, (ts - start) / dur);
      draw(1 - Math.pow(1 - k, 3));
      if (k < 1) requestAnimationFrame(step); else { done = true; draw(1); }
    };
    requestAnimationFrame(step);
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt); rt = setTimeout(function () { size(); draw(1); }, 120);
  });
})();
