import { expect, test } from '@playwright/test';
import { openSite } from './helpers.js';

test('pathway cards load photos from /assets, not /assets/assets', async ({ page }) => {
  await openSite(page);
  const cards = [
    ['.card-fr--square', '/assets/square-wide.jpg'],
    ['.card-fr--basilica', '/assets/basilica.jpg'],
    ['.card-fr--walls', '/assets/walls.jpg'],
  ];
  for (const [sel, path] of cards) {
    const bg = await page.locator(sel).evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg, sel).toContain(path);
    expect(bg, sel).not.toContain('/assets/assets/');
    const res = await page.request.get(path);
    expect(res.ok(), path).toBeTruthy();
  }
  const width = await page.locator('.pre-bg').evaluate((img) => img.naturalWidth);
  expect(width).toBeGreaterThan(0);
});
