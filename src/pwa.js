/* Register the square cache after first paint. */

export function registerPwa() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const url = `${import.meta.env.BASE_URL}sw.js`;
  const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  later(() => {
    navigator.serviceWorker.register(url).catch(() => {});
  });
}
