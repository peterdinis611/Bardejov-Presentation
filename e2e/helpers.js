export const CHAPTERS = ['gate', 'pathways', 'lessons', 'suburb', 'eternity'];

export const LANGS = ['sk', 'cs', 'en', 'pl', 'hu', 'uk'];

export const GATE_COPY = {
  sk: /Radničné námestie/,
  cs: /Radniční náměstí/,
  en: /Town Hall Square/,
  pl: /Rynek Ratuszowy/,
  hu: /Városháza tér/,
  uk: /Ратушна площа/,
};

export const PLAY_LABEL = {
  sk: /Prehrať kapitolu/,
  cs: /Přehrát kapitolu/,
  en: /Play chapter/,
  pl: /Odtwórz rozdział/,
  hu: /Fejezet lejátszása/,
  uk: /Відтворити розділ/,
};

export const STOP_LABEL = {
  sk: /Zastaviť kapitolu/,
  cs: /Zastavit kapitolu/,
  en: /Stop chapter/,
  pl: /Zatrzymaj rozdział/,
  hu: /Fejezet leállítása/,
  uk: /Зупинити розділ/,
};

/** Install a deterministic speechSynthesis before app boot. */
export async function mockSpeech(page, opts = {}) {
  const deferVoices = !!opts.deferVoices;
  const disable = !!opts.disable;
  await page.addInitScript(
    ({ deferVoices: waitVoices, disable: off }) => {
      const spoken = [];
      const stats = { speak: 0, cancel: 0, pause: 0, resume: 0 };
      let current = null;
      let speaking = false;

      window.__ttsSpoken = spoken;
      window.__ttsStats = stats;
      window.__ttsFinish = () => {};
      window.__ttsReadyVoices = () => {};

      if (off) {
        Object.defineProperty(window, 'speechSynthesis', {
          configurable: true,
          get() {
            return undefined;
          },
        });
        return;
      }

      class FakeUtterance {
        constructor(text) {
          this.text = String(text || '');
          this.lang = '';
          this.voice = null;
          this.rate = 1;
          this.pitch = 1;
          this.volume = 1;
          this.onend = null;
          this.onerror = null;
        }
      }

      const voices = [
        { name: 'Laura', lang: 'sk-SK', localService: true, default: true, voiceURI: 'sk' },
        { name: 'Zuzana', lang: 'cs-CZ', localService: true, default: false, voiceURI: 'cs' },
        { name: 'Daniel', lang: 'en-GB', localService: true, default: false, voiceURI: 'en' },
        { name: 'Zosia', lang: 'pl-PL', localService: true, default: false, voiceURI: 'pl' },
        { name: 'Tünde', lang: 'hu-HU', localService: true, default: false, voiceURI: 'hu' },
        { name: 'Lesya', lang: 'uk-UA', localService: true, default: false, voiceURI: 'uk' },
      ];

      let voicesReady = !waitVoices;
      const voiceListeners = [];

      const synth = {
        pending: false,
        paused: false,
        get speaking() {
          return speaking;
        },
        getVoices() {
          return voicesReady ? voices : [];
        },
        speak(utterance) {
          current = utterance;
          speaking = true;
          stats.speak += 1;
          spoken.push({
            text: utterance.text,
            lang: utterance.lang,
            rate: utterance.rate,
            voice: utterance.voice?.name || '',
          });
        },
        cancel() {
          stats.cancel += 1;
          const prev = current;
          current = null;
          speaking = false;
          if (prev?.onerror) prev.onerror({ error: 'interrupted' });
        },
        pause() {
          stats.pause += 1;
        },
        resume() {
          stats.resume += 1;
        },
        addEventListener(type, fn) {
          if (type === 'voiceschanged') voiceListeners.push(fn);
        },
        removeEventListener(_type, fn) {
          const i = voiceListeners.indexOf(fn);
          if (i >= 0) voiceListeners.splice(i, 1);
        },
      };

      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        enumerable: true,
        get() {
          return synth;
        },
      });
      window.SpeechSynthesisUtterance = FakeUtterance;
      window.__ttsFinish = () => {
        const u = current;
        current = null;
        speaking = false;
        if (u?.onend) u.onend();
      };
      window.__ttsReadyVoices = () => {
        voicesReady = true;
        voiceListeners.slice().forEach((fn) => {
          fn();
        });
      };
    },
    { deferVoices, disable }
  );
}

/** Skip Google Fonts, weather, Three.js and boot delays unless a test needs WebGL. */
export async function installFastBoot(page, opts = {}) {
  const webgl = !!opts.webgl;
  await page.addInitScript(
    ({ webgl: keepGl }) => {
      Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: {
          ready: Promise.resolve(),
          check: () => true,
          load: () => Promise.resolve([]),
        },
      });
      if (!keepGl) {
        const orig = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
          if (/webgl/i.test(String(type))) throw new Error('e2e: no webgl');
          return orig.call(this, type, ...args);
        };
      }
      const origTimeout = window.setTimeout;
      window.setTimeout = (fn, ms, ...rest) => {
        if (ms === 120 || ms === 200 || ms === 240 || ms === 280) ms = 0;
        return origTimeout(fn, ms, ...rest);
      };
      const origInterval = window.setInterval;
      window.setInterval = (fn, ms, ...rest) => {
        if (typeof ms === 'number' && ms >= 10_000) ms = 20;
        return origInterval(fn, ms, ...rest);
      };
    },
    { webgl }
  );
}

export async function openSite(page, path = '/?lang=sk', opts = {}) {
  const motion = opts.reducedMotion === false ? 'no-preference' : 'reduce';
  await installFastBoot(page, opts);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.route('https://api.open-meteo.com/**', (route) => route.abort());
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto(path);
  await page.locator('#pre').waitFor({ state: 'hidden', timeout: 8_000 });
}

export function spoken(page) {
  return page.evaluate(() => window.__ttsSpoken || []);
}

export function lastSpoken(page) {
  return page.evaluate(() => {
    const rows = window.__ttsSpoken || [];
    return rows[rows.length - 1] || null;
  });
}

export function ttsStats(page) {
  return page.evaluate(() => window.__ttsStats || { speak: 0, cancel: 0, pause: 0, resume: 0 });
}

export async function finishSpeech(page) {
  await page.evaluate(() => window.__ttsFinish?.());
}

export function playingId(page) {
  return page.evaluate(() => {
    const on = document.querySelector('.nav-speak.is-on');
    return on ? on.getAttribute('data-speak') : null;
  });
}

export async function fireSpeak(page, id) {
  await page.evaluate((speakId) => {
    document.querySelector(`.nav-speak[data-speak="${speakId}"]`)?.click();
  }, id);
}

export async function fireLang(page, id) {
  await page.evaluate((langId) => {
    document.querySelector(`#lingua-list [data-lang="${langId}"]`)?.click();
  }, id);
}

const IGNORE_CONSOLE =
  /webgl|three|WebGL|e2e: no webgl|net::ERR_FAILED|fonts\.(googleapis|gstatic)|Failed to load resource/i;

export function watchPageErrors(page) {
  const errors = [];
  const push = (msg) => {
    if (!IGNORE_CONSOLE.test(msg)) errors.push(msg);
  };
  page.on('pageerror', (err) => push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') push(msg.text());
  });
  return errors;
}
