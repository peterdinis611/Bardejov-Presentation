/* Bardejov — day’s walk: lengths, weather, the ticket you send. */

export const ITERS = {
  '2h': {
    cap: 'FORUM · 2 HORAE',
    path: 'M298 196 L298 98 L168 98',
    on: ['square', 'hall', 'basilica', 'walls'],
    ids: ['square', 'basilica', 'walls'],
  },
  half: {
    cap: 'MOENIA · DIES MEDIUS',
    path: 'M298 196 L298 98 L168 98 L132 360',
    on: ['square', 'hall', 'basilica', 'walls', 'suburb'],
    ids: ['hall', 'basilica', 'walls', 'synagogue'],
  },
  full: {
    cap: 'AQUAE · DIES TOTUS',
    path: 'M298 196 L298 98 L168 98 L132 360 M298 196 L478 90 L520 64',
    on: ['square', 'hall', 'basilica', 'walls', 'suburb', 'spa'],
    ids: ['hall', 'synagogue', 'square', 'spa'],
  },
};

export function createWalk({
  $,
  $$,
  pack,
  fallbackPack,
  fmt,
  ui,
  getLang,
  getIterKey,
  setIterKey,
  getWxSnap,
  setWxSnap,
  openSheet,
  iterData,
}) {
  function hoursToday() {
    const h = pack().hours || fallbackPack().hours || {};
    const d = new Date();
    const day = d.getDay();
    const summer = d.getMonth() >= 4 && d.getMonth() <= 8;
    let bas = h.basWeek || '',
      basUntil = '16:00';
    if (day === 0) {
      bas = h.basSun || '';
      basUntil = '14:30';
    } else if (day === 6) {
      bas = h.basSat || '';
      basUntil = '15:00';
    }
    let hall = summer ? h.hallSummer || '' : h.hallWinter || '';
    const hallUntil = day === 1 ? '' : summer ? '16:30' : '16:00';
    if (day === 1) hall = h.hallMon || '';
    return { bas: bas + (h.basNote || ''), hall: hall, basUntil, hallUntil };
  }
  function wxWord(code) {
    const w = pack().wx || fallbackPack().wx || {};
    if (code === 0) return w['0'];
    if (code <= 3) return w['3'];
    if (code <= 48) return w['48'];
    if (code <= 57) return w['57'];
    if (code <= 67) return w['67'];
    if (code <= 77) return w['77'];
    if (code <= 82) return w['82'];
    return w['99'];
  }
  function setWxLine(text) {
    $$('[data-wx]').forEach((el) => {
      el.textContent = text;
    });
  }
  function paintHoursAndWx() {
    const hrs = hoursToday();
    const hallEl = $('#hrs-hall');
    const basEl = $('#hrs-bas');
    if (hallEl) hallEl.textContent = hrs.hall;
    if (basEl) basEl.textContent = hrs.bas;
    const wx = pack().wx || {};
    const basBit = hrs.basUntil ? fmt(wx.basOpen, { t: hrs.basUntil }) : wx.basLiturgy || '';
    const hallBit = hrs.hallUntil ? fmt(wx.hallUntil, { t: hrs.hallUntil }) : wx.hallClosed || '';
    const wxSnap = getWxSnap();
    if (wxSnap)
      setWxLine(fmt(wx.today, { t: wxSnap.t, w: wxWord(wxSnap.code), bas: basBit, hall: hallBit }));
    else setWxLine(fmt(wx.dusk, { bas: basBit, hall: hallBit }) || ui('wxFallback'));
    paintDuskHint();
  }
  function isWet(code) {
    if (code == null) return false;
    return (code >= 51 && code <= 67) || (code >= 71 && code <= 77) || code >= 80;
  }
  function paintDuskHint() {
    const wx = pack().wx || fallbackPack().wx || {};
    const wxSnap = getWxSnap();
    let line = '';
    if (wxSnap && isWet(wxSnap.code)) line = wx.duskRain || '';
    else if (wxSnap?.sunset) {
      const mins = Math.round((wxSnap.sunset - Date.now()) / 60000);
      if (mins <= 0) line = wx.duskDown || '';
      else if (mins <= 90) line = fmt(wx.duskTower, { m: String(mins) });
      else line = wx.duskLong || '';
    }
    $$('.dusk-hint').forEach((el) => {
      el.hidden = !line;
      el.textContent = line;
    });
  }
  function loadWeather() {
    paintHoursAndWx();
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=49.2944&longitude=21.2758&current=temperature_2m,weather_code&daily=sunset&forecast_days=1&timezone=Europe%2FBratislava'
    )
      .then((r) => r.json())
      .then((j) => {
        const sun = j.daily?.sunset?.[0];
        setWxSnap({
          t: Math.round(j.current.temperature_2m),
          code: j.current.weather_code,
          sunset: sun ? Date.parse(sun) : 0,
        });
        paintHoursAndWx();
      })
      .catch(() => {
        setWxSnap(null);
        paintHoursAndWx();
      });
  }

  function iterFromQuery() {
    const key = new URLSearchParams(location.search).get('iter');
    return ITERS[key] ? key : '2h';
  }
  function walkSearch() {
    const next = new URLSearchParams();
    next.set('iter', getIterKey());
    next.set('lang', getLang());
    for (const [k, v] of new URLSearchParams(location.search)) {
      if (k !== 'iter' && k !== 'lang') next.append(k, v);
    }
    return next;
  }
  function walkHref() {
    const u = new URL(location.href);
    return `${u.pathname}?${walkSearch()}#walk`;
  }
  function syncWalkQuery() {
    const u = new URL(location.href);
    const next = `${u.pathname}?${walkSearch()}${u.hash}`;
    if (`${location.pathname}${location.search}${location.hash}` !== next) {
      history.replaceState(null, '', next);
    }
  }
  async function shareIter() {
    const btn = $('#iter-share');
    const url = `${location.origin}${walkHref()}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: ui('walkH'), text: ui('shareIter'), url });
        if (btn) {
          btn.textContent = ui('shareSent');
          btn.classList.add('is-done');
        }
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      history.replaceState(null, '', walkHref());
    }
    if (btn) {
      btn.textContent = ui('shareCopied');
      btn.classList.add('is-done');
    }
  }
  function setIter(key) {
    setIterKey(key);
    const data = iterData(key);
    const path = $('#plan-path');
    const cap = $('#plan-cap');
    const list = $('#stops');
    if (path) path.setAttribute('d', data.path);
    if (cap) cap.textContent = data.cap;
    $$('#plan [data-stop]').forEach((g) => {
      g.classList.toggle('is-off', data.on.indexOf(g.getAttribute('data-stop')) === -1);
    });
    if (list) {
      list.innerHTML = data.stops
        .map(
          (s) =>
            `<li${s[2] ? ` data-place="${s[2]}" data-cursor` : ''}><div><b>${s[0]}</b><span>${s[1]}</span></div></li>`
        )
        .join('');
      $$('#stops [data-place]').forEach((el) => {
        el.addEventListener('click', () => openSheet(el.getAttribute('data-place')));
      });
    }
    $$('.itab').forEach((b) => {
      const on = b.getAttribute('data-iter') === key;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const share = $('#iter-share');
    if (share) {
      share.classList.remove('is-done');
      share.textContent = ui('shareIter');
    }
    syncWalkQuery();
  }

  return {
    hoursToday,
    paintHoursAndWx,
    paintDuskHint,
    loadWeather,
    iterFromQuery,
    walkHref,
    syncWalkQuery,
    shareIter,
    setIter,
  };
}
