/* Lantern-slide compare: photogravure vs dusk plate. */

export function wireThen() {
  const root = document.getElementById('then');
  if (!root) return;
  const old = root.querySelector('.then-old');
  const split = root.querySelector('.then-split');
  const range = document.getElementById('then-range');
  const frame = root.querySelector('.then-frame');
  if (!old || !split || !range || !frame) return;

  const set = (pct) => {
    const p = Math.max(4, Math.min(96, Number(pct)));
    old.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
    split.style.left = `${p}%`;
    range.value = String(Math.round(p));
    range.setAttribute('aria-valuenow', String(Math.round(p)));
  };

  set(range.value || 52);

  range.addEventListener('input', () => set(range.value));

  let drag = false;
  const fromEvent = (e) => {
    const box = frame.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - box.left;
    set((x / box.width) * 100);
  };
  const down = (e) => {
    if (e.target === range) return;
    drag = true;
    frame.classList.add('is-drag');
    fromEvent(e);
    e.preventDefault();
  };
  const move = (e) => {
    if (!drag) return;
    fromEvent(e);
  };
  const up = () => {
    drag = false;
    frame.classList.remove('is-drag');
  };

  frame.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  frame.addEventListener('touchstart', down, { passive: false });
  window.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', up);
}
