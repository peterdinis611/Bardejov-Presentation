/* Bardejov — dusk voices for the five spoken chapters. */

const TTS_SKIP =
  /zarvox|whisper|bells|cellos|boing|bad news|good news|deranged|trinoids|organ|wobble|jester|princess|junior|albert|bahh|bubbles|superstar|kathy|fred|compact|novelty/i;
const TTS_PREF = {
  sk: ['zuzana', 'laura', 'google slovenčina', 'google slovensky'],
  cs: ['iveta', 'zuzana', 'google čeština'],
  en: ['daniel', 'serena', 'martha', 'google uk english', 'samantha', 'kate'],
  pl: ['zosia', 'google polski'],
  hu: ['tünde', 'tunde', 'google magyar'],
  uk: ['lesya', 'lesja', 'google українська', 'google ukrainian'],
};

export function createSpeech({
  $$,
  duckDusk,
  getLang,
  locale,
  pack,
  fallbackPack,
  ui,
  goToId,
  isTouring,
  endTour,
}) {
  let ttsUtter = null;
  let ttsVoice = null;
  let ttsVoiceLang = '';
  let ttsKey = '';
  let ttsKeep = 0;

  function clearTtsKeep() {
    if (ttsKeep) {
      clearInterval(ttsKeep);
      ttsKeep = 0;
    }
  }
  function stopSpeech() {
    ttsUtter = null;
    ttsKey = '';
    clearTtsKeep();
    duckDusk(false);
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    syncSpeakButtons();
  }
  function warmVoices() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.getVoices();
    if (!warmVoices.bound) {
      warmVoices.bound = true;
      synth.addEventListener('voiceschanged', () => {
        ttsVoice = null;
        ttsVoiceLang = '';
        synth.getVoices();
      });
    }
  }
  function scoreVoice(v, loc, prefix, prefs) {
    const code = (v.lang || '').toLowerCase().replace('_', '-');
    const name = v.name || '';
    if (TTS_SKIP.test(name)) return -100;
    let s = -1;
    if (code === loc) s = 90;
    else if (code.startsWith(`${prefix}-`) || code === prefix) s = 55;
    else return -1;
    if (prefs.some((p) => name.toLowerCase().includes(p))) s += 36;
    if (/premium|enhanced|neural|natural|online \(natural\)|google|microsoft/i.test(name)) s += 22;
    if (v.localService) s += 8;
    if (/compact/i.test(name)) s -= 24;
    return s;
  }
  function pickVoice() {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    const loc = locale().toLowerCase();
    if (ttsVoice && ttsVoiceLang === loc) return ttsVoice;
    const prefix = loc.slice(0, 2);
    const prefs = TTS_PREF[getLang()] || [];
    let best = null;
    let bestScore = -1;
    synth.getVoices().forEach((v) => {
      const s = scoreVoice(v, loc, prefix, prefs);
      if (s > bestScore) {
        bestScore = s;
        best = v;
      }
    });
    ttsVoice = best;
    ttsVoiceLang = loc;
    return best;
  }
  function prepareSpeech(text) {
    return String(text || '')
      .replace(/UNESCO|ЮНЕСКО/g, 'Unesco')
      .replace(/[·•]/g, ', ')
      .replace(/[—–]/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function speakLine(text, key) {
    if (!window.speechSynthesis) return;
    const line = prepareSpeech(text);
    if (!line) return;
    const synth = window.speechSynthesis;
    if (!synth.getVoices().length) {
      warmVoices();
      const retry = () => {
        synth.removeEventListener('voiceschanged', retry);
        speakLine(line, key);
      };
      synth.addEventListener('voiceschanged', retry);
      return;
    }
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(line);
      ttsUtter = u;
      ttsKey = key || '';
      const voice = pickVoice();
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = locale();
      }
      const lang = getLang();
      u.rate = lang === 'en' || lang === 'cs' ? 0.94 : 0.91;
      u.pitch = 0.96;
      u.volume = 1;
      const done = () => {
        if (ttsUtter !== u) return;
        ttsUtter = null;
        ttsKey = '';
        clearTtsKeep();
        duckDusk(false);
        syncSpeakButtons();
      };
      u.onend = done;
      u.onerror = done;
      duckDusk(true);
      synth.speak(u);
      syncSpeakButtons();
      if (/Chrome|Chromium|Edg\//.test(navigator.userAgent)) {
        clearTtsKeep();
        ttsKeep = setInterval(() => {
          if (ttsUtter !== u || !synth.speaking) {
            clearTtsKeep();
            return;
          }
          synth.pause();
          synth.resume();
        }, 11000);
      }
    } catch {
      ttsKey = '';
      clearTtsKeep();
      syncSpeakButtons();
    }
  }
  function syncSpeakButtons() {
    $$('.nav-speak').forEach((b) => {
      const on = !!(ttsUtter && ttsKey && ttsKey === b.getAttribute('data-speak'));
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    labelSpeakButtons();
  }
  function labelSpeakButtons() {
    $$('.nav-speak').forEach((b) => {
      const on = b.classList.contains('is-on');
      const name = b.previousElementSibling?.querySelector('[data-i18n]')?.textContent || '';
      const verb = ui(on ? 'navStop' : 'navPlay');
      b.setAttribute('aria-label', verb + (name ? ` — ${name}` : ''));
    });
  }
  function speakChapter(id, scroll) {
    if (!id) return;
    if (isTouring()) endTour();
    if (ttsKey === id && ttsUtter) {
      stopSpeech();
      return;
    }
    if (scroll !== false) goToId(id);
    const text = pack().voice?.[id] || fallbackPack().voice?.[id];
    speakLine(text, id);
  }

  function resetVoice() {
    ttsVoice = null;
    ttsVoiceLang = '';
  }

  return {
    speakLine,
    speakChapter,
    stopSpeech,
    warmVoices,
    syncSpeakButtons,
    labelSpeakButtons,
    playingKey: () => ttsKey,
    resetVoice,
  };
}
