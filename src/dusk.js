/* Quiet dusk bed: wind + a distant bell. No audio files. */

let ctx = null;
let master = null;
let wanted = false;
let timer = 0;

export function duskWanted() {
  try {
    return localStorage.getItem('bv-snd') === '1';
  } catch {
    return false;
  }
}

function noiseBuffer(ac) {
  const n = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function startGraph() {
  const ac = ctx;
  master = ac.createGain();
  master.gain.value = 0.0001;
  master.connect(ac.destination);

  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 360;
  bp.Q.value = 0.65;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 680;
  const gain = ac.createGain();
  gain.gain.value = 0.048;
  const lfo = ac.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoG = ac.createGain();
  lfoG.gain.value = 120;
  lfo.connect(lfoG);
  lfoG.connect(bp.frequency);
  src.connect(bp);
  bp.connect(lp);
  lp.connect(gain);
  gain.connect(master);
  src.start();
  lfo.start();
  master.gain.exponentialRampToValueAtTime(1, ac.currentTime + 2.6);
  scheduleBell();
}

function strikeBell() {
  if (!ctx || !master) return;
  const ac = ctx;
  const now = ac.currentTime;
  const mix = ac.createGain();
  mix.gain.setValueAtTime(0.0001, now);
  mix.gain.exponentialRampToValueAtTime(0.06, now + 0.05);
  mix.gain.exponentialRampToValueAtTime(0.0001, now + 7);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 540;
  [196, 247, 392].forEach((hz, i) => {
    const osc = ac.createOscillator();
    osc.type = i ? 'triangle' : 'sine';
    osc.frequency.value = hz;
    const g = ac.createGain();
    g.gain.value = i === 0 ? 0.5 : 0.18;
    osc.connect(g);
    g.connect(lp);
    osc.start(now);
    osc.stop(now + 7.2);
  });
  lp.connect(mix);
  mix.connect(master);
}

function scheduleBell() {
  clearTimeout(timer);
  if (!wanted) return;
  timer = window.setTimeout(
    () => {
      strikeBell();
      scheduleBell();
    },
    20000 + Math.random() * 18000
  );
}

export async function setDusk(on) {
  wanted = !!on;
  try {
    localStorage.setItem('bv-snd', wanted ? '1' : '0');
  } catch {}
  if (!wanted) {
    clearTimeout(timer);
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
    }
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') await ctx.resume();
  if (!master) startGraph();
  else {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.7);
    scheduleBell();
  }
}

export function duckDusk(on) {
  if (!master || !ctx || !wanted) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(on ? 0.16 : 1, ctx.currentTime + 0.32);
}

export function syncDuskButton(btn, labels) {
  if (!btn) return;
  btn.classList.toggle('is-on', wanted);
  btn.setAttribute('aria-pressed', wanted ? 'true' : 'false');
  btn.setAttribute('aria-label', wanted ? labels.off : labels.on);
}
