import './styles.css';
import { I18N, LANGS } from './lang.js';

/* Bardejov — error gates. Grain, LINGVA, no Three.js. */
(() => {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [].slice.call((r || document).querySelectorAll(s));
  const grain = $('#grain');
  let lang = 'sk';

  function pack() {
    return I18N?.[lang] || {};
  }
  function fallbackPack() {
    return I18N?.sk || {};
  }
  function ui(key) {
    const a = pack().ui || {};
    const b = fallbackPack().ui || {};
    return a[key] != null ? a[key] : b[key] || '';
  }
  function makeGrain() {
    if (!grain) return;
    const c = document.createElement('canvas');
    c.width = 180;
    c.height = 180;
    const x = c.getContext('2d');
    const img = x.createImageData(180, 180);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 80 + Math.random() * 140;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    grain.style.backgroundImage = `url(${c.toDataURL('image/png')})`;
  }
  function detectLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && I18N?.[q]) return q;
    try {
      const saved = localStorage.getItem('bv-lang');
      if (saved && I18N?.[saved]) return saved;
    } catch {}
    const n = (navigator.language || 'sk').toLowerCase();
    if (n.startsWith('cs')) return 'cs';
    if (n.startsWith('en')) return 'en';
    if (n.startsWith('pl')) return 'pl';
    if (n.startsWith('hu')) return 'hu';
    if (n.startsWith('uk')) return 'uk';
    return 'sk';
  }
  function applyI18n() {
    $$('[data-i18n]').forEach((el) => {
      const v = ui(el.getAttribute('data-i18n'));
      if (!v) return;
      const attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, v);
      else el.textContent = v;
    });
    $$('[data-i18n-ext]').forEach((a) => {
      const name = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (name) a.setAttribute('aria-label', `${name} — ${ui('extNew')}`);
    });
    const kind = document.documentElement.classList.contains('err-500') ? '500' : '404';
    const title = ui(kind === '500' ? 'err500k' : 'err404k');
    const desc = ui(kind === '500' ? 'err500p' : 'err404p');
    if (title) document.title = `${title} · Bardejov`;
    const md = document.querySelector('meta[name="description"]');
    if (md && desc) md.setAttribute('content', desc);
    const spec = (LANGS || []).find((l) => l.id === lang);
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
  }
  function setLang(id) {
    if (!I18N?.[id]) return;
    lang = id;
    try {
      localStorage.setItem('bv-lang', id);
    } catch {}
    applyI18n();
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
  function wireLang() {
    lang = detectLang();
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q && I18N?.[q]) localStorage.setItem('bv-lang', q);
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
  function wireNav() {
    const nav = $('#nav');
    const burger = $('.nav-burger');
    const links = $('#navlinks');
    if (!nav || !burger) return;
    burger.addEventListener('click', () => {
      setLinguaOpen(false);
      const open = nav.classList.toggle('menu-open');
      burger.classList.toggle('active', open);
      document.documentElement.classList.toggle('nav-open', open);
    });
    if (links) {
      $$('.nav-link', links).forEach((a) => {
        a.addEventListener('click', () => {
          nav.classList.remove('menu-open');
          burger.classList.remove('active');
          document.documentElement.classList.remove('nav-open');
        });
      });
    }
  }

  makeGrain();
  wireLang();
  wireNav();
  const retry = $('#err-retry');
  if (retry) retry.addEventListener('click', () => location.reload());
})();
