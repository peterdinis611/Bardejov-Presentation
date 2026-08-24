import { expect, test } from '@playwright/test';
import { CHAPTERS, finishSpeech, lastSpoken, mockSpeech, openSite, spoken } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await mockSpeech(page);
});

test('dusk sound control is gone', async ({ page }) => {
  await openSite(page);
  await expect(page.locator('#snd, .snd')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /zvuk súmraku/i })).toHaveCount(0);
});

test('nav has a play control for every chapter', async ({ page }) => {
  await openSite(page);
  const buttons = page.locator('.nav-speak');
  await expect(buttons).toHaveCount(CHAPTERS.length);

  for (const id of CHAPTERS) {
    const btn = page.locator(`.nav-speak[data-speak="${id}"]`);
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect(btn).toHaveAttribute('aria-label', /Prehrať kapitolu/);
  }
});

test('playing a chapter speaks the long copy and marks the button on', async ({ page }) => {
  await openSite(page);
  const btn = page.locator('.nav-speak[data-speak="gate"]');
  await btn.click();

  await expect(btn).toHaveClass(/is-on/);
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(btn).toHaveAttribute('aria-label', /Zastaviť kapitolu/);

  const line = await lastSpoken(page);
  expect(line).toBeTruthy();
  expect(line.text).toMatch(/Radničné námestie/);
  expect(line.text).toMatch(/Unesco/);
  expect(line.text.length).toBeGreaterThan(280);
  expect(line.lang.toLowerCase()).toMatch(/^sk/);
});

test('a second click on the same chapter stops speech', async ({ page }) => {
  await openSite(page);
  const btn = page.locator('.nav-speak[data-speak="pathways"]');
  await btn.click();
  await expect(btn).toHaveClass(/is-on/);
  expect((await spoken(page)).length).toBe(1);

  await btn.click();
  await expect(btn).not.toHaveClass(/is-on/);
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await expect(btn).toHaveAttribute('aria-label', /Prehrať kapitolu/);
  expect((await spoken(page)).length).toBe(1);
});

test('switching chapter speaks the new one and turns the previous off', async ({ page }) => {
  await openSite(page);
  const gate = page.locator('.nav-speak[data-speak="gate"]');
  const spa = page.locator('.nav-speak[data-speak="eternity"]');

  await gate.click();
  await expect(gate).toHaveClass(/is-on/);

  await spa.click();
  await expect(spa).toHaveClass(/is-on/);
  await expect(gate).not.toHaveClass(/is-on/);

  const line = await lastSpoken(page);
  expect(line.text).toMatch(/Bardejovské Kúpele|prameň/);
  expect((await spoken(page)).length).toBe(2);
});

test('speech end clears the playing state', async ({ page }) => {
  await openSite(page);
  const btn = page.locator('.nav-speak[data-speak="suburb"]');
  await btn.click();
  await expect(btn).toHaveClass(/is-on/);

  await finishSpeech(page);
  await expect(btn).not.toHaveClass(/is-on/);
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
});

test('play scrolls the chapter into view', async ({ page }) => {
  await openSite(page);
  await page.locator('.nav-speak[data-speak="lessons"]').click();
  await expect(page.locator('#lessons')).toBeInViewport();
});

test('changing language resumes the chapter in the new tongue', async ({ page }) => {
  await openSite(page);
  await page.locator('.nav-speak[data-speak="gate"]').click();
  expect((await lastSpoken(page)).text).toMatch(/Radničné námestie/);

  await page.locator('#lingua-btn').click();
  await page.locator('#lingua-list [data-lang="en"]').click();

  await expect(page.locator('#lingua-now')).toHaveText('EN');
  await expect(page.locator('.nav-speak[data-speak="gate"]')).toHaveClass(/is-on/);
  await expect(page.locator('.nav-speak[data-speak="gate"]')).toHaveAttribute(
    'aria-label',
    /Stop chapter/
  );

  const line = await lastSpoken(page);
  expect(line.text).toMatch(/Town Hall Square/);
  expect(line.lang.toLowerCase()).toMatch(/^en/);
});

test('mobile menu can play a chapter', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page);

  await page.locator('.nav-burger').click();
  await expect(page.locator('#nav')).toHaveClass(/menu-open/);

  const btn = page.locator('.nav-speak[data-speak="suburb"]');
  await expect(btn).toBeVisible();
  await btn.click();

  await expect(page.locator('#nav')).not.toHaveClass(/menu-open/);
  await expect(btn).toHaveClass(/is-on/);
  expect((await lastSpoken(page)).text).toMatch(/predmestie|synagóg/i);
});
