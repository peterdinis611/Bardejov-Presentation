import { duckDusk, duskWanted, setDusk, syncDuskButton } from './dusk.js';
import { loadCyrillicFonts } from './fonts.js';
import { wireHere, ZONE_CHAPTER } from './here.js';
import './styles.css';
import { hasLocale, I18N, LANGS, loadLocale } from './lang.js';
import { registerPwa } from './pwa.js';
import { jsonLdFromPack, langFromPathname, langUrl, OG_LOCALE } from './seo.js';
import { siteUrl } from './site.js';
import { createSpeech } from './speech.js';
import { wireThen } from './then.js';
import { createTown } from './town.js';
import { createWalk, ITERS } from './walk.js';

/* Bardejov — dusk walk through a live UNESCO square */
(() => {
  let THREE = null;
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE = window.matchMedia('(max-width: 1080px), (pointer: coarse)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [].slice.call((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const asset = (path) => `${import.meta.env.BASE_URL}${path}`;

  const root = document.documentElement;
  const nav = $('#nav');
  const preEl = $('#pre');
  const preFill = $('#pre-fill');
  const prePct = $('#pre-pct');
  const preHint = $('#pre-hint');
  const PLACES = {
    square: { lat: 'FORUM', year: '1376', photo: asset('assets/square.jpg') },
    hall: { lat: 'CURIA', year: '1505', photo: asset('assets/radnica.jpg') },
    basilica: { lat: 'BASILICA', year: '15. st.', photo: asset('assets/basilica.jpg') },
    walls: { lat: 'MOENIA', year: '14.–16. st.', photo: asset('assets/walls.jpg') },
    synagogue: { lat: 'SYNAGOGA', year: '18. st.', photo: asset('assets/synagogue.jpg') },
    mikve: { lat: 'MIQVEH', year: 'suterén', photo: asset('assets/synagogue.jpg') },
    midrash: { lat: 'BETH HAMIDRASH', year: '18. st.', photo: asset('assets/synagogue.jpg') },
    spa: { lat: 'AQUAE', year: 'pramene', photo: asset('assets/spa.jpg') },
  };
  const GUILDS = {
    weavers: { lat: 'TEXTORES', year: '1480', photo: asset('assets/houses.jpg') },
    potters: { lat: 'FIGULI', year: 'oltár', photo: asset('assets/houses.jpg') },
    tailors: { lat: 'SUTORES', year: '1480', photo: asset('assets/radnica.jpg') },
    carpenters: { lat: 'FABRI', year: '1500', photo: asset('assets/radnica.jpg') },
    masons: { lat: 'CAEMENTARII', year: '1480', photo: asset('assets/walls.jpg') },
    furriers: { lat: 'PELLIONES', year: 'cesta', photo: asset('assets/houses.jpg') },
    gold: { lat: 'AURIFABRI', year: 'erb', photo: asset('assets/radnica.jpg') },
    sieves: { lat: 'CRIBRARII', year: '1485', photo: asset('assets/basilica.jpg') },
    farmers: { lat: 'AGRICOLAE', year: '1480', photo: asset('assets/basilica.jpg') },
  };
  const ALTARS = {
    andrew: { lat: 'ANDREAS', year: '1440–1460', photo: asset('assets/altars/andrew.jpg') },
    barbara: { lat: 'BARBARA', year: '1450–1470', photo: asset('assets/altars/barbara.jpg') },
    elisabeth: { lat: 'ELISABETH', year: '1480', photo: asset('assets/altars/elisabeth.jpg') },
    ann: { lat: 'ANNA', year: '1485', photo: asset('assets/altars/ann.jpg') },
    mager: { lat: 'VIRGO', year: '1489', photo: asset('assets/altars/mager.jpg') },
    cross: { lat: 'CRUX', year: '1480–1490', photo: asset('assets/altars/cross.jpg') },
    pieta: { lat: 'PIETAS', year: '1480–1490', photo: asset('assets/altars/pieta.jpg') },
    apollonia: { lat: 'APOLLONIA', year: '1485', photo: asset('assets/altars/apollonia.jpg') },
    nativity: { lat: 'NATIVITAS', year: '1480–1490', photo: asset('assets/altars/nativity.jpg') },
    erasmus: { lat: 'ERASMUS', year: 'cech', photo: asset('assets/altars/erasmus.jpg') },
    sorrows: { lat: 'VIR DOLORUM', year: '1500–1510', photo: asset('assets/altars/sorrows.jpg') },
  };
  const ERAS = {
    1241: { lat: 'TATARI', year: '1241', photo: asset('assets/square.jpg') },
    1365: { lat: 'IUS GLADII', year: '1365', photo: asset('assets/radnica.jpg') },
    1376: { lat: 'CIVITAS', year: '1376', photo: asset('assets/square.jpg') },
    1505: { lat: 'CURIA', year: '1505', photo: asset('assets/radnica.jpg') },
    '18c': { lat: 'SUBURBIUM', year: 'XVIII', photo: asset('assets/synagogue.jpg') },
    2000: { lat: 'UNESCO', year: '2000', photo: asset('assets/square-wide.jpg') },
  };
  const TOUR_PATH = [
    { at: 0, p: [0.2, 3.5, 8.8], t: [0, 4.2, -8], fov: 38, lat: 'FORUM' },
    { at: 7, p: [-4.8, 2.3, 4.6], t: [0.1, 2.6, -1.1], fov: 44, lat: 'CURIA' },
    { at: 15, p: [1.4, 5.2, 2.4], t: [0, 7.4, -12], fov: 36, lat: 'BASILICA' },
    { at: 23, p: [8.8, 3.8, -1.2], t: [-2, 2.8, -8], fov: 42, lat: 'MOENIA' },
    { at: 32, p: [0.15, 3.55, 8.6], t: [0, 4.4, -9], fov: 38, lat: 'CIVITAS' },
  ];
  let lang = 'sk';
  let iterKey = '2h';
  let sheetId = null;
  let wxSnap = null;
  let hereApi = null;
  const spokeZones = (() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('bv-spoke') || '[]'));
    } catch {
      return new Set();
    }
  })();
  const TOUR_LEN = 32000;
  const cursor = $('#cursor');

  function vpW() {
    return Math.max(1, Math.round(window.visualViewport?.width || window.innerWidth));
  }
  function vpH() {
    return Math.max(1, Math.round(window.visualViewport?.height || window.innerHeight));
  }
  function setVW() {
    root.style.setProperty('--vw', `${vpW()}px`);
  }

  let load = 0;
  function setLoad(n) {
    load = Math.max(load, Math.min(100, n | 0));
    preFill.style.right = `${100 - load}%`;
    prePct.textContent = String(load);
    preEl.style.setProperty('--p', `${load}%`);
    if (preHint) {
      const hints = pack().hints || [];
      const marks = [0, 24, 48, 72, 90];
      let text = hints[0] || '';
      marks.forEach((m, i) => {
        if (load >= m && hints[i]) text = hints[i];
      });
      if (preHint.textContent !== text) preHint.textContent = text;
    }
  }

  /* -------------------------------------------------------------- Three.js */
  const canvas = $('#gl');
  let renderer,
    scene,
    camera,
    lanterns = [];
  let moon;
  let curveP;
  const RIG = { prog: 0, smooth: 0, mx: 0, my: 0, tmx: 0, tmy: 0, intro: 0 };
  const GWALL = {
    x: 0,
    user: 0,
    primed: false,
    root: null,
    track: null,
    moved: 0,
    drift: true,
    sways: null,
    gust: null,
    aim: null,
  };
  const ROOD = { x: 0, user: 0, primed: false, root: null, track: null, moved: 0, drift: false };
  const CAM = [
    { p: [0.15, 3.55, 8.6], t: [0.0, 4.4, -9.0], fov: 38 },
    { p: [-3.8, 2.25, 5.2], t: [0.6, 3.2, -3.4], fov: 46 },
    { p: [6.8, 3.05, 1.6], t: [-1.4, 3.0, -8.2], fov: 42 },
    { p: [-0.8, 2.05, -1.2], t: [0.2, 6.2, -14.0], fov: 40 },
    { p: [-7.4, 3.2, 2.8], t: [-1.6, 2.4, -5.2], fov: 44 },
    { p: [0.2, 13.6, 1.2], t: [0.0, 0.4, -8.0], fov: 50 },
    { p: [0.0, 8.6, 4.4], t: [0.0, 3.8, -10.0], fov: 44 },
    { p: [1.6, 11.2, 10.4], t: [0.0, 1.8, -6.0], fov: 48 },
  ];

  /* -------------------------------------------------------------- walk: sheet, tour, speech */
  let sheetOpen = false,
    touring = false,
    tourT0 = 0,
    lastCaption = '';
  const HOT_DEF = [
    { place: 'hall', p: [0, 2.7, 0.15] },
    { place: 'basilica', p: [0, 9.6, -8.5] },
    { place: 'walls', p: [-10.2, 2.6, 6.4] },
  ];
  let hotVecs = [];
  let _look, _hp;

  function pack() {
    const all = I18N || {};
    return (
      all[lang] ||
      all.sk || {
        ui: {},
        cat: {},
        voice: {},
        tour: [],
        hints: [],
        iters: {},
        wx: {},
        hours: {},
        meta: {},
      }
    );
  }
  function fallbackPack() {
    return I18N?.sk || pack();
  }
  function ui(key) {
    const a = pack().ui || {};
    const b = fallbackPack().ui || {};
    return a[key] != null ? a[key] : b[key] || '';
  }
  function fmt(s, data) {
    if (!s) return '';
    return String(s).replace(/\{(\w+)\}/g, (_, k) => (data[k] != null ? data[k] : ''));
  }
  function locale() {
    const list = LANGS || [];
    const found = list.find((l) => l.id === lang);
    return found?.locale || 'sk-SK';
  }
  function catalog(id) {
    const base = PLACES[id] || GUILDS[id] || ALTARS[id] || ERAS[id];
    if (!base) return null;
    const extra = pack().cat?.[id] || fallbackPack().cat?.[id] || {};
    return Object.assign({}, base, extra);
  }
  function tourStep(i) {
    const base = TOUR_PATH[i] || {};
    const extra = pack().tour?.[i] || fallbackPack().tour?.[i] || {};
    return Object.assign({}, base, extra);
  }
  function iterData(key) {
    const base = ITERS[key] || ITERS['2h'];
    const rows = pack().iters?.[key] || fallbackPack().iters?.[key] || [];
    return Object.assign({}, base, {
      stops: rows.map((s, i) => [s[0], s[1], base.ids[i]]),
    });
  }
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  }

  const {
    speakLine,
    speakChapter,
    stopSpeech,
    warmVoices,
    labelSpeakButtons,
    playingKey,
    resetVoice,
  } = createSpeech({
    $$,
    duckDusk,
    getLang: () => lang,
    locale,
    pack,
    fallbackPack,
    ui,
    goToId,
    isTouring: () => touring,
    endTour,
  });
  const { paintHoursAndWx, loadWeather, iterFromQuery, shareIter, setIter } = createWalk({
    $,
    $$,
    pack,
    fallbackPack,
    fmt,
    ui,
    getLang: () => lang,
    getIterKey: () => iterKey,
    setIterKey: (k) => {
      iterKey = k;
    },
    getWxSnap: () => wxSnap,
    setWxSnap: (v) => {
      wxSnap = v;
    },
    openSheet,
    iterData,
  });

  function openSheet(id, compact) {
    const d = catalog(id);
    if (!d) return;
    sheetId = id;
    const sheet = $('#sheet');
    const img = $('#sheet-img');
    img.src = d.photo || asset('assets/square.jpg');
    img.alt = d.title;
    $('#sheet-lat').textContent = d.lat || '';
    $('#sheet-yr').textContent = d.year || '';
    $('#sheet-title').textContent = d.title;
    $('#sheet-lead').textContent = d.lead || '';
    $('#sheet-copy').textContent = d.body || '';
    $('#sheet-mins').textContent = d.mins || '';
    $('#sheet-how').textContent = d.how || '';
    sheet.classList.toggle('compact', !!compact);
    sheet.classList.add('on');
    sheet.setAttribute('aria-hidden', 'false');
    sheetOpen = true;
    document.documentElement.classList.add('is-sheet');
  }
  function closeSheet() {
    const sheet = $('#sheet');
    if (!sheet) return;
    sheet.classList.remove('on');
    sheet.setAttribute('aria-hidden', 'true');
    sheetOpen = false;
    sheetId = null;
    document.documentElement.classList.remove('is-sheet');
  }

  async function startTour() {
    if (touring) return;
    closeNav();
    if (!renderer && !document.body.classList.contains('no-webgl')) {
      try {
        await ensureGL();
      } catch (err) {
        console.warn(err);
        document.body.classList.add('no-webgl');
      }
    }
    if (!renderer || document.body.classList.contains('no-webgl')) {
      openSheet('square');
      return;
    }
    closeSheet();
    touring = true;
    tourT0 = performance.now();
    lastCaption = '';
    $('#tour').hidden = false;
    document.documentElement.classList.add('is-tour');
  }
  function endTour() {
    touring = false;
    $('#tour').hidden = true;
    document.documentElement.classList.remove('is-tour');
    const fill = $('#tour-fill');
    if (fill) fill.style.width = '0%';
    stopSpeech();
  }
  function tickTour(now) {
    if (!touring || !camera) return false;
    if (!_look) _look = new THREE.Vector3();
    const elapsed = now - tourT0;
    const u = clamp(elapsed / TOUR_LEN, 0, 1);
    const fill = $('#tour-fill');
    if (fill) fill.style.width = `${u * 100}%`;
    let a = tourStep(0),
      b = tourStep(TOUR_PATH.length - 1);
    for (let i = 0; i < TOUR_PATH.length - 1; i++) {
      if (elapsed <= TOUR_PATH[i + 1].at * 1000) {
        a = tourStep(i);
        b = tourStep(i + 1);
        break;
      }
    }
    const span = Math.max(1, (b.at - a.at) * 1000);
    const t = easeInOut(clamp((elapsed - a.at * 1000) / span, 0, 1));
    camera.position.set(lerp(a.p[0], b.p[0], t), lerp(a.p[1], b.p[1], t), lerp(a.p[2], b.p[2], t));
    _look.set(lerp(a.t[0], b.t[0], t), lerp(a.t[1], b.t[1], t), lerp(a.t[2], b.t[2], t));
    camera.lookAt(_look);
    camera.fov = lerp(a.fov, b.fov, t);
    camera.aspect = vpW() / vpH();
    camera.updateProjectionMatrix();
    if (a.title !== lastCaption) {
      lastCaption = a.title;
      $('#tour-lat').textContent = a.lat;
      $('#tour-title').textContent = a.title;
      $('#tour-k').textContent = a.k;
      speakLine(`${a.title}. ${a.k || ''}`, 'tour');
    }
    if (u >= 1) endTour();
    return true;
  }

  function initHots() {
    if (!THREE) return;
    hotVecs = HOT_DEF.map((h) => ({
      place: h.place,
      v: new THREE.Vector3(h.p[0], h.p[1], h.p[2]),
      el: $(`.hot[data-place="${h.place}"]`),
    })).filter((h) => h.el);
  }
  function coverHots() {
    return ['#then', '.plots-head', '#plots'].some((sel) => {
      const el = $(sel);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top < vpH() - 80 && r.bottom > 96;
    });
  }
  function updateHots() {
    const wrap = $('#hots');
    if (!wrap || !camera || !hotVecs.length) return;
    if (!_hp) _hp = new THREE.Vector3();
    const show =
      !touring &&
      !sheetOpen &&
      RIG.smooth < 1.65 &&
      !coverHots() &&
      !document.body.classList.contains('no-webgl');
    wrap.classList.toggle('show', show);
    hotVecs.forEach((h) => {
      _hp.copy(h.v).project(camera);
      const x = (_hp.x * 0.5 + 0.5) * vpW();
      const y = (-_hp.y * 0.5 + 0.5) * vpH();
      const vis =
        show && _hp.z > -1 && _hp.z < 1 && x > 48 && x < vpW() - 48 && y > 90 && y < vpH() - 90;
      h.el.style.left = `${x}px`;
      h.el.style.top = `${y}px`;
      h.el.style.opacity = vis ? '1' : '0';
      h.el.style.pointerEvents = vis ? 'auto' : 'none';
    });
  }

  function enterZone(zone) {
    const chapter = ZONE_CHAPTER[zone?.id];
    if (!chapter || spokeZones.has(zone.id)) return;
    spokeZones.add(zone.id);
    try {
      sessionStorage.setItem('bv-spoke', JSON.stringify([...spokeZones]));
    } catch {}
    speakChapter(chapter, false);
  }

  function navIndex(sec) {
    const id = SECS[sec]?.id;
    if (id === 'gate') return 0;
    if (id === 'pathways') return 1;
    if (id === 'lessons') return 2;
    if (id === 'suburb') return 3;
    if (id === 'walk') return 4;
    if (id === 'eternity') return 5;
    return -1;
  }

  let glPending = null;
  async function ensureGL() {
    if (renderer || document.body.classList.contains('no-webgl')) return;
    if (!glPending) {
      glPending = (async () => {
        if (!THREE) THREE = await import('three');
        initGL();
      })().catch((err) => {
        glPending = null;
        throw err;
      });
    }
    await glPending;
  }

  let townApi = null;
  function initGL() {
    if (!THREE) throw new Error('three missing');
    townApi = createTown({
      THREE,
      canvas,
      MOBILE,
      REDUCE,
      vpW,
      vpH,
      clamp,
      lerp,
      CAM,
      setLoad,
      RIG,
    });
    renderer = townApi.renderer;
    scene = townApi.scene;
    camera = townApi.camera;
    lanterns = townApi.lanterns;
    moon = townApi.moon;
    curveP = townApi.curveP;
    initHots();
  }

  function applyCam(u) {
    townApi?.applyCam(u);
  }

  /* -------------------------------------------------------------- page */
  const SECS = $$('[data-cam]');
  let anchors = [],
    maxScroll = 1,
    activeSec = 0,
    lastY = 0;

  function measure() {
    setVW();
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vpH());
    anchors = SECS.map((el, i) => {
      if (i === 0) return 0;
      if (i === SECS.length - 1) return maxScroll;
      return clamp(el.offsetTop + el.offsetHeight * 0.22 - vpH() * 0.22, 0, maxScroll);
    });
    for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
  }
  function progressFor(y) {
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++)
      if (y <= anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    return anchors.length - 1;
  }

  function resetWordReveal() {
    $$('.word-reveal').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const phrase = (key ? ui(key) : '') || el.getAttribute('aria-label') || '';
      delete el.dataset.wordReady;
      el.classList.remove('word-reveal');
      el.removeAttribute('aria-label');
      el.textContent = phrase;
    });
  }
  function setHead(sel, attr, val) {
    const el = document.querySelector(sel);
    if (el && val) el.setAttribute(attr, val);
  }
  function applySeo(metaPack, spec) {
    const SITE = siteUrl();
    const pageUrl = langUrl(SITE, lang);
    const cover = `${SITE}assets/square.jpg`;
    if (metaPack.title) document.title = metaPack.title;
    setHead('meta[name="description"]', 'content', metaPack.description);
    setHead('meta[name="keywords"]', 'content', metaPack.keywords);
    setHead('meta[property="og:site_name"]', 'content', metaPack.siteName);
    setHead('meta[property="og:locale"]', 'content', OG_LOCALE[lang] || 'sk_SK');
    setHead('meta[property="og:title"]', 'content', metaPack.title);
    setHead('meta[property="og:description"]', 'content', metaPack.description);
    setHead('meta[property="og:url"]', 'content', pageUrl);
    setHead('meta[property="og:image"]', 'content', cover);
    setHead('meta[property="og:image:alt"]', 'content', metaPack.imageAlt);
    setHead('link[rel="image_src"]', 'href', cover);
    setHead('meta[name="twitter:title"]', 'content', metaPack.title);
    setHead('meta[name="twitter:description"]', 'content', metaPack.description);
    setHead('meta[name="twitter:image"]', 'content', cover);
    setHead('meta[name="twitter:image:alt"]', 'content', metaPack.imageAlt);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', pageUrl);
    setHead('link[rel="tdm-policy"]', 'href', `${SITE}tdm-policy.txt`);
    setHead('link[rel="sitemap"]', 'href', `${SITE}sitemap.xml`);
    $$('link[rel="alternate"][hreflang]').forEach((el) => {
      const hl = el.getAttribute('hreflang');
      el.setAttribute(
        'href',
        hl === 'x-default' || hl === 'sk' ? langUrl(SITE, 'sk') : langUrl(SITE, hl)
      );
    });
    const ld = document.getElementById('ld-json');
    if (ld) ld.textContent = JSON.stringify(jsonLdFromPack(SITE, lang, pack(), spec?.html || lang));
  }
  function applyI18n() {
    const shown = $$('.rv-in');
    resetWordReveal();
    $$('[data-i18n]').forEach((el) => {
      const v = ui(el.getAttribute('data-i18n'));
      if (!v) return;
      const attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, v);
      else el.textContent = v;
    });
    const metaPack = pack().meta || fallbackPack().meta || {};
    const spec = (LANGS || []).find((l) => l.id === lang);
    applySeo(metaPack, spec);
    document.documentElement.lang = spec?.html || lang;
    const now = $('#lingua-now');
    if (now) now.textContent = spec?.label || (lang || 'sk').toUpperCase();
    const flag = $('#lingua-flag');
    if (flag) {
      flag.className = 'flag';
      const fromList = document.querySelector(`#lingua-list [data-lang="${lang}"] img.flag`);
      if (fromList?.src) flag.src = fromList.src;
    }
    $$('#lingua-list [data-lang]').forEach((el) => {
      el.setAttribute('aria-selected', el.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    const lingua = $('#lingua');
    const linguaBtn = $('#lingua-btn');
    if (lingua) lingua.setAttribute('aria-label', ui('lingua'));
    if (linguaBtn) {
      const nm = spec?.name || '';
      linguaBtn.setAttribute('aria-label', ui('lingua') + (nm ? ` — ${nm}` : ''));
    }
    const burger = $('.nav-burger');
    if (burger) burger.setAttribute('aria-label', ui('menu'));
    labelSpeakButtons();
    const peek = $('#tour-btn');
    if (peek) peek.setAttribute('aria-label', ui('peekAria'));
    const prev = $('#tape-prev');
    if (prev) prev.setAttribute('aria-label', ui('tapePrev'));
    const next = $('#tape-next');
    if (next) next.setAttribute('aria-label', ui('tapeNext'));
    const close = $('.sheet-x');
    if (close) close.setAttribute('aria-label', ui('sheetClose'));
    const rise = $('#rise');
    if (rise) rise.setAttribute('aria-label', ui('toTop'));
    const share = $('#iter-share');
    if (share && !share.classList.contains('is-done')) share.textContent = ui('shareIter');
    syncDuskButton($('#snd'), { on: ui('soundOn'), off: ui('soundOff') });
    if (hereApi) hereApi.refresh();
    $$('#rail button').forEach((b, i) => {
      b.setAttribute('aria-label', `${ui('chapter')} ${i}`);
    });
    const guildKeys = {
      weavers: 'gWeavers',
      potters: 'gPotters',
      tailors: 'gTailors',
      carpenters: 'gCarp',
      masons: 'gMasons',
      furriers: 'gFur',
      gold: 'gGold',
      sieves: 'gSieves',
      farmers: 'gFarm',
    };
    $$('[data-guild]').forEach((el) => {
      const k = guildKeys[el.getAttribute('data-guild')];
      if (k) el.setAttribute('aria-label', `${ui(k)} — ${ui('gldOpen')}`);
    });
    $$('[data-i18n-ext]').forEach((a) => {
      const name = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (name) a.setAttribute('aria-label', `${name} — ${ui('extNew')}`);
    });
    splitHeadingWords();
    shown.forEach((el) => {
      if (el.isConnected) el.classList.add('rv-in');
    });
    $$('#hero .mask-line, #hero [data-rv]').forEach((el) => {
      el.classList.add('rv-in');
    });
    $$('.word-reveal.rv-in .word').forEach((w) => {
      w.style.transition = 'none';
    });
  }
  function detectLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && hasLocale(q)) return q;
    const pathLang = langFromPathname(location.pathname);
    if (pathLang && hasLocale(pathLang)) return pathLang;
    try {
      const saved = localStorage.getItem('bv-lang');
      if (saved && hasLocale(saved)) return saved;
    } catch {}
    const n = (navigator.language || 'sk').toLowerCase();
    if (n.startsWith('cs')) return 'cs';
    if (n.startsWith('en')) return 'en';
    if (n.startsWith('pl')) return 'pl';
    if (n.startsWith('hu')) return 'hu';
    if (n.startsWith('uk')) return 'uk';
    return 'sk';
  }
  async function setLang(id) {
    if (!hasLocale(id)) return;
    await loadLocale(id);
    if (id === 'uk') loadCyrillicFonts();
    lang = id;
    try {
      localStorage.setItem('bv-lang', id);
    } catch {}
    const resume = playingKey();
    stopSpeech();
    resetVoice();
    applyI18n();
    paintHoursAndWx();
    setIter(iterKey);
    if (hereApi) hereApi.refresh();
    if (sheetOpen && sheetId) openSheet(sheetId, $('#sheet')?.classList.contains('compact'));
    if (touring) lastCaption = '';
    if (resume) speakChapter(resume, false);
  }
  function setLinguaOpen(open) {
    const box = $('#lingua');
    const btn = $('#lingua-btn');
    if (!box || !btn) return;
    box.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      const sel = $('#lingua-list [aria-selected="true"]');
      if (sel) sel.focus();
    }
  }
  async function wireLang() {
    lang = detectLang();
    await loadLocale(lang);
    if (lang === 'uk') loadCyrillicFonts();
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q && hasLocale(q)) localStorage.setItem('bv-lang', q);
    } catch {}
    applyI18n();
    const box = $('#lingua');
    const btn = $('#lingua-btn');
    if (!box || !btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setLinguaOpen(!box.classList.contains('open'));
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setLinguaOpen(true);
      }
    });
    $$('#lingua-list [data-lang]').forEach((el) => {
      el.addEventListener('click', () => {
        setLang(el.getAttribute('data-lang'));
        setLinguaOpen(false);
        btn.focus();
      });
      el.addEventListener('keydown', (e) => {
        const opts = $$('#lingua-list [data-lang]');
        const i = opts.indexOf(el);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          opts[(i + 1) % opts.length].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          opts[(i - 1 + opts.length) % opts.length].focus();
        } else if (e.key === 'Home') {
          e.preventDefault();
          opts[0].focus();
        } else if (e.key === 'End') {
          e.preventDefault();
          opts[opts.length - 1].focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setLinguaOpen(false);
          btn.focus();
        } else if (e.key === 'Tab') {
          setLinguaOpen(false);
        }
      });
    });
    document.addEventListener('click', (e) => {
      if (!box.contains(e.target)) setLinguaOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && box.classList.contains('open')) {
        setLinguaOpen(false);
        btn.focus();
      }
    });
  }

  function splitHeadingWords() {
    if (REDUCE) return;
    $$('h1.display, h2.display').forEach((heading) => {
      const lines = heading.querySelectorAll('.mask-line');
      const targets = lines.length ? [].slice.call(lines) : [heading];
      targets.forEach((target) => {
        if (target.dataset.wordReady === 'true') return;
        const phrase = target.textContent.replace(/\s+/g, ' ').trim();
        if (!phrase) return;
        target.dataset.wordReady = 'true';
        target.classList.add('word-reveal');
        target.setAttribute('aria-label', phrase);
        target.textContent = '';
        phrase.split(' ').forEach((word, i) => {
          if (i) target.appendChild(document.createTextNode(' '));
          const mask = document.createElement('span');
          const inner = document.createElement('span');
          mask.className = 'word-mask';
          mask.setAttribute('aria-hidden', 'true');
          inner.className = 'word';
          inner.textContent = word;
          inner.style.setProperty('--word-delay', `${i * 72}ms`);
          mask.appendChild(inner);
          target.appendChild(mask);
        });
      });
    });
  }

  function wireReveals() {
    splitHeadingWords();
    const items = $$('[data-rv], .mask-line');
    items.forEach((el, i) => {
      el.dataset.rvd = String((i % 6) * 70);
    });
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          const d = parseFloat(e.target.dataset.rvd || 0);
          setTimeout(() => e.target.classList.add('rv-in'), REDUCE ? 0 : d);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.04 }
    );
    items.forEach((el) => {
      if (!el.closest('#hero')) io.observe(el);
    });
    requestAnimationFrame(() => {
      $$('#hero [data-rv], #hero .mask-line').forEach((el) => {
        el.classList.add('rv-in');
      });
    });
  }

  function wireForeground() {
    const pairs = $$('.sec .fg, .foot .fg')
      .map((stage) => ({
        section: stage.closest('.sec, .foot'),
        stage,
      }))
      .filter((p) => p.section);
    const sky = $('#fg-sky');
    if (!pairs.length || !sky) return;
    const homes = new WeakMap(pairs.map((p) => [p.stage, p.section]));
    let active = null;
    const lift = (stage) => {
      if (stage.parentNode !== sky) sky.appendChild(stage);
    };
    const park = (stage) => {
      const home = homes.get(stage);
      if (home && stage.parentNode !== home) home.insertBefore(stage, home.firstChild);
    };
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          const pair = pairs.find((p) => p.section === e.target);
          if (!pair) return;
          if (e.isIntersecting && e.intersectionRatio > 0.28) {
            if (active && active !== pair.stage) {
              active.classList.remove('fg-active');
              active.classList.add('fg-retiring');
              const old = active;
              setTimeout(() => {
                old.classList.remove('fg-retiring');
                park(old);
              }, 900);
            }
            lift(pair.stage);
            pair.stage.classList.add('fg-active');
            pair.stage.classList.remove('fg-retiring');
            active = pair.stage;
          }
        });
      },
      { threshold: [0.28, 0.5] }
    );
    pairs.forEach((p) => {
      io.observe(p.section);
    });
  }

  function wireRail() {
    const rail = $('#rail');
    SECS.forEach((el, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<i></i>';
      b.setAttribute('aria-label', `${ui('chapter')} ${i}`);
      b.addEventListener('click', () =>
        el.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' })
      );
      rail.appendChild(b);
    });
  }

  function wireRise() {
    const rise = $('#rise');
    if (!rise) return;
    rise.addEventListener('click', () => {
      closeNav();
      goToId('top');
      try {
        history.replaceState(null, '', '#top');
      } catch {}
    });
  }

  function syncRise(y) {
    const rise = $('#rise');
    if (!rise) return;
    const threshold = Math.min(420, vpH() * 0.42);
    rise.classList.toggle('on', y > threshold);
  }

  function wireNav() {
    const burger = $('.nav-burger');
    const links = $('#navlinks');
    burger.addEventListener('click', () => {
      setLinguaOpen(false);
      const open = nav.classList.toggle('menu-open');
      burger.classList.toggle('active', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.documentElement.classList.toggle('nav-open', open);
    });
    $$('.nav-link', links).forEach((a) => {
      a.addEventListener('click', () => {
        closeNav();
      });
    });
    $$('.nav-speak', links).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeNav();
        speakChapter(btn.getAttribute('data-speak'));
      });
    });
    $$('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const map = ['gate', 'pathways', 'lessons', 'walk', 'eternity'];
        goToId(map[chip.getAttribute('data-chip')]);
      });
    });
    const snd = $('#snd');
    if (snd) {
      syncDuskButton(snd, { on: ui('soundOn'), off: ui('soundOff') });
      snd.addEventListener('click', async () => {
        await setDusk(!snd.classList.contains('is-on'));
        syncDuskButton(snd, { on: ui('soundOn'), off: ui('soundOff') });
      });
      if (duskWanted()) {
        const arm = async () => {
          await setDusk(true);
          syncDuskButton(snd, { on: ui('soundOn'), off: ui('soundOff') });
        };
        for (const ev of ['pointerdown', 'touchstart', 'keydown']) {
          window.addEventListener(ev, arm, { once: true, passive: true });
        }
      }
    }
  }

  function openLesson(art) {
    if (!art?.classList.contains('les')) return;
    $$('.les').forEach((el) => {
      el.classList.remove('is-open');
      const row = $('.les-row', el);
      if (row) row.setAttribute('aria-expanded', 'false');
    });
    art.classList.add('is-open');
    const btn = $('.les-row', art);
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('menu-open');
    const burger = $('.nav-burger');
    if (burger) burger.classList.remove('active');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('nav-open');
  }
  function goToId(id, instant) {
    if (!id) return false;
    if (id === 'top') {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: instant || REDUCE ? 'auto' : 'smooth',
      });
      return true;
    }
    const el = document.getElementById(id);
    if (!el) return false;
    if (el.classList.contains('les')) openLesson(el);
    el.scrollIntoView({ behavior: instant || REDUCE ? 'auto' : 'smooth', block: 'start' });
    return true;
  }
  function wireAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = (a.getAttribute('href') || '').replace(/^#/, '');
        if (!id) return;
        if (!goToId(id)) return;
        e.preventDefault();
        closeNav();
        try {
          history.replaceState(null, '', `#${id}`);
        } catch {}
      });
    });
  }

  function wireCursor() {
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    window.addEventListener(
      'pointermove',
      (e) => {
        if (fine) cursor.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
        if (touring) return;
        RIG.tmx = (e.clientX / vpW()) * 2 - 1;
        RIG.tmy = (e.clientY / vpH()) * 2 - 1;
      },
      { passive: true }
    );
    if (!fine) return;
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle(
        'act',
        !!e.target.closest('[data-cursor], a, button, .chip, .les, .card')
      );
    });
  }

  function updateProgress() {
    const y = window.scrollY || 0;
    RIG.prog = progressFor(y);
    const sec = clamp(Math.round(RIG.prog), 0, SECS.length - 1);
    if (sec !== activeSec) {
      activeSec = sec;
      const ni = navIndex(sec);
      $$('.nav-link').forEach((a, i) => {
        a.classList.toggle('on', i === ni);
      });
      $$('.chip').forEach((c, i) => {
        const id = SECS[sec]?.id;
        const on =
          (i === 0 && id === 'gate') ||
          (i === 1 && id === 'pathways') ||
          (i === 2 && id === 'lessons') ||
          (i === 3 && id === 'walk') ||
          (i === 4 && id === 'eternity');
        c.classList.toggle('on', on);
      });
      $$('#rail button').forEach((b, i) => {
        b.classList.toggle('on', i === sec);
      });
    }
    nav.classList.toggle('stuck', y > 24);
    syncRise(y);
    return y;
  }
  function onScroll() {
    const y = updateProgress();
    nav.classList.toggle('hide', y > lastY + 8 && y > 120 && !nav.classList.contains('menu-open'));
    if (y < lastY - 4) nav.classList.remove('hide');
    lastY = y;
  }

  function wireTape() {
    const tape = $('#tape');
    const prev = $('#tape-prev');
    const next = $('#tape-next');
    if (!tape) return;
    const step = () => Math.max(220, Math.min(tape.clientWidth * 0.72, 340));
    const syncBtns = () => {
      const max = Math.max(0, tape.scrollWidth - tape.clientWidth - 2);
      if (prev) prev.disabled = tape.scrollLeft <= 2;
      if (next) next.disabled = tape.scrollLeft >= max;
    };
    if (prev)
      prev.addEventListener('click', () =>
        tape.scrollBy({ left: -step(), behavior: REDUCE ? 'auto' : 'smooth' })
      );
    if (next)
      next.addEventListener('click', () =>
        tape.scrollBy({ left: step(), behavior: REDUCE ? 'auto' : 'smooth' })
      );
    tape.addEventListener('scroll', syncBtns, { passive: true });
    tape.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaY) < 1 && Math.abs(e.deltaX) < 1) return;
        const goingH = Math.abs(e.deltaX) > Math.abs(e.deltaY);
        if (goingH) return;
        e.preventDefault();
        tape.scrollLeft += e.deltaY;
      },
      { passive: false }
    );
    let down = false,
      x0 = 0,
      sl = 0,
      moved = 0;
    tape.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true;
      moved = 0;
      x0 = e.clientX;
      sl = tape.scrollLeft;
      tape.classList.add('is-drag');
      try {
        tape.setPointerCapture(e.pointerId);
      } catch {}
    });
    tape.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - x0;
      moved = Math.max(moved, Math.abs(dx));
      tape.scrollLeft = sl - dx;
    });
    const endDrag = () => {
      down = false;
      tape.classList.remove('is-drag');
    };
    tape.addEventListener('pointerup', endDrag);
    tape.addEventListener('pointercancel', endDrag);
    $$('.ann', tape).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (moved > 8) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        openSheet(btn.getAttribute('data-era'), true);
      });
    });
    syncBtns();
    window.addEventListener('resize', syncBtns);
  }

  function stripMax(S) {
    if (!S.root || !S.track) return 0;
    return Math.max(0, S.track.scrollWidth - S.root.clientWidth);
  }

  function viewWalk(el) {
    const rail = el.getBoundingClientRect();
    const vh = vpH();
    if (rail.bottom < -80 || rail.top > vh + 80) return null;
    const start = vh * 0.82;
    const end = vh * 0.18;
    return clamp((start - rail.top) / Math.max(80, start - end), 0, 1);
  }

  function bindStrip(S, root, track) {
    S.root = root;
    S.track = track;
    S.x = 0;
    S.user = 0;
    S.primed = false;
    S.moved = 0;
    if (!root || !track) return;
    root.addEventListener(
      'wheel',
      (e) => {
        if (REDUCE) return;
        if (Math.abs(e.deltaY) < 1 && Math.abs(e.deltaX) < 1) return;
        e.preventDefault();
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const travel = Math.max(stripMax(S), S.drift ? Math.min(220, vpW() * 0.13) : 0);
        S.user = clamp(S.user - d, -travel - 48, travel + 48);
        S.hot = performance.now();
      },
      { passive: false }
    );
    let down = false,
      x0 = 0,
      u0 = 0;
    root.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true;
      S.moved = 0;
      x0 = e.clientX;
      u0 = S.user;
    });
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - x0;
      S.moved = Math.max(S.moved, Math.abs(dx));
      if (S.moved > 4) {
        S.user = u0 + dx;
        S.hot = performance.now();
      }
    };
    const endDrag = () => {
      down = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }

  function tickStrip(S) {
    const root = S.root;
    const track = S.track;
    if (!root || !track) return;
    if (REDUCE) {
      track.style.transform = '';
      return;
    }
    const walked = viewWalk(root);
    if (walked == null) return;
    const extra = stripMax(S);
    const travel = extra > 12 ? extra : S.drift ? Math.min(220, Math.max(88, vpW() * 0.13)) : 0;
    if (travel < 8 && !S.drift) return;
    const look = RIG.mx * (extra > 12 ? 22 : 36);
    const walkX = extra > 12 ? lerp(0, -travel, walked) : lerp(travel, -travel, walked);
    const minX = extra > 12 ? -travel : -travel;
    const maxX = extra > 12 ? 0 : travel;
    const aim = clamp(walkX - look + S.user, minX, maxX);
    if (!S.primed) {
      S.x = aim;
      S.primed = true;
    } else {
      const k = performance.now() - (S.hot || 0) < 120 ? 0.32 : 0.1;
      S.x += (aim - S.x) * k;
    }
    track.style.transform = `translate3d(${S.x.toFixed(2)}px,0,0)`;
  }

  function wireStrips() {
    bindStrip(GWALL, $('#gwall'), $('#gwall') && $('.gwall-track', $('#gwall')));
    bindStrip(ROOD, $('#rood'), $('#rood') && $('.rood-track', $('#rood')));
  }

  function tickStrips() {
    tickStrip(GWALL);
    tickStrip(ROOD);
  }

  function wireGuildWind() {
    const wall = $('#gwall');
    if (!wall) return;
    const sways = $$('.gld-sway', wall);
    GWALL.sways = sways;
    GWALL.gust = new Float32Array(sways.length);
    GWALL.aim = new Float32Array(sways.length);
    if (REDUCE || !sways.length) return;
    wall.classList.add('has-js-wind');
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (!fine) return;
    wall.addEventListener(
      'pointermove',
      (e) => {
        sways.forEach((el, i) => {
          const b = el.getBoundingClientRect();
          const d = (e.clientX - (b.left + b.width * 0.5)) / 150;
          GWALL.aim[i] = clamp(-d * 5.6, -7.2, 7.2);
        });
      },
      { passive: true }
    );
    wall.addEventListener('pointerleave', () => {
      GWALL.aim.fill(0);
    });
  }

  function tickGuildWind(now) {
    if (REDUCE || !GWALL.sways?.length) return;
    const t = now * 0.001;
    const gust =
      Math.sin(t * 0.51) * 2.35 + Math.sin(t * 1.07 + 0.6) * 1.55 + Math.sin(t * 0.21) * 0.85;
    GWALL.sways.forEach((el, i) => {
      const aim = GWALL.aim ? GWALL.aim[i] : 0;
      GWALL.gust[i] += (aim - GWALL.gust[i]) * 0.08;
      const wave = Math.sin(t * 0.84 + i * 0.5) * 1.7;
      const flutter = Math.sin(t * 1.85 + i * 1.25) * 0.5;
      const held = el.parentElement?.matches(':hover, :focus-visible') ? 0.3 : 1;
      const ang = (1.2 + gust + wave + flutter) * held + GWALL.gust[i];
      el.style.transform = `rotate(${ang.toFixed(2)}deg)`;
    });
  }

  function wireWalk() {
    const tourBtn = $('#tour-btn');
    const tourMob = $('#tour-mob');
    if (tourBtn) tourBtn.addEventListener('click', startTour);
    if (tourMob) tourMob.addEventListener('click', startTour);
    const skip = $('#tour-skip');
    if (skip) skip.addEventListener('click', endTour);
    $$('#hots .hot, .card[data-place], .sub-card[data-place], .gate-stats [data-place]').forEach(
      (el) => {
        const open = () => openSheet(el.getAttribute('data-place'), el.classList.contains('hot'));
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        });
      }
    );
    $$('#plan [data-place]').forEach((el) => {
      el.addEventListener('click', () => openSheet(el.getAttribute('data-place')));
    });
    $$('[data-guild]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (el.classList.contains('gld') && GWALL.moved > 8) {
          e.preventDefault();
          return;
        }
        openSheet(el.getAttribute('data-guild'));
      });
    });
    $$('[data-altar]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (ROOD.moved > 8) {
          e.preventDefault();
          return;
        }
        openSheet(el.getAttribute('data-altar'));
      });
    });
    $$('[data-era]:not(.ann)').forEach((el) => {
      el.addEventListener('click', () => openSheet(el.getAttribute('data-era'), true));
    });
    $$('.itab').forEach((el) => {
      el.addEventListener('click', () => setIter(el.getAttribute('data-iter')));
    });
    $$('#sheet [data-close]').forEach((el) => {
      el.addEventListener('click', closeSheet);
    });
    $$('.les-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        const art = btn.closest('.les');
        const open = art.classList.contains('is-open');
        $$('.les').forEach((el) => {
          el.classList.remove('is-open');
          const row = $('.les-row', el);
          if (row) row.setAttribute('aria-expanded', 'false');
        });
        if (!open) {
          art.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (sheetOpen) closeSheet();
      else if (touring) endTour();
    });
    warmVoices();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopSpeech();
    });
    wireTape();
    wireStrips();
    wireGuildWind();
    wireThen();
    hereApi = wireHere({ ui, fmt, onEnter: enterZone });
    const share = $('#iter-share');
    if (share) share.addEventListener('click', () => shareIter());
    const stats = $('.gate-stats');
    if (stats) {
      const io = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            if (!e.isIntersecting) return;
            io.unobserve(e.target);
            $$('[data-count]', stats).forEach((el) => {
              const end = parseInt(el.getAttribute('data-count'), 10);
              if (!Number.isFinite(end)) return;
              const startAt = performance.now();
              const dur = 1200;
              const tick = (now) => {
                const t = Math.min(1, (now - startAt) / dur);
                const eased = 1 - (1 - t) ** 3;
                el.textContent = String(Math.round(end * eased));
                if (t < 1) requestAnimationFrame(tick);
                else el.textContent = String(end);
              };
              requestAnimationFrame(tick);
            });
          });
        },
        { threshold: 0.45 }
      );
      io.observe(stats);
    }
  }

  function loop(now) {
    requestAnimationFrame(loop);
    updateProgress();
    RIG.mx += (RIG.tmx - RIG.mx) * 0.06;
    RIG.my += (RIG.tmy - RIG.my) * 0.06;
    RIG.smooth += (RIG.prog - RIG.smooth) * (REDUCE ? 1 : 0.045);
    if (RIG.intro < 1) RIG.intro = Math.min(1, RIG.intro + 0.012);
    tickStrips();
    tickGuildWind(now);
    if (renderer && curveP && !document.body.classList.contains('no-webgl')) {
      if (!tickTour(now)) applyCam(RIG.smooth);
      updateHots();
      lanterns.forEach((l, i) => {
        l.intensity = 0.95 + Math.sin(now * 0.004 + i * 1.7) * 0.18;
      });
      if (moon) moon.position.x = 8.5 + Math.sin(now * 0.00012) * 0.4;
      try {
        renderer.render(scene, camera);
        document.documentElement.classList.add('has-gl');
      } catch {
        document.body.classList.add('no-webgl');
        document.documentElement.classList.remove('has-gl');
      }
    }
  }

  function onResize() {
    measure();
    GWALL.primed = false;
    ROOD.primed = false;
    if (renderer) {
      renderer.setSize(vpW(), vpH(), false);
      camera.aspect = vpW() / vpH();
      camera.updateProjectionMatrix();
    }
  }

  function recoverBrokenPhotos() {
    $$('picture img').forEach((img) => {
      img.addEventListener('error', () => {
        const pic = img.closest('picture');
        if (pic) {
          $$('source', pic).forEach((source) => {
            source.remove();
          });
        }
        const fallback = img.getAttribute('src');
        if (fallback && img.dataset.fb !== '1') {
          img.dataset.fb = '1';
          img.src = fallback;
        }
      });
    });
  }

  function ready() {
    document.body.classList.remove('is-locked');
    preEl.classList.add('done');
    recoverBrokenPhotos();
    measure();
    onScroll();
    wireReveals();
    wireForeground();
    setIter(iterFromQuery());
    const laterWx = window.requestIdleCallback || ((fn) => setTimeout(fn, 2000));
    laterWx(() => loadWeather(), { timeout: 2500 });
    registerPwa();
    const hash = (location.hash || '').replace(/^#/, '');
    if (hash) setTimeout(() => goToId(hash, true), 60);
    const armGL = () => {
      ensureGL().catch((err) => {
        console.warn(err);
        document.body.classList.add('no-webgl');
      });
    };
    for (const ev of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
      window.addEventListener(ev, armGL, { once: true, passive: true });
    }
    const laterGL = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    laterGL(armGL, { timeout: 400 });
  }

  async function boot() {
    setVW();
    await wireLang();
    wireRail();
    wireRise();
    wireNav();
    wireAnchors();
    wireCursor();
    wireWalk();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      requestAnimationFrame(loop);
      let dismissed = false;
      const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        setLoad(100);
        setTimeout(ready, 120);
      };
      dismiss();
    };
    start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
