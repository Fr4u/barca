(() => {
  'use strict';

  /* ======================================================================
     Narzędzia i dane
     ====================================================================== */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const POS = window.POSITIONS;
  const PL = window.PLAYERS;
  const TAC = window.TACTICS;
  const POS_POINTS = window.POS_POINTS;
  const POS_NAMES = window.POS_NAMES;
  const RULES = window.PHOTO_RULES || {};
  const LOCAL = window.LOCAL_PHOTOS || {};
  const byId = Object.fromEntries(PL.map((p) => [p.id, p]));
  const LINE_CLS = { GK: 'gk', DEF: 'def', MID: 'mid', FWD: 'fwd' };
  const LINE_COLOR = { GK: '#edbb00', DEF: '#2f7bff', MID: '#9a5cff', FWD: '#ff2e6e' };
  const LINE_NAME = { GK: 'Bramkarze', DEF: 'Obrońcy', MID: 'Pomocnicy', FWD: 'Napastnicy' };
  const LINE_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
  const SQUAD = PL.slice().sort((a, b) => LINE_ORDER[a.line] - LINE_ORDER[b.line] || a.num - b.num);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const hasGsap = !!window.gsap;
  const D = (d) => (reduced ? 0 : d);
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (hasGsap && window.SplitText) gsap.registerPlugin(SplitText);

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* brak dostępu */ } },
  };

  /* ======================================================================
     Geometria i rysowanie boiska
     x = głębokość (0 własna bramka → 100 bramka rywala), y = szerokość (0 lewa → 100 prawa)
     ====================================================================== */
  const PAD = 20, W = 1050, H = 680, VW = W + 2 * PAD, VH = H + 2 * PAD;
  const hx = (x) => PAD + (x / 100) * W;
  const hy = (y) => PAD + (y / 100) * H;
  function toPct(x, y, vertical) {
    const X = hx(x), Y = hy(y);
    return vertical ? [(Y / VH) * 100, ((VW - X) / VW) * 100] : [(X / VW) * 100, (Y / VH) * 100];
  }
  const tacVertical = () => window.innerWidth < 720;

  function pitchSVG(vertical, uid, extra = '') {
    const n = 12, sw = W / n;
    const stripes = Array.from({ length: n }, (_, i) =>
      `<rect x="${PAD + i * sw}" y="${PAD}" width="${sw + .5}" height="${H}" fill="${i % 2 ? '#155f38' : '#11542f'}"/>`).join('');
    const a = 73.1;
    const lines = [
      `<rect x="${PAD}" y="${PAD}" width="${W}" height="${H}"/>`,
      `<path d="M${PAD + 525} ${PAD}V${PAD + H}"/>`,
      `<circle cx="${PAD + 525}" cy="${PAD + 340}" r="91.5"/>`,
      `<rect x="${PAD}" y="${PAD + 138.4}" width="165" height="403.2"/>`,
      `<rect x="${PAD}" y="${PAD + 248.4}" width="55" height="183.2"/>`,
      `<rect x="${PAD + W - 165}" y="${PAD + 138.4}" width="165" height="403.2"/>`,
      `<rect x="${PAD + W - 55}" y="${PAD + 248.4}" width="55" height="183.2"/>`,
      `<path d="M${PAD + 165} ${PAD + 340 - a}A91.5 91.5 0 0 1 ${PAD + 165} ${PAD + 340 + a}"/>`,
      `<path d="M${PAD + W - 165} ${PAD + 340 - a}A91.5 91.5 0 0 0 ${PAD + W - 165} ${PAD + 340 + a}"/>`,
      `<path d="M${PAD + 10} ${PAD}A10 10 0 0 1 ${PAD} ${PAD + 10}M${PAD + W - 10} ${PAD}A10 10 0 0 0 ${PAD + W} ${PAD + 10}M${PAD} ${PAD + H - 10}A10 10 0 0 1 ${PAD + 10} ${PAD + H}M${PAD + W - 10} ${PAD + H}A10 10 0 0 1 ${PAD + W} ${PAD + H - 10}"/>`,
      `<rect x="${PAD - 12}" y="${PAD + 303.4}" width="12" height="73.2"/>`,
      `<rect x="${PAD + W}" y="${PAD + 303.4}" width="12" height="73.2"/>`,
    ].join('');
    const spot = (x) => `<circle cx="${x}" cy="${PAD + 340}" r="3.6" fill="rgba(255,255,255,.85)"/>`;
    const tf = vertical ? ` transform="matrix(0,-1,1,0,0,${VW})"` : '';
    const vb = vertical ? `0 0 ${VH} ${VW}` : `0 0 ${VW} ${VH}`;
    const marker = (k, c) => `<marker id="${uid}-ah-${k}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3.4" markerHeight="3.4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`;
    const zg = (k, c) => `<radialGradient id="${uid}-zg-${k}"><stop offset="0" stop-color="${c}" stop-opacity=".7"/><stop offset=".65" stop-color="${c}" stop-opacity=".25"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
    return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id="${uid}-light" cx=".5" cy="-.1" r="1.1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
        ${marker('run', '#edbb00')}${marker('move', '#ffffff')}${marker('press', '#ff4d7d')}${marker('pass', '#ffffff')}
        ${zg('gk', LINE_COLOR.GK)}${zg('def', LINE_COLOR.DEF)}${zg('mid', LINE_COLOR.MID)}${zg('fwd', LINE_COLOR.FWD)}
      </defs>
      <rect width="100%" height="100%" fill="#0c4426"/>
      <g${tf}>
        ${stripes}
        <g fill="none" stroke="rgba(255,255,255,.82)" stroke-width="2.6" class="plines">${lines}</g>
        ${spot(PAD + 525)}${spot(PAD + 110)}${spot(PAD + W - 110)}
        ${extra}
      </g>
      <rect width="100%" height="100%" fill="url(#${uid}-light)" pointer-events="none"/>
    </svg>`;
  }

  /* ======================================================================
     Koszulka zastępcza (gdy brak zdjęcia w barwach Barçy)
     ====================================================================== */
  let svgUid = 0;
  function shirtSVG(p, mode) {
    const id = `sh${++svgUid}`;
    const body = 'M62 44 L86 32 Q100 42 114 32 L138 44 L172 72 L154 98 L140 88 L140 176 L60 176 L60 88 L46 98 L28 72 Z';
    const stripes = Array.from({ length: 10 }, (_, i) =>
      `<rect x="${28 + i * 15}" y="28" width="15" height="152" fill="${i % 2 ? '#a50044' : '#004d98'}"/>`).join('');
    const surname = esc(p.short.toUpperCase());
    const big = mode === 'big';
    const vb = big ? '0 0 200 240' : '0 0 200 200';
    const shift = big ? 'translate(0 22)' : 'translate(0 4)';
    const glow = LINE_COLOR[p.line];
    return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid ${big ? 'meet' : 'slice'}" aria-hidden="true">
      <defs>
        <clipPath id="${id}"><path d="${body}"/></clipPath>
        <radialGradient id="${id}g" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="${glow}" stop-opacity=".35"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#0b0d1c"/>
      <rect width="100%" height="100%" fill="url(#${id}g)"/>
      <g transform="${shift}">
        <g clip-path="url(#${id})">${stripes}<rect x="28" y="28" width="150" height="152" fill="url(#${id}s)"/></g>
        <path d="M86 32 Q100 46 114 32" fill="none" stroke="#edbb00" stroke-width="3"/>
        ${mode === 'token' ? '' : `<text x="100" y="78" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="${surname.length > 9 ? 10 : 12.5}" letter-spacing="1" fill="#edbb00">${surname}</text>`}
        <text x="100" y="${mode === 'token' ? 150 : 150}" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="900" font-size="${mode === 'token' ? 70 : 64}" fill="#edbb00" stroke="#0b0d1c" stroke-width="1.5" paint-order="stroke">${p.num}</text>
      </g>
    </svg>`;
  }
  const phHTML = (p, mode = 'token', cls = '') => `<span class="ph ${cls}" data-pid="${p.id}" data-mode="${mode}">${shirtSVG(p, mode)}</span>`;

  /* ======================================================================
     Zdjęcia: tylko w barwach FC Barcelony
     1) js/photos.js (lokalne), 2) Wikimedia Commons z filtrem, 3) koszulka zastępcza
     ====================================================================== */
  const PHOTO_KEY = 'blaugrana.photos.v2';
  const BARCA_STRONG = /\bfc barcelona\b|\bbarca\b|\bfcb\b|blaugrana|joan gamper|camp nou|barca atletic|barcelona atletic|la masia|futbol club barcelona|club de futbol barcelona/;
  const BARCA_WEAK = /\bbarcelona\b/;
  const GLOBAL_EX = /national (football |soccer )?team|seleccion|reprezentac|nationalmannschaft|nationalelf|landslag|world cup|copa del mundo|copa mundial|mundial 20|uefa euro|euro 20\d\d|eurocopa|nations league|copa america|olympic|olimpic|\bu-?1[5-9]\b|\bu-?2[0-3]\b|under-?2[0-3]|selecao|femeni|women/;
  const ART_EX = /signature|autograph|mural|graffiti|drawing|painting|illustration|sticker|panini|cartoon|\blogo\b|caricature|wax|statue|figurine|tattoo/;

  const Photo = {
    data: {},
    listeners: new Set(),
    init() {
      Object.entries(LOCAL).forEach(([id, v]) => {
        if (byId[id] && v) this.data[id] = typeof v === 'string' ? { src: v, local: true } : { ...v, local: true };
      });
      const cached = store.get(PHOTO_KEY, null);
      if (cached && Date.now() - cached.t < 3 * 864e5) {
        Object.entries(cached.d).forEach(([k, v]) => { if (!(k in this.data) && byId[k]) this.data[k] = v; });
      }
      const queue = SQUAD.filter((p) => !(p.id in this.data));
      this.apply();
      let i = 0;
      const worker = async () => {
        while (i < queue.length) {
          const p = queue[i++];
          await this.find(p);
          this.apply();
          this.emit(p.id);
        }
      };
      Promise.all([worker(), worker(), worker(), worker()]).then(() => this.save());
    },
    has: (id) => id in Photo.data,
    get: (id) => Photo.data[id],
    on(fn) { this.listeners.add(fn); },
    emit(id) { this.listeners.forEach((fn) => fn(id)); },
    save() {
      const d = {};
      Object.entries(this.data).forEach(([k, v]) => { if (!(v && v.local)) d[k] = v; });
      store.set(PHOTO_KEY, { t: Date.now(), d });
    },
    async api(params) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      try {
        const qs = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', ...params });
        const r = await fetch('https://commons.wikimedia.org/w/api.php?' + qs, { signal: ctrl.signal });
        if (!r.ok) throw new Error(String(r.status));
        return await r.json();
      } finally { clearTimeout(timer); }
    },
    score(pg, p, rule) {
      const ii = pg.imageinfo && pg.imageinfo[0];
      if (!ii || !ii.thumburl || !/\.(jpe?g|png|webp)$/i.test(ii.url || '')) return -1;
      const md = ii.extmetadata || {};
      const val = (k) => stripTags(md[k] && md[k].value);
      const title = norm(pg.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/[_-]/g, ' '));
      const txt = norm(`${title} ${val('ImageDescription')} ${val('ObjectName')} ${val('Categories').replace(/\|/g, ' ')}`);
      const names = (rule.m || [norm(p.name)]).map((k) => new RegExp(`\\b${reEsc(k)}\\b`));
      if (!names.some((r) => r.test(txt))) return -1;
      if (GLOBAL_EX.test(txt) || ART_EX.test(txt)) return -1;
      if ((rule.ex || []).some((k) => txt.includes(k))) return -1;
      const strong = BARCA_STRONG.test(txt);
      if (!strong && !BARCA_WEAK.test(txt)) return -1;
      const yr = +((val('DateTimeOriginal').match(/(19|20)\d\d/) || [0])[0]);
      let s = strong ? 4 : 1;
      if (names.some((r) => r.test(title))) s += 4;
      if (BARCA_STRONG.test(title)) s += 1;
      s += yr >= 2025 ? 3 : yr >= 2023 ? 2 : yr >= 2020 ? 1 : 0;
      if (ii.height >= ii.width * 0.9) s += 2;
      if (ii.thumbwidth >= 600) s += 1;
      return s;
    },
    async find(p) {
      const rule = RULES[p.id] || { m: [norm(p.name)], ex: [] };
      try {
        const j = await this.api({
          generator: 'search', gsrnamespace: '6', gsrlimit: '40',
          gsrsearch: `"${p.name}" (Barcelona OR Barça OR FCB) filetype:bitmap`,
          prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '1000',
          iiextmetadatafilter: 'ImageDescription|ObjectName|Categories|Artist|LicenseShortName|DateTimeOriginal',
        });
        const pages = (j.query && j.query.pages) || [];
        let best = null, bestS = 0;
        pages.forEach((pg) => { const s = this.score(pg, p, rule); if (s > bestS) { bestS = s; best = pg; } });
        if (best) {
          const ii = best.imageinfo[0], md = ii.extmetadata || {};
          this.data[p.id] = {
            src: ii.thumburl,
            page: ii.descriptionurl,
            title: best.title.replace(/^File:/, ''),
            artist: stripTags(md.Artist && md.Artist.value).slice(0, 80),
            license: stripTags(md.LicenseShortName && md.LicenseShortName.value),
          };
        } else this.data[p.id] = false;
      } catch (e) {
        this.data[p.id] = false;
      }
    },
    apply(root = document) {
      $$('.ph[data-pid]', root).forEach((el) => {
        const d = this.data[el.dataset.pid];
        if (!d || el.querySelector('img')) return;
        const img = new Image();
        img.alt = '';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.onload = () => { img.classList.add('ok'); el.classList.add('has-img'); };
        img.onerror = () => img.remove();
        img.src = d.src;
        el.appendChild(img);
      });
    },
  };

  /* ======================================================================
     Smooth scroll, kursor, nawigacja
     ====================================================================== */
  let lenis = null;
  function initScroll() {
    if (!reduced && window.Lenis && hasGsap) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const target = a.getAttribute('href') === '#top' ? 0 : $(a.getAttribute('href'));
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else if (target === 0) scrollTo({ top: 0, behavior: 'smooth' });
      else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
    const nav = $('#nav');
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const links = $$('[data-nav]');
    const sio = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    $$('section[id]').forEach((s) => sio.observe(s));
  }
  const lockScroll = (on) => {
    if (lenis) on ? lenis.stop() : lenis.start();
    document.documentElement.style.overflow = on ? 'hidden' : '';
  };

  const Cursor = { el: null, set() {}, drag() {} };
  function initCursor() {
    if (!finePointer || reduced || !hasGsap) return;
    document.documentElement.classList.add('has-cursor');
    const el = $('#cursor'), dot = $('.cursor-dot', el), ring = $('.cursor-ring', el), label = $('#cursorLabel');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.08 }), dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    gsap.set(el, { opacity: 0 });
    let shown = false;
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) { shown = true; gsap.set([dot, ring], { x: e.clientX, y: e.clientY }); gsap.to(el, { opacity: 1, duration: 0.3 }); }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    });
    const SEL = 'a, button, [data-cursor], tr[data-pos], .mk, .token, .bp, .ro, .rs, .lu-btn';
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest(SEL);
      const txt = t && t.dataset.cursor;
      el.classList.toggle('is-hover', !!t && !txt);
      el.classList.toggle('is-label', !!txt);
      if (txt) label.textContent = txt;
    });
    document.addEventListener('mouseleave', () => gsap.to(el, { opacity: 0, duration: 0.2 }));
    document.addEventListener('mouseenter', () => gsap.to(el, { opacity: 1, duration: 0.2 }));
    Cursor.drag = (on) => el.classList.toggle('is-drag', on);
  }

  /* ======================================================================
     Loader + hero
     ====================================================================== */
  function splitChars(el) {
    if (!window.SplitText || reduced) return null;
    return new SplitText(el, { type: 'lines,chars', linesClass: 'split-line', charsClass: 'split-char' });
  }

  function initHero() {
    const pitch = $('#heroPitch');
    pitch.innerHTML = pitchSVG(false, 'hero');
    const cycle = ['433', '325', '442', '4231', '343'].map((id) => TAC.find((t) => t.id === id));
    const dots = cycle[0].slots.map(() => { const d = document.createElement('i'); d.className = 'hdot'; pitch.appendChild(d); return d; });
    const label = $('#heroFormation');
    const place = (t, animate) => {
      t.slots.forEach((s, i) => {
        const [l, tp] = toPct(s[2], s[3], false);
        const c = LINE_COLOR[byId[s[4]].line];
        if (animate && hasGsap) gsap.to(dots[i], { left: l + '%', top: tp + '%', '--c': c, duration: D(1.5), ease: 'power3.inOut', delay: i * 0.025 });
        else { dots[i].style.left = l + '%'; dots[i].style.top = tp + '%'; dots[i].style.setProperty('--c', c); }
      });
      label.textContent = `${t.name} · ${t.title}`;
    };
    place(cycle[0], false);
    let k = 0;
    if (!reduced) setInterval(() => { if (document.hidden) return; k = (k + 1) % cycle.length; place(cycle[k], true); }, 3600);

    if (!hasGsap) return;
    const titleSplits = $$('.hero-title [data-split]').map(splitChars);
    gsap.set(pitch, { yPercent: 26, rotationX: 64, scale: 0.9 });

    const intro = () => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      titleSplits.forEach((sp, i) => { if (sp) tl.from(sp.chars, { yPercent: 115, rotate: 6, duration: 1.3, stagger: 0.045 }, i * 0.12); });
      tl.from(pitch, { rotationX: 85, yPercent: 60, opacity: 0, duration: 1.8 }, 0.1)
        .from(dots, { scale: 0, opacity: 0, duration: 0.8, stagger: 0.04, ease: 'back.out(2)' }, 0.9)
        .from('.hero-kicker span', { y: 16, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.5)
        .from('.hero-lead, .hero-scroll', { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 0.7)
        .from('.hero-stripes i', { scaleY: 0, transformOrigin: '50% 0%', duration: 1.4, stagger: 0.05 }, 0);
      if (!reduced) {
        const plines = $$('.plines > *', pitch);
        plines.forEach((pth) => {
          const len = pth.getTotalLength ? pth.getTotalLength() : 3000;
          gsap.fromTo(pth, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut', delay: 0.5, clearProps: 'strokeDasharray,strokeDashoffset' });
        });
      }
    };

    // loader tylko przy pierwszej wizycie w sesji
    const loader = $('#loader');
    let seen = false;
    try { seen = sessionStorage.getItem('bt-seen') === '1'; sessionStorage.setItem('bt-seen', '1'); } catch (e) { seen = true; }
    if (seen || reduced) { loader.classList.add('done'); intro(); }
    else {
      const count = $('#loaderCount');
      const o = { v: 0 };
      lockScroll(true);
      gsap.timeline()
        .to(o, { v: 100, duration: 1.2, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(o.v)).padStart(2, '0'); } })
        .to('.loader-inner', { opacity: 0, y: -20, duration: 0.4 })
        .to('.loader-stripes i', { yPercent: -100, duration: 1, stagger: 0.06, ease: 'expo.inOut' }, '-=.2')
        .add(intro, '-=.8')
        .add(() => { loader.classList.add('done'); lockScroll(false); });
    }

    // scroll: tytuł się rozjeżdża, boisko kładzie się płasko
    if (!reduced && window.ScrollTrigger) {
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=110%', scrub: 0.8, pin: true, anticipatePin: 1 } });
      tl.to('.ht-line:first-child', { xPercent: -18, opacity: 0.1, ease: 'none' }, 0)
        .to('.ht-outline', { xPercent: 18, opacity: 0.1, ease: 'none' }, 0)
        .to('.hero-kicker, .hero-bottom', { opacity: 0, y: -30, ease: 'none' }, 0)
        .to(pitch, { rotationX: 0, yPercent: 0, scale: 1.02, ease: 'power1.inOut' }, 0)
        .to('.hero-stripes', { yPercent: -25, opacity: 0.08, ease: 'none' }, 0);
    }
  }

  /* nagłówki rozdziałów */
  function initChapterReveals() {
    if (!hasGsap || reduced || !window.ScrollTrigger) return;
    $$('.chapter-head').forEach((head) => {
      const title = $('.ch-title', head);
      const sp = splitChars(title);
      const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 80%', once: true } });
      if (sp) tl.from(sp.chars, { yPercent: 115, rotate: 5, duration: 1.1, stagger: 0.03, ease: 'expo.out' });
      tl.from($('.ch-num', head), { opacity: 0, x: -30, duration: 0.9, ease: 'expo.out' }, 0)
        .from($('.ch-lead', head), { opacity: 0, y: 30, duration: 0.9, ease: 'expo.out' }, 0.2);
    });
    gsap.utils.toArray('.table-block, .bench, .lineup, .filters, .formations, .matchday').forEach((el) => {
      gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
  }

  /* ======================================================================
     01 · Anatomia boiska
     ====================================================================== */
  const POS_OVERRIDE = { SW: ['joan', 'cubarsi'], WB: ['balde', 'cancelo'], WM: ['yamal', 'gordon'], SS: ['olmo', 'fermin'], F9: ['olmo', 'fermin'] };
  const POS_CODES = { GK: ['GK'], CB: ['CB'], FB: ['LB', 'RB'], CDM: ['CDM'], CM: ['CM'], CAM: ['CAM'], W: ['LW', 'RW'], CF: ['CF'] };
  function playersFor(posId) {
    if (POS_OVERRIDE[posId]) return POS_OVERRIDE[posId].map((id) => byId[id]);
    const codes = POS_CODES[posId] || [];
    return PL.map((p) => ({ p, i: Math.min(...codes.map((c) => { const k = p.pos.indexOf(c); return k < 0 ? 99 : k; })) }))
      .filter((o) => o.i < 99).sort((a, b) => a.i - b.i || a.p.num - b.p.num).map((o) => o.p);
  }

  const STEPS = [
    { g: 'ALL', t: '13 pozycji, 4 linie', x: 'Ustawienie zapisuje się od obrony do ataku, bez bramkarza: 4-3-3 to czterech obrońców, trzech pomocników i trzech napastników. Sama liczba nie mówi jednak, co kto robi. Dlatego przy każdej pozycji są role: dwóch zawodników na tej samej pozycji może grać zupełnie inaczej.' },
    { g: 'GK', t: 'Bramkarz', x: 'Najbardziej wyspecjalizowana pozycja. U Flicka bramkarz jest też pierwszym rozgrywającym i asekuruje przestrzeń za wysoko ustawioną linią obrony.', ids: ['GK'] },
    { g: 'DEF', t: 'Obrona', x: 'Środkowi obrońcy bronią pola karnego i prowadzą linię, boczni i wahadłowi odpowiadają za flanki. Libero to pozycja historyczna, ale jego idea żyje dziś w bramkarzu-libero.', ids: ['SW', 'CB', 'FB', 'WB'] },
    { g: 'MID', t: 'Pomoc', x: 'Tu wygrywa się kontrolę nad meczem. Defensywny pomocnik chroni obronę, ósemki łączą linie, dziesiątka szuka ostatniego podania, a boczni pomocnicy domykają flanki.', ids: ['CDM', 'CM', 'CAM', 'WM'] },
    { g: 'FWD', t: 'Atak', x: 'Skrzydłowi rozciągają obronę, dziewiątka atakuje pole karne, a fałszywa dziewiątka celowo z niego wychodzi, żeby zrobić miejsce innym.', ids: ['W', 'SS', 'CF', 'F9'] },
    { g: 'PICK', t: 'Twoja kolej', x: 'Każdy znacznik na boisku otwiera kartę pozycji: zadania, cechy, warianty ról i zawodnicy Barçy, którzy na niej grają. Pełne zestawienie jest w tabeli poniżej.' },
  ];

  function renderPosBoard() {
    const zones = POS.map((ps) => `<g class="zone" data-zone="${ps.id}">${ps.zones.map(([cx, cy, rx, ry]) =>
      `<ellipse cx="${hx(cx)}" cy="${hy(cy)}" rx="${(rx / 100) * W}" ry="${(ry / 100) * H}" fill="url(#pos-zg-${LINE_CLS[ps.line]})" stroke="${LINE_COLOR[ps.line]}" stroke-opacity=".75" stroke-width="2" stroke-dasharray="6 7"/>`).join('')}</g>`).join('');
    $('#posPitch').innerHTML = pitchSVG(false, 'pos', zones);
    $('#posMarkers').innerHTML = POS.flatMap((ps) => ps.points.map(([x, y, lab]) => {
      const [l, t] = toPct(x, y, false);
      return `<button class="mk ${LINE_CLS[ps.line]}" data-pos="${ps.id}" data-line="${ps.line}" style="left:${l}%;top:${t}%" aria-label="${esc(ps.name)} (${lab})" data-cursor="Karta">${lab}</button>`;
    })).join('');
  }

  let curGroup = null;
  function setGroup(g) {
    if (g === curGroup) return;
    curGroup = g;
    const step = STEPS.find((s) => s.g === g);
    const ids = step && step.ids;
    $$('#posMarkers .mk').forEach((m) => {
      const on = ids ? ids.includes(m.dataset.pos) : false;
      m.classList.toggle('lit', on);
      m.classList.toggle('dim', !!ids && !on);
    });
    $$('#posPitch .zone').forEach((z) => z.classList.toggle('on', !!ids && ids.includes(z.dataset.zone)));
    if (hasGsap && !reduced && ids) {
      gsap.fromTo($$('#posMarkers .mk.lit'), { scale: 0.6 }, { scale: 1, duration: 0.7, ease: 'back.out(2.5)', stagger: 0.04, clearProps: 'scale' });
    }
  }

  function renderSteps() {
    $('#steps').innerHTML = STEPS.map((s, i) => {
      const c = s.g === 'ALL' || s.g === 'PICK' ? 'var(--gold)' : LINE_COLOR[s.g];
      const list = s.ids ? `<ul class="step-list">${s.ids.map((id) => {
        const ps = POS.find((p) => p.id === id);
        return `<li><button class="rs ${LINE_CLS[ps.line]}" data-sheet="${ps.id}"><span class="rs-pos">${esc(ps.abbr)}</span><span><b>${esc(ps.name)}</b><small>${esc(ps.area)}</small></span><span class="rs-arrow">→</span></button></li>`;
      }).join('')}</ul>` : '';
      return `<article class="step" data-g="${s.g}" style="--c:${c}">
        <span class="step-num">${String(i).padStart(2, '0')} / ${String(STEPS.length - 1).padStart(2, '0')}</span>
        <h3>${esc(s.t)}</h3><p>${esc(s.x)}</p>${list}</article>`;
    }).join('');
    const steps = $$('.step');
    const activate = (el) => { steps.forEach((s) => s.classList.toggle('active', s === el)); setGroup(el.dataset.g); };
    if (window.ScrollTrigger) {
      steps.forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 62%', end: 'bottom 62%', onToggle: (self) => self.isActive && activate(el) }));
    } else {
      const io = new IntersectionObserver((ents) => ents.forEach((e) => e.isIntersecting && activate(e.target)), { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach((s) => io.observe(s));
    }
    activate(steps[0]);
  }

  function renderPosTable() {
    $('#posTable tbody').innerHTML = POS.map((ps) => `
      <tr data-pos="${ps.id}" style="--c:${LINE_COLOR[ps.line]}" data-cursor="Karta">
        <td><div class="pt-pos"><span class="pt-abbr">${esc(ps.abbr.replace(' / ', '/'))}</span><span><b>${esc(ps.name)}</b><span>${esc(ps.en)}</span></span></div></td>
        <td>${esc(ps.area)}</td>
        <td>${esc(ps.tasks)}</td>
        <td><ul>${ps.roles.map(([n, d]) => `<li><b>${esc(n)}</b>: ${esc(d)}</li>`).join('')}</ul></td>
        <td>${esc(ps.barca)}<div class="pt-players">${playersFor(ps.id).map((p) => `<button class="pchip" data-open="${p.id}">${phHTML(p)}${esc(p.short)}</button>`).join('')}</div></td>
      </tr>`).join('');
  }

  /* karta pozycji */
  let sheetOpen = false, sheetFocus = null;
  function openSheet(posId) {
    const ps = POS.find((p) => p.id === posId);
    if (!ps) return;
    const c = LINE_COLOR[ps.line];
    const zone = ps.zones.map(([cx, cy, rx, ry]) => `<ellipse cx="${hx(cx)}" cy="${hy(cy)}" rx="${(rx / 100) * W}" ry="${(ry / 100) * H}" fill="url(#sheet-zg-${LINE_CLS[ps.line]})" stroke="${c}" stroke-width="2.5" stroke-dasharray="6 7"/>`).join('');
    const pts = ps.points.map(([x, y]) => `<circle cx="${hx(x)}" cy="${hy(y)}" r="20" fill="${c}" stroke="#fff" stroke-width="4"/>`).join('');
    const panel = $('#sheetPanel');
    panel.style.setProperty('--c', c);
    panel.innerHTML = `
      <div class="sheet-top"><span class="sheet-kicker">${esc(ps.area)}</span><button class="x-btn" data-close-sheet aria-label="Zamknij kartę">✕</button></div>
      <p class="sheet-abbr">${esc(ps.abbr.replace(' / ', '/'))}</p>
      <h3 id="sheetTitle">${esc(ps.name)}</h3>
      <p class="sheet-en">${esc(ps.en)}</p>
      <div class="sheet-mini"><div class="board">${pitchSVG(false, 'sheet', zone + pts)}</div></div>
      <div class="sheet-sec"><h4>Zadania</h4><p>${esc(ps.tasks)}</p></div>
      <div class="sheet-sec"><h4>Kluczowe cechy</h4><div class="tags">${ps.traits.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
      <div class="sheet-sec"><h4>Warianty ról</h4><ul class="role-list">${ps.roles.map(([n, t]) => `<li><b>${esc(n)}</b>${esc(t)}</li>`).join('')}</ul></div>
      <div class="sheet-sec"><h4>W Barcelonie 2026/27</h4><p class="sheet-barca">${esc(ps.barca)}</p>
        <div class="plist">${playersFor(ps.id).map((p) => `<button class="prow" data-open="${p.id}">${phHTML(p)}<span><b>${esc(p.name)}</b><small>${p.pos.map((x) => POS_NAMES[x] || x).join(' · ')}</small></span><em>${p.num}</em></button>`).join('')}</div>
      </div>`;
    Photo.apply(panel);
    const sheet = $('#sheet');
    if (!sheetOpen) sheetFocus = document.activeElement;
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    panel.scrollTop = 0;
    sheetOpen = true;
    lockScroll(true);
    $$('#posMarkers .mk').forEach((m) => m.classList.toggle('lit', m.dataset.pos === posId));
    $$('#posTable tbody tr').forEach((r) => r.classList.toggle('on', r.dataset.pos === posId));
    if (hasGsap && !reduced) gsap.from($$('.sheet-panel > *'), { y: 30, opacity: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out', delay: 0.15 });
    setTimeout(() => $('.x-btn', panel).focus({ preventScroll: true }), 50);
  }
  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    const sheet = $('#sheet');
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    const g = curGroup; curGroup = null; setGroup(g);
    if (sheetFocus) sheetFocus.focus({ preventScroll: true });
  }

  function initPositions() {
    renderPosBoard();
    renderSteps();
    renderPosTable();
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open]')) return;
      const t = e.target.closest('[data-sheet], #posMarkers .mk, #posTable tr[data-pos]');
      if (t) openSheet(t.dataset.sheet || t.dataset.pos);
      if (e.target.closest('[data-close-sheet]')) closeSheet();
    });
  }

  /* ======================================================================
     02 · Tablica meczowa
     ====================================================================== */
  const TKEY = 'blaugrana.tactics.v2';
  const saved = store.get(TKEY, {});
  const state = {
    tactic: TAC.some((t) => t.id === saved.tactic) ? saved.tactic : TAC[0].id,
    lineups: {},
    layers: { arrows: true, lanes: false, links: false, ...(saved.layers || {}) },
    swap: false,
    sel: null,
    playing: false,
  };
  Object.entries(saved.lineups || {}).forEach(([k, v]) => {
    if (TAC.some((t) => t.id === k) && Array.isArray(v) && v.length === 11 && new Set(v).size === 11 && v.every((id) => byId[id])) state.lineups[k] = v;
  });
  const saveTac = () => store.set(TKEY, { tactic: state.tactic, lineups: state.lineups, layers: state.layers });
  const cur = () => TAC.find((t) => t.id === state.tactic);
  const lineup = (t = cur()) => state.lineups[t.id] || t.slots.map((s) => s[4]);

  function curve([x1, y1], [x2, y2], bend = 0.14) {
    const X1 = hx(x1), Y1 = hy(y1), X2 = hx(x2), Y2 = hy(y2);
    const mx = (X1 + X2) / 2, my = (Y1 + Y2) / 2, dx = X2 - X1, dy = Y2 - Y1;
    return `M${X1} ${Y1}Q${mx - dy * bend} ${my + dx * bend} ${X2} ${Y2}`;
  }

  // linie podań: każdy zawodnik z dwoma najbliższymi partnerami (czysta geometria ustawienia)
  function linkPairs(t) {
    const pts = t.slots.map((s) => [s[2] * 1.05, s[3] * 0.68]);
    const set = new Set();
    pts.forEach((a, i) => {
      pts.map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1])]).filter(([j]) => j !== i)
        .sort((u, v) => u[1] - v[1]).slice(0, 2).forEach(([j]) => set.add(i < j ? `${i}-${j}` : `${j}-${i}`));
    });
    return [...set].map((k) => k.split('-').map(Number));
  }

  function renderTacPitch() {
    const t = cur(), V = tacVertical();
    $('#tacBoard').classList.toggle('vertical', V);
    const L = state.layers;
    const bands = [20.35, 36.53, 63.47, 79.65];
    const lanes = `
      <rect class="lane-fill" x="${PAD}" y="${hy(20.35)}" width="${W}" height="${hy(36.53) - hy(20.35)}"/>
      <rect class="lane-fill" x="${PAD}" y="${hy(63.47)}" width="${W}" height="${hy(79.65) - hy(63.47)}"/>
      ${bands.map((y) => `<path class="lane-line" d="M${PAD} ${hy(y)}H${PAD + W}"/>`).join('')}
      ${[33.33, 66.67].map((x) => `<path class="lane-line" d="M${hx(x)} ${PAD}V${PAD + H}"/>`).join('')}
      ${V ? '' : [['Skrzydło', 10], ['Półprzestrzeń', 28.4], ['Środek', 50], ['Półprzestrzeń', 71.6], ['Skrzydło', 90]].map(([n, y]) =>
        `<text class="lane-label" x="${hx(1.5)}" y="${hy(y) + 6}">${n}</text>`).join('')}`;
    const links = linkPairs(t).map(([i, j]) => `<path class="link-line" pathLength="1" d="M${hx(t.slots[i][2])} ${hy(t.slots[i][3])}L${hx(t.slots[j][2])} ${hy(t.slots[j][3])}"/>`).join('');
    const arrows = t.arrows.map(([type, a, b]) => `<g class="arr"><path class="a-${type}" d="${curve(a, b)}" marker-end="url(#tac-ah-${type})"/></g>`).join('');
    $('#tacPitch').innerHTML = pitchSVG(V, 'tac', `
      <g class="layer${L.lanes ? '' : ' off'}" data-ly="lanes">${lanes}</g>
      <g class="layer${L.links ? '' : ' off'}" data-ly="links">${links}</g>
      <g class="layer arrows${L.arrows ? '' : ' off'}" data-ly="arrows">${arrows}</g>
      <g class="arrows" id="passLayer"></g>`);
    if (hasGsap && !reduced) {
      gsap.from($$('#tacPitch .arr'), { opacity: 0, duration: 0.6, stagger: 0.1, delay: 0.7 });
      gsap.fromTo($$('#tacPitch .link-line'), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, stagger: 0.03, delay: 0.5, ease: 'power2.out' });
    }
  }

  function makeToken(p) {
    const el = document.createElement('button');
    el.className = `token ${LINE_CLS[p.line]}`;
    el.dataset.pid = p.id;
    el.dataset.cursor = 'Profil';
    el.innerHTML = `<span class="t-pos"></span><span class="t-face">${phHTML(p)}<span class="t-num">${p.num}</span></span><span class="t-name">${esc(p.short)}</span>`;
    return el;
  }
  const centerOf = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  function layoutTokens(animate = true) {
    const t = cur(), ids = lineup(t), V = tacVertical();
    const wrap = $('#tokens');
    const prev = new Map($$('.token', wrap).filter((el) => !el.classList.contains('leaving')).map((el) => [el.dataset.pid, centerOf($('.t-face', el))]));
    ids.forEach((pid, i) => {
      const s = t.slots[i], p = byId[pid];
      let el = $(`.token[data-pid="${pid}"]:not(.leaving)`, wrap);
      const fresh = !el;
      if (fresh) { el = makeToken(p); wrap.appendChild(el); }
      if (hasGsap) gsap.killTweensOf(el);
      el.style.setProperty('--dx', '0px');
      el.style.setProperty('--dy', '0px');
      const [l, tp] = toPct(s[2], s[3], V);
      el.style.left = l + '%';
      el.style.top = tp + '%';
      el.dataset.slot = s[0];
      $('.t-pos', el).textContent = s[1];
      el.setAttribute('aria-label', `${p.name}, ${POS_NAMES[s[1]] || s[1]}`);
      el.classList.toggle('selected', !!(state.sel && state.sel.pid === pid));
      if (!hasGsap || !animate || reduced) { el.style.setProperty('--s', 1); el.style.opacity = 1; return; }
      if (fresh) {
        gsap.fromTo(el, { '--s': 0, opacity: 0 }, { '--s': 1, opacity: 1, duration: 0.8, ease: 'back.out(1.8)', delay: 0.15 + i * 0.03 });
      } else {
        const now = centerOf($('.t-face', el)), old = prev.get(pid);
        gsap.fromTo(el, { '--dx': `${old[0] - now[0]}px`, '--dy': `${old[1] - now[1]}px` },
          { '--dx': '0px', '--dy': '0px', duration: 1.1, ease: 'power3.inOut', delay: i * 0.025 });
      }
    });
    $$('.token', wrap).forEach((el) => {
      if (ids.includes(el.dataset.pid) || el.classList.contains('leaving')) return;
      el.classList.add('leaving');
      if (hasGsap && animate && !reduced) gsap.to(el, { '--s': 0, opacity: 0, duration: 0.45, ease: 'power3.in', onComplete: () => el.remove() });
      else el.remove();
    });
    Photo.apply(wrap);
  }

  function renderFormations() {
    const box = $('#formations');
    box.innerHTML = TAC.map((t) => `<button class="fm${t.id === state.tactic ? ' is-on' : ''}" role="tab" aria-selected="${t.id === state.tactic}" data-t="${t.id}"><b>${esc(t.name)}</b><span>${esc(t.title)}</span></button>`).join('') + '<i class="fm-bar"></i>';
    moveBar(false);
  }
  function moveBar(animate = true) {
    const on = $('.fm.is-on'), bar = $('.fm-bar');
    if (!on || !bar) return;
    bar.style.transition = animate ? '' : 'none';
    bar.style.width = on.offsetWidth + 'px';
    bar.style.transform = `translateX(${on.offsetLeft}px)`;
    if (animate) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }

  function renderInfo(animate) {
    const t = cur();
    const box = $('#tacticInfo');
    box.innerHTML = `
      <p class="ti-name">${esc(t.name)}</p>
      <p class="ti-title">${esc(t.title)}</p>
      <span class="ti-badge">${esc(t.badge)}</span>
      <p class="ti-desc">${esc(t.desc)}</p>
      <ol class="ti-pr">${t.principles.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      <div class="ti-legend">
        <span><svg width="44" height="10"><path d="M2 5H36" stroke="#edbb00" stroke-width="3" stroke-dasharray="8 5"/><path d="M35 1l7 4-7 4z" fill="#edbb00"/></svg>wbiegnięcie, atak przestrzeni</span>
        <span><svg width="44" height="10"><path d="M2 5H36" stroke="#fff" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/><path d="M35 1l7 4-7 4z" fill="#fff"/></svg>przesunięcie w ustawieniu</span>
        <span><svg width="44" height="10"><path d="M2 5H36" stroke="#ff4d7d" stroke-width="3" stroke-dasharray="8 5"/><path d="M35 1l7 4-7 4z" fill="#ff4d7d"/></svg>pressing</span>
        <span><svg width="44" height="10"><path d="M2 5H42" stroke="rgba(255,255,255,.6)" stroke-width="2"/></svg>linie podań: dwaj najbliżsi partnerzy</span>
      </div>`;
    if (animate && hasGsap && !reduced) {
      const sp = window.SplitText ? new SplitText($('.ti-name', box), { type: 'chars', charsClass: 'split-char' }) : null;
      if (sp) gsap.from(sp.chars, { yPercent: 60, opacity: 0, rotateX: -80, duration: 0.8, stagger: 0.05, ease: 'expo.out' });
      gsap.from($$('.ti-title, .ti-badge, .ti-desc, .ti-pr li, .ti-legend', box), { y: 20, opacity: 0, duration: 0.7, stagger: 0.05, ease: 'expo.out', delay: 0.1 });
    }
  }

  function renderBench() {
    const ids = new Set(lineup());
    const list = SQUAD.filter((p) => !ids.has(p.id));
    $('#benchCount').textContent = `${list.length} zawodników`;
    $('#bench').innerHTML = list.map((p) => `
      <button class="bp ${LINE_CLS[p.line]}${state.sel && state.sel.pid === p.id ? ' selected' : ''}" data-pid="${p.id}" data-cursor="Przeciągnij">
        ${phHTML(p)}<span><b>${p.num} · ${esc(p.short)}</b><small>${p.pos.join(' / ')}</small></span>
      </button>`).join('');
    Photo.apply($('#bench'));
  }

  function renderLineup(animate) {
    const t = cur(), ids = lineup(t);
    $('#lineupName').textContent = t.name;
    $('#lineup').innerHTML = t.slots.map((s, i) => {
      const p = byId[ids[i]], def = byId[s[4]];
      const note = p.id !== def.id ? `<span class="lu-note">Opis roli przygotowany pod: ${esc(def.short)}</span>` : '';
      return `<li class="lu"><button class="lu-btn ${LINE_CLS[p.line]}" data-pid="${p.id}" data-cursor="Profil">
        <span class="lu-num">${p.num}</span>${phHTML(p)}
        <span><span class="lu-pos">${esc(s[1])} · ${esc(POS_NAMES[s[1]] || s[1])}</span><b>${esc(p.name)}</b><p>${esc(s[5])}</p>${note}</span>
      </button></li>`;
    }).join('');
    Photo.apply($('#lineup'));
    if (animate && hasGsap && !reduced) gsap.from($$('#lineup .lu'), { y: 24, opacity: 0, duration: 0.7, stagger: 0.035, ease: 'expo.out' });
  }

  function setTactic(id) {
    if (id === state.tactic) return;
    stopPlay();
    state.tactic = id;
    state.sel = null;
    saveTac();
    $$('.fm').forEach((b) => { const on = b.dataset.t === id; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    moveBar(true);
    renderTacPitch();
    layoutTokens(true);
    renderInfo(true);
    renderBench();
    renderLineup(true);
    hint('');
  }

  function hint(txt) { $('#swapHint').textContent = txt; }

  function doSwap(a, b) {
    const t = cur(), ids = lineup(t).slice();
    if (a.where === 'bench' && b.where === 'bench') return false;
    if (a.where === 'pitch' && b.where === 'pitch') {
      const i = ids.indexOf(a.pid), j = ids.indexOf(b.pid);
      if (i < 0 || j < 0 || i === j) return false;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      hint(`${byId[a.pid].short} i ${byId[b.pid].short} zamienili się pozycjami.`);
    } else {
      const onPitch = a.where === 'pitch' ? a.pid : b.pid, fromBench = a.where === 'bench' ? a.pid : b.pid;
      const i = ids.indexOf(onPitch);
      if (i < 0) return false;
      ids[i] = fromBench;
      hint(`Zmiana: ${byId[fromBench].short} za ${byId[onPitch].short}.`);
    }
    state.lineups[t.id] = ids;
    state.sel = null;
    saveTac();
    layoutTokens(true);
    renderBench();
    renderLineup(false);
    return true;
  }

  function handleSwapClick(where, pid) {
    if (!state.sel) { state.sel = { where, pid }; hint(`Wybrano: ${byId[pid].short}. Teraz kliknij zawodnika, z którym ma się zamienić.`); }
    else if (state.sel.pid === pid) { state.sel = null; hint('Tryb zmian: kliknij zawodnika na boisku, potem drugiego na boisku albo na ławce.'); }
    else if (state.sel.where === 'bench' && where === 'bench') { state.sel = { where, pid }; hint(`Wybrano: ${byId[pid].short}. Teraz kliknij zawodnika na boisku.`); }
    else { doSwap(state.sel, { where, pid }); }
    $$('.token').forEach((el) => el.classList.toggle('selected', !!(state.sel && state.sel.pid === el.dataset.pid)));
    $$('.bp').forEach((el) => el.classList.toggle('selected', !!(state.sel && state.sel.pid === el.dataset.pid)));
  }

  /* przeciąganie (mysz i dotyk) */
  let suppressClick = false;
  function initDrag() {
    let d = null;
    const tokenAt = (x, y, skip) => $$('#tokens .token:not(.leaving)').find((el) => {
      if (el.dataset.pid === skip) return false;
      const r = $('.t-face', el).getBoundingClientRect();
      return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < r.width * 0.75;
    });
    const benchAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('.bp'); };
    const start = (kind, el, e) => {
      if (e.button !== 0 || state.playing || state.swap) return;
      if (e.pointerType === 'mouse') e.preventDefault();
      d = { kind, el, pid: el.dataset.pid, x0: e.clientX, y0: e.clientY, id: e.pointerId, moved: false, target: null };
      addEventListener('pointermove', move, { passive: false });
      addEventListener('pointerup', up);
      addEventListener('pointercancel', cancel);
    };
    const setTarget = (tg) => {
      if (d.target === tg) return;
      if (d.target) d.target.classList.remove('drop-target');
      d.target = tg;
      if (tg) tg.classList.add('drop-target');
    };
    const move = (e) => {
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (!d.moved) {
        if (Math.hypot(dx, dy) < 7) return;
        if (d.kind === 'bench' && e.pointerType !== 'mouse' && Math.abs(dx) > Math.abs(dy)) return end();
        d.moved = true;
        Cursor.drag(true);
        if (d.kind === 'pitch') { d.el.classList.add('dragging'); d.el.style.pointerEvents = 'none'; if (hasGsap) gsap.killTweensOf(d.el); }
        else {
          d.ghost = document.createElement('div');
          d.ghost.className = 'drag-ghost';
          d.ghost.innerHTML = `${phHTML(byId[d.pid])}<span>${esc(byId[d.pid].short)}</span>`;
          document.body.appendChild(d.ghost);
          Photo.apply(d.ghost);
          d.el.classList.add('is-dragging');
        }
      }
      e.preventDefault();
      if (d.kind === 'pitch') { d.el.style.setProperty('--dx', dx + 'px'); d.el.style.setProperty('--dy', dy + 'px'); }
      else { d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px'; }
      const tg = tokenAt(e.clientX, e.clientY, d.pid) || (d.kind === 'pitch' ? benchAt(e.clientX, e.clientY) : null);
      setTarget(tg || null);
    };
    const up = (e) => {
      if (!d || e.pointerId !== d.id) return;
      if (d.moved) {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
        const tg = d.target;
        const a = { where: d.kind, pid: d.pid };
        const ok = tg && doSwap(a, { where: tg.classList.contains('bp') ? 'bench' : 'pitch', pid: tg.dataset.pid });
        if (d.kind === 'pitch') {
          d.el.classList.remove('dragging');
          d.el.style.pointerEvents = '';
          if (!ok && hasGsap) gsap.to(d.el, { '--dx': '0px', '--dy': '0px', duration: D(0.7), ease: 'elastic.out(1, .6)' });
          else if (!ok) { d.el.style.setProperty('--dx', '0px'); d.el.style.setProperty('--dy', '0px'); }
        }
        if (ok) {
          const landed = $(`#tokens .token[data-pid="${d.kind === 'bench' ? d.pid : tg.dataset.pid}"]`);
          if (landed && hasGsap && !reduced) gsap.fromTo($('.t-face', landed), { scale: 1.35 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, .5)', clearProps: 'scale' });
        }
      }
      end();
    };
    const cancel = () => {
      if (d && d.kind === 'pitch' && d.moved) { d.el.classList.remove('dragging'); d.el.style.pointerEvents = ''; d.el.style.setProperty('--dx', '0px'); d.el.style.setProperty('--dy', '0px'); }
      end();
    };
    const end = () => {
      if (!d) return;
      if (d.target) d.target.classList.remove('drop-target');
      if (d.ghost) d.ghost.remove();
      if (d.el) d.el.classList.remove('is-dragging');
      Cursor.drag(false);
      d = null;
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', cancel);
    };
    $('#tokens').addEventListener('pointerdown', (e) => { const el = e.target.closest('.token'); if (el && !el.classList.contains('leaving')) start('pitch', el, e); });
    $('#bench').addEventListener('pointerdown', (e) => { const el = e.target.closest('.bp'); if (el) start('bench', el, e); });
    $('#bench').addEventListener('dragstart', (e) => e.preventDefault());
  }

  /* akcja z piłką */
  let playTl = null;
  function stopPlay() {
    if (playTl) { playTl.kill(); playTl = null; }
    state.playing = false;
    const ball = $('#ball');
    if (hasGsap) gsap.set(ball, { opacity: 0 });
    const pl = $('#passLayer');
    if (pl) pl.innerHTML = '';
    if (hasGsap) gsap.set('#goal', { visibility: 'hidden' });
    $('#btnPlay').disabled = false;
  }
  function play() {
    if (!hasGsap) return;
    stopPlay();
    const t = cur(), ids = lineup(t), V = tacVertical();
    const pts = t.sequence.map((it) => {
      if (it === 'GOAL') return { x: 101, y: 50 };
      if (Array.isArray(it)) return { x: it[0], y: it[1] };
      const i = t.slots.findIndex((s) => s[0] === it);
      return { x: t.slots[i][2], y: t.slots[i][3], pid: ids[i] };
    });
    const ball = $('#ball'), pl = $('#passLayer');
    const pos = (p) => { const [l, tp] = toPct(p.x, p.y, V); return { left: l + '%', top: tp + '%' }; };
    const touch = (pid) => {
      const tok = pid && $(`#tokens .token[data-pid="${pid}"]`);
      if (tok) { tok.classList.remove('touch'); void tok.offsetWidth; tok.classList.add('touch'); }
    };
    state.playing = true;
    $('#btnPlay').disabled = true;
    const seg = reduced ? 0.01 : 0.62;
    playTl = gsap.timeline({ onComplete: stopPlay });
    playTl.set(ball, { ...pos(pts[0]), opacity: 0, scale: 0.4 })
      .to(ball, { opacity: 1, scale: 1, duration: 0.25 })
      .call(() => touch(pts[0].pid));
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      playTl.call(() => {
        if (!pl) return;
        pl.insertAdjacentHTML('beforeend', `<g class="arr"><path class="a-pass" pathLength="1" d="${curve([a.x, a.y], [b.x, b.y], 0.05)}" style="stroke-dasharray:1;stroke-dashoffset:1"/></g>`);
        const path = pl.lastElementChild.firstElementChild;
        gsap.to(path, { strokeDashoffset: 0, duration: seg, ease: 'power2.inOut', onComplete: () => path.setAttribute('marker-end', 'url(#tac-ah-pass)') });
      })
        .to(ball, { ...pos(b), duration: seg, ease: 'power2.inOut' })
        .call(() => touch(b.pid));
    }
    playTl.set('#goal', { visibility: 'visible' })
      .fromTo('#goal i', { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.5, stagger: 0.05, ease: 'expo.out' })
      .fromTo('#goal b', { yPercent: 40, opacity: 0, scale: 0.8 }, { yPercent: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' }, '<.15')
      .to('#tacBoard', { keyframes: [{ x: -6, y: 3 }, { x: 5, y: -3 }, { x: -3, y: 2 }, { x: 0, y: 0 }], duration: 0.35 }, '<')
      .to('#goal b', { opacity: 0, yPercent: -30, duration: 0.4 }, '+=.7')
      .to('#goal i', { scaleY: 0, transformOrigin: '50% 0%', duration: 0.5, stagger: 0.05, ease: 'expo.in' }, '<');
  }

  function initTactics() {
    renderFormations();
    renderTacPitch();
    layoutTokens(false);
    renderInfo(false);
    renderBench();
    renderLineup(false);
    initDrag();
    $$('.tgl').forEach((b) => {
      const k = b.dataset.layer;
      b.classList.toggle('is-on', !!state.layers[k]);
      b.setAttribute('aria-pressed', !!state.layers[k]);
      b.addEventListener('click', () => {
        state.layers[k] = !state.layers[k];
        b.classList.toggle('is-on', state.layers[k]);
        b.setAttribute('aria-pressed', state.layers[k]);
        const g = $(`#tacPitch [data-ly="${k}"]`);
        if (g) g.classList.toggle('off', !state.layers[k]);
        if (k === 'links' && state.layers[k] && hasGsap && !reduced) gsap.fromTo($$('#tacPitch .link-line'), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, stagger: 0.03 });
        saveTac();
      });
    });
    $('#formations').addEventListener('click', (e) => { const b = e.target.closest('.fm'); if (b) setTactic(b.dataset.t); });
    $('#tokens').addEventListener('click', (e) => {
      const el = e.target.closest('.token');
      if (!el || suppressClick || el.classList.contains('leaving')) return;
      if (state.swap) handleSwapClick('pitch', el.dataset.pid);
      else openPlayer(el.dataset.pid, lineup(), e);
    });
    $('#bench').addEventListener('click', (e) => {
      const el = e.target.closest('.bp');
      if (!el || suppressClick) return;
      if (state.swap) handleSwapClick('bench', el.dataset.pid);
      else openPlayer(el.dataset.pid, SQUAD.map((p) => p.id), e);
    });
    const lu = $('#lineup');
    lu.addEventListener('click', (e) => { const b = e.target.closest('.lu-btn'); if (b) openPlayer(b.dataset.pid, lineup(), e); });
    const hl = (pid, on) => { const tok = pid && $(`#tokens .token[data-pid="${pid}"]`); if (tok) tok.classList.toggle('hl', on); };
    lu.addEventListener('mouseover', (e) => { const b = e.target.closest('.lu-btn'); $$('#tokens .token.hl').forEach((x) => x.classList.remove('hl')); if (b) hl(b.dataset.pid, true); });
    lu.addEventListener('mouseleave', () => $$('#tokens .token.hl').forEach((x) => x.classList.remove('hl')));
    $('#tokens').addEventListener('mouseover', (e) => {
      const tok = e.target.closest('.token');
      $$('.lu-btn').forEach((b) => b.classList.toggle('hl', !!tok && b.dataset.pid === tok.dataset.pid));
    });
    $('#tokens').addEventListener('mouseleave', () => $$('.lu-btn.hl').forEach((b) => b.classList.remove('hl')));
    $('#btnPlay').addEventListener('click', play);
    $('#btnSwap').addEventListener('click', () => {
      state.swap = !state.swap;
      state.sel = null;
      $('#btnSwap').setAttribute('aria-pressed', state.swap);
      $$('.token.selected, .bp.selected').forEach((el) => el.classList.remove('selected'));
      hint(state.swap ? 'Tryb zmian: kliknij zawodnika na boisku, potem drugiego na boisku albo na ławce.' : '');
    });
    $('#btnReset').addEventListener('click', () => {
      delete state.lineups[state.tactic];
      state.sel = null;
      saveTac();
      layoutTokens(true);
      renderBench();
      renderLineup(true);
      hint('Przywrócono wyjściowy skład tego ustawienia.');
    });
    addEventListener('resize', () => moveBar(false));
  }

  /* ======================================================================
     03 · Kadra
     ====================================================================== */
  function initRoster() {
    const box = $('#roster');
    let html = '', line = null;
    SQUAD.forEach((p) => {
      if (p.line !== line) { line = p.line; html += `<div class="ro-group" data-line="${line}">${LINE_NAME[line]}</div>`; }
      html += `<button class="ro ${LINE_CLS[p.line]}" data-pid="${p.id}" data-line="${p.line}" data-cursor="Otwórz">
        ${phHTML(p, 'token', 'ro-thumb')}
        <span class="ro-num">${p.num}</span>
        <span class="ro-name">${esc(p.name)}${p.tags.includes('nowy 2026') ? '<span class="ro-new">Nowy</span>' : ''}</span>
        <span class="ro-pos">${p.pos.join(' · ')}</span>
        <span class="ro-nat">${esc(p.nat)}</span>
        <span class="ro-arrow">→</span>
      </button>`;
    });
    box.innerHTML = html;
    Photo.apply(box);
    box.addEventListener('click', (e) => {
      const r = e.target.closest('.ro');
      if (r) openPlayer(r.dataset.pid, $$('.ro:not(.hide)').map((x) => x.dataset.pid), e);
    });
    if (hasGsap && !reduced && window.ScrollTrigger) {
      ScrollTrigger.batch('.ro', { start: 'top 92%', once: true, onEnter: (els) => gsap.from(els, { y: 40, opacity: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out' }) });
    }
    $('#filters').addEventListener('click', (e) => {
      const b = e.target.closest('.flt');
      if (!b) return;
      $$('.flt').forEach((x) => x.classList.toggle('is-on', x === b));
      const f = b.dataset.f;
      const shown = [];
      $$('.ro, .ro-group', box).forEach((el) => {
        const show = f === 'ALL' || el.dataset.line === f;
        el.classList.toggle('hide', !show);
        el.style.display = show ? '' : 'none';
        if (show) shown.push(el);
      });
      if (hasGsap && !reduced) gsap.fromTo(shown, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.03, ease: 'expo.out' });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });

    // podgląd zdjęcia pod kursorem
    const card = $('#hoverCard');
    if (!finePointer || !hasGsap) return;
    const qx = gsap.quickTo(card, 'x', { duration: 0.55, ease: 'power3' });
    const qy = gsap.quickTo(card, 'y', { duration: 0.55, ease: 'power3' });
    const qr = gsap.quickTo(card, 'rotation', { duration: 0.6, ease: 'power3' });
    let lastX = 0, current = null;
    box.addEventListener('mousemove', (e) => {
      qx(e.clientX + 28);
      qy(e.clientY - 180);
      qr(Math.max(-12, Math.min(12, (e.clientX - lastX) * 0.6)));
      lastX = e.clientX;
    });
    const setCard = (pid) => {
      if (pid === current) return;
      current = pid;
      if (!pid) { gsap.to(card, { opacity: 0, scale: 0.6, duration: 0.35, ease: 'power3' }); return; }
      const p = byId[pid], ph = Photo.get(pid);
      card.innerHTML = `${phHTML(p, 'big', 'square')}<span class="hc-src">${ph ? (ph.local ? 'Zdjęcie własne' : 'Wikimedia Commons') : (Photo.has(pid) ? 'Brak zdjęcia w barwach Barçy' : 'Szukam zdjęcia…')}</span>`;
      Photo.apply(card);
      gsap.to(card, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' });
    };
    box.addEventListener('mouseover', (e) => { const r = e.target.closest('.ro'); setCard(r ? r.dataset.pid : null); });
    box.addEventListener('mouseleave', () => setCard(null));
  }

  /* ======================================================================
     Profil zawodnika (pełny ekran)
     ====================================================================== */
  const PV = { list: [], idx: 0, open: false, focus: null, origin: [innerWidth / 2, innerHeight / 2] };

  function miniBoard(p) {
    const dots = p.pos.map((code, i) => {
      const pt = POS_POINTS[code];
      if (!pt) return '';
      const X = hx(pt[0]), Y = hy(pt[1]), c = LINE_COLOR[p.line];
      return i === 0
        ? `<circle cx="${X}" cy="${Y}" r="40" fill="${c}" opacity=".3"><animate attributeName="r" values="32;52;32" dur="2.2s" repeatCount="indefinite"/></circle><circle cx="${X}" cy="${Y}" r="26" fill="${c}" stroke="#fff" stroke-width="5"/>`
        : `<circle cx="${X}" cy="${Y}" r="19" fill="#fff" opacity=".9"/>`;
    }).join('');
    return `<div class="board vertical">${pitchSVG(true, 'mini', dots)}</div>`;
  }

  function roleBlock(p) {
    const t = cur(), ids = lineup(t), i = ids.indexOf(p.id);
    if (i < 0) return `<div class="pl-role"><h4>${esc(t.name)} · ${esc(t.title)}</h4><p>W tym ustawieniu jest na ławce. Przeciągnij go na boisko w tablicy meczowej, żeby zobaczyć, kogo mógłby zastąpić.</p></div>`;
    const s = t.slots[i], def = byId[s[4]];
    const note = def.id !== p.id ? ` <span class="muted">(opis roli przygotowany pod: ${esc(def.short)})</span>` : '';
    return `<div class="pl-role"><h4>Rola w ${esc(t.name)} · ${esc(POS_NAMES[s[1]] || s[1])}</h4><p>${esc(s[5])}${note}</p></div>`;
  }

  function mediaHTML(p) {
    const ph = Photo.get(p.id);
    let credit;
    if (ph && ph.local) credit = `<span class="pl-credit"><b>Zdjęcie</b>${esc(ph.credit || 'plik lokalny')}</span>`;
    else if (ph) credit = `<a class="pl-credit" href="${esc(ph.page)}" target="_blank" rel="noopener" data-cursor="Źródło"><b>Zdjęcie w barwach FC Barcelony · Wikimedia Commons</b>${esc(ph.artist || 'autor w opisie pliku')}${ph.license ? ' · ' + esc(ph.license) : ''}</a>`;
    else if (Photo.has(p.id)) credit = `<span class="pl-credit"><b>Brak wolnego zdjęcia w barwach Barçy</b>Zamiast zdjęcia z innego klubu pokazujemy koszulkę. Własne zdjęcie: js/photos.js</span>`;
    else credit = `<span class="pl-credit"><b>Szukam zdjęcia w barwach Barçy…</b>Wikimedia Commons</span>`;
    return `${phHTML(p, 'big', 'square')}${Photo.has(p.id) ? '' : '<span class="pl-loading"></span>'}<span class="pl-bignum">${p.num}</span><span class="pl-shade"></span>${credit}`;
  }

  function renderPlayer(dir) {
    const p = byId[PV.list[PV.idx]];
    const root = $('#player');
    root.className = `player ${LINE_CLS[p.line]}`;
    $('#plBg').innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
    $('#plMedia').innerHTML = mediaHTML(p);
    $('#plBody').innerHTML = `
      <span class="pl-kicker">${esc(POS_NAMES[p.pos[0]] || p.pos[0])} · ${esc(p.nat)} · nr ${p.num}</span>
      <h2 class="pl-name" id="plName">${esc(p.name)}</h2>
      <div class="pl-pos">${p.pos.map((c, i) => `<span class="tag${i === 0 ? ' pri' : ''}">${c} · ${esc(POS_NAMES[c] || c)}</span>`).join('')}</div>
      ${roleBlock(p)}
      <div class="pl-grid">
        <div>
          <div class="pl-sec"><h4>Profil i rola w drużynie</h4><p>${esc(p.role)}</p><p class="muted">${esc(p.alt)}</p></div>
          <div class="pl-sec"><h4>Mocne strony</h4><div class="tags">${p.traits.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
          <div class="pl-sec"><h4>Etykiety</h4><div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
        </div>
        <div class="pl-mini">${miniBoard(p)}<small>Kolor: pozycja główna. Białe: alternatywne.</small></div>
      </div>`;
    const n = PV.list.length;
    $('#plPrev em').textContent = byId[PV.list[(PV.idx - 1 + n) % n]].name;
    $('#plNext em').textContent = byId[PV.list[(PV.idx + 1) % n]].name;
    Photo.apply(root);
    $('#plBody').scrollTop = 0;
    if (hasGsap && !reduced) {
      const nameSplit = window.SplitText ? new SplitText('#plName', { type: 'lines,chars', linesClass: 'split-line', charsClass: 'split-char' }) : null;
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      if (nameSplit) tl.from(nameSplit.chars, { yPercent: 110, duration: 1, stagger: 0.025 }, 0.15);
      tl.from('.pl-kicker, .pl-pos, .pl-role, .pl-grid', { y: 30, opacity: 0, duration: 0.9, stagger: 0.07 }, 0.25)
        .from('#plMedia .ph', { scale: 1.18, xPercent: dir ? dir * 8 : 0, duration: 1.4 }, 0)
        .from('.pl-bignum', { yPercent: 30, opacity: 0, duration: 1.2 }, 0.1)
        .from('#plBg i', { scaleY: 0, transformOrigin: '50% 0%', duration: 1.1, stagger: 0.04 }, 0);
    }
  }

  function openPlayer(pid, list, e) {
    if (!byId[pid]) return;
    PV.list = list && list.includes(pid) ? list : SQUAD.map((p) => p.id);
    PV.idx = PV.list.indexOf(pid);
    const root = $('#player');
    const first = !PV.open;
    if (first) PV.focus = document.activeElement;
    PV.open = true;
    root.hidden = false;
    lockScroll(true);
    renderPlayer(0);
    if (first && hasGsap && !reduced) {
      const x = e && e.clientX ? e.clientX : innerWidth / 2, y = e && e.clientY ? e.clientY : innerHeight / 2;
      PV.origin = [x, y];
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      gsap.fromTo(root, { clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${r + 20}px at ${x}px ${y}px)`, duration: 0.9, ease: 'expo.inOut', clearProps: 'clipPath' });
    }
    $('#plClose').focus({ preventScroll: true });
  }
  function closePlayer() {
    if (!PV.open) return;
    PV.open = false;
    const root = $('#player');
    const done = () => { root.hidden = true; if (!sheetOpen) lockScroll(false); if (PV.focus) PV.focus.focus({ preventScroll: true }); };
    if (hasGsap && !reduced) {
      const [x, y] = PV.origin;
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      gsap.fromTo(root, { clipPath: `circle(${r + 20}px at ${x}px ${y}px)` }, { clipPath: `circle(0px at ${x}px ${y}px)`, duration: 0.7, ease: 'expo.inOut', onComplete: () => { gsap.set(root, { clearProps: 'clipPath' }); done(); } });
    } else done();
  }
  function stepPlayer(dir) {
    const n = PV.list.length;
    PV.idx = (PV.idx + dir + n) % n;
    if (hasGsap && !reduced) {
      gsap.to('#plBody > *, #plMedia', { opacity: 0, x: -30 * dir, duration: 0.25, stagger: 0.02, ease: 'power2.in', onComplete: () => { gsap.set('#plBody > *, #plMedia', { clearProps: 'opacity,transform' }); renderPlayer(dir); } });
    } else renderPlayer(dir);
  }

  function initPlayer() {
    $('#plClose').addEventListener('click', closePlayer);
    $('#plPrev').addEventListener('click', () => stepPlayer(-1));
    $('#plNext').addEventListener('click', () => stepPlayer(1));
    document.addEventListener('keydown', (e) => {
      if (PV.open) {
        if (e.key === 'Escape') closePlayer();
        else if (e.key === 'ArrowLeft') stepPlayer(-1);
        else if (e.key === 'ArrowRight') stepPlayer(1);
        else if (e.key === 'Tab') {
          const f = $$('#player button, #player a[href]').filter((el) => el.offsetParent !== null);
          if (f.length && e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (f.length && !e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      } else if (sheetOpen && e.key === 'Escape') closeSheet();
    });
    // otwieranie z chipów / list w tabeli i karcie pozycji
    document.addEventListener('click', (e) => {
      const c = e.target.closest('[data-open]');
      if (!c) return;
      const scope = c.closest('tr, .sheet-panel') || document;
      openPlayer(c.dataset.open, $$('[data-open]', scope).map((x) => x.dataset.open), e);
    });
    // paralaksa zdjęcia
    if (finePointer && hasGsap && !reduced) {
      $('#player').addEventListener('mousemove', (e) => {
        const ph = $('#plMedia .ph');
        if (!ph) return;
        gsap.to(ph, { x: (e.clientX / innerWidth - 0.5) * -24, y: (e.clientY / innerHeight - 0.5) * -16, duration: 1, ease: 'power3' });
      });
    }
    // swipe na telefonie
    let sx = null;
    $('#player').addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    $('#player').addEventListener('touchend', (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 80) stepPlayer(dx < 0 ? 1 : -1);
      sx = null;
    });
    // gdy zdjęcie dotrze, odśwież otwarty profil
    Photo.on((id) => {
      if (PV.open && PV.list[PV.idx] === id) {
        $('#plMedia').innerHTML = mediaHTML(byId[id]);
        Photo.apply($('#plMedia'));
      }
    });
  }

  /* ======================================================================
     Zmiana orientacji tablicy
     ====================================================================== */
  function initResize() {
    let v = tacVertical(), tmr;
    addEventListener('resize', () => {
      clearTimeout(tmr);
      tmr = setTimeout(() => {
        if (tacVertical() === v) return;
        v = tacVertical();
        stopPlay();
        renderTacPitch();
        layoutTokens(false);
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      }, 150);
    });
  }

  /* ======================================================================
     Start
     ====================================================================== */
  const safe = (fn) => { try { fn(); } catch (err) { console.error(err); } };
  [initScroll, initCursor, initHero, initPositions, initTactics, initRoster, initPlayer, initChapterReveals, initResize, () => Photo.init()].forEach(safe);
  window.__btReady = true;
  if (document.fonts && window.ScrollTrigger) document.fonts.ready.then(() => { ScrollTrigger.refresh(); moveBar(false); });
})();
