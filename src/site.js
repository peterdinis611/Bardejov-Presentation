/** Canonical origin for SEO, sitemap and Open Graph. */
export function siteOrigin() {
  const env = String(import.meta.env.VITE_SITE || '').replace(/\/$/, '');
  if (env) return env;
  if (typeof location !== 'undefined' && location.origin) {
    return location.origin.replace(/\/$/, '');
  }
  return '';
}

export function siteUrl() {
  const origin = siteOrigin();
  return origin ? `${origin}/` : '/';
}
