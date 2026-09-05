import { expect, test } from '@playwright/test';
import { openSite } from './helpers.js';

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
  await openSite(page, '/?lang=sk&here=forum');
  await expect(page.locator('#here-cap')).toHaveText(/FORUM/);
  await expect(page.locator('.plan-plaza')).toHaveClass(/is-here/);
  await expect(page.locator('#here-pin')).toBeVisible();

  await page.goto('/?lang=sk&here=suburb');
  await page.locator('#pre').waitFor({ state: 'hidden', timeout: 8_000 });
  await expect(page.locator('#here-cap')).toHaveText(/SUBURBIUM/);
  await expect(page.locator('.plan-sub')).toHaveClass(/is-here/);
});

test('pocket ticket carries prices and map links', async ({ page }) => {
  await openSite(page);
  const ticket = page.locator('#ticket');
  await expect(ticket.getByText(/6 €/)).toBeVisible();
  await expect(ticket.getByText(/4 €/)).toBeVisible();
  await expect(ticket.locator('a[href*="49.29442"]')).toHaveAttribute('href', /openstreetmap/);
  await expect(ticket.locator('a[href*="49.32715"]')).toHaveCount(1);
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
