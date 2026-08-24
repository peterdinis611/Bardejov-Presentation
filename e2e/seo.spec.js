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
  expect(attraction.containsPlace.map((p) => p.name)).toContain('Bazilika sv. Egídia');
  const origin = new URL(page.url()).origin;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    `${origin}/assets/square.jpg`
  );
});

test('English language updates title and JSON-LD', async ({ page }) => {
  await openSite(page, '/?lang=en');
  await expect(page).toHaveTitle(/Town Hall Square/);
  await expect(page.locator('meta[name="keywords"]')).toHaveAttribute('content', /St Giles/);
  const ld = JSON.parse(await page.locator('#ld-json').textContent());
  expect(ld['@graph'][0].inLanguage).toBe('en');
  expect(ld['@graph'][1].containsPlace[0].name).toBe('Town Hall Square');
});
