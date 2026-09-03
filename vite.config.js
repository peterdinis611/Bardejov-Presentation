import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const LANGS = JSON.parse(readFileSync(resolve(root, 'locales/langs.json'), 'utf8')).map(
  (l) => l.id
);

function resolveSite(mode) {
  const fileEnv = loadEnv(mode, root, '');
  const env = { ...process.env, ...fileEnv };
  const raw =
    env.VITE_SITE_URL ||
    env.SITE_URL ||
    env.VERCEL_PROJECT_PRODUCTION_URL ||
    (env.VERCEL_ENV === 'preview' ? env.VERCEL_URL : '') ||
    env.VERCEL_URL ||
    '';
  const host = String(raw)
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  if (!host) return '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return `http://${host}`;
  return `https://${host}`;
}

function hreflangLinks(site) {
  const links = LANGS.map(
    (id) => `    <xhtml:link rel="alternate" hreflang="${id}" href="${site}/?lang=${id}"/>`
  );
  links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/"/>`);
  return links.join('\n');
}

function sitemapXml(site) {
  const today = new Date().toISOString().slice(0, 10);
  const alts = hreflangLinks(site);
  const urls = [
    { loc: `${site}/`, priority: '1.0' },
    ...LANGS.map((id) => ({ loc: `${site}/?lang=${id}`, priority: id === 'sk' ? '0.9' : '0.8' })),
  ];
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
${alts}
  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;
}

function siteMetaPlugin(site) {
  return {
    name: 'bardejov-site-meta',
    transformIndexHtml(html) {
      return html.replaceAll('__SITE__', site);
    },
    closeBundle() {
      if (!site) return;
      const dist = resolve(root, 'dist');
      if (!existsSync(dist)) return;
      writeFileSync(resolve(dist, 'sitemap.xml'), sitemapXml(site));
      const robotsPath = resolve(dist, 'robots.txt');
      if (existsSync(robotsPath)) {
        let robots = readFileSync(robotsPath, 'utf8');
        robots = robots.replace(/Sitemap:.*$/m, `Sitemap: ${site}/sitemap.xml`);
        writeFileSync(robotsPath, robots);
      }
      const tdmDir = resolve(dist, '.well-known');
      mkdirSync(tdmDir, { recursive: true });
      writeFileSync(
        resolve(tdmDir, 'tdmrep.json'),
        `${JSON.stringify(
          {
            list: [
              {
                location: '/',
                'tdm-reservation': 1,
                'tdm-policy': `${site}/tdm-policy.txt`,
              },
            ],
          },
          null,
          2
        )}\n`
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const site = resolveSite(mode);
  return {
    base: process.env.VITE_BASE || '/',
    publicDir: 'public',
    envPrefix: ['VITE_'],
    define: {
      'import.meta.env.VITE_SITE': JSON.stringify(site),
    },
    plugins: [siteMetaPlugin(site)],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2022',
      cssCodeSplit: true,
      modulePreload: { polyfill: false },
      chunkSizeWarningLimit: 600,
      assetsInlineLimit: (filePath, content) => {
        if (String(filePath).replace(/\\/g, '/').includes('/flags/') && filePath.endsWith('.svg')) {
          return false;
        }
        return content.length < 4096;
      },
      rollupOptions: {
        input: {
          main: resolve(root, 'index.html'),
          404: resolve(root, '404.html'),
          500: resolve(root, '500.html'),
        },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three';
            if (id.includes('@fontsource')) return 'fonts';
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: false,
    },
  };
});
