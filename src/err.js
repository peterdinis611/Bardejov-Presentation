import { loadCyrillicFonts } from './fonts.js';
import './styles.css';
import { hasLocale, I18N, LANGS, loadLocale } from './lang.js';

/* Bardejov — error gates. Grain, LINGVA, no Three.js. */
(() => {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [].slice.call((r || document).querySelectorAll(s));
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
  function detectLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && hasLocale(q)) return q;
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
  async function setLang(id) {
    if (!hasLocale(id)) return;
    await loadLocale(id);
    if (id === 'uk') loadCyrillicFonts();
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

  wireLang();
  wireNav();
  const retry = $('#err-retry');
  if (retry) retry.addEventListener('click', () => location.reload());
})();
