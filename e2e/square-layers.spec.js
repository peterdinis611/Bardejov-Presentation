import { expect, test } from '@playwright/test';
import { lastSpoken, mockSpeech, openSite } from './helpers.js';

test('then/now slider moves the photogravure threshold', async ({ page }) => {
  await openSite(page);
  const old = page.locator('.then-old');
  const range = page.locator('#then-range');
  await expect(page.locator('#then')).toBeVisible();
  await range.evaluate((el) => {
    el.value = '22';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const clip = await old.evaluate((el) => getComputedStyle(el).clipPath);
  expect(clip).toMatch(/78%/);
});

test('GPS demo lights FORUM and SUBURBIUM on the plan', async ({ page }) => {
  await mockSpeech(page);
  await openSite(page, '/?lang=sk&here=forum');
  await expect(page.locator('#here-cap')).toHaveText(/FORUM/);
  await expect(page.locator('.plan-plaza')).toHaveClass(/is-here/);
  await expect(page.locator('#here-pin')).toBeVisible();

  await page.goto('/?lang=sk&here=suburb');
  await page.locator('#pre').waitFor({ state: 'hidden', timeout: 8_000 });
  await expect(page.locator('#here-cap')).toHaveText(/SUBURBIUM/);
  await expect(page.locator('.plan-sub')).toHaveClass(/is-here/);
});

test('arriving at a zone speaks its chapter once', async ({ page }) => {
  await mockSpeech(page);
  await openSite(page, '/?lang=sk&here=forum');
  const first = await lastSpoken(page);
  expect(first?.text).toMatch(/Radničné námestie/);

  await page.goto('/?lang=sk&here=suburb');
  await page.locator('#pre').waitFor({ state: 'hidden', timeout: 8_000 });
  const second = await lastSpoken(page);
  expect(second?.text).toMatch(/predmestie|synagóg/i);
});

test('pocket ticket carries prices, access and map links', async ({ page }) => {
  await openSite(page);
  const ticket = page.locator('#ticket');
  await expect(ticket.getByText(/6 €/)).toBeVisible();
  await expect(ticket.getByText(/4 €/)).toBeVisible();
  await expect(ticket.getByText(/72 m/)).toBeVisible();
  await expect(ticket.locator('a[href*="49.29442"]')).toHaveAttribute('href', /openstreetmap/);
  await expect(ticket.locator('a[href*="49.32715"]')).toHaveCount(1);
});

test('rainy dusk tells you to leave the walls', async ({ page }) => {
  const sunset = new Date(Date.now() + 40 * 60 * 1000).toISOString();
  await openSite(page, '/?lang=sk', {
    weather: {
      current: { temperature_2m: 8, weather_code: 61 },
      daily: { sunset: [sunset] },
    },
  });
  await expect(page.locator('#dusk-hint')).toHaveText(/dážď/i, { timeout: 8_000 });
});

test('shared itinerary opens the same day length', async ({ page }) => {
  await openSite(page, '/?lang=pl&iter=half#walk');
  await expect(page.locator('.itab[data-iter="half"]')).toHaveClass(/on/);
  await expect(page.locator('#walk')).toBeInViewport();
  await expect(page.locator('#iter-share')).toHaveText(/długość dnia|dĺžku dňa|length/i);
  expect(page.url()).toMatch(/iter=half/);
  expect(page.url()).toMatch(/lang=pl/);
  expect(page.url()).toMatch(/#walk/);
  await page.locator('[data-iter="full"]').click();
  expect(page.url()).toMatch(/iter=full/);
  expect(page.url()).toMatch(/lang=pl/);
});

test('three burgher plots open a guild sheet', async ({ page }) => {
  await openSite(page);
  await expect(page.locator('#plots .plot')).toHaveCount(3);
  await page.locator('#plots [data-guild="weavers"]').click();
  await expect(page.locator('#sheet')).toHaveClass(/on/);
  await expect(page.locator('#sheet-title')).toHaveText(/Tkáči/);
});

test('PWA manifest and service worker are published', async ({ page }) => {
  await openSite(page);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    /manifest\.webmanifest/
  );
  const man = await page.request.get('/manifest.webmanifest');
  expect(man.ok()).toBeTruthy();
  const body = await man.json();
  expect(body.short_name).toMatch(/Bardejov/);
  const sw = await page.request.get('/sw.js');
  expect(sw.ok()).toBeTruthy();
});
