/** Head, hreflang and JSON-LD for the dusk walk. */

export const OG_LOCALE = {
  sk: 'sk_SK',
  cs: 'cs_CZ',
  en: 'en_GB',
  pl: 'pl_PL',
  hu: 'hu_HU',
  uk: 'uk_UA',
};

export const LANG_IDS = ['sk', 'cs', 'en', 'pl', 'hu', 'uk'];

const WIKI = {
  sk: 'https://sk.wikipedia.org/wiki/Bardejov',
  cs: 'https://cs.wikipedia.org/wiki/Bardejov',
  en: 'https://en.wikipedia.org/wiki/Bardejov',
  pl: 'https://pl.wikipedia.org/wiki/Bardej%C3%B3w',
  hu: 'https://hu.wikipedia.org/wiki/B%C3%A1rtfa',
  uk: 'https://uk.wikipedia.org/wiki/%D0%91%D0%B0%D1%80%D0%B4%D1%96%D1%97%D0%B2',
};

const PLACE_GEO = [
  { type: 'LandmarksOrHistoricalBuildings', lat: 49.29442, lon: 21.27575 },
  { type: 'Church', lat: 49.29518, lon: 21.27595 },
  { type: 'CivicStructure', lat: 49.29442, lon: 21.27575 },
  { type: 'LandmarksOrHistoricalBuildings', lat: 49.29455, lon: 21.27785 },
  { type: 'PlaceOfWorship', lat: 49.29185, lon: 21.27355 },
  { type: 'TouristAttraction', lat: 49.32715, lon: 21.2692 },
];

export const SITEMAP_IMAGES = [
  { file: 'square.jpg', title: 'Radničné námestie, Bardejov UNESCO' },
  { file: 'basilica.jpg', title: 'Bazilika sv. Egídia' },
  { file: 'radnica.jpg', title: 'Mestská radnica' },
  { file: 'walls.jpg', title: 'Mestské hradby' },
  { file: 'houses.jpg', title: 'Meštianske domy na námestí' },
  { file: 'synagogue.jpg', title: 'Synagóga na predmestí' },
  { file: 'spa.jpg', title: 'Bardejovské Kúpele' },
];

export function withSlash(site) {
  if (!site || site === '/') return '/';
  return site.endsWith('/') ? site : `${site}/`;
}

export function langUrl(site, id) {
  const root = withSlash(site);
  if (!id || id === 'sk') return root;
  return root === '/' ? `/${id}` : `${root}${id}`;
}

export function langFromPathname(pathname) {
  const parts = String(pathname || '')
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean);
  const last = parts[parts.length - 1] || '';
  if (last && last !== 'sk' && LANG_IDS.includes(last)) return last;
  return '';
}

export function buildJsonLd({
  site,
  pageUrl,
  lang = 'sk',
  htmlLang = 'sk',
  meta = {},
  faq = [],
  chapters = [],
  altars = [],
  altarTitle = '',
  tripName = '',
}) {
  const root = withSlash(site);
  const img = `${root}assets/square.jpg`;
  const names = meta.places || [];
  const places = names.map((name, i) => {
    const geo = PLACE_GEO[i] || PLACE_GEO[0];
    return {
      '@type': geo.type,
      name,
      geo: { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lon },
    };
  });
  const sameAs = [
    'https://www.wikidata.org/wiki/Q207227',
    WIKI[lang] || WIKI.sk,
    'https://whc.unesco.org/en/list/973/',
    'https://www.bardejov.sk/',
    'https://www.openstreetmap.org/#map=16/49.2944/21.2758',
  ];
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${root}#website`,
      name: meta.siteName || 'Bardejov UNESCO',
      url: root,
      inLanguage: htmlLang,
      description: meta.description,
      keywords: meta.keywords,
      publisher: { '@id': `${root}#place` },
    },
    {
      '@type': 'WebPage',
      '@id': pageUrl,
      url: pageUrl,
      name: meta.title,
      description: meta.description,
      inLanguage: htmlLang,
      isPartOf: { '@id': `${root}#website` },
      about: { '@id': `${root}#place` },
      primaryImageOfPage: { '@id': `${root}#cover` },
      hasPart: chapters.map((ch) => ({
        '@type': 'WebPageElement',
        name: ch.name,
        url: `${pageUrl.replace(/#.*$/, '')}#${ch.id}`,
      })),
    },
    {
      '@type': 'ImageObject',
      '@id': `${root}#cover`,
      url: img,
      contentUrl: img,
      width: 1920,
      height: 1440,
      caption: meta.imageAlt,
      inLanguage: htmlLang,
    },
    {
      '@type': 'TouristAttraction',
      '@id': `${root}#place`,
      name: 'Bardejov',
      alternateName: ['UNESCO Bardejov', 'Bártfa', 'Bardejów', 'Бардіїв'],
      identifier: 'UNESCO-973',
      url: pageUrl,
      image: { '@id': `${root}#cover` },
      description: meta.description,
      keywords: meta.keywords,
      isAccessibleForFree: true,
      touristType: ['Cultural tourism', 'Heritage tourism'],
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Bardejov',
        addressRegion: 'Prešovský kraj',
        addressCountry: 'SK',
        postalCode: '085 01',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 49.2944, longitude: 21.2758 },
      hasMap: 'https://www.openstreetmap.org/#map=16/49.2944/21.2758',
      containedInPlace: {
        '@type': 'AdministrativeArea',
        name: 'Prešovský kraj',
        containedInPlace: { '@type': 'Country', name: 'Slovakia' },
      },
      sameAs,
      containsPlace: places,
    },
  ];
  if (chapters.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${root}#crumbs`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: meta.siteName || 'Bardejov UNESCO',
          item: pageUrl,
        },
        ...chapters.slice(0, 5).map((ch, i) => ({
          '@type': 'ListItem',
          position: i + 2,
          name: ch.name,
          item: `${pageUrl.replace(/#.*$/, '')}#${ch.id}`,
        })),
      ],
    });
  }
  if (faq.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${root}#faq`,
      mainEntity: faq.map((row) => ({
        '@type': 'Question',
        name: row.q,
        acceptedAnswer: { '@type': 'Answer', text: row.a },
      })),
    });
  }
  if (tripName && names.length) {
    graph.push({
      '@type': 'TouristTrip',
      '@id': `${root}#trip`,
      name: tripName,
      description: meta.description,
      touristType: ['Cultural tourism', 'Heritage tourism'],
      itinerary: {
        '@type': 'ItemList',
        itemListElement: names.map((name, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'Place', name },
        })),
      },
    });
  }
  if (altars.length) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${root}#altars`,
      name: altarTitle || undefined,
      numberOfItems: altars.length,
      itemListElement: altars.map((name, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name,
      })),
    });
  }
  return {
    '@context': 'https://schema.org',
    '@graph': graph.filter(Boolean),
  };
}

export function jsonLdFromPack(site, lang, pack, htmlLang) {
  const ui = pack.ui || {};
  const hours = pack.hours || {};
  const meta = pack.meta || {};
  const pageUrl = langUrl(site, lang);
  return buildJsonLd({
    site,
    pageUrl,
    lang,
    htmlLang: htmlLang || lang,
    meta,
    faq: [
      { q: ui.practHall, a: [hours.hallSummer, ui.practFeeD].filter(Boolean).join('. ') },
      { q: ui.practBas, a: [hours.basWeek, ui.practTowerD].filter(Boolean).join('. ') },
      { q: ui.practAccess, a: ui.practAccessD },
      { q: ui.practMhd, a: ui.practMhdD },
    ].filter((row) => row.q && row.a),
    chapters: [
      { id: 'gate', name: ui.gateK },
      { id: 'pathways', name: ui.pathK },
      { id: 'lessons', name: ui.lesK },
      { id: 'suburb', name: ui.subK },
      { id: 'walk', name: ui.walkK },
      { id: 'eternity', name: ui.finH },
    ].filter((ch) => ch.name),
    altars: [
      ui.aAndrew,
      ui.aBarbara,
      ui.aElis,
      ui.aAnn,
      ui.aMager,
      ui.aCross,
      ui.aPieta,
      ui.aApol,
      ui.aNat,
      ui.aEras,
      ui.aSor,
    ].filter(Boolean),
    tripName: ui.walkH,
    altarTitle: ui.altK,
  });
}
