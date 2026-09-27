(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const POS = window.POSITIONS;
  const PL = window.PLAYERS;
  const TAC = window.TACTICS;
  const POS_POINTS = window.POS_POINTS;
  const POS_NAMES = window.POS_NAMES;
  const byId = Object.fromEntries(PL.map((p) => [p.id, p]));
  const LINE_CLS = { GK: 'gk', DEF: 'def', MID: 'mid', FWD: 'fwd' };
  const LINE_COLOR = { GK: '#edbb00', DEF: '#3b82f6', MID: '#9b5cf6', FWD: '#e0195e' };
  const LINE_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SQUAD = PL.slice().sort((a, b) => LINE_ORDER[a.line] - LINE_ORDER[b.line] || a.num - b.num);

  /* ================= storage (per-przeglądarka, opcjonalne) ================= */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* brak dostępu */ } },
  };

  /* ================= geometria boiska ================= */
  const PAD = 20, W = 1050, H = 680, VW = W + 2 * PAD, VH = H + 2 * PAD;
  const hx = (x) => PAD + (x / 100) * W;
  const hy = (y) => PAD + (y / 100) * H;
  function toPct(x, y, vertical) {
    const X = hx(x), Y = hy(y);
    return vertical ? [(Y / VH) * 100, ((VW - X) / VW) * 100] : [(X / VW) * 100, (Y / VH) * 100];
  }
  const isVertical = () => window.innerWidth < 720;

  function pitchSVG(vertical, uid, extra = '', opts = {}) {
    const stripes = Array.from({ length: 14 }, (_, i) => i % 2 ? '' :
      `<rect x="${PAD + (i * W) / 14}" y="0" width="${W / 14}" height="${VH}" fill="#fff" opacity=".035"/>`).join('');
    const lc = opts.lineClass ? ` class="${opts.lineClass}"` : '';
    const arcDy = 73.1;
    const L = [
      `<rect${lc} x="${PAD}" y="${PAD}" width="${W}" height="${H}" rx="2"/>`,
      `<path${lc} d="M${PAD + 525} ${PAD}V${PAD + H}"/>`,
      `<circle${lc} cx="${PAD + 525}" cy="${PAD + 340}" r="91.5"/>`,
      `<rect${lc} x="${PAD}" y="${PAD + 138.4}" width="165" height="403.2"/>`,
      `<rect${lc} x="${PAD}" y="${PAD + 248.4}" width="55" height="183.2"/>`,
      `<rect${lc} x="${PAD + W - 165}" y="${PAD + 138.4}" width="165" height="403.2"/>`,
      `<rect${lc} x="${PAD + W - 55}" y="${PAD + 248.4}" width="55" height="183.2"/>`,
      `<path${lc} d="M${PAD + 165} ${PAD + 340 - arcDy}A91.5 91.5 0 0 1 ${PAD + 165} ${PAD + 340 + arcDy}"/>`,
      `<path${lc} d="M${PAD + W - 165} ${PAD + 340 - arcDy}A91.5 91.5 0 0 0 ${PAD + W - 165} ${PAD + 340 + arcDy}"/>`,
      `<path${lc} d="M${PAD + 10} ${PAD}A10 10 0 0 1 ${PAD} ${PAD + 10}M${PAD + W - 10} ${PAD}A10 10 0 0 0 ${PAD + W} ${PAD + 10}M${PAD} ${PAD + H - 10}A10 10 0 0 1 ${PAD + 10} ${PAD + H}M${PAD + W - 10} ${PAD + H}A10 10 0 0 1 ${PAD + W} ${PAD + H - 10}"/>`,
      `<rect${lc} x="${PAD - 12}" y="${PAD + 303.4}" width="12" height="73.2"/>`,
      `<rect${lc} x="${PAD + W}" y="${PAD + 303.4}" width="12" height="73.2"/>`,
    ].join('');
    const spots = `<circle cx="${PAD + 525}" cy="${PAD + 340}" r="4" fill="rgba(255,255,255,.8)"/>
      <circle cx="${PAD + 110}" cy="${PAD + 340}" r="3.5" fill="rgba(255,255,255,.8)"/>
      <circle cx="${PAD + W - 110}" cy="${PAD + 340}" r="3.5" fill="rgba(255,255,255,.8)"/>`;
    const tf = vertical ? ` transform="matrix(0,-1,1,0,0,${VW})"` : '';
    const vb = vertical ? `0 0 ${VH} ${VW}` : `0 0 ${VW} ${VH}`;
    const marker = (name, color) => `<marker id="${uid}-ah-${name}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3.6" markerHeight="3.6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${color}"/></marker>`;
    const zg = (k, c) => `<radialGradient id="${uid}-zg-${k}"><stop offset="0" stop-color="${c}" stop-opacity=".62"/><stop offset=".7" stop-color="${c}" stop-opacity=".22"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
    return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="${uid}-grass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#1f7a45"/><stop offset=".5" stop-color="#17693b"/><stop offset="1" stop-color="#0f5530"/>
        </linearGradient>
        <radialGradient id="${uid}-vig" cx=".5" cy=".5" r=".75">
          <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/>
        </radialGradient>
        ${marker('run', '#edbb00')}${marker('move', '#ffffff')}${marker('press', '#ff4d7d')}${marker('pass', '#ffffff')}
        ${zg('gk', LINE_COLOR.GK)}${zg('def', LINE_COLOR.DEF)}${zg('mid', LINE_COLOR.MID)}${zg('fwd', LINE_COLOR.FWD)}
      </defs>
      <g${tf}>
        <rect width="${VW}" height="${VH}" fill="url(#${uid}-grass)"/>
        ${stripes}
        <g fill="none" stroke="rgba(255,255,255,.78)" stroke-width="2.6">${L}</g>
        ${spots}
        ${extra}
      </g>
      <rect width="100%" height="100%" fill="url(#${uid}-vig)" pointer-events="none"/>
    </svg>`;
  }

  /* ================= zdjęcia ================= */
  const PHOTO_KEY = 'blaugrana.photos.v1';
  const Photo = {
    data: {}, // pid -> {src, file} | false
    init() {
      PL.forEach((p) => { if (p.photo) this.data[p.id] = { src: p.photo, file: null }; });
      const cached = store.get(PHOTO_KEY, null);
      if (cached && Date.now() - cached.t < 7 * 864e5) {
        Object.entries(cached.d).forEach(([k, v]) => { if (!(k in this.data) && v) this.data[k] = v; });
      }
      const missing = PL.filter((p) => !(p.id in this.data));
      if (missing.length) this.fetchAll(missing).then(() => this.apply());
      this.apply();
    },
    save() {
      const d = {};
      Object.entries(this.data).forEach(([k, v]) => { if (v && !byId[k].photo) d[k] = v; });
      store.set(PHOTO_KEY, { t: Date.now(), d });
    },
    async api(params) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      try {
        const qs = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', ...params });
        const r = await fetch('https://en.wikipedia.org/w/api.php?' + qs, { signal: ctrl.signal });
        if (!r.ok) throw new Error(r.status);
        return await r.json();
      } finally { clearTimeout(timer); }
    },
    isFootballer: (pg) => pg && pg.thumbnail && /football|soccer|goalkeeper/i.test(pg.description || ''),
    async fetchAll(list) {
      try {
        const j = await this.api({
          prop: 'pageimages|description', piprop: 'thumbnail|name', pithumbsize: '640', pilimit: '50',
          redirects: '1', titles: list.map((p) => p.wiki).join('|'),
        });
        const q = j.query || {};
        const mapT = {};
        (q.normalized || []).forEach((n) => { mapT[n.from] = n.to; });
        (q.redirects || []).forEach((n) => { mapT[n.from] = n.to; });
        const pages = Object.fromEntries((q.pages || []).map((pg) => [pg.title, pg]));
        const retry = [];
        list.forEach((p) => {
          let t = p.wiki;
          for (let i = 0; i < 3 && mapT[t]; i++) t = mapT[t];
          const pg = pages[t];
          if (this.isFootballer(pg)) this.data[p.id] = { src: pg.thumbnail.source, file: pg.pageimage || null, page: pg.title };
          else retry.push(p);
        });
        this.apply();
        await Promise.all(retry.map((p) => this.search(p)));
        this.save();
      } catch (e) {
        list.forEach((p) => { if (!(p.id in this.data)) this.data[p.id] = false; });
      }
    },
    async search(p) {
      try {
        const j = await this.api({
          generator: 'search', gsrsearch: `${p.name} footballer`, gsrlimit: '5',
          prop: 'pageimages|description', piprop: 'thumbnail|name', pithumbsize: '640',
        });
        const pages = ((j.query && j.query.pages) || []).sort((a, b) => a.index - b.index);
        const hit = pages.find((pg) => this.isFootballer(pg) && norm(pg.title).includes(p.key));
        this.data[p.id] = hit ? { src: hit.thumbnail.source, file: hit.pageimage || null, page: hit.title } : false;
      } catch (e) { this.data[p.id] = false; }
      this.apply();
    },
    apply() {
      $$('.ph[data-pid]').forEach((el) => {
        const d = this.data[el.dataset.pid];
        if (!d || el.querySelector('img')) return;
        const img = new Image();
        img.alt = '';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.onload = () => img.classList.add('ok');
        img.onerror = () => { img.remove(); };
        img.src = d.src;
        el.appendChild(img);
      });
    },
  };

  const initials = (p) => p.name.split(' ').filter((w) => /^[A-ZÀ-Ž]/.test(w)).map((w) => w[0]).join('').slice(0, 2);
  function avatarSVG(p, big) {
    const c = LINE_COLOR[p.line];
    if (big) {
      return `<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="300" height="400" fill="#0c1533"/>
        <g opacity=".5" transform="rotate(-12 150 200)">
          <rect x="-60" y="-80" width="70" height="560" fill="#004d98"/><rect x="10" y="-80" width="70" height="560" fill="#a50044"/>
          <rect x="80" y="-80" width="70" height="560" fill="#004d98"/><rect x="150" y="-80" width="70" height="560" fill="#a50044"/>
          <rect x="220" y="-80" width="70" height="560" fill="#004d98"/><rect x="290" y="-80" width="70" height="560" fill="#a50044"/>
        </g>
        <circle cx="150" cy="170" r="120" fill="${c}" opacity=".18"/>
        <text x="150" y="222" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="170" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.5" letter-spacing="4">${esc(initials(p))}</text>
      </svg>`;
    }
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="100" height="100" fill="#0d1636"/>
      <rect x="0" width="20" height="100" fill="#004d98" opacity=".55"/><rect x="20" width="20" height="100" fill="#a50044" opacity=".55"/>
      <rect x="40" width="20" height="100" fill="#004d98" opacity=".55"/><rect x="60" width="20" height="100" fill="#a50044" opacity=".55"/>
      <rect x="80" width="20" height="100" fill="#004d98" opacity=".55"/>
      <circle cx="50" cy="40" r="17" fill="rgba(255,255,255,.26)"/>
      <path d="M14 106C14 76 30 62 50 62S86 76 86 106Z" fill="rgba(255,255,255,.26)"/>
    </svg>`;
  }
  const phHTML = (p, big) => `<span class="ph" data-pid="${p.id}">${avatarSVG(p, big)}</span>`;

  /* ================= nawigacja / efekty ogólne ================= */
  function initChrome() {
    const nav = $('#nav'), bar = $('#progress');
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      bar.style.transform = `scaleX(${p})`;
      nav.classList.toggle('scrolled', h.scrollTop > 30);
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const io = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach((el) => io.observe(el));

    const links = $$('[data-nav]');
    const sio = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    $$('section[id]').forEach((s) => sio.observe(s));

    // liczniki
    const cio = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const end = +e.target.dataset.count, t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 1400);
        e.target.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }));
    $$('[data-count]').forEach((el) => cio.observe(el));

    // marquee
    const items = SQUAD.map((p) => `<span><b>${p.num}</b>${esc(p.name)}</span>`).join('');
    $('#marquee').innerHTML = items + items;
  }

  /* ================= hero: obracane boisko z animowaną formacją ================= */
  function initHero() {
    const el = $('#heroPitch');
    el.innerHTML = pitchSVG(false, 'hero', '', { lineClass: 'pline' });
    const cycle = ['433', '325', '442', '4231'].map((id) => TAC.find((t) => t.id === id));
    const dots = cycle[0].slots.map((s, i) => {
      const d = document.createElement('i');
      d.className = 'hdot';
      d.style.animationDelay = `${1 + i * 0.07}s`;
      el.appendChild(d);
      return d;
    });
    const label = $('#heroFormation');
    let k = 0;
    const place = (t) => {
      t.slots.forEach((s, i) => {
        const [l, tp] = toPct(s[2], s[3], false);
        dots[i].style.left = l + '%';
        dots[i].style.top = tp + '%';
        dots[i].style.setProperty('--c', LINE_COLOR[byId[s[4]].line]);
        dots[i].style.transitionDelay = `${i * 0.04}s`;
      });
      label.classList.add('swap');
      setTimeout(() => { label.textContent = t.name; label.classList.remove('swap'); }, 300);
    };
    place(cycle[0]);
    if (!reducedMotion) setInterval(() => { k = (k + 1) % cycle.length; place(cycle[k]); }, 3200);

    const vis = $('.hero-visual'), tilt = $('.tilt');
    vis.addEventListener('mousemove', (e) => {
      const r = vis.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `rotateY(${dx * 10}deg) rotateX(${-dy * 8}deg)`;
    });
    vis.addEventListener('mouseleave', () => { tilt.style.transform = ''; });
  }

  /* ================= 01: pozycje ================= */
  const POS_PLAYERS_OVERRIDE = {
    SW: ['joan', 'cubarsi'], WB: ['balde', 'cancelo'], WM: ['yamal', 'gordon'], SS: ['olmo', 'fermin'], F9: ['olmo', 'fermin'],
  };
  const POS_CODES = { GK: ['GK'], CB: ['CB'], FB: ['LB', 'RB'], CDM: ['CDM'], CM: ['CM'], CAM: ['CAM'], W: ['LW', 'RW'], CF: ['CF'] };
  function playersFor(posId) {
    if (POS_PLAYERS_OVERRIDE[posId]) return POS_PLAYERS_OVERRIDE[posId].map((id) => byId[id]);
    const codes = POS_CODES[posId] || [];
    return PL.map((p) => ({ p, i: Math.min(...codes.map((c) => { const k = p.pos.indexOf(c); return k < 0 ? 99 : k; })) }))
      .filter((o) => o.i < 99).sort((a, b) => a.i - b.i || a.p.num - b.p.num).map((o) => o.p);
  }
  const chipHTML = (p) => `<button class="pchip" data-open="${p.id}">${phHTML(p)}${esc(p.short)}<span class="muted">${p.num}</span></button>`;

  let posSel = 'CM';
  function renderPositions() {
    const vertical = isVertical();
    const board = $('#posBoard');
    board.classList.toggle('vertical', vertical);
    const zones = POS.map((ps) => `<g class="zone" data-zone="${ps.id}">${ps.zones.map(([cx, cy, rx, ry]) =>
      `<ellipse cx="${hx(cx)}" cy="${hy(cy)}" rx="${(rx / 100) * W}" ry="${(ry / 100) * H}" fill="url(#pos-zg-${LINE_CLS[ps.line]})" stroke="${LINE_COLOR[ps.line]}" stroke-opacity=".7" stroke-width="2" stroke-dasharray="6 6"/>`).join('')}</g>`).join('');
    $('#posPitch').innerHTML = pitchSVG(vertical, 'pos', zones);
    let i = 0;
    $('#posMarkers').innerHTML = POS.flatMap((ps) => ps.points.map(([x, y, lab]) => {
      const [l, t] = toPct(x, y, vertical);
      return `<button class="marker ${LINE_CLS[ps.line]}" data-pos="${ps.id}" style="left:${l}%;top:${t}%;--d:${(i++) * 0.04 + 0.2}s" aria-label="${esc(ps.name)} (${lab})">${lab}</button>`;
    })).join('');
    selectPos(posSel, false);
  }
  function renderPosTable() {
    $('#posTable tbody').innerHTML = POS.map((ps) => `
      <tr data-pos="${ps.id}" style="--c:${LINE_COLOR[ps.line]}">
        <td><span class="abbr-pill ${LINE_CLS[ps.line]}">${esc(ps.abbr)}</span></td>
        <td class="nm"><b>${esc(ps.name)}</b><span>${esc(ps.en)}</span></td>
        <td>${esc(ps.area)}</td>
        <td>${esc(ps.tasks)}</td>
        <td><ul>${ps.roles.map(([n, d]) => `<li><b>${esc(n)}</b>: ${esc(d)}</li>`).join('')}</ul></td>
        <td>${esc(ps.barca)}<div class="pd-players">${playersFor(ps.id).map(chipHTML).join('')}</div></td>
      </tr>`).join('');
  }
  function selectPos(id, animate = true) {
    posSel = id;
    const ps = POS.find((p) => p.id === id);
    $$('#posMarkers .marker').forEach((m) => m.classList.toggle('on', m.dataset.pos === id));
    $('#posMarkers').classList.add('has-on');
    $$('#posPitch .zone').forEach((z) => z.classList.toggle('on', z.dataset.zone === id));
    $$('#posTable tbody tr').forEach((r) => r.classList.toggle('on', r.dataset.pos === id));
    const d = $('#posDetail');
    d.dataset.abbr = ps.abbr.split(' ')[0];
    d.style.setProperty('--c', LINE_COLOR[ps.line]);
    d.innerHTML = `<div class="${animate ? 'anim' : ''}">
      <span class="pd-kicker">${esc(ps.abbr)}</span>
      <h3>${esc(ps.name)}</h3>
      <p class="pd-en">${esc(ps.en)} · ${esc(ps.area)}</p>
      <div><div class="pd-label">Zadania</div><p>${esc(ps.tasks)}</p></div>
      <div><div class="pd-label">Kluczowe cechy</div><div class="tags">${ps.traits.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
      <div><div class="pd-label">Warianty ról</div><ul class="roles-list">${ps.roles.map(([n, t]) => `<li><b>${esc(n)}</b>${esc(t)}</li>`).join('')}</ul></div>
      <div><div class="pd-label">W Barcelonie</div><div class="pd-barca">${esc(ps.barca)}<div class="pd-players">${playersFor(ps.id).map(chipHTML).join('')}</div></div></div>
    </div>`;
    Photo.apply();
  }
  function initPositions() {
    renderPosTable();
    renderPositions();
    $('#posMarkers').addEventListener('click', (e) => { const m = e.target.closest('.marker'); if (m) selectPos(m.dataset.pos); });
    $('#posMarkers').addEventListener('mouseover', (e) => {
      const m = e.target.closest('.marker');
      if (m && m.dataset.pos !== posSel && matchMedia('(hover:hover)').matches) selectPos(m.dataset.pos);
    });
    $('#posTable').addEventListener('click', (e) => {
      if (e.target.closest('[data-open]')) return;
      const r = e.target.closest('tr[data-pos]');
      if (!r) return;
      selectPos(r.dataset.pos);
      if (window.innerWidth < 1080) $('#posBoard').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ================= 02: tablica taktyczna ================= */
  const TKEY = 'blaugrana.tactics.v1';
  const saved = store.get(TKEY, {});
  const state = {
    tactic: TAC.some((t) => t.id === saved.tactic) ? saved.tactic : TAC[0].id,
    lineups: {},
    arrows: saved.arrows !== false,
    swap: false,
    sel: null,
    playing: false,
  };
  // przywróć tylko poprawne składy (11 różnych, istniejących zawodników)
  Object.entries(saved.lineups || {}).forEach(([k, v]) => {
    if (TAC.some((t) => t.id === k) && Array.isArray(v) && v.length === 11 && new Set(v).size === 11 && v.every((id) => byId[id])) state.lineups[k] = v;
  });
  const saveTac = () => store.set(TKEY, { tactic: state.tactic, lineups: state.lineups, arrows: state.arrows });
  const cur = () => TAC.find((t) => t.id === state.tactic);
  const lineup = (t = cur()) => state.lineups[t.id] || t.slots.map((s) => s[4]);
  const slotIndex = (t, sid) => t.slots.findIndex((s) => s[0] === sid);

  function arrowPath([x1, y1], [x2, y2], bend = 0.14) {
    const X1 = hx(x1), Y1 = hy(y1), X2 = hx(x2), Y2 = hy(y2);
    const mx = (X1 + X2) / 2, my = (Y1 + Y2) / 2, dx = X2 - X1, dy = Y2 - Y1;
    return `M${X1} ${Y1}Q${mx - dy * bend} ${my + dx * bend} ${X2} ${Y2}`;
  }
  function renderTacPitch() {
    const t = cur(), vertical = isVertical();
    $('#tacBoard').classList.toggle('vertical', vertical);
    const arrows = t.arrows.map(([type, a, b], i) =>
      `<g class="arr" style="animation-delay:${0.5 + i * 0.12}s"><path class="a-${type}" d="${arrowPath(a, b)}" marker-end="url(#tac-ah-${type})"/></g>`).join('');
    $('#tacPitch').innerHTML = pitchSVG(vertical, 'tac',
      `<g class="arrows${state.arrows ? '' : ' hide'}" id="arrowLayer">${arrows}</g><g class="arrows" id="passLayer"></g>`);
  }

  function tokenHTML(p) {
    return `<span class="t-pos"></span><span class="t-face">${phHTML(p)}<span class="t-num">${p.num}</span></span><span class="t-name">${esc(p.short)}</span>`;
  }
  function renderTokens(animate = true) {
    const t = cur(), ids = lineup(t), vertical = isVertical();
    const wrap = $('#tokens');
    const existing = new Map($$('.token', wrap).filter((el) => !el.classList.contains('leaving')).map((el) => [el.dataset.pid, el]));
    ids.forEach((pid, i) => {
      const s = t.slots[i], p = byId[pid];
      let el = existing.get(pid);
      const [l, tp] = toPct(s[2], s[3], vertical);
      if (!el) {
        el = document.createElement('button');
        el.className = `token ${LINE_CLS[p.line]}` + (animate ? ' entering' : '');
        el.dataset.pid = pid;
        el.innerHTML = tokenHTML(p);
        el.style.left = l + '%';
        el.style.top = tp + '%';
        wrap.appendChild(el);
        if (animate) { void el.offsetWidth; requestAnimationFrame(() => el.classList.remove('entering')); }
      }
      existing.delete(pid);
      el.dataset.slot = s[0];
      el.style.setProperty('--d', animate ? `${i * 0.035}s` : '0s');
      el.style.left = l + '%';
      el.style.top = tp + '%';
      el.querySelector('.t-pos').textContent = s[1];
      el.setAttribute('aria-label', `${p.name}, ${POS_NAMES[s[1]] || s[1]}`);
      el.classList.toggle('selected', !!(state.sel && state.sel.pid === pid));
    });
    existing.forEach((el) => { el.classList.add('leaving'); setTimeout(() => el.remove(), 600); });
    Photo.apply();
  }

  function renderTacticInfo() {
    const t = cur();
    $('#tacticInfo').innerHTML = `<div class="anim">
      <p class="big">${esc(t.name)}</p>
      <h3>${esc(t.title)}</h3>
      <span class="badge">${esc(t.badge)}</span>
      <p>${esc(t.desc)}</p>
      <ul class="principles">${t.principles.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="arrow-legend">
        <span><svg width="44" height="10"><path d="M2 5H38" stroke="#edbb00" stroke-width="3" stroke-dasharray="8 5"/><path d="M36 1l6 4-6 4z" fill="#edbb00"/></svg>wbiegnięcie / atak przestrzeni</span>
        <span><svg width="44" height="10"><path d="M2 5H38" stroke="#fff" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/><path d="M36 1l6 4-6 4z" fill="#fff"/></svg>przesunięcie w ustawieniu</span>
        <span><svg width="44" height="10"><path d="M2 5H38" stroke="#ff4d7d" stroke-width="3" stroke-dasharray="8 5"/><path d="M36 1l6 4-6 4z" fill="#ff4d7d"/></svg>pressing</span>
      </div>
    </div>`;
  }

  function renderTabs() {
    $('#tacticTabs').innerHTML = TAC.map((t) =>
      `<button class="ttab${t.id === state.tactic ? ' is-on' : ''}" role="tab" aria-selected="${t.id === state.tactic}" data-t="${t.id}"><b>${esc(t.name)}</b><span>${esc(t.title)}</span></button>`).join('');
  }

  function renderBench() {
    const ids = new Set(lineup());
    const bench = SQUAD.filter((p) => !ids.has(p.id));
    $('#benchCount').textContent = `${bench.length} zawodników`;
    $('#bench').innerHTML = bench.map((p, i) => `
      <button class="bplayer ${LINE_CLS[p.line]}${state.sel && state.sel.pid === p.id ? ' selected' : ''}" data-pid="${p.id}" style="animation-delay:${i * 0.02}s">
        ${phHTML(p)}<span><b>${p.num} · ${esc(p.short)}</b><small>${p.pos.join(' / ')}</small></span>
      </button>`).join('');
    Photo.apply();
  }

  function renderRoles() {
    const t = cur(), ids = lineup(t);
    $('#rolesGrid').innerHTML = t.slots.map((s, i) => {
      const p = byId[ids[i]], def = byId[s[4]];
      const note = p.id !== def.id ? `<p class="muted" style="font-size:12px;margin-top:6px">Opis roli przygotowany pod: ${esc(def.short)}</p>` : '';
      return `<article class="rcard ${LINE_CLS[p.line]}" data-pid="${p.id}" tabindex="0" style="animation-delay:${i * 0.04}s">
        <div class="rc-top">${phHTML(p)}<div><span class="rc-pos">${esc(s[1])} · ${esc(POS_NAMES[s[1]] || s[1])}</span><b>${p.num}. ${esc(p.name)}</b></div></div>
        <p>${esc(s[5])}</p>${note}
      </article>`;
    }).join('');
    Photo.apply();
  }

  function setTactic(id) {
    if (id === state.tactic) return;
    stopPlay();
    state.tactic = id;
    state.sel = null;
    saveTac();
    renderTabs();
    renderTacPitch();
    renderTokens(true);
    renderTacticInfo();
    renderBench();
    renderRoles();
  }

  function handleSwap(where, pid) {
    const t = cur();
    if (!state.sel) { state.sel = { where, pid }; }
    else if (state.sel.pid === pid) { state.sel = null; }
    else if (state.sel.where === 'bench' && where === 'bench') { state.sel = { where, pid }; }
    else {
      const ids = lineup(t).slice();
      const a = state.sel, b = { where, pid };
      if (a.where === 'pitch' && b.where === 'pitch') {
        const i = ids.indexOf(a.pid), j = ids.indexOf(b.pid);
        [ids[i], ids[j]] = [ids[j], ids[i]];
      } else {
        const onPitch = a.where === 'pitch' ? a.pid : b.pid;
        const fromBench = a.where === 'bench' ? a.pid : b.pid;
        ids[ids.indexOf(onPitch)] = fromBench;
      }
      state.lineups[t.id] = ids;
      state.sel = null;
      saveTac();
      renderTokens(true);
      renderRoles();
    }
    renderBench();
    $$('.token').forEach((el) => el.classList.toggle('selected', !!(state.sel && state.sel.pid === el.dataset.pid)));
  }

  /* --- animacja akcji z piłką --- */
  let playTimers = [];
  function stopPlay() {
    playTimers.forEach(clearTimeout);
    playTimers = [];
    state.playing = false;
    const ball = $('#ball');
    ball.getAnimations().forEach((a) => a.cancel());
    ball.style.opacity = 0;
    const pl = $('#passLayer');
    if (pl) pl.innerHTML = '';
    $('#btnPlay').disabled = false;
  }
  function playSequence() {
    stopPlay();
    const t = cur(), vertical = isVertical(), ids = lineup(t);
    const pts = t.sequence.map((it) => {
      if (it === 'GOAL') return { x: 101, y: 50 };
      if (Array.isArray(it)) return { x: it[0], y: it[1] };
      const i = slotIndex(t, it);
      return { x: t.slots[i][2], y: t.slots[i][3], pid: ids[i] };
    });
    const seg = reducedMotion ? 10 : 720;
    const ball = $('#ball');
    const frames = pts.map((p, i) => {
      const [l, tp] = toPct(p.x, p.y, vertical);
      return { left: l + '%', top: tp + '%', opacity: 1, offset: i / (pts.length - 1), easing: 'cubic-bezier(.45,0,.2,1)' };
    });
    frames[0].opacity = 0;
    frames.splice(1, 0, { ...frames[0], opacity: 1, offset: Math.min(0.02, frames[1].offset / 2) });
    state.playing = true;
    $('#btnPlay').disabled = true;
    const total = seg * (pts.length - 1);
    const anim = ball.animate(frames, { duration: total, fill: 'forwards' });
    const pl = $('#passLayer');
    pts.forEach((p, i) => {
      playTimers.push(setTimeout(() => {
        if (p.pid) {
          const tok = $(`.token[data-pid="${p.pid}"]`);
          if (tok) { tok.classList.remove('touch'); void tok.offsetWidth; tok.classList.add('touch'); }
        }
        if (i < pts.length - 1 && pl) {
          const q = pts[i + 1];
          pl.insertAdjacentHTML('beforeend', `<g class="arr"><path class="a-pass" d="${arrowPath([p.x, p.y], [q.x, q.y], 0.06)}" marker-end="url(#tac-ah-pass)"/></g>`);
        }
      }, i * seg));
    });
    anim.finished.then(() => {
      if (!state.playing) return;
      const g = $('#goalBurst');
      g.classList.remove('go'); void g.offsetWidth; g.classList.add('go');
      $('#tacBoard').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,3px)' }, { transform: 'translate(5px,-3px)' }, { transform: 'translate(0,0)' }], { duration: 350 });
      playTimers.push(setTimeout(stopPlay, 1700));
    }).catch(() => {});
  }

  function initTactics() {
    renderTabs();
    renderTacPitch();
    renderTokens(false);
    renderTacticInfo();
    renderBench();
    renderRoles();
    const btnArrows = $('#btnArrows');
    btnArrows.classList.toggle('is-on', state.arrows);
    btnArrows.setAttribute('aria-pressed', state.arrows);

    $('#tacticTabs').addEventListener('click', (e) => { const b = e.target.closest('.ttab'); if (b) setTactic(b.dataset.t); });
    $('#tokens').addEventListener('click', (e) => {
      const tok = e.target.closest('.token');
      if (!tok || tok.classList.contains('leaving')) return;
      if (state.swap) handleSwap('pitch', tok.dataset.pid);
      else openModal(tok.dataset.pid, lineup());
    });
    $('#bench').addEventListener('click', (e) => {
      const b = e.target.closest('.bplayer');
      if (!b) return;
      if (state.swap) handleSwap('bench', b.dataset.pid);
      else openModal(b.dataset.pid, SQUAD.map((p) => p.id));
    });
    const rg = $('#rolesGrid');
    rg.addEventListener('click', (e) => { const c = e.target.closest('.rcard'); if (c) openModal(c.dataset.pid, lineup()); });
    rg.addEventListener('keydown', (e) => { const c = e.target.closest('.rcard'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openModal(c.dataset.pid, lineup()); } });
    const hl = (e, on) => {
      const c = e.target.closest('.rcard');
      if (!c) return;
      const tok = $(`.token[data-pid="${c.dataset.pid}"]`);
      if (tok) tok.classList.toggle('hl', on);
    };
    rg.addEventListener('mouseover', (e) => hl(e, true));
    rg.addEventListener('mouseout', (e) => hl(e, false));
    $('#tokens').addEventListener('mouseover', (e) => {
      const tok = e.target.closest('.token');
      $$('.rcard').forEach((c) => c.classList.toggle('hl', !!tok && c.dataset.pid === tok.dataset.pid));
    });
    $('#tokens').addEventListener('mouseleave', () => $$('.rcard.hl').forEach((c) => c.classList.remove('hl')));

    btnArrows.addEventListener('click', () => {
      state.arrows = !state.arrows;
      btnArrows.classList.toggle('is-on', state.arrows);
      btnArrows.setAttribute('aria-pressed', state.arrows);
      $('#arrowLayer').classList.toggle('hide', !state.arrows);
      saveTac();
    });
    $('#btnPlay').addEventListener('click', playSequence);
    $('#btnSwap').addEventListener('click', () => {
      state.swap = !state.swap;
      state.sel = null;
      const b = $('#btnSwap');
      b.classList.toggle('is-on', state.swap);
      b.setAttribute('aria-pressed', state.swap);
      $('#taktyki').classList.toggle('swap-mode', state.swap);
      $$('.token.selected').forEach((el) => el.classList.remove('selected'));
      renderBench();
    });
    $('#btnReset').addEventListener('click', () => {
      delete state.lineups[state.tactic];
      state.sel = null;
      saveTac();
      renderTokens(true);
      renderBench();
      renderRoles();
    });
  }

  /* ================= 03: kadra ================= */
  function initSquad() {
    $('#squad').innerHTML = SQUAD.map((p, i) => `
      <button class="pcard ${LINE_CLS[p.line]}" data-pid="${p.id}" data-line="${p.line}" style="animation-delay:${(i % 8) * 0.04}s" aria-label="${esc(p.name)}, numer ${p.num}">
        ${phHTML(p, true)}
        <span class="pc-shade"></span>
        <span class="pc-num">${p.num}</span>
        ${p.tags.includes('nowy 2026') ? '<span class="pc-tag">NOWY</span>' : ''}
        <span class="pc-body">
          <span class="pc-pos">${p.pos.map((c) => `<span>${c}</span>`).join('')}</span>
          <b>${esc(p.name)}</b>
          <small>${esc(p.nat)}</small>
        </span>
      </button>`).join('');
    Photo.apply();
    const sq = $('#squad');
    sq.addEventListener('click', (e) => {
      const c = e.target.closest('.pcard');
      if (c) openModal(c.dataset.pid, $$('.pcard:not(.hide)').map((x) => x.dataset.pid));
    });
    if (matchMedia('(hover:hover)').matches && !reducedMotion) {
      sq.addEventListener('mousemove', (e) => {
        const c = e.target.closest('.pcard');
        if (!c) return;
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', `${(x - 0.5) * 14}deg`);
        c.style.setProperty('--rx', `${(0.5 - y) * 14}deg`);
        c.style.setProperty('--mx', `${x * 100}%`);
        c.style.setProperty('--my', `${y * 100}%`);
      });
      sq.addEventListener('mouseout', (e) => {
        const c = e.target.closest('.pcard');
        if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }
      });
    }
    $('#filters').addEventListener('click', (e) => {
      const b = e.target.closest('.filter');
      if (!b) return;
      $$('.filter').forEach((x) => x.classList.toggle('is-on', x === b));
      let k = 0;
      $$('.pcard').forEach((c) => {
        const show = b.dataset.f === 'ALL' || c.dataset.line === b.dataset.f;
        c.classList.toggle('hide', !show);
        if (show) { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; c.style.animationDelay = `${(k++) * 0.04}s`; }
      });
    });
  }

  /* ================= modal zawodnika ================= */
  let modalList = [], modalIdx = 0, lastFocus = null;
  function miniPitch(p) {
    const dots = p.pos.map((code, i) => {
      const pt = POS_POINTS[code];
      if (!pt) return '';
      const X = hx(pt[0]), Y = hy(pt[1]);
      return i === 0
        ? `<circle cx="${X}" cy="${Y}" r="34" fill="${LINE_COLOR[p.line]}" opacity=".25"><animate attributeName="r" values="30;46;30" dur="2s" repeatCount="indefinite"/></circle><circle cx="${X}" cy="${Y}" r="24" fill="${LINE_COLOR[p.line]}" stroke="#fff" stroke-width="5"/>`
        : `<circle cx="${X}" cy="${Y}" r="17" fill="#fff" opacity=".85"/>`;
    }).join('');
    return pitchSVG(true, 'mini', dots);
  }
  function tacticRole(p) {
    const t = cur(), ids = lineup(t), i = ids.indexOf(p.id);
    if (i < 0) return `<div class="m-role"><div class="pd-label">Ustawienie ${esc(t.name)} · ${esc(t.title)}</div><p>Poza wyjściową jedenastką w tym ustawieniu. Możesz go wstawić w trybie zmian na tablicy taktycznej.</p></div>`;
    const s = t.slots[i], def = byId[s[4]];
    const note = def.id !== p.id ? ` <span class="muted">(opis roli przygotowany pod: ${esc(def.short)})</span>` : '';
    return `<div class="m-role"><div class="pd-label">Rola w ${esc(t.name)} · ${esc(POS_NAMES[s[1]] || s[1])}</div><p>${esc(s[5])}${note}</p></div>`;
  }
  function renderModal() {
    const p = byId[modalList[modalIdx]];
    const card = $('#modalCard');
    card.className = `modal-card ${LINE_CLS[p.line]}`;
    void card.offsetWidth;
    const d = Photo.data[p.id];
    const credit = d && d.file
      ? `<a class="mp-credit" href="https://en.wikipedia.org/wiki/File:${encodeURIComponent(d.file)}" target="_blank" rel="noopener">Zdjęcie: Wikimedia Commons</a>`
      : '';
    const loading = !(p.id in Photo.data) ? '<span class="mp-loading"></span>' : '';
    $('#mPhoto').innerHTML = `<span class="ph reveal-photo" data-pid="${p.id}">${avatarSVG(p, true)}</span>${loading}<span class="mp-shade"></span><span class="mp-num">${p.num}</span>${credit}`;
    $('#mBody').innerHTML = `
      <span class="m-kicker">${esc(POS_NAMES[p.pos[0]] || p.pos[0])} · ${esc(p.nat)}</span>
      <h3 id="mName">${esc(p.name)}</h3>
      <div class="m-row">${p.pos.map((c, i) => `<span class="tag${i === 0 ? ' pri' : ''}">${c} · ${esc(POS_NAMES[c] || c)}</span>`).join('')}</div>
      ${tacticRole(p)}
      <div class="m-grid">
        <div>
          <div class="pd-label">Profil i rola w drużynie</div>
          <p>${esc(p.role)}</p>
          <p class="muted">${esc(p.alt)}</p>
        </div>
        <div class="m-mini" title="Pozycje zawodnika: główna (kolor) i alternatywne (białe)">${miniPitch(p)}</div>
      </div>
      <div><div class="pd-label">Mocne strony</div><div class="tags">${p.traits.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
      <div class="m-row" style="margin-top:14px">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
    Photo.apply();
    // gdy zdjęcie dojdzie później, dołóż podpis źródła
    if (!(p.id in Photo.data)) {
      const pid = p.id;
      const iv = setInterval(() => {
        if (modalList[modalIdx] !== pid || $('#modal').hidden) return clearInterval(iv);
        if (pid in Photo.data) { clearInterval(iv); const l = $('#mPhoto .mp-loading'); if (l) l.remove(); if (Photo.data[pid]) renderModal(); }
      }, 400);
    }
  }
  function openModal(pid, list) {
    modalList = list && list.includes(pid) ? list : SQUAD.map((p) => p.id);
    modalIdx = modalList.indexOf(pid);
    const m = $('#modal');
    if (m.hidden) lastFocus = document.activeElement;
    m.hidden = false;
    m.classList.remove('closing');
    document.body.style.overflow = 'hidden';
    renderModal();
    $('.modal-close', m).focus({ preventScroll: true });
  }
  function closeModal() {
    const m = $('#modal');
    if (m.hidden) return;
    m.classList.add('closing');
    setTimeout(() => { m.hidden = true; m.classList.remove('closing'); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus({ preventScroll: true }); }, reducedMotion ? 0 : 280);
  }
  function stepModal(d) {
    modalIdx = (modalIdx + d + modalList.length) % modalList.length;
    renderModal();
  }
  function initModal() {
    const m = $('#modal');
    m.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
    $('#mPrev').addEventListener('click', () => stepModal(-1));
    $('#mNext').addEventListener('click', () => stepModal(1));
    document.addEventListener('keydown', (e) => {
      if (m.hidden) return;
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'ArrowLeft') stepModal(-1);
      else if (e.key === 'ArrowRight') stepModal(1);
      else if (e.key === 'Tab') {
        const f = $$('button, a[href]', m).filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    // przesunięcie palcem w modalu = następny/poprzedni
    let sx = null;
    m.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    m.addEventListener('touchend', (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 70) stepModal(dx < 0 ? 1 : -1);
      sx = null;
    });
    // chipy zawodników w sekcji pozycji
    document.addEventListener('click', (e) => {
      const c = e.target.closest('[data-open]');
      if (!c) return;
      e.stopPropagation();
      const row = c.closest('[data-pos]') || c.closest('.pos-detail');
      const list = $$('[data-open]', row || document).map((x) => x.dataset.open);
      openModal(c.dataset.open, list);
    });
  }

  /* ================= zmiana orientacji ================= */
  function initResize() {
    let v = isVertical(), tmr;
    addEventListener('resize', () => {
      clearTimeout(tmr);
      tmr = setTimeout(() => {
        if (isVertical() === v) return;
        v = isVertical();
        stopPlay();
        document.body.classList.add('no-anim');
        renderPositions();
        renderTacPitch();
        renderTokens(false);
        requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('no-anim')));
      }, 150);
    });
  }

  /* ================= start ================= */
  initChrome();
  initHero();
  initPositions();
  initTactics();
  initSquad();
  initModal();
  initResize();
  Photo.init();
})();
