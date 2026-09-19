/* GPS pin on the ITER plan. Zones light FORUM / SUBURBIUM / … */

const ZONES = [
  { id: 'forum', lat: 49.29442, lon: 21.27575, r: 110, pin: [298, 196], latin: 'FORUM' },
  { id: 'basilica', lat: 49.29518, lon: 21.27595, r: 55, pin: [298, 98], latin: 'BASILICA' },
  { id: 'walls', lat: 49.29455, lon: 21.27785, r: 95, pin: [168, 98], latin: 'MOENIA' },
  { id: 'suburb', lat: 49.29185, lon: 21.27355, r: 90, pin: [132, 360], latin: 'SUBURBIUM' },
  { id: 'spa', lat: 49.32715, lon: 21.2692, r: 280, pin: [520, 64], latin: 'AQUAE' },
];

export const ZONE_CHAPTER = {
  forum: 'gate',
  basilica: 'lessons',
  walls: 'pathways',
  suburb: 'suburb',
  spa: 'eternity',
};

const ALIAS = {
  square: 'forum',
  hall: 'forum',
  synagogue: 'suburb',
  away: 'away',
  town: 'town',
};

let watchId = 0;
let lastZone = null;

function haversine(aLat, aLon, bLat, bLon) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function nearestZone(lat, lon) {
  let best = null;
  for (const z of ZONES) {
    const d = haversine(lat, lon, z.lat, z.lon);
    if (d <= z.r && (!best || d < best.d)) best = Object.assign({ d }, z);
  }
  if (best) return best;
  const toSquare = haversine(lat, lon, 49.29442, 21.27575);
  if (toSquare < 900) return { id: 'town', latin: '', d: toSquare, pin: null };
  return { id: 'away', latin: '', d: toSquare, pin: null };
}

export function zoneFromName(name) {
  const id = ALIAS[name] || name;
  if (id === 'away') return { id: 'away', latin: '', pin: null };
  if (id === 'town') return { id: 'town', latin: '', pin: null };
  return ZONES.find((z) => z.id === id) || null;
}

export function paintHere(ui, fmt) {
  const zone = lastZone;
  const plan = document.getElementById('plan');
  const pin = document.getElementById('here-pin');
  const cap = document.getElementById('here-cap');
  const btn = document.getElementById('here-btn');
  if (plan) {
    plan.classList.toggle('has-here', !!(zone && zone.id !== 'away' && zone.id !== 'off'));
    plan.querySelectorAll('[data-zone]').forEach((el) => {
      el.classList.toggle('is-here', !!(zone && el.getAttribute('data-zone') === zone.id));
    });
  }
  if (pin) {
    if (zone?.pin) {
      pin.setAttribute('transform', `translate(${zone.pin[0]} ${zone.pin[1]})`);
      pin.removeAttribute('hidden');
    } else {
      pin.setAttribute('hidden', '');
    }
  }
  let line = '';
  if (!zone) line = '';
  else if (zone.id === 'off') line = ui('hereOff');
  else if (zone.id === 'denied') line = ui('hereDenied');
  else if (zone.id === 'away') line = ui('hereAway');
  else if (zone.id === 'town') line = ui('hereTown');
  else line = fmt(ui('hereLive'), { place: zone.latin });
  if (cap) {
    cap.hidden = !line;
    cap.textContent = line;
  }
  if (btn) {
    btn.classList.toggle(
      'is-on',
      !!(zone && zone.id !== 'away' && zone.id !== 'denied' && zone.id !== 'off')
    );
    btn.setAttribute('aria-pressed', btn.classList.contains('is-on') ? 'true' : 'false');
  }
}

function applyZone(zone, ui, fmt, onEnter) {
  const prev = lastZone?.id;
  lastZone = zone;
  paintHere(ui, fmt);
  if (zone?.id && zone.id !== prev && onEnter) onEnter(zone);
}

function stopWatch() {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = 0;
  }
}

export function wireHere({ ui, fmt, onEnter }) {
  const btn = document.getElementById('here-btn');
  const enter = onEnter || (() => {});
  const fake = new URLSearchParams(location.search).get('here');
  if (fake) {
    const zone = zoneFromName(fake);
    if (zone) applyZone(zone, ui, fmt, enter);
  }

  const onFix = (pos) => {
    applyZone(nearestZone(pos.coords.latitude, pos.coords.longitude), ui, fmt, enter);
  };
  const onErr = (err) => {
    if (err?.code === 1) applyZone({ id: 'denied' }, ui, fmt, enter);
    else if (!lastZone) applyZone({ id: 'off' }, ui, fmt, enter);
  };

  const ask = () => {
    if (!navigator.geolocation) {
      applyZone({ id: 'off' }, ui, fmt, enter);
      return;
    }
    stopWatch();
    navigator.geolocation.getCurrentPosition(onFix, onErr, {
      enableHighAccuracy: true,
      timeout: 9000,
      maximumAge: 12000,
    });
    watchId = navigator.geolocation.watchPosition(onFix, onErr, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 8000,
    });
  };

  btn?.addEventListener('click', ask);
  return { refresh: () => paintHere(ui, fmt), ask };
}
