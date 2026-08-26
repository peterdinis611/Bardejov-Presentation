import { expect, test } from '@playwright/test';
import { openSite } from './helpers.js';

test('guild shields sway in the dusk wind', async ({ page }) => {
  await openSite(page, '/?lang=sk', { reducedMotion: false });
  await page.locator('#guilds').scrollIntoViewIfNeeded();
  await expect(page.locator('#gwall')).toHaveClass(/has-js-wind/);
  const sway = page.locator('.gld-sway').nth(1);
  await expect.poll(async () => sway.evaluate((el) => el.style.transform)).toMatch(/rotate\(/);
  const first = await sway.evaluate((el) => el.style.transform);
  await expect.poll(async () => sway.evaluate((el) => el.style.transform)).not.toBe(first);
});
