/*
 * TWO LEFT FEET · edit Barçy (Lamine Yamal i Raphinha)
 * Kompozycja 1080×1920 rysowana na canvasie. Każda klatka jest czystą funkcją czasu t,
 * więc render klatka po klatce (render.mjs) i podgląd na żywo (?preview) dają ten sam obraz.
 * Znaki spoza ASCII są zapisane jako \u…, żeby nic nie zależało od kodowania pliku.
 */
(() => {
  'use strict';

  const W = 1080, H = 1920;
  // bezpieczna strefa TikToka: prawa kolumna przycisków (x > ~920) i podpis na dole (y > ~1480)
  const CX = 500, SAFE = 820;
  const C = {
    ink: '#07070b', paper: '#f3efe7', blau: '#004d98', blauHot: '#2f7bff', grana: '#a50044', granaHot: '#e0145e',
    gold: '#edbb00', goldHot: '#ffd23a', espR: '#aa151b', espY: '#f1bf00', braG: '#009c3b', braY: '#ffdf00', braB: '#002776',
  };
  const DOT = '·', TIMES = '×', ARROW = '→', ENDASH = '–', APOS = '’';

  /* ---- teksty (wszystkie fakty sprawdzone, źródła w edit/README.md) ---- */
  const TXT = {
    kicker: `FC BARCELONA ${DOT} 2026/27`,
    hook: ['TWO', 'LEFT', 'FEET.'],
    hook2: ['ONE', 'PROBLEM.'],
    yamal: { first: 'LAMINE', last: 'YAMAL', num: '10', chips: ['RIGHT WING', 'LEFT FOOT'] },
    raph: { name: 'RAPHINHA', num: '11', chips: ['PORTO ALEGRE', 'LEFT FOOT'] },
    replay1: 'THE CURLER', replay2: 'THE PRESS', replay3: `10 ${ARROW} 11`,
    golazo: 'GOLAZO.', golaco: 'GOLAÇO.',
    euro: { label: 'UEFA EURO 2024', main: ['CHAMPION'], detail: `SPAIN 2${ENDASH}1 ENGLAND ${DOT} BERLIN` },
    record: { label: 'RECORD', main: ['YOUNGEST SCORER', 'IN EURO HISTORY'], big: '16Y 362D', detail: `VS FRANCE ${DOT} SEMI-FINAL ${DOT} 09.07.2024` },
    kopa: { label: 'KOPA TROPHY', big: `${TIMES}2`, detail: `2024 ${DOT} 2025 ${DOT} FIRST TO WIN IT TWICE` },
    wc: { label: 'FIFA WORLD CUP 2026', main: ['WORLD', 'CHAMPION'], detail: `SPAIN 1${ENDASH}0 ARGENTINA ${DOT} A.E.T. ${DOT} 19.07.2026` },
    ballonY: { label: `BALLON D${APOS}OR 2025`, main: ['RUNNER-UP'] },
    ucl: { label: 'UEFA CHAMPIONS LEAGUE 2024/25', count: 13, main: ['GOALS'] },
    top: { label: 'UEFA CHAMPIONS LEAGUE 2024/25', main: ['JOINT', 'TOP SCORER'], detail: 'WITH SERHOU GUIRASSY' },
    ballonR: { label: `BALLON D${APOS}OR 2025`, big: '5TH' },
    liga: { main: ['LALIGA', 'CHAMPIONS'], detail: `2024/25 ${DOT} 2025/26` },
    end: { names: `LAMINE YAMAL ${DOT} RAPHINHA`, motto: 'VISCA EL BARÇA' },
  };

  let TL = null, BEAT = 60 / 130;
  const B = (b) => b * BEAT;

  /* ================================================================ narzędzia */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const inv = (a, b, x) => clamp((x - a) / (b - a));
  const smooth = (k) => k * k * (3 - 2 * k);
  const outExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
  const inExpo = (k) => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10));
  const outCubic = (k) => 1 - Math.pow(1 - k, 3);
  const inCubic = (k) => k * k * k;
  const inOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const outBack = (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };
  const vnoise = (x, seed = 0) => { const i = Math.floor(x), f = x - i; return lerp(hash(i + seed * 97.3), hash(i + 1 + seed * 97.3), smooth(f)); };
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // „fast-slow-fast”: rampa prędkości do slow-mo w locie piłki
  const ramp = (u, k) => u + (k / (2 * Math.PI)) * Math.sin(2 * Math.PI * u);

  function mk(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
  const main = document.getElementById('c');
  const M = main.getContext('2d');
  const S = mk(W, H), s = S.getContext('2d');
  const SP1 = mk(W, H), sp1 = SP1.getContext('2d');
  const SP2 = mk(W, H), sp2 = SP2.getContext('2d');
  const TXC = mk(W, 900), tx = TXC.getContext('2d');
  const GRAIN = [];
  const cache = {};

  /* ================================================================ tekst */
  function font(c, size, o = {}) {
    c.font = `${o.weight || 900} ${Math.round(size * 10) / 10}px ${o.family || 'Archivo'}`;
    c.fontStretch = o.stretch || 'expanded';
    c.letterSpacing = `${o.ls || 0}px`;
  }
  function measure(c, str, size, o = {}) {
    font(c, size, o);
    const m = c.measureText(str);
    const ls = o.ls || 0;
    return { w: m.width - ls, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
  }
  function fit(c, str, maxW, maxSize, o = {}) {
    const m = measure(c, str, 100, o);
    return Math.min(maxSize, (100 * maxW) / m.w);
  }
  // rysuje tekst wyśrodkowany (x = środek, y = środek wysokości wersalików)
  function text(c, str, x, y, size, o = {}) {
    const m = measure(c, str, size, o);
    const left = o.align === 'left' ? x : o.align === 'right' ? x - m.w : x - m.w / 2;
    const base = y + (m.asc - m.desc) / 2;
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    if (o.fill !== false) { c.fillStyle = o.color || C.paper; c.fillText(str, left, base); }
    if (o.stroke) { c.lineWidth = o.stroke; c.strokeStyle = o.strokeColor || C.paper; c.lineJoin = 'round'; c.strokeText(str, left, base); }
    return m;
  }
  // tekst wypełniony pasami blaugrany (maska na osobnym płótnie)
  function stripeText(c, str, x, y, size, o = {}) {
    const m = measure(tx, str, size, o);
    const pad = 40;
    const w = Math.ceil(m.w + pad * 2), h = Math.ceil(m.asc + m.desc + pad * 2);
    if (TXC.width < w || TXC.height < h) { TXC.width = Math.max(TXC.width, w); TXC.height = Math.max(TXC.height, h); }
    tx.setTransform(1, 0, 0, 1, 0, 0);
    tx.globalCompositeOperation = 'source-over';
    tx.clearRect(0, 0, w, h);
    // 1) pasy na całym prostokącie
    const sw = o.stripeW || size * 0.16, off = ((o.shift || 0) % (sw * 2) + sw * 2) % (sw * 2);
    for (let i = -2; i * sw < w + sw * 2; i++) {
      tx.fillStyle = i % 2 === 0 ? (o.c1 || '#1f5fd8') : (o.c2 || '#c8124f');
      tx.fillRect(i * sw + off - sw * 2, 0, sw + 1, h);
    }
    const g = tx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.22)');
    tx.fillStyle = g; tx.fillRect(0, 0, w, h);
    // 2) tekst jako maska: zostają tylko pasy wewnątrz liter
    tx.globalCompositeOperation = 'destination-in';
    font(tx, size, o);
    tx.textAlign = 'left'; tx.textBaseline = 'alphabetic';
    tx.fillStyle = '#fff';
    tx.fillText(str, pad, pad + m.asc);
    tx.globalCompositeOperation = 'source-over';
    const left = x - m.w / 2 - pad, top = y - (m.asc + m.desc) / 2 - pad;
    c.drawImage(TXC, 0, 0, w, h, left, top, w, h);
    if (o.stroke) text(c, str, x, y, size, { ...o, fill: false, strokeColor: o.strokeColor || C.gold });
    return m;
  }
  // „slam”: wjazd z dużej skali z rozmyciem ruchu (kopie ducha)
  function slamK(t, t0, dur = 0.16) { return t < t0 ? -1 : clamp((t - t0) / dur); }
  function slam(c, t, t0, draw, o = {}) {
    const k = slamK(t, t0, o.dur || 0.16);
    if (k < 0) return;
    const e = outExpo(k);
    const sc = lerp(o.from || 2.3, 1, e);
    const [x, y] = o.at || [W / 2, H / 2];
    const ghosts = k < 1 ? 3 : 0;
    for (let g = ghosts; g >= 0; g--) {
      c.save();
      c.globalAlpha = g === 0 ? clamp(k * 3) * (o.alpha ?? 1) : 0.16 * (1 - k);
      const gs = sc * (1 + g * 0.12 * (1 - k));
      c.translate(x, y); c.scale(gs, gs); c.translate(-x, -y);
      draw(c);
      c.restore();
    }
  }
  function chip(c, str, x, y, o = {}) {
    const size = o.size || 30;
    const m = measure(c, str, size, { stretch: 'condensed', weight: 700, ls: 4 });
    const pw = m.w + size * 1.3, ph = size * 1.9;
    c.save();
    c.beginPath();
    c.roundRect(x - pw / 2, y - ph / 2, pw, ph, ph / 2);
    c.fillStyle = o.bg || 'rgba(7,7,11,.72)'; c.fill();
    c.lineWidth = 2.5; c.strokeStyle = o.border || C.gold; c.stroke();
    c.restore();
    text(c, str, x, y, size, { stretch: 'condensed', weight: 700, ls: 4, color: o.color || C.paper });
    return pw;
  }

  /* ================================================================ tła i efekty */
  function stripesBG(c, t, o = {}) {
    const n = o.n || 7, sw = W / n;
    const off = (t * (o.speed ?? 40)) % (sw * 2);
    c.save();
    c.fillStyle = C.ink; c.fillRect(0, 0, W, H);
    c.globalAlpha = o.alpha ?? 0.22;
    if (o.angle) { c.translate(W / 2, H / 2); c.rotate(o.angle); c.translate(-W / 2 * 1.6, -H / 2 * 1.3); }
    for (let i = -2; i < n * 2 + 2; i++) {
      c.fillStyle = i % 2 ? C.grana : C.blau;
      c.fillRect(i * sw + off - sw * 2, -H, sw + 1, H * 3);
    }
    c.restore();
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(7,7,11,.85)'); g.addColorStop(0.35, 'rgba(7,7,11,.2)'); g.addColorStop(0.7, 'rgba(7,7,11,.35)'); g.addColorStop(1, 'rgba(7,7,11,.95)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function glow(c, x, y, r, color, a = 1) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.globalAlpha = a; c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  }
  function flareH(c, x, y, len, color, a = 1) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
    const g = c.createLinearGradient(x - len, 0, x + len, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x - len, y - 3, len * 2, 6);
    c.globalAlpha = a * 0.35; c.fillRect(x - len * 0.6, y - 14, len * 1.2, 28);
    c.restore();
  }
  function sparks(c, t, t0, x, y, o = {}) {
    const age = t - t0;
    if (age < 0 || age > (o.life || 0.9)) return;
    const rnd = mulberry(o.seed || 7);
    const n = o.n || 70;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const ang = rnd() * Math.PI * 2, sp = (o.speed || 1500) * (0.35 + rnd() * 0.9);
      const life = (o.life || 0.9) * (0.5 + rnd() * 0.5);
      if (age > life) continue;
      const k = age / life;
      const dx = Math.cos(ang) * sp, dy = Math.sin(ang) * sp;
      const drag = (1 - Math.exp(-age * 3.2)) / 3.2;
      const px = x + dx * drag, py = y + dy * drag + 500 * age * age;
      const tail = 0.03;
      const qx = x + dx * Math.max(0, drag - tail), qy = y + dy * Math.max(0, drag - tail) + 500 * Math.max(0, age - tail) ** 2;
      const cols = o.colors || [C.goldHot, '#fff', C.gold];
      c.strokeStyle = cols[i % cols.length];
      c.globalAlpha = (1 - k) * 0.95;
      c.lineWidth = (o.w || 4) * (1 - k * 0.6);
      c.beginPath(); c.moveTo(qx, qy); c.lineTo(px, py); c.stroke();
    }
    c.restore();
  }
  function confetti(c, t, t0, o = {}) {
    const age = t - t0;
    if (age < 0) return;
    const rnd = mulberry(o.seed || 21);
    const n = o.n || 140;
    const cols = o.colors || [C.gold, C.goldHot, '#fff5cc', C.gold];
    c.save();
    for (let i = 0; i < n; i++) {
      const x0 = rnd() * W, delay = rnd() * 0.5, vy = 380 + rnd() * 520, sway = 30 + rnd() * 50, rot0 = rnd() * 6, spin = (rnd() - 0.5) * 14;
      const a = age - delay;
      if (a < 0) continue;
      const y = -60 + vy * a + (o.burst ? -900 * Math.exp(-a * 3) + 900 : 0);
      if (y > H + 60) continue;
      const x = x0 + Math.sin(a * 3 + i) * sway;
      const w = 10 + rnd() * 14, h = 6 + rnd() * 8;
      c.save(); c.translate(x, y); c.rotate(rot0 + spin * a); c.scale(Math.cos(a * 6 + i), 1);
      c.fillStyle = cols[i % cols.length]; c.globalAlpha = 0.95;
      c.fillRect(-w / 2, -h / 2, w, h);
      c.restore();
    }
    c.restore();
  }
  function star(c, x, y, r, color) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath(); c.fillStyle = color; c.fill();
  }
  function rays(c, x, y, t, color, a = 0.25, n = 18) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.translate(x, y); c.rotate(t * 0.25);
    for (let i = 0; i < n; i++) {
      c.rotate((Math.PI * 2) / n);
      const g = c.createLinearGradient(0, 0, 1400, 0);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(1400, -70); c.lineTo(1400, 70); c.closePath(); c.fill();
    }
    c.restore();
  }
  function flagESP(c, x, y, w, h) { c.fillStyle = C.espR; c.fillRect(x, y, w, h); c.fillStyle = C.espY; c.fillRect(x, y + h / 4, w, h / 2); }
  function flagBRA(c, x, y, w, h) {
    c.fillStyle = C.braG; c.fillRect(x, y, w, h);
    c.fillStyle = C.braY; c.beginPath(); c.moveTo(x + w * 0.5, y + h * 0.09); c.lineTo(x + w * 0.93, y + h * 0.5); c.lineTo(x + w * 0.5, y + h * 0.91); c.lineTo(x + w * 0.07, y + h * 0.5); c.closePath(); c.fill();
    c.fillStyle = C.braB; c.beginPath(); c.arc(x + w * 0.5, y + h * 0.5, h * 0.25, 0, Math.PI * 2); c.fill();
  }

  /* ================================================================ 3D */
  const V = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  };
  const NEAR = 0.35;
  function camera(pos, target, fov) {
    const f = V.norm(V.sub(target, pos));
    const r = V.norm(V.cross(f, [0, 0, 1]));
    const u = V.cross(r, f);
    return { pos, f, r, u, focal: (W / 2) / Math.tan((fov * Math.PI) / 360), cx: W / 2, cy: H * 0.5 };
  }
  const toCam = (cam, p) => { const d = V.sub(p, cam.pos); return [V.dot(d, cam.r), V.dot(d, cam.u), V.dot(d, cam.f)]; };
  const pc = (cam, q) => [cam.cx + (q[0] / q[2]) * cam.focal, cam.cy - (q[1] / q[2]) * cam.focal, q[2]];
  const proj = (cam, p) => { const q = toCam(cam, p); return q[2] < NEAR ? null : pc(cam, q); };
  function clipPoly(cps) {
    const out = [];
    for (let i = 0; i < cps.length; i++) {
      const a = cps[i], b = cps[(i + 1) % cps.length];
      const ia = a[2] >= NEAR, ib = b[2] >= NEAR;
      if (ia) out.push(a);
      if (ia !== ib) { const k = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]); }
    }
    return out;
  }
  function poly3(c, cam, pts) {
    const q = clipPoly(pts.map((p) => toCam(cam, p)));
    if (q.length < 3) return false;
    c.beginPath();
    q.forEach((p, i) => { const sp = pc(cam, p); if (i) c.lineTo(sp[0], sp[1]); else c.moveTo(sp[0], sp[1]); });
    c.closePath();
    return true;
  }
  function seg3(c, cam, a, b, wWorld, minW = 0.7) {
    let A = toCam(cam, a), Bq = toCam(cam, b);
    if (A[2] < NEAR && Bq[2] < NEAR) return;
    if (A[2] < NEAR) { const k = (NEAR - A[2]) / (Bq[2] - A[2]); A = [A[0] + (Bq[0] - A[0]) * k, A[1] + (Bq[1] - A[1]) * k, NEAR]; }
    if (Bq[2] < NEAR) { const k = (NEAR - Bq[2]) / (A[2] - Bq[2]); Bq = [Bq[0] + (A[0] - Bq[0]) * k, Bq[1] + (A[1] - Bq[1]) * k, NEAR]; }
    const sa = pc(cam, A), sb = pc(cam, Bq);
    c.lineWidth = Math.max(minW, (wWorld * cam.focal) / ((A[2] + Bq[2]) / 2));
    c.beginPath(); c.moveTo(sa[0], sa[1]); c.lineTo(sb[0], sb[1]); c.stroke();
  }
  function polyline3(c, cam, pts, w, closed = false) {
    for (let i = 0; i < pts.length - 1; i++) seg3(c, cam, pts[i], pts[i + 1], w);
    if (closed) seg3(c, cam, pts[pts.length - 1], pts[0], w);
  }
  const circ = (cx, cy, r, a0 = 0, a1 = Math.PI * 2, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.02]; });

  const LINES = (() => {
    const z = 0.02, L = [];
    L.push([[0, 0, z], [105, 0, z], [105, 68, z], [0, 68, z], [0, 0, z]]);
    L.push([[52.5, 0, z], [52.5, 68, z]]);
    L.push(circ(52.5, 34, 9.15, 0, Math.PI * 2, 64));
    L.push([[105, 13.84, z], [88.5, 13.84, z], [88.5, 54.16, z], [105, 54.16, z]]);
    L.push([[0, 13.84, z], [16.5, 13.84, z], [16.5, 54.16, z], [0, 54.16, z]]);
    L.push([[105, 24.84, z], [99.5, 24.84, z], [99.5, 43.16, z], [105, 43.16, z]]);
    L.push([[0, 24.84, z], [5.5, 24.84, z], [5.5, 43.16, z], [0, 43.16, z]]);
    const a = Math.acos(5.5 / 9.15);
    L.push(circ(94, 34, 9.15, Math.PI - a, Math.PI + a, 24));
    L.push(circ(11, 34, 9.15, -a, a, 24));
    L.push(circ(105, 0, 1, Math.PI / 2, Math.PI, 8), circ(105, 68, 1, Math.PI, Math.PI * 1.5, 8), circ(0, 0, 1, 0, Math.PI / 2, 8), circ(0, 68, 1, -Math.PI / 2, 0, 8));
    return L;
  })();
  const SPOTS = [[94, 34], [11, 34], [52.5, 34]];

  // trybuny: kropki „kibiców” na pochyłych płaszczyznach wokół boiska
  const CROWD = (() => {
    const rnd = mulberry(1899), pts = [];
    const cols = ['#2a3a78', '#5c1a3a', '#8d8a99', '#edbb00', '#f3efe7', '#1d2b55', '#6b1f45'];
    const add = (fn, n) => { for (let i = 0; i < n; i++) { const u = rnd(), v = rnd(); pts.push({ p: fn(u, v), c: cols[Math.floor(rnd() * cols.length)], a: 0.35 + rnd() * 0.5, tw: rnd() * 10 }); } };
    add((u, v) => [118 + v * 30, -12 + u * 92, 3 + v * 26], 1400);
    add((u, v) => [-10 + u * 125, 76 + v * 30, 3 + v * 26], 1500);
    add((u, v) => [-10 + u * 125, -8 - v * 30, 3 + v * 26], 1500);
    return pts;
  })();

  function drawStadium(c, cam, t) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#04050b'); g.addColorStop(0.45, '#0a1024'); g.addColorStop(1, '#05070d');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // trybuny jako ciemne płaszczyzny
    c.fillStyle = '#0a0d18';
    [[[113, -14, 0], [113, 82, 0], [150, 82, 30], [150, -14, 30]], [[-12, 74, 0], [117, 74, 0], [117, 110, 30], [-12, 110, 30]], [[-12, -6, 0], [117, -6, 0], [117, -42, 30], [-12, -42, 30]]]
      .forEach((q) => { if (poly3(c, cam, q)) c.fill(); });
    // kibice i flesze telefonów
    for (let i = 0; i < CROWD.length; i++) {
      const d = CROWD[i];
      const sp = proj(cam, d.p);
      if (!sp || sp[0] < -10 || sp[0] > W + 10 || sp[1] < -10 || sp[1] > H + 10) continue;
      const sz = clamp((0.3 * cam.focal) / sp[2], 1.2, 4.5);
      c.globalAlpha = d.a * (0.75 + 0.25 * Math.sin(t * 6 + d.tw));
      c.fillStyle = d.c;
      c.fillRect(sp[0], sp[1], sz, sz * 1.4);
    }
    c.globalAlpha = 1;
    // maszty jupiterów
    [[-18, -30, 48], [123, -30, 48], [-18, 98, 48], [123, 98, 48]].forEach((p) => {
      const sp = proj(cam, p);
      if (!sp) return;
      const r = Math.min(900, (60 * cam.focal) / sp[2]);
      glow(c, sp[0], sp[1], r, 'rgba(210,225,255,.55)', 0.8);
      glow(c, sp[0], sp[1], r * 0.18, 'rgba(255,255,255,.95)', 1);
    });
  }

  function drawPitch(c, cam) {
    c.fillStyle = '#0c3b21';
    if (poly3(c, cam, [[-6, -5, 0], [111, -5, 0], [111, 73, 0], [-6, 73, 0]])) c.fill();
    for (let i = 0; i < 20; i++) {
      c.fillStyle = i % 2 ? '#135c35' : '#10502e';
      if (poly3(c, cam, [[i * 5.25, 0, 0], [(i + 1) * 5.25, 0, 0], [(i + 1) * 5.25, 68, 0], [i * 5.25, 68, 0]])) c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,.88)';
    c.lineCap = 'round';
    LINES.forEach((pl) => polyline3(c, cam, pl, 0.13));
    c.fillStyle = 'rgba(255,255,255,.9)';
    SPOTS.forEach(([x, y]) => { if (poly3(c, cam, circ(x, y, 0.22, 0, Math.PI * 2, 12))) c.fill(); });
  }

  // bramka przy x=105 z siatką; bulge = wybrzuszenie siatki po golu
  function goalParts(cam, bulge) {
    const y0 = 30.34, y1 = 37.66, zt = 2.44, xb = 107.1, zb = 1.45;
    const parts = [];
    const disp = (y, z, base) => {
      if (!bulge) return 0;
      const d = Math.hypot(y - bulge.y, z - bulge.z);
      return bulge.a * Math.exp(-(d * d) / (2 * 0.95 * 0.95)) * base;
    };
    const net = (c) => {
      c.strokeStyle = 'rgba(235,240,255,.38)';
      const ny = 22, nz = 6;
      for (let i = 0; i <= ny; i++) {
        const y = lerp(y0, y1, i / ny);
        const pts = [];
        for (let j = 0; j <= nz; j++) { const z = lerp(0, zb, j / nz); pts.push([xb + disp(y, z, 1), y, z]); }
        for (let j = 1; j <= 4; j++) { const k = j / 4; const z = lerp(zb, zt, k); pts.push([lerp(xb, 105, k) + disp(y, z, 1 - k), y, z]); }
        polyline3(c, cam, pts, 0.025);
      }
      for (let j = 0; j <= nz; j++) {
        const z = lerp(0, zb, j / nz);
        const pts = [];
        for (let i = 0; i <= ny; i++) { const y = lerp(y0, y1, i / ny); pts.push([xb + disp(y, z, 1), y, z]); }
        polyline3(c, cam, pts, 0.025);
      }
      for (let j = 1; j <= 3; j++) {
        const k = j / 4, z = lerp(zb, zt, k), pts = [];
        for (let i = 0; i <= ny; i++) { const y = lerp(y0, y1, i / ny); pts.push([lerp(xb, 105, k) + disp(y, z, 1 - k), y, z]); }
        polyline3(c, cam, pts, 0.025);
      }
      [y0, y1].forEach((y) => {
        for (let j = 1; j <= 5; j++) { const k = j / 5; seg3(c, cam, [105, y, lerp(0, zt, k)], [xb, y, lerp(0, zb, k)], 0.025); }
        seg3(c, cam, [105, y, 0], [xb, y, 0], 0.03);
        seg3(c, cam, [xb, y, 0], [xb, y, zb], 0.03);
        seg3(c, cam, [xb, y, zb], [105, y, zt], 0.03);
      });
    };
    const frame = (c) => {
      c.strokeStyle = '#ffffff';
      c.lineCap = 'round';
      seg3(c, cam, [105, y0, 0], [105, y0, zt], 0.12, 1.5);
      seg3(c, cam, [105, y1, 0], [105, y1, zt], 0.12, 1.5);
      seg3(c, cam, [105, y0, zt], [105, y1, zt], 0.12, 1.5);
    };
    const back = toCam(cam, [xb, 34, 0.8]), front = toCam(cam, [105, 34, 1.2]);
    parts.push({ z: back[2], draw: net });
    parts.push({ z: front[2], draw: frame });
    // druga bramka (daleko)
    parts.push({ z: toCam(cam, [0, 34, 1])[2], draw: (c) => { c.strokeStyle = '#fff'; seg3(c, cam, [0, y0, 0], [0, y0, zt], 0.12); seg3(c, cam, [0, y1, 0], [0, y1, zt], 0.12); seg3(c, cam, [0, y0, zt], [0, y1, zt], 0.12); } });
    return parts;
  }

  function capsule(c, cam, pl) {
    const g = toCam(cam, [pl.x, pl.y, 0]);
    if (g[2] < NEAR + 0.5) return;
    const sg = pc(cam, g);
    const top = pc(cam, toCam(cam, [pl.x, pl.y, 1.85]));
    const wpx = (0.62 * cam.focal) / g[2];
    const k = cam.focal / g[2];
    // cień i pierścień na murawie
    c.save();
    c.fillStyle = 'rgba(0,0,0,.45)';
    if (poly3(c, cam, circ(pl.x + 0.25, pl.y + 0.2, 0.75, 0, Math.PI * 2, 20))) c.fill();
    c.strokeStyle = pl.ring || 'rgba(255,255,255,.5)';
    c.lineWidth = Math.max(1.5, 0.09 * k);
    if (poly3(c, cam, circ(pl.x, pl.y, 1.0, 0, Math.PI * 2, 28))) c.stroke();
    if (pl.hero) {
      c.globalAlpha = 0.35;
      c.fillStyle = pl.ring;
      if (poly3(c, cam, circ(pl.x, pl.y, 1.0, 0, Math.PI * 2, 28))) c.fill();
      c.globalAlpha = 1;
    }
    // bryła zawodnika (kapsuła), z opcjonalnym przechyłem przy robinsonadzie
    const vx = top[0] - sg[0], vy = top[1] - sg[1];
    const len = Math.hypot(vx, vy);
    const ang = Math.atan2(vy, vx) + Math.PI / 2 + (pl.tilt || 0);
    c.translate(sg[0], sg[1]);
    c.rotate(ang);
    c.beginPath();
    c.roundRect(-wpx / 2, -len, wpx, len, wpx / 2);
    if (pl.team === 'fcb') {
      c.save(); c.clip();
      const sw = wpx / 4;
      for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? C.grana : C.blau; c.fillRect(-wpx / 2 + i * sw, -len, sw + 0.5, len); }
      const gr = c.createLinearGradient(-wpx / 2, 0, wpx / 2, 0);
      gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.4)');
      c.fillStyle = gr; c.fillRect(-wpx / 2, -len, wpx, len);
      c.restore();
      c.lineWidth = Math.max(1.2, 0.05 * k); c.strokeStyle = pl.hero ? C.gold : 'rgba(255,255,255,.35)'; c.stroke();
    } else {
      const gr = c.createLinearGradient(-wpx / 2, 0, wpx / 2, 0);
      const base = pl.team === 'gk' ? ['#d6ff4a', '#7d9a1f'] : ['#e9ecf2', '#8a90a0'];
      gr.addColorStop(0, base[0]); gr.addColorStop(1, base[1]);
      c.fillStyle = gr; c.globalAlpha = pl.team === 'gk' ? 0.85 : 0.7; c.fill(); c.globalAlpha = 1;
    }
    c.restore();
    if (pl.hero && pl.tag) {
      const tp = pc(cam, toCam(cam, [pl.x, pl.y, 2.45]));
      tag(c, tp[0], tp[1], pl.num, pl.tag, clamp(900 / g[2] / 30, 0.75, 1.25));
    }
  }
  function tag(c, x, y, num, name, sc = 1) {
    c.save();
    c.translate(x, y); c.scale(sc, sc);
    const nm = measure(c, name, 30, { stretch: 'condensed', weight: 800, ls: 2 });
    const w = 64 + nm.w + 30, h = 58;
    c.beginPath(); c.roundRect(-w / 2, -h, w, h, 10);
    c.fillStyle = 'rgba(7,7,11,.86)'; c.fill();
    c.lineWidth = 2.5; c.strokeStyle = C.gold; c.stroke();
    c.beginPath(); c.roundRect(-w / 2 + 6, -h + 6, 54, h - 12, 7); c.fillStyle = C.gold; c.fill();
    text(c, num, -w / 2 + 33, -h / 2, 32, { stretch: 'expanded', weight: 900, color: '#140f00' });
    text(c, name, -w / 2 + 70, -h / 2, 30, { stretch: 'condensed', weight: 800, ls: 2, align: 'left', color: C.paper });
    c.beginPath(); c.moveTo(-10, 0); c.lineTo(10, 0); c.lineTo(0, 14); c.closePath(); c.fillStyle = C.gold; c.fill();
    c.restore();
  }
  function ball(c, cam, p) {
    const sh = proj(cam, [p[0], p[1], 0.01]);
    const bp = proj(cam, p);
    if (!bp) return;
    if (sh) {
      c.save(); c.globalAlpha = clamp(0.6 - p[2] * 0.12, 0.1, 0.6); c.fillStyle = '#000';
      if (poly3(c, cam, circ(p[0], p[1], 0.3, 0, Math.PI * 2, 14))) c.fill();
      c.restore();
    }
    const r = Math.max(5, (0.17 * cam.focal) / bp[2]);
    glow(c, bp[0], bp[1], r * 5, 'rgba(255,240,200,.55)', 0.9);
    const g = c.createRadialGradient(bp[0] - r * 0.35, bp[1] - r * 0.35, r * 0.1, bp[0], bp[1], r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#dfe3ea'); g.addColorStop(1, '#8f96a8');
    c.fillStyle = g; c.beginPath(); c.arc(bp[0], bp[1], r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1c1c22';
    c.beginPath(); c.arc(bp[0] + r * 0.1, bp[1] - r * 0.05, r * 0.32, 0, Math.PI * 2); c.fill();
  }
  function tracer(c, cam, pts, color = C.gold) {
    const sp = pts.map((p) => proj(cam, p)).filter(Boolean);
    if (sp.length < 2) return;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalCompositeOperation = 'lighter';
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < sp.length; i++) {
        const k = i / (sp.length - 1);
        c.strokeStyle = pass ? '#fff6d6' : color;
        c.globalAlpha = pass ? 0.8 * k : 0.55 * k;
        c.lineWidth = pass ? 2 + 4 * k : 6 + 16 * k;
        c.beginPath(); c.moveTo(sp[i - 1][0], sp[i - 1][1]); c.lineTo(sp[i][0], sp[i][1]); c.stroke();
      }
    }
    c.restore();
  }
  function shock(c, cam, p, age) {
    if (age < 0 || age > 0.35) return;
    const sp = proj(cam, p); if (!sp) return;
    const k = age / 0.35;
    c.save(); c.strokeStyle = '#fff'; c.globalAlpha = 1 - k; c.lineWidth = 8 * (1 - k) + 1;
    c.beginPath(); c.arc(sp[0], sp[1], 30 + 260 * outCubic(k), 0, Math.PI * 2); c.stroke(); c.restore();
  }

  /* animacja: tory po punktach kluczowych (Catmull-Rom) */
  function path(keys, tau) {
    if (tau <= keys[0][0]) return keys[0].slice(1);
    const n = keys.length;
    if (tau >= keys[n - 1][0]) return keys[n - 1].slice(1);
    let i = 0;
    while (i < n - 2 && tau > keys[i + 1][0]) i++;
    const u = (tau - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
    const p0 = keys[Math.max(0, i - 1)].slice(1), p1 = keys[i].slice(1), p2 = keys[i + 1].slice(1), p3 = keys[Math.min(n - 1, i + 2)].slice(1);
    return p1.map((_, d) => {
      const a = p0[d], b = p1[d], cc = p2[d], e = p3[d];
      return 0.5 * (2 * b + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - e) * u * u + (-a + 3 * b - 3 * cc + e) * u * u * u);
    });
  }
  const bez = (p0, p1, p2, p3, u) => p0.map((_, d) => {
    const m = 1 - u;
    return m * m * m * p0[d] + 3 * m * m * u * p1[d] + 3 * m * u * u * p2[d] + u * u * u * p3[d];
  });
  function camAt(keys, tau) { const v = path(keys, tau); return camera([v[0], v[1], v[2]], [v[3], v[4], v[5]], v[6]); }
  // czas akcji τ jako funkcja czasu sceny (odcinki z własną krzywą prędkości)
  function tauMap(segs, tl) {
    for (const sg of segs) {
      if (tl <= sg[1] || sg === segs[segs.length - 1]) {
        const u = clamp((tl - sg[0]) / (sg[1] - sg[0]));
        return lerp(sg[2], sg[3], sg[4] ? sg[4](u) : u);
      }
    }
    return 0;
  }
  function netBulge(tau, tHit, y, z, amp = 0.9) {
    const d = tau - tHit;
    if (d <= 0) return null;
    const a = amp * Math.sin(clamp(d / 0.09) * Math.PI / 2) * Math.exp(-d / 0.5) * (0.8 + 0.2 * Math.cos(d * 18));
    return { y, z, a };
  }

  function renderWorld(c, cam, t, o) {
    drawStadium(c, cam, t);
    drawPitch(c, cam);
    const items = [];
    goalParts(cam, o.bulge).forEach((p) => items.push(p));
    o.players.forEach((pl) => {
      const q = toCam(cam, [pl.x, pl.y, 0.9]);
      items.push({ z: q[2], draw: (cc) => capsule(cc, cam, pl) });
    });
    if (o.ball) { const q = toCam(cam, o.ball); items.push({ z: q[2] - 0.2, draw: (cc) => ball(cc, cam, o.ball) }); }
    items.sort((a, b) => b.z - a.z).forEach((it) => { if (it.z > NEAR) it.draw(c); });
    if (o.tracer) tracer(c, cam, o.tracer);
    // światło z jupiterów + mgiełka
    const g = c.createRadialGradient(W * 0.5, H * 0.25, 50, W * 0.5, H * 0.45, H * 0.8);
    g.addColorStop(0, 'rgba(180,200,255,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function hud(c, t, t0, title, extra) {
    const k = outExpo(clamp((t - t0) / 0.35));
    c.save(); c.globalAlpha = k; c.translate(lerp(-120, 0, k), 0);
    const lw = measure(c, 'SIGNATURE MOVE', 28, { stretch: 'condensed', weight: 800, ls: 5 }).w;
    c.beginPath(); c.roundRect(64, 250, lw + 72, 60, 8); c.fillStyle = 'rgba(7,7,11,.8)'; c.fill();
    c.fillStyle = C.granaHot; c.beginPath(); c.arc(94, 280, 10, 0, Math.PI * 2); c.fill();
    text(c, 'SIGNATURE MOVE', 118, 280, 28, { stretch: 'condensed', weight: 800, ls: 5, align: 'left', color: C.paper });
    text(c, title, 64, 356, 54, { stretch: 'expanded', weight: 900, align: 'left', color: C.paper });
    if (extra) text(c, extra, 64, 412, 26, { stretch: 'condensed', weight: 700, ls: 4, align: 'left', color: C.gold });
    c.restore();
  }
  function slowmoBadge(c, t, from, to) {
    if (t < from || t > to) return;
    const k = clamp((t - from) / 0.15) * clamp((to - t) / 0.1);
    c.save(); c.globalAlpha = k;
    c.beginPath(); c.roundRect(64, 1380, 300, 54, 27); c.fillStyle = 'rgba(237,187,0,.95)'; c.fill();
    text(c, `SUPER SLOW-MO`, 214, 1407, 28, { stretch: 'condensed', weight: 800, ls: 4, color: '#140f00' });
    c.restore();
  }
  function letterbox(c, k) {
    if (k <= 0) return;
    const h = 150 * outCubic(k);
    c.fillStyle = '#000'; c.fillRect(0, 0, W, h); c.fillRect(0, H - h, W, h);
  }

  /* ================================================================ sceny */
  function sIntro(c, t) {
    const b = t / BEAT;
    stripesBG(c, t, { alpha: 0.14, speed: 30 });
    const kick = outExpo(clamp((t - 0) / 0.5));
    c.save(); c.globalAlpha = kick * (b < 7.5 ? 1 : 0);
    text(c, TXT.kicker, W / 2, 330, 30, { stretch: 'condensed', weight: 700, ls: 8, color: C.gold });
    c.restore();
    if (b < 4) {
      const ys = [650, 890, 1130];
      const size = Math.min(...TXT.hook.map((wd) => fit(c, wd, SAFE, 250)));
      TXT.hook.forEach((wd, i) => {
        const jit = b >= 3 ? (hash(Math.floor(t * 30) + i) - 0.5) * 18 : 0;
        slam(c, t, B(i), (cc) => {
          if (i === 2) stripeText(cc, wd, CX + jit, ys[i], size, { stroke: 5, shift: t * 60 });
          else text(cc, wd, CX + jit, ys[i], size, { color: C.paper });
        }, { at: [CX, ys[i]] });
      });
      if (b >= 3) {
        const k = inv(3, 3.25, b);
        c.fillStyle = C.gold; c.fillRect(CX - 360 * k, 1300, 720 * k, 8);
      }
    } else if (b < 6) {
      slam(c, t, B(4), (cc) => text(cc, TXT.hook2[0], CX, 800, Math.min(260, fit(cc, TXT.hook2[0], SAFE, 260)), { color: C.paper }), { at: [CX, 800] });
      slam(c, t, B(5), (cc) => {
        const sz = fit(cc, TXT.hook2[1], SAFE, 220);
        text(cc, TXT.hook2[1], CX, 1050, sz, { color: C.gold });
      }, { at: [CX, 1050], from: 2.8 });
    } else if (b < 7.5) {
      // „10 / 11” migają coraz szybciej
      const step = b < 7 ? 0.5 : 0.25;
      const idx = Math.floor((b - 6) / step);
      const n = idx % 2 ? TXT.raph.num : TXT.yamal.num;
      const k = (b - 6 - idx * step) / step;
      c.fillStyle = idx % 2 ? C.grana : C.blau; c.globalAlpha = 0.55; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
      const sc = 1 + (b - 6) * 0.12 + (1 - outExpo(k)) * 0.25;
      c.save(); c.translate(W / 2, H / 2); c.scale(sc, sc); c.translate(-W / 2, -H / 2);
      text(c, n, W / 2, H / 2, fit(c, n, 980, 980, { stretch: 'condensed' }), { stretch: 'condensed', color: C.paper });
      c.restore();
    }
  }

  function numberTitle(c, t, t0, num, colorsAccent) {
    const age = t - t0;
    stripesBG(c, t, { alpha: 0.13, speed: 60 });
    glow(c, W / 2, H * 0.44, 900, 'rgba(237,187,0,.18)', 0.8);
    const sc = 1 + age * 0.05;
    c.save(); c.translate(W / 2, H * 0.44); c.scale(sc, sc); c.translate(-W / 2, -H * 0.44);
    const nsz = fit(c, num, 880, 1000, { stretch: 'condensed' });
    slam(c, t, t0, (cc) => stripeText(cc, num, CX, H * 0.44, nsz, { stretch: 'condensed', stroke: 7, shift: t * 120, stripeW: 90 }), { at: [CX, H * 0.44], from: 1.8, dur: 0.2 });
    c.restore();
    sparks(c, t, t0, CX, H * 0.44, { n: 90, seed: t0 * 10, colors: colorsAccent });
  }

  function sTitle10(c, t) {
    const b = t / BEAT;
    numberTitle(c, t, B(8), TXT.yamal.num, [C.goldHot, '#fff', C.blauHot, C.granaHot]);
    const sz = Math.min(fit(c, TXT.yamal.first, SAFE, 190), fit(c, TXT.yamal.last, SAFE, 190));
    slam(c, t, B(9), (cc) => text(cc, TXT.yamal.first, CX, 1250, sz, { color: C.paper }), { at: [CX, 1250] });
    slam(c, t, B(10), (cc) => text(cc, TXT.yamal.last, CX, 1250 + sz * 0.95, sz, { color: C.gold }), { at: [CX, 1250 + sz] });
    if (b >= 11) {
      const k = outExpo(clamp((t - B(11)) / 0.3));
      c.save(); c.globalAlpha = k;
      chip(c, TXT.yamal.chips[0], W / 2 - 190, 330 + (1 - k) * 30);
      chip(c, TXT.yamal.chips[1], W / 2 + 190, 330 + (1 - k) * 30);
      c.restore();
      flag(c, 'esp', W / 2, 330 + (1 - k) * 30, k);
    }
  }

  /* --- powtórka 1: podkręcony strzał Yamala --- */
  const REP1 = {
    tau: [[0, 2 * BEAT, 0, 1.25], [2 * BEAT, 4 * BEAT, 1.25, 2.05, (u) => ramp(u, 0.86)], [4 * BEAT, 6 * BEAT, 2.05, 2.6]],
    yamal: [[0, 80.5, 6.5], [0.45, 83.2, 9.2], [0.85, 86.2, 14.2], [1.25, 88.4, 19.8], [1.7, 89.4, 21.4], [2.6, 90.6, 22.6]],
    d1: [[0, 84.8, 12.0], [0.6, 85.7, 13.8], [0.95, 86.6, 16.4], [1.3, 87.0, 17.1], [2.6, 87.3, 17.6]],
    gk: [[0, 104.2, 33.0], [1.45, 104.2, 33.8], [2.0, 104.3, 36.0], [2.6, 104.4, 36.4]],
    others: [
      { team: 'opp', k: [[0, 92.5, 29.5], [2.6, 94.0, 27.5]] }, { team: 'opp', k: [[0, 93.0, 39.0], [2.6, 94.2, 36.8]] },
      { team: 'opp', k: [[0, 90.0, 49.0], [2.6, 92.0, 46.5]] }, { team: 'opp', k: [[0, 83.5, 41.0], [2.6, 86.0, 38.0]] },
      { team: 'fcb', k: [[0, 85.0, 38.0], [2.6, 91.5, 35.5]] },
      { team: 'fcb', hero: true, num: '11', tag: 'RAPHINHA', k: [[0, 94.2, 47.5], [2.6, 99.0, 43.5]], ring: 'rgba(237,187,0,.55)' },
    ],
    shot: { t0: 1.25, t1: 2.05, p: [[88.9, 21.2, 0.11], [95.2, 30.5, 2.0], [101.2, 40.6, 2.85], [105.05, 37.0, 2.06]] },
    after: [[2.05, 105.05, 37.0, 2.06], [2.25, 106.7, 37.2, 1.55], [2.6, 106.9, 37.25, 1.1]],
    cam: [
      [0, 69.5, -3.0, 8.5, 86.5, 15.5, 0.6, 60], [0.8, 72.5, 1.0, 7.8, 90.0, 22.0, 0.8, 56],
      [1.25, 76.0, 5.5, 7.0, 96.0, 29.5, 1.0, 50], [1.7, 79.0, 9.5, 6.0, 101.5, 34.5, 1.3, 42],
      [2.05, 81.0, 12.5, 5.2, 104.6, 36.6, 1.6, 34], [2.6, 82.0, 13.5, 5.0, 105.2, 37.0, 1.6, 30],
    ],
  };
  function ballR1(tau) {
    if (tau < REP1.shot.t0) { const p = path(REP1.yamal, tau), q = path(REP1.yamal, tau + 0.05); const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [p[0] + ((q[0] - p[0]) / d) * 0.55, p[1] + ((q[1] - p[1]) / d) * 0.55, 0.11]; }
    if (tau < REP1.shot.t1) { const u = (tau - REP1.shot.t0) / (REP1.shot.t1 - REP1.shot.t0); return bez(...REP1.shot.p, u); }
    return path(REP1.after, tau);
  }
  function worldR1(c, t, tl) {
    const tau = tauMap(REP1.tau, tl);
    const cam = camAt(REP1.cam, tau);
    const yp = path(REP1.yamal, tau), dp = path(REP1.d1, tau), gp = path(REP1.gk, tau);
    const players = [
      { x: yp[0], y: yp[1], team: 'fcb', hero: true, num: '10', tag: 'LAMINE', ring: C.gold },
      { x: dp[0], y: dp[1], team: 'opp', tilt: tau > 1.0 ? -0.35 * clamp((tau - 1.0) / 0.3) : 0 },
      { x: gp[0], y: gp[1], team: 'gk', tilt: tau > 1.6 ? -1.1 * clamp((tau - 1.6) / 0.4) : 0 },
      ...REP1.others.map((o) => { const p = path(o.k, tau); return { x: p[0], y: p[1], team: o.team, hero: o.hero, num: o.num, tag: o.tag, ring: o.ring }; }),
    ];
    const bp = ballR1(tau);
    let trace = null;
    if (tau > REP1.shot.t0) {
      trace = [];
      const end = Math.min(tau, 2.3);
      for (let x = REP1.shot.t0; x <= end; x += 0.02) trace.push(ballR1(x));
      trace.push(bp);
    }
    renderWorld(c, cam, t, { players, ball: bp, tracer: trace, bulge: netBulge(tau, REP1.shot.t1, 37.0, 2.0) });
    shock(c, cam, REP1.shot.p[0], tau - REP1.shot.t0);
    return tau;
  }
  function sReplayYamal(c, t) {
    const tl = t - B(12);
    worldR1(c, t, tl);
    const into = clamp(tl / 0.25);
    if (into < 1) { c.fillStyle = `rgba(255,255,255,${(1 - into) * 0.9})`; c.fillRect(0, 0, W, H); }
    letterbox(c, clamp((t - B(14)) / 0.25) * (t < B(16) ? 1 : clamp(1 - (t - B(16)) / 0.2)));
    hud(c, t, B(12), TXT.replay1, `LAMINE YAMAL ${DOT} 10`);
    slowmoBadge(c, t, B(14) + 0.1, B(16));
    if (t >= B(16)) goalWord(c, t, B(16), TXT.golazo, [C.goldHot, '#fff', C.blauHot]);
  }
  function goalWord(c, t, t0, word, cols) {
    c.fillStyle = `rgba(7,7,11,${0.45 * outExpo(clamp((t - t0) / 0.2))})`; c.fillRect(0, 0, W, H);
    sparks(c, t, t0, CX, H * 0.48, { n: 120, seed: 99 + t0, colors: cols, speed: 1900 });
    const sz = fit(c, word, SAFE, 230);
    slam(c, t, t0, (cc) => { stripeText(cc, word, CX, H * 0.48, sz, { stroke: 5, shift: t * 90 }); }, { at: [CX, H * 0.48], from: 3 });
  }

  /* karty ze statystykami */
  function cardBG(c, t) {
    stripesBG(c, t, { alpha: 0.12, speed: 50, angle: -0.35 });
  }
  function flag(c, kind, x, y, k = 1) {
    const w = 84, h = 56;
    c.save(); c.globalAlpha = k;
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 16;
    c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 6); c.clip();
    if (kind === 'esp') flagESP(c, x - w / 2, y - h / 2, w, h); else flagBRA(c, x - w / 2, y - h / 2, w, h);
    c.restore();
    c.save(); c.globalAlpha = k * 0.9; c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.55)';
    c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 6); c.stroke(); c.restore();
  }
  function card(c, t, t0, o) {
    const age = t - t0;
    const kl = outExpo(clamp(age / 0.3));
    if (o.flag) flag(c, o.flag, CX, (o.labelY || 640) - 90, kl);
    c.save(); c.globalAlpha = kl;
    text(c, o.label, CX + (1 - kl) * -80, o.labelY || 640, Math.min(34, fit(c, o.label, SAFE, 34, { stretch: 'condensed', weight: 700, ls: 7 })), { stretch: 'condensed', weight: 700, ls: 7, color: C.gold });
    c.restore();
    let y = o.mainY || 820;
    const lines = o.main || [];
    const common = lines.length ? Math.min(...lines.map((ln) => fit(c, ln, SAFE, o.mainSize || 170))) : 0;
    lines.forEach((ln, i) => {
      const sz = common;
      slam(c, t, t0 + i * 0.05, (cc) => text(cc, ln, CX, y, sz, { color: o.mainColor || C.paper }), { at: [CX, y] });
      y += sz * 1.02;
    });
    if (o.big) {
      const sz = fit(c, o.bigRef || o.big, SAFE, o.bigSize || 360);
      slam(c, t, t0 + 0.06, (cc) => stripeText(cc, o.big, CX, o.bigY || y + sz * 0.5, sz, { stroke: 5, shift: t * 80 }), { at: [CX, o.bigY || y + sz * 0.5], from: 2 });
      y = (o.bigY || y + sz * 0.5) + sz * 0.6;
    }
    if (o.detail) {
      const kd = outExpo(clamp((age - 0.12) / 0.35));
      c.save(); c.globalAlpha = kd;
      const dsz = Math.min(30, fit(c, o.detail, SAFE, 30, { stretch: 'condensed', weight: 600, ls: 3 }));
      text(c, o.detail, CX, (o.detailY || y + 40) + (1 - kd) * 20, dsz, { stretch: 'condensed', weight: 600, ls: 3, color: 'rgba(243,239,231,.8)' });
      c.restore();
    }
  }
  function sCardsYamal(c, t) {
    const b = t / BEAT;
    if (b < 18) { cardBG(c, t); card(c, t, B(17), { ...TXT.euro, flag: 'esp', mainY: 900, mainSize: 200 }); }
    else if (b < 19) { cardBG(c, t); card(c, t, B(18), { ...TXT.record, mainY: 760, mainSize: 120, bigSize: 230 }); }
    else if (b < 20) { cardBG(c, t); card(c, t, B(19), { ...TXT.kopa, labelY: 620, big: TXT.kopa.big, bigY: 900, bigSize: 520 }); }
    else if (b < 22) {
      const t0 = B(20);
      c.fillStyle = C.ink; c.fillRect(0, 0, W, H);
      glow(c, CX, 760, 1100, 'rgba(237,187,0,.45)', 1);
      rays(c, CX, 760, t, 'rgba(255,210,58,.9)', 0.22);
      text(c, '2026', CX, 1000, 520, { stretch: 'condensed', fill: false, stroke: 3, strokeColor: 'rgba(237,187,0,.35)' });
      const ks = outBack(clamp((t - t0) / 0.35), 2.2);
      star(c, CX - 70, 520, 55 * ks, C.goldHot); star(c, CX + 70, 520, 55 * ks, C.goldHot);
      card(c, t, t0, { label: TXT.wc.label, labelY: 640, main: TXT.wc.main, mainY: 790, mainSize: 210, mainColor: C.goldHot, detail: TXT.wc.detail });
      confetti(c, t, t0 + 0.05, { n: 160, seed: 2026 });
      flag(c, 'esp', CX, 1230, outExpo(clamp((t - t0 - 0.15) / 0.3)));
    } else {
      cardBG(c, t);
      card(c, t, B(22), { ...TXT.ballonY, mainY: 900, mainSize: 180 });
    }
  }

  function sTitle11(c, t) {
    const b = t / BEAT;
    numberTitle(c, t, B(24), TXT.raph.num, [C.braY, '#fff', C.braG, C.goldHot]);
    const sz = fit(c, TXT.raph.name, SAFE, 190);
    slam(c, t, B(25), (cc) => text(cc, TXT.raph.name, CX, 1290, sz, { color: C.gold }), { at: [CX, 1290] });
    if (b >= 26) {
      const k = outExpo(clamp((t - B(26)) / 0.3));
      c.save(); c.globalAlpha = k;
      chip(c, TXT.raph.chips[0], W / 2 - 200, 330 + (1 - k) * 30);
      chip(c, TXT.raph.chips[1], W / 2 + 210, 330 + (1 - k) * 30);
      c.restore();
      flag(c, 'bra', W / 2, 330 + (1 - k) * 30, k);
    }
  }

  /* --- powtórka 2: pressing Raphinhi --- */
  const REP2 = {
    tau: [[0, 1.5 * BEAT, 0, 1.0], [1.5 * BEAT, 3 * BEAT, 1.0, 1.7, (u) => Math.pow(u, 1.6)], [3 * BEAT, 4 * BEAT, 1.7, 2.1, (u) => ramp(u, 0.7)], [4 * BEAT, 6 * BEAT, 2.1, 2.5]],
    raph: [[0, 79.5, 35.5], [0.6, 85.6, 39.6], [1.0, 90.1, 42.2], [1.3, 92.4, 41.0], [1.7, 95.9, 38.6], [2.5, 97.4, 37.8]],
    cb: [[0, 91.3, 43.4], [0.55, 91.4, 43.2], [1.0, 91.0, 43.6], [1.4, 90.6, 44.6], [2.5, 92.8, 42.6]],
    gk: [[0, 104.0, 34.0], [1.5, 102.8, 35.1], [2.05, 103.1, 32.2], [2.5, 103.3, 31.8]],
    others: [
      { team: 'opp', k: [[0, 92.0, 24.0], [2.5, 95.0, 27.0]] }, { team: 'opp', k: [[0, 88.0, 55.0], [2.5, 91.0, 50.0]] },
      { team: 'opp', k: [[0, 84.0, 44.5], [2.5, 88.5, 41.5]] }, { team: 'opp', k: [[0, 95.5, 33.0], [2.5, 97.0, 33.5]] },
      { team: 'fcb', hero: true, num: '10', tag: 'LAMINE', ring: 'rgba(237,187,0,.55)', k: [[0, 90.5, 16.0], [2.5, 97.0, 24.5]] },
      { team: 'fcb', k: [[0, 84.5, 29.0], [2.5, 91.0, 31.0]] },
    ],
    pass: [[0, 103.2, 34.0, 0.11], [0.55, 91.6, 42.8, 0.11]],
    touch: [[0.55, 91.6, 42.8, 0.11], [1.0, 90.6, 42.6, 0.11]],
    shot: { t0: 1.7, t1: 2.1, p: [[96.3, 38.3, 0.11], [99.5, 36.0, 0.35], [102.5, 33.2, 0.32], [105.05, 31.0, 0.3]] },
    after: [[2.1, 105.05, 31.0, 0.3], [2.3, 106.8, 30.9, 0.25], [2.5, 106.95, 30.9, 0.2]],
    cam: [
      [0, 70.0, 30.0, 17.0, 90.0, 40.0, 0.0, 60], [1.0, 78.0, 34.0, 11.0, 93.0, 41.0, 0.5, 54],
      [1.7, 86.0, 40.0, 6.5, 101.0, 35.0, 0.8, 52], [2.1, 92.0, 39.0, 4.0, 104.8, 32.0, 0.8, 46], [2.5, 93.5, 38.0, 3.6, 105.5, 31.5, 0.8, 42],
    ],
  };
  function ballR2(tau) {
    if (tau < 0.55) return path(REP2.pass, tau);
    if (tau < 1.0) return path(REP2.touch, tau);
    if (tau < REP2.shot.t0) { const p = path(REP2.raph, tau), q = path(REP2.raph, tau + 0.05); const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [p[0] + ((q[0] - p[0]) / d) * 0.55, p[1] + ((q[1] - p[1]) / d) * 0.55, 0.11]; }
    if (tau < REP2.shot.t1) return bez(...REP2.shot.p, (tau - REP2.shot.t0) / (REP2.shot.t1 - REP2.shot.t0));
    return path(REP2.after, tau);
  }
  function sReplayRaph(c, t) {
    const tl = t - B(28);
    const tau = tauMap(REP2.tau, tl);
    const cam = camAt(REP2.cam, tau);
    const rp = path(REP2.raph, tau), cb = path(REP2.cb, tau), gp = path(REP2.gk, tau);
    const players = [
      { x: rp[0], y: rp[1], team: 'fcb', hero: true, num: '11', tag: 'RAPHINHA', ring: C.gold },
      { x: cb[0], y: cb[1], team: 'opp', tilt: tau > 1.0 ? 0.5 * clamp((tau - 1.0) / 0.3) * (1 - clamp((tau - 1.8) / 0.5)) : 0 },
      { x: gp[0], y: gp[1], team: 'gk', tilt: tau > 1.75 ? 1.1 * clamp((tau - 1.75) / 0.35) : 0 },
      ...REP2.others.map((o) => { const p = path(o.k, tau); return { x: p[0], y: p[1], team: o.team, hero: o.hero, num: o.num, tag: o.tag, ring: o.ring }; }),
    ];
    const bp = ballR2(tau);
    let trace = null;
    if (tau > REP2.shot.t0) { trace = []; for (let x = REP2.shot.t0; x <= Math.min(tau, 2.3); x += 0.02) trace.push(ballR2(x)); trace.push(bp); }
    renderWorld(c, cam, t, { players, ball: bp, tracer: trace, bulge: netBulge(tau, REP2.shot.t1, 31.0, 0.35, 0.8) });
    shock(c, cam, [90.8, 42.7, 0.4], tau - 1.0);
    shock(c, cam, REP2.shot.p[0], tau - REP2.shot.t0);
    const into = clamp(tl / 0.25);
    if (into < 1) { c.fillStyle = `rgba(255,255,255,${(1 - into) * 0.9})`; c.fillRect(0, 0, W, H); }
    letterbox(c, clamp((t - B(29.5)) / 0.25) * (t < B(32) ? 1 : clamp(1 - (t - B(32)) / 0.2)));
    hud(c, t, B(28), TXT.replay2, `RAPHINHA ${DOT} 11`);
    slowmoBadge(c, t, B(29.5) + 0.05, B(31));
    if (t >= B(29.5) && t < B(30.5)) {
      const k = outExpo(clamp((t - B(29.5)) / 0.2));
      c.save(); c.globalAlpha = 1 - clamp((t - B(30.2)) / 0.14);
      text(c, 'BALL WON', CX, 1300 + (1 - k) * 40, 90, { stretch: 'expanded', color: C.gold });
      c.restore();
    }
    if (t >= B(32)) goalWord(c, t, B(32), TXT.golaco, [C.braY, '#fff', C.braG]);
  }

  function sCardsRaph(c, t) {
    const b = t / BEAT;
    if (b < 34) {
      cardBG(c, t);
      const n = Math.round(13 * outCubic(clamp((t - B(33)) / 0.22)));
      card(c, t, B(33), { label: TXT.ucl.label, flag: 'bra', labelY: 560, big: String(n), bigRef: '13', bigY: 880, bigSize: 640 });
      slam(c, t, B(33) + 0.05, (cc) => text(cc, TXT.ucl.main[0], CX, 1250, Math.min(170, fit(cc, TXT.ucl.main[0], SAFE, 170)), { color: C.paper }), { at: [CX, 1250] });
    } else if (b < 35) { cardBG(c, t); card(c, t, B(34), { ...TXT.top, mainY: 820, mainSize: 190 }); }
    else if (b < 36) { cardBG(c, t); card(c, t, B(35), { label: TXT.ballonR.label, labelY: 640, big: TXT.ballonR.big, bigY: 900, bigSize: 470 }); }
    else if (b < 38) {
      stripesBG(c, t, { alpha: 0.3, speed: 90 });
      glow(c, W / 2, 900, 900, 'rgba(224,20,94,.35)', 1);
      const lsz = Math.min(fit(c, TXT.liga.main[0], SAFE, 230), fit(c, TXT.liga.main[1], SAFE, 230));
      slam(c, t, B(36), (cc) => text(cc, TXT.liga.main[0], CX, 800, lsz, { color: C.paper }), { at: [CX, 800] });
      slam(c, t, B(37), (cc) => text(cc, TXT.liga.main[1], CX, 800 + lsz * 1.05, lsz, { color: C.gold }), { at: [CX, 800 + lsz] });
      const kd = outExpo(clamp((t - B(37) - 0.1) / 0.3));
      c.save(); c.globalAlpha = kd; text(c, TXT.liga.detail, CX, 800 + lsz * 2.2, 54, { stretch: 'condensed', weight: 800, ls: 6, color: C.paper }); c.restore();
      text(c, `${TXT.yamal.num}  +  ${TXT.raph.num}`, CX, 560, 64, { stretch: 'expanded', color: 'rgba(243,239,231,.35)' });
    } else if (b < 39.5) {
      const step = b < 39 ? 0.5 : 0.25;
      const idx = Math.floor((b - 38) / step);
      const k = (b - 38 - idx * step) / step;
      c.fillStyle = idx % 2 ? C.grana : C.blau; c.fillRect(0, 0, W, H);
      const sc = 1 + (b - 38) * 0.18 + (1 - outExpo(k)) * 0.25;
      c.save(); c.translate(W / 2, H / 2); c.scale(sc, sc); c.translate(-W / 2, -H / 2);
      const nn = idx % 2 ? TXT.raph.num : TXT.yamal.num;
      text(c, nn, W / 2, H / 2, fit(c, nn, 980, 980, { stretch: 'condensed' }), { stretch: 'condensed', color: C.paper });
      c.restore();
    } else { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
  }

  /* --- powtórka 3: trivela Yamala, wolej Raphinhi (kamera zza bramki) --- */
  const REP3 = {
    tau: [[0, BEAT, 0, 0.46], [BEAT, 2.5 * BEAT, 0.46, 1.46, (u) => ramp(u, 0.8)], [2.5 * BEAT, 3 * BEAT, 1.46, 1.66], [3 * BEAT, 3.5 * BEAT, 1.66, 1.82, outCubic]],
    yamal: [[0, 85.4, 10.8], [0.46, 87.6, 12.2], [1.0, 89.4, 13.4], [2.0, 91.0, 14.4]],
    raph: [[0, 94.3, 51.8], [0.8, 97.4, 46.6], [1.46, 100.0, 41.3], [1.8, 100.9, 40.1], [2.0, 101.2, 39.8]],
    gk: [[0, 103.9, 30.6], [1.2, 103.5, 33.6], [1.6, 103.7, 36.4], [2.0, 103.8, 36.8]],
    others: [
      { team: 'opp', k: [[0, 90.6, 14.2], [2.0, 89.4, 13.9]] }, { team: 'opp', k: [[0, 96.0, 38.0], [2.0, 98.6, 39.4]] },
      { team: 'opp', k: [[0, 95.6, 30.0], [2.0, 97.8, 31.4]] }, { team: 'opp', k: [[0, 92.0, 46.0], [2.0, 95.5, 45.0]] },
      { team: 'fcb', k: [[0, 95.2, 27.5], [2.0, 99.2, 30.8]] },
    ],
    cross: { t0: 0.46, t1: 1.46, p: [[88.0, 12.5, 0.11], [96.0, 15.5, 3.4], [100.8, 29.5, 3.0], [100.4, 40.6, 1.0]] },
    volley: { t0: 1.46, t1: 1.66, p: [[100.4, 40.6, 1.0], [101.9, 38.2, 1.12], [103.5, 35.6, 1.2], [105.05, 33.2, 1.25]] },
    after: [[1.66, 105.05, 33.2, 1.25], [1.82, 106.8, 32.9, 1.05], [2.0, 106.95, 32.9, 0.9]],
    cam: [
      [0, 122.5, 37.5, 10.5, 95.5, 26.0, 0.0, 64], [0.6, 123.0, 38.5, 10.2, 96.5, 31.0, 0.3, 64],
      [1.0, 123.5, 39.5, 10.0, 98.0, 36.5, 0.6, 64], [1.46, 118.5, 39.0, 7.4, 100.5, 39.5, 0.9, 50],
      [1.66, 117.0, 37.5, 6.6, 103.5, 37.2, 1.0, 52], [2.0, 116.5, 37.0, 6.3, 104.0, 36.5, 1.0, 48],
    ],
  };
  function ballR3(tau) {
    if (tau < REP3.cross.t0) { const p = path(REP3.yamal, tau), q = path(REP3.yamal, tau + 0.05); const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [p[0] + ((q[0] - p[0]) / d) * 0.55, p[1] + ((q[1] - p[1]) / d) * 0.55, 0.11]; }
    if (tau < REP3.cross.t1) return bez(...REP3.cross.p, (tau - REP3.cross.t0) / (REP3.cross.t1 - REP3.cross.t0));
    if (tau < REP3.volley.t1) return bez(...REP3.volley.p, (tau - REP3.volley.t0) / (REP3.volley.t1 - REP3.volley.t0));
    return path(REP3.after, tau);
  }
  function worldR3(c, t, tau) {
    const cam = camAt(REP3.cam, tau);
    const yp = path(REP3.yamal, tau), rp = path(REP3.raph, tau), gp = path(REP3.gk, tau);
    const players = [
      { x: yp[0], y: yp[1], team: 'fcb', hero: true, num: '10', tag: 'LAMINE', ring: C.gold },
      { x: rp[0], y: rp[1], team: 'fcb', hero: true, num: '11', tag: 'RAPHINHA', ring: C.gold },
      { x: gp[0], y: gp[1], team: 'gk', tilt: tau > 1.5 ? 1.0 * clamp((tau - 1.5) / 0.3) : 0 },
      ...REP3.others.map((o) => { const p = path(o.k, tau); return { x: p[0], y: p[1], team: o.team }; }),
    ];
    const bp = ballR3(tau);
    let trace = null;
    if (tau > REP3.cross.t0) { trace = []; for (let x = REP3.cross.t0; x <= Math.min(tau, 1.85); x += 0.02) trace.push(ballR3(x)); trace.push(bp); }
    renderWorld(c, cam, t, { players, ball: bp, tracer: trace, bulge: netBulge(tau, REP3.volley.t1, 33.2, 1.25, 1.0) });
    shock(c, cam, REP3.cross.p[0], tau - REP3.cross.t0);
    shock(c, cam, REP3.volley.p[0], tau - REP3.volley.t0);
  }
  function sReplayDuo(c, t) {
    const tl = t - B(40);
    const freezeAt = 3.5 * BEAT;
    const tau = tauMap(REP3.tau, Math.min(tl, freezeAt));
    worldR3(c, t, tau);
    letterbox(c, clamp((t - B(41)) / 0.25) * (t < B(43) ? 1 : clamp(1 - (t - B(43)) / 0.2)));
    const k = outExpo(clamp(tl / 0.3));
    c.save(); c.globalAlpha = k;
    text(c, TXT.replay3, W / 2, 330, 120, { stretch: 'expanded', color: C.paper });
    c.restore();
    slowmoBadge(c, t, B(41) + 0.05, B(42.5));
    if (tl > freezeAt) {
      const fk = clamp((tl - freezeAt) / 0.2);
      c.fillStyle = `rgba(7,7,11,${0.35 * fk})`; c.fillRect(0, 0, W, H);
    }
  }

  function freezeFrame() {
    if (cache.freeze) return cache.freeze;
    const cv = mk(W, H), c = cv.getContext('2d');
    worldR3(c, B(43.5), tauMap(REP3.tau, 3.5 * BEAT));
    const out = mk(W, H), o = out.getContext('2d');
    o.filter = 'blur(10px) saturate(1.2)';
    o.drawImage(cv, 0, 0);
    o.filter = 'none';
    cache.freeze = out;
    return out;
  }
  function sEnd(c, t) {
    const age = t - B(44);
    const fz = freezeFrame();
    const sc = 1.05 + age * 0.03;
    c.save(); c.translate(W / 2, H / 2); c.scale(sc, sc); c.translate(-W / 2, -H / 2); c.drawImage(fz, 0, 0); c.restore();
    c.fillStyle = 'rgba(7,7,11,.62)'; c.fillRect(0, 0, W, H);
    glow(c, W / 2, 820, 900, 'rgba(47,123,255,.28)', 1);
    const y0 = 800;
    const nz = 460, xz = 170;
    const w10 = measure(c, TXT.yamal.num, nz, { stretch: 'condensed' }).w, w11 = measure(c, TXT.raph.num, nz, { stretch: 'condensed' }).w;
    const wx = measure(c, TIMES, xz).w, gap = 26;
    const tot = w10 + w11 + wx + gap * 2, sk = Math.min(1, 840 / tot);
    slam(c, t, B(44), (cc) => {
      cc.save(); cc.translate(CX, y0); cc.scale(sk, sk); cc.translate(-CX, -y0);
      const x0 = CX - tot / 2;
      stripeText(cc, TXT.yamal.num, x0 + w10 / 2, y0, nz, { stretch: 'condensed', stroke: 6, shift: t * 100, stripeW: 50 });
      text(cc, TIMES, x0 + w10 + gap + wx / 2, y0, xz, { stretch: 'expanded', color: C.gold });
      stripeText(cc, TXT.raph.num, x0 + w10 + gap * 2 + wx + w11 / 2, y0, nz, { stretch: 'condensed', stroke: 6, shift: t * 100, stripeW: 50 });
      cc.restore();
    }, { at: [CX, y0], from: 2.2 });
    const nsz = fit(c, TXT.end.names, SAFE, 60, { stretch: 'condensed', weight: 800, ls: 4 });
    slam(c, t, B(45), (cc) => text(cc, TXT.end.names, CX, 1120, nsz, { stretch: 'condensed', weight: 800, ls: 4, color: C.paper }), { at: [CX, 1120] });
    const msz = fit(c, TXT.end.motto, SAFE, 150);
    slam(c, t, B(46), (cc) => text(cc, TXT.end.motto, CX, 1290, msz, { color: C.gold }), { at: [CX, 1290], from: 2.6 });
    confetti(c, t, B(46), { n: 170, seed: 1899, colors: [C.gold, C.blauHot, C.granaHot, '#fff'] });
    sparks(c, t, B(46), CX, 1290, { n: 140, seed: 46, speed: 2100, colors: [C.goldHot, '#fff', C.granaHot, C.blauHot] });
  }

  const SCENES = [
    [0, 8, sIntro], [8, 12, sTitle10], [12, 17, sReplayYamal], [17, 24, sCardsYamal],
    [24, 28, sTitle11], [28, 33, sReplayRaph], [33, 40, sCardsRaph], [40, 44, sReplayDuo], [44, 999, sEnd],
  ];

  /* ================================================================ post-produkcja */
  const FXP = {
    slam: [0.7, 0.3, 10, 18, 0], drop: [1.2, 0.9, 24, 42, 0.22], goal: [1.2, 1.0, 26, 46, 0.2], big: [1.0, 0.8, 18, 30, 0.12],
    card: [0.45, 0.14, 6, 10, 0], tick: [0.25, 0.05, 4, 6, 0], whoosh: [0.2, 0, 6, 6, 0], shot: [0.5, 0.25, 8, 12, 0],
    steal: [0.4, 0.2, 8, 10, 0.08], final: [1.3, 1.0, 28, 48, 0.3],
  };
  function fxAt(t) {
    const f = { punch: 0, flash: 0, rgb: 0, shake: 0, glitch: 0 };
    TL.hits.forEach((h) => {
      const d = t - B(h.b);
      if (d < 0 || d > 1.5) return;
      const p = FXP[h.type] || FXP.tick;
      f.punch += p[0] * Math.exp(-d / 0.14);
      f.flash += p[1] * Math.exp(-d / 0.07);
      f.rgb += p[2] * Math.exp(-d / 0.12);
      f.shake += p[3] * Math.exp(-d / 0.16);
      if (d < p[4]) f.glitch = Math.max(f.glitch, 1 - d / p[4]);
    });
    // lekki puls na każdym bicie, kiedy gra bit
    const b = t / BEAT;
    if (b >= 8 && b < 46) { const d = (b - Math.floor(b)) * BEAT; f.punch += 0.12 * Math.exp(-d / 0.09); }
    return f;
  }
  function whip(t) {
    // przejście „whip pan” między częścią Yamala a Raphinhą
    const a = B(23.5), b = B(24), e = B(24.25);
    if (t >= a && t < b) return -W * inExpo(inv(a, b, t)) * 0.9;
    if (t >= b && t < e) return W * 0.9 * (1 - outExpo(inv(b, e, t)));
    return 0;
  }
  function zoomThrough(t) {
    // wlot „w cyfrę” przed powtórkami
    for (const [a, b] of [[B(11.5), B(12)], [B(27.5), B(28)]]) if (t >= a && t < b) return 1 + 14 * inExpo(inv(a, b, t));
    return 1;
  }

  function renderFrame(t) {
    const b = t / BEAT;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalAlpha = 1; s.globalCompositeOperation = 'source-over'; s.filter = 'none';
    const sc = SCENES.find((x) => b >= x[0] && b < x[1]) || SCENES[SCENES.length - 1];
    sc[2](s, t);
    s.setTransform(1, 0, 0, 1, 0, 0);

    const f = fxAt(t);
    const zt = zoomThrough(t);
    const wx = whip(t);
    const shx = f.shake * (vnoise(t * 38, 1) * 2 - 1), shy = f.shake * (vnoise(t * 41, 2) * 2 - 1);
    const rot = f.shake * 0.0007 * (vnoise(t * 29, 3) * 2 - 1);
    const zoom = (1 + f.punch * 0.045) * zt;

    M.setTransform(1, 0, 0, 1, 0, 0);
    M.globalAlpha = 1; M.globalCompositeOperation = 'source-over';
    M.fillStyle = '#000'; M.fillRect(0, 0, W, H);
    M.save();
    M.translate(W / 2 + shx + wx, H / 2 + shy); M.rotate(rot); M.scale(zoom, zoom); M.translate(-W / 2, -H / 2);
    const split = f.rgb + (wx ? 18 : 0);
    if (split > 1) {
      sp1.globalCompositeOperation = 'source-over'; sp1.drawImage(S, 0, 0); sp1.globalCompositeOperation = 'multiply'; sp1.fillStyle = '#ff0000'; sp1.fillRect(0, 0, W, H);
      sp2.globalCompositeOperation = 'source-over'; sp2.drawImage(S, 0, 0); sp2.globalCompositeOperation = 'multiply'; sp2.fillStyle = '#00ffff'; sp2.fillRect(0, 0, W, H);
      M.globalCompositeOperation = 'lighter';
      M.drawImage(SP1, -split, 0);
      M.drawImage(SP2, split, 0);
      M.globalCompositeOperation = 'source-over';
    } else {
      M.drawImage(S, 0, 0);
    }
    if (wx) { // smuga ruchu przy whip panie
      M.globalAlpha = 0.28;
      for (let i = 1; i <= 4; i++) M.drawImage(S, i * 26 * Math.sign(-wx || 1), 0);
      M.globalAlpha = 1;
    }
    if (zt > 1.02) { M.globalAlpha = 0.35; M.drawImage(S, -W * 0.04, -H * 0.04, W * 1.08, H * 1.08); M.globalAlpha = 1; }
    M.restore();

    if (f.glitch > 0) {
      const rnd = mulberry(Math.floor(t * 60) + 5);
      sp1.globalCompositeOperation = 'source-over';
      sp1.drawImage(main, 0, 0);
      const n = 6 + Math.floor(rnd() * 6);
      for (let i = 0; i < n; i++) {
        const y = Math.floor(rnd() * H), h = 12 + Math.floor(rnd() * 90), dx = (rnd() - 0.5) * 140 * f.glitch;
        M.drawImage(SP1, 0, y, W, h, dx, y, W, h);
      }
    }
    // ziarno, winieta, błysk
    const gi = GRAIN[Math.floor(t * 24) % GRAIN.length];
    M.globalAlpha = 0.07; M.globalCompositeOperation = 'overlay';
    M.drawImage(gi, 0, 0, W, H);
    M.globalAlpha = 1; M.globalCompositeOperation = 'source-over';
    const vg = M.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    M.fillStyle = vg; M.fillRect(0, 0, W, H);
    TL.hits.forEach((h) => {
      if (!['drop', 'goal', 'final'].includes(h.type)) return;
      const d = t - B(h.b);
      if (d >= 0 && d < 2 / TL.fps) { M.globalCompositeOperation = 'difference'; M.fillStyle = '#fff'; M.fillRect(0, 0, W, H); M.globalCompositeOperation = 'source-over'; }
    });
    if (f.flash > 0.01) { M.fillStyle = `rgba(255,255,255,${clamp(f.flash, 0, 0.95)})`; M.fillRect(0, 0, W, H); }
    // cisza przed dropem = czerń; wygaszenie na końcu
    let black = 0;
    TL.gaps.forEach((g) => { if (b >= g.from && b < g.to) black = Math.max(black, clamp((b - g.from) / 0.12)); });
    const tail = clamp((t - (TL.duration - 0.45)) / 0.4);
    black = Math.max(black, tail);
    if (black > 0) { M.fillStyle = `rgba(0,0,0,${black})`; M.fillRect(0, 0, W, H); }
    if (window.SHOW_GUIDES) { // podgląd stref zasłanianych przez interfejs TikToka
      M.fillStyle = 'rgba(255,0,60,.28)';
      M.fillRect(0, 0, W, 220); M.fillRect(920, 780, 160, 780); M.fillRect(0, 1480, W, 440);
    }
    // cienka złota linia w ciszy przed dropem
    TL.gaps.forEach((g) => {
      if (b >= g.from && b < g.to) {
        const k = inv(g.from, g.to, b);
        M.fillStyle = C.gold; M.fillRect(W / 2 - 400 * (1 - k), H / 2 - 2, 800 * (1 - k), 4);
      }
    });
  }

  function makeGrain() {
    const rnd = mulberry(304);
    for (let k = 0; k < 4; k++) {
      const cv = mk(540, 960), c = cv.getContext('2d');
      const img = c.createImageData(540, 960);
      for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (rnd() - 0.5) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      c.putImageData(img, 0, 0);
      GRAIN.push(cv);
    }
  }

  async function init() {
    TL = await (await fetch('timeline.json')).json();
    BEAT = 60 / TL.bpm;
    await Promise.all([
      document.fonts.load(`900 100px Archivo`), document.fonts.load(`700 100px Archivo`),
      document.fonts.load(`600 30px 'Inter Tight'`), document.fonts.load(`900 100px Archivo`, '\u00C7'),
    ]);
    await document.fonts.ready;
    makeGrain();
    window.renderFrame = (t) => { renderFrame(t); return true; };
    window.EDIT = { duration: TL.duration, fps: TL.fps, bpm: TL.bpm };
    window.EDIT_READY = true;
    if (/[?&]preview/.test(location.search)) preview();
    else if (/[?&]t=([\d.]+)/.test(location.search)) renderFrame(parseFloat(RegExp.$1));
  }

  function preview() {
    document.body.classList.add('preview');
    const hint = document.createElement('div');
    hint.className = 'hint'; hint.textContent = 'Kliknij, \u017Ceby odtworzy\u0107 z d\u017Awi\u0119kiem';
    document.body.appendChild(hint);
    const audio = new Audio('out/soundtrack.m4a');
    let playing = false;
    renderFrame(0.001);
    main.addEventListener('click', () => { if (playing) { audio.pause(); playing = false; } else { audio.currentTime = audio.ended ? 0 : audio.currentTime; audio.play(); playing = true; } });
    audio.addEventListener('ended', () => { audio.currentTime = 0; audio.play(); });
    const loop = () => { if (playing) renderFrame(Math.min(audio.currentTime, TL.duration - 0.001)); requestAnimationFrame(loop); };
    loop();
  }

  init();
})();
