// Monte Carlo fan chart for the hero: simulated 10-year paths, percentile band, median.
(function () {
  var canvas = document.getElementById("fan");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var N = 400, STEPS = 120, drift = 0.006, vol = 0.045;
  var css = getComputedStyle(document.documentElement);
  var INK = css.getPropertyValue("--ink").trim() || "#0e2a47";
  var ACCENT = css.getPropertyValue("--accent").trim() || "#2563c9";
  var SLATE = css.getPropertyValue("--slate").trim() || "#51627a";
  var RULE = css.getPropertyValue("--rule").trim() || "#d8e0ec";

  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  var paths = [];
  for (var i = 0; i < N; i++) {
    var p = new Float32Array(STEPS + 1), x = 0;
    for (var t = 1; t <= STEPS; t++) { x += drift + vol * gauss(); p[t] = x; }
    paths.push(p);
  }

  function quantile(sorted, q) { return sorted[Math.floor(q * (sorted.length - 1))]; }
  var p10 = [], p50 = [], p90 = [], lo = 0, hi = 0;
  for (var s = 0; s <= STEPS; s++) {
    var col = paths.map(function (p) { return p[s]; }).sort(function (a, b) { return a - b; });
    p10.push(quantile(col, 0.1)); p50.push(quantile(col, 0.5)); p90.push(quantile(col, 0.9));
    lo = Math.min(lo, quantile(col, 0.01)); hi = Math.max(hi, quantile(col, 0.99));
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

  function draw(progress) {
    var upto = Math.max(1, Math.round(STEPS * progress));
    ctx.clearRect(0, 0, W, H);

    // year grid
    ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.fillStyle = SLATE;
    ctx.font = "12px 'Schibsted Grotesk', system-ui, sans-serif"; ctx.textAlign = "center";
    for (var yr = 0; yr <= 10; yr += 2) {
      var gx = Math.round(X(yr * 12)) + 0.5;
      ctx.beginPath(); ctx.moveTo(gx, pad.t); ctx.lineTo(gx, H - pad.b); ctx.stroke();
      ctx.textAlign = yr === 0 ? "left" : yr === 10 ? "right" : "center";
      ctx.fillText(yr === 0 ? "Year 0" : yr === 10 ? "Year 10" : String(yr), gx, H - pad.b + 20);
    }
    var zy = Math.round(Y(0)) + 0.5;
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(pad.l, zy); ctx.lineTo(W - pad.r, zy); ctx.stroke(); ctx.setLineDash([]);

    // paths
    ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.globalAlpha = 0.05;
    for (var i = 0; i < N; i++) { line(paths[i], upto); ctx.stroke(); }
    ctx.globalAlpha = 1;

    // percentile band
    ctx.beginPath(); ctx.moveTo(X(0), Y(p90[0]));
    for (var t = 1; t <= upto; t++) ctx.lineTo(X(t), Y(p90[t]));
    for (t = upto; t >= 0; t--) ctx.lineTo(X(t), Y(p10[t]));
    ctx.closePath(); ctx.fillStyle = ACCENT; ctx.globalAlpha = 0.16; ctx.fill(); ctx.globalAlpha = 1;

    // median
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 2.5; line(p50, upto); ctx.stroke();
    ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(X(upto), Y(p50[upto]), 4, 0, Math.PI * 2); ctx.fill();
  }

  size();
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { draw(1); }
  else {
    var start = null, dur = 1800;
    var step = function (ts) {
      if (start === null) start = ts;
      var k = Math.min(1, (ts - start) / dur);
      draw(1 - Math.pow(1 - k, 3));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt); rt = setTimeout(function () { size(); draw(1); }, 120);
  });
})();
