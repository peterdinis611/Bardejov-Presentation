# Bardejov

Súmraková prechádzka UNESCO Bardejovom — jedna dlhá editorial scroll stránka: námestie, hradby, pamäť (letopis / cechy / oltáre), židovské predmestie, itinerár dňa a kúpele.

Nie je to portál s desiatimi routami. Jazykové shelly (`/en`, `/pl`, …), JSON-LD a sitemap áno. PWA podrží dlažbu aj offline.

## Spustenie

```bash
npm install
npm run dev
```

| Príkaz | Čo robí |
|--------|---------|
| `npm run build` | Optimalizácia obrázkov + Vite build do `dist/` |
| `npm run preview` | Lokálny náhľad produkčného buildu |
| `npm run build:pages` | Build pre GitHub Pages (`/Bardejov-Presentation/`) |
| `npm run images` | Len `scripts/opt-images.mjs` (AVIF/WebP) |
| `npm run i18n` | Validácia locale kľúčov proti SK |
| `npm run check` | Biome + i18n |
| `npm test` | Playwright e2e |

### Premenné prostredia

- `VITE_SITE_URL` / `VITE_SITE` — kanonický origin (SEO, sitemap, Open Graph). Bez neho ostávajú relatívne cesty.
- `VITE_BASE` — base path (napr. `/Bardejov-Presentation/` na Pages).

## Jazyky

SK je bundled. CS, EN, PL, HU, UK sa načítajú lazy z `locales/*.json`. Prepínač v hlavičke, URL `?lang=en` alebo shell `/en`.

Po zmene textov:

```bash
npm run i18n
```

## Štruktúra

```
index.html          # jedna súmraková os (#gate … #walk … #eternity)
locales/            # sk, cs, en, pl, hu, uk (+ langs.json)
public/sw.js        # PWA cache bv-dusk-2, precache jazykových shellov
src/
  main.js           # boot: scroll, i18n, nav, sheet
  town.js           # Three.js mesto (lazy import three)
  speech.js         # TTS kapitol
  walk.js           # itinerár, počasie, zdieľanie lístka
  here.js           # GPS zóny
  seo.js / dusk.js / then.js / pwa.js …
e2e/                # Playwright
scripts/            # i18n.mjs, opt-images.mjs, tts.mjs
```

### Návštevnícka os

Hero → námestie (parcely + mini-lístok CISTA) → hradby → pamäť (kotvy Letopis / Cechy / Oltáre) → predmestie → itinerár → kúpele.

Menu: Forum, Moenia, Memoria, Suburbium, **Iter**, Aquae. Päť chipov v heroi; hlasové kapitoly ostávajú päť (itinerár nie je spoken chapter).

Zdieľanie dňa: `/?lang=pl&iter=half#walk`.

## Stack

Vite 6 · vanilla JS · Three.js (idle / gesto) · custom dusk CSS · Biome · Playwright.

Lístok hodín je ručný (TIK); počasie cez Open-Meteo. „Overte pred cestou.“
