import { expect, test } from '@playwright/test';
import { openSite } from './helpers.js';

test('pathway cards load photos from /assets, not /assets/assets', async ({ page }) => {
  await openSite(page);
  const cards = [
    ['.card-fr--square img, .card-fr--square .card-shot', '/assets/square-wide'],
    ['.card-fr--basilica img, .card-fr--basilica .card-shot', '/assets/basilica'],
    ['.card-fr--walls img, .card-fr--walls .card-shot', '/assets/walls'],
  ];
  for (const [sel, stem] of cards) {
    const src = await page
      .locator(sel)
      .first()
      .evaluate((el) => {
        const img = el.matches('img') ? el : el.querySelector('img');
        return img?.currentSrc || img?.src || getComputedStyle(el).backgroundImage;
      });
    expect(src, sel).toMatch(new RegExp(`${stem}(?:-\\d+)?\\.(avif|webp|jpg)`));
    expect(src, sel).not.toContain('/assets/assets/');
    const jpg = await page.request.get(`${stem}.jpg`);
    expect(jpg.ok(), `${stem}.jpg`).toBeTruthy();
  }
  const width = await page.locator('.pre-bg').evaluate((img) => img.naturalWidth);
  expect(width).toBeGreaterThan(0);
});
