import { expect, test } from '@playwright/test';
import { openSite } from './helpers.js';

test('head tags carry UNESCO keywords', async ({ page }) => {
  await openSite(page);
  await expect(page).toHaveTitle(/Bardejov UNESCO/i);
  await expect(page.locator('meta[name="keywords"]')).toHaveAttribute(
    'content',
    /Radničné námestie/
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /bazilika sv\. Egídia/
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /UNESCO/);

  const ld = JSON.parse(await page.locator('#ld-json').textContent());
  const attraction = ld['@graph'].find((n) => n['@type'] === 'TouristAttraction');
  expect(attraction.keywords).toMatch(/Bardejov/);
  expect(attraction.identifier).toBe('UNESCO-973');
  expect(attraction.containsPlace.map((p) => p.name)).toContain('Bazilika sv. Egídia');
  expect(attraction.containsPlace[0].geo.latitude).toBeCloseTo(49.29442);
  expect(attraction.sameAs.join(' ')).toMatch(/wikidata|wikipedia|unesco/i);
  expect(ld['@graph'].some((n) => n['@type'] === 'FAQPage')).toBeTruthy();
  expect(ld['@graph'].some((n) => n['@type'] === 'BreadcrumbList')).toBeTruthy();
  expect(ld['@graph'].some((n) => n['@type'] === 'TouristTrip')).toBeTruthy();
  const origin = new URL(page.url()).origin;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/`);
  await expect(page.locator('link[hreflang="sk"]')).toHaveAttribute('href', `${origin}/`);
  await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', `${origin}/en`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    `${origin}/assets/square.jpg`
  );
  await expect(page.locator('.altar-shot').first()).toHaveAttribute('alt', /Ondrej|Andrew/i);
});

test('English language updates title and JSON-LD', async ({ page }) => {
  await openSite(page, '/?lang=en');
  await expect(page).toHaveTitle(/Town Hall Square/);
  await expect(page.locator('meta[name="keywords"]')).toHaveAttribute('content', /St Giles/);
  const origin = new URL(page.url()).origin;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/en`);
  const ld = JSON.parse(await page.locator('#ld-json').textContent());
  expect(ld['@graph'][0].inLanguage).toBe('en');
  const attraction = ld['@graph'].find((n) => n['@type'] === 'TouristAttraction');
  expect(attraction.containsPlace[0].name).toBe('Town Hall Square');
  const faq = ld['@graph'].find((n) => n['@type'] === 'FAQPage');
  expect(faq.mainEntity[0].name).toMatch(/Town Hall|tower|Without/i);
});

test('English path serves the same language as ?lang=en', async ({ page }) => {
  await openSite(page, '/en');
  await expect(page).toHaveTitle(/Town Hall Square/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const origin = new URL(page.url()).origin;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/en`);
});

test('sitemap lists language URLs and photographs', async ({ page }) => {
  const res = await page.request.get('/sitemap.xml');
  expect(res.ok()).toBeTruthy();
  const xml = await res.text();
  expect(xml).toMatch(/hreflang="sk"/);
  expect(xml).toMatch(/\/en</);
  expect(xml).not.toMatch(/\?lang=sk/);
  expect(xml).toMatch(/image:loc/);
  expect(xml).toMatch(/assets\/square\.jpg/);
  expect(xml).toMatch(/assets\/synagogue\.jpg/);
});
