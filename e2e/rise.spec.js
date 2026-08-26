import { expect, test } from '@playwright/test';
import { openSite } from './helpers.js';

test('rise control appears after scroll and returns to the gate', async ({ page }) => {
  await openSite(page);
  const rise = page.locator('#rise');
  await expect(rise).toHaveCount(1);
  await expect(rise).not.toHaveClass(/on/);
  await expect(rise).toHaveCSS('visibility', 'hidden');

  await page.locator('#eternity').scrollIntoViewIfNeeded();
  await expect(rise).toHaveClass(/on/);
  await expect(rise).toHaveCSS('visibility', 'visible');
  await expect(page.locator('.foot-rise')).toContainText(/Na bránu/i);

  await rise.click();
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeLessThan(8);
  await expect(rise).not.toHaveClass(/on/);
});

test('footer rise link also returns to the top', async ({ page }) => {
  await openSite(page);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.locator('.foot-rise').click();
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeLessThan(8);
});

test('rise is tappable on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page);
  const rise = page.locator('#rise');
  await page.locator('#eternity').scrollIntoViewIfNeeded();
  await expect(rise).toHaveClass(/on/);
  const box = await rise.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await rise.click();
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeLessThan(8);
});
