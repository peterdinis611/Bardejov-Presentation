import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { jsonLdFromPack, LANG_IDS, langUrl, OG_LOCALE, SITEMAP_IMAGES } from './src/seo.js';

const root = dirname(fileURLToPath(import.meta.url));

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

function siteRoot(site) {
  const host = String(site || '').replace(/\/$/, '');
  return host ? `${host}/` : '/';
}

function hreflangLinks(root) {
  const links = LANG_IDS.map(
    (id) => `    <xhtml:link rel="alternate" hreflang="${id}" href="${langUrl(root, id)}"/>`
  );
  links.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${langUrl(root, 'sk')}"/>`
  );
  return links.join('\n');
}

function imageEntries(root) {
  return SITEMAP_IMAGES.map(
    (im) => `    <image:image>
      <image:loc>${root}assets/${im.file}</image:loc>
      <image:title>${im.title}</image:title>
    </image:image>`
  ).join('\n');
}

function sitemapXml(site) {
  const root = siteRoot(site);
  const today = new Date().toISOString().slice(0, 10);
  const alts = hreflangLinks(root);
  const images = imageEntries(root);
  const body = LANG_IDS.map((id) => {
    const loc = langUrl(root, id);
    const extra = id === 'sk' ? `\n${images}` : '';
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${id === 'sk' ? '1.0' : '0.8'}</priority>
${alts}${extra}
  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>
`;
}

function escAttr(val) {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

function setMeta(html, kind, key, val) {
  const attr = kind === 'name' || kind === 'property' ? kind : 'name';
  const re = new RegExp(`(<meta[^>]*${attr}="${key}"[^>]*content=")[^"]*(")`);
  if (re.test(html)) return html.replace(re, `$1${escAttr(val)}$2`);
  const re2 = new RegExp(`(<meta[^>]*content=")[^"]*("[^>]*${attr}="${key}"[^>]*)`);
  return html.replace(re2, `$1${escAttr(val)}$2`);
}

function localizeHtml(html, site, lang, pack, htmlLang) {
  const root = siteRoot(site);
  const pageUrl = langUrl(root, lang);
  const cover = `${root}assets/square.jpg`;
  const meta = pack.meta || {};
  let out = html.replace(/<html lang="[^"]*"/, `<html lang="${htmlLang || lang}"`);
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(meta.title)}</title>`);
  out = setMeta(out, 'name', 'description', meta.description);
  out = setMeta(out, 'name', 'keywords', meta.keywords);
  out = setMeta(out, 'property', 'og:site_name', meta.siteName);
  out = setMeta(out, 'property', 'og:locale', OG_LOCALE[lang] || 'sk_SK');
  out = setMeta(out, 'property', 'og:title', meta.title);
  out = setMeta(out, 'property', 'og:description', meta.description);
  out = setMeta(out, 'property', 'og:url', pageUrl);
  out = setMeta(out, 'property', 'og:image', cover);
  out = setMeta(out, 'property', 'og:image:alt', meta.imageAlt);
  out = setMeta(out, 'name', 'twitter:title', meta.title);
  out = setMeta(out, 'name', 'twitter:description', meta.description);
  out = setMeta(out, 'name', 'twitter:image', cover);
  out = setMeta(out, 'name', 'twitter:image:alt', meta.imageAlt);
  out = out.replace(/(<link[^>]*rel="canonical"[^>]*href=")[^"]*(")/, `$1${pageUrl}$2`);
  out = out.replace(/(<link[^>]*rel="image_src"[^>]*href=")[^"]*(")/, `$1${cover}$2`);
  LANG_IDS.forEach((id) => {
    const href = langUrl(root, id);
    out = out.replace(new RegExp(`(<link[^>]*hreflang="${id}"[^>]*href=")[^"]*(")`), `$1${href}$2`);
  });
  out = out.replace(
    /(<link[^>]*hreflang="x-default"[^>]*href=")[^"]*(")/,
    `$1${langUrl(root, 'sk')}$2`
  );
  const ld = JSON.stringify(jsonLdFromPack(root, lang, pack, htmlLang || lang));
  out = out.replace(
    /<script type="application\/ld\+json" id="ld-json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" id="ld-json">${ld}</script>`
  );
  return out;
}

function serveLangIndex() {
  return (req, _res, next) => {
    const path = String(req.url || '/').split('?')[0];
    if (/^\/(cs|en|pl|hu|uk)\/?$/.test(path)) {
      const q = String(req.url || '').includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      req.url = `/${q}`;
    }
    next();
  };
}

function siteMetaPlugin(site) {
  return {
    name: 'bardejov-site-meta',
    transformIndexHtml(html) {
      return html.replaceAll('__SITE__', site);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/sitemap.xml') {
          const host = req.headers.host;
          const origin = site || (host ? `http://${host}` : '');
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.end(sitemapXml(origin));
          return;
        }
        next();
      });
      server.middlewares.use(serveLangIndex());
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveLangIndex());
    },
    closeBundle() {
      const dist = resolve(root, 'dist');
      if (!existsSync(dist)) return;
      const origin = siteRoot(site);
      writeFileSync(resolve(dist, 'sitemap.xml'), sitemapXml(site || ''));
      const robotsPath = resolve(dist, 'robots.txt');
      if (existsSync(robotsPath) && site) {
        let robots = readFileSync(robotsPath, 'utf8');
        robots = robots.replace(/Sitemap:.*$/m, `Sitemap: ${origin}sitemap.xml`);
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
                'tdm-policy': `${origin}tdm-policy.txt`,
              },
            ],
          },
          null,
          2
        )}\n`
      );
      const indexPath = resolve(dist, 'index.html');
      if (!existsSync(indexPath)) return;
      const html = readFileSync(indexPath, 'utf8');
      const specs = JSON.parse(readFileSync(resolve(root, 'locales/langs.json'), 'utf8'));
      const packs = Object.fromEntries(
        specs.map((spec) => [
          spec.id,
          JSON.parse(readFileSync(resolve(root, `locales/${spec.id}.json`), 'utf8')),
        ])
      );
      writeFileSync(indexPath, localizeHtml(html, origin, 'sk', packs.sk, 'sk'));
      for (const spec of specs) {
        if (spec.id === 'sk') continue;
        const dir = resolve(dist, spec.id);
        mkdirSync(dir, { recursive: true });
        writeFileSync(
          resolve(dir, 'index.html'),
          localizeHtml(html, origin, spec.id, packs[spec.id], spec.html)
        );
      }
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
    plugins: [tailwindcss(), siteMetaPlugin(site)],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2022',
      cssCodeSplit: true,
      modulePreload: {
        polyfill: false,
        resolveDependencies(_filename, deps) {
          return deps.filter((dep) => !dep.includes('three'));
        },
      },
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
