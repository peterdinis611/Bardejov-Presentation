import { expect, test } from '@playwright/test';
import {
  CHAPTERS,
  GATE_COPY,
  LANGS,
  fireLang,
  fireSpeak,
  lastSpoken,
  mockSpeech,
  openSite,
  playingId,
  spoken,
  ttsStats,
  watchPageErrors,
} from './helpers.js';

test.describe('chapter speech stress', () => {
  test.describe.configure({ timeout: 45_000 });

  test('rapid cycle through every chapter keeps a single playing button', async ({ page }) => {
    await mockSpeech(page);
    const errors = watchPageErrors(page);
    await openSite(page);

    const rounds = 24;
    await page.evaluate(
      ({ ids, rounds: n }) => {
        for (let i = 0; i < n; i++) {
          const id = ids[i % ids.length];
          document.querySelector(`.nav-speak[data-speak="${id}"]`)?.click();
        }
      },
      { ids: CHAPTERS, rounds }
    );

    const lastId = CHAPTERS[(rounds - 1) % CHAPTERS.length];
    expect(await playingId(page)).toBe(lastId);
    await expect(page.locator('.nav-speak.is-on')).toHaveCount(1);
    expect((await spoken(page)).length).toBe(rounds);
    const stats = await ttsStats(page);
    expect(stats.speak).toBe(rounds);
    expect(stats.cancel).toBeGreaterThanOrEqual(rounds - 1);
    expect(errors.filter((e) => !/webgl|three|WebGL/i.test(e))).toEqual([]);
  });

  test('fifty toggles of one chapter end in a stable on/off state', async ({ page }) => {
    await mockSpeech(page);
    const errors = watchPageErrors(page);
    await openSite(page);

    const clicks = 50;
    await page.evaluate((n) => {
      const btn = document.querySelector('.nav-speak[data-speak="gate"]');
      for (let i = 0; i < n; i++) btn.click();
    }, clicks);

    expect(await playingId(page)).toBeNull();
    expect((await spoken(page)).length).toBe(clicks / 2);
    await expect(page.locator('.nav-speak[data-speak="gate"]')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(errors.filter((e) => !/webgl|three|WebGL/i.test(e))).toEqual([]);
  });

  test('double-click does not leave two chapters playing', async ({ page }) => {
    await mockSpeech(page);
    await openSite(page);
    await page.locator('.nav-speak[data-speak="suburb"]').dblclick();
    await expect(page.locator('.nav-speak.is-on')).toHaveCount(0);
    expect((await spoken(page)).length).toBe(1);
  });

  test('language hammer while a chapter is playing stays on that chapter', async ({ page }) => {
    await mockSpeech(page);
    const errors = watchPageErrors(page);
    await openSite(page);
    await fireSpeak(page, 'gate');

    const rounds = 8;
    for (let i = 0; i < rounds; i++) {
      for (const lang of LANGS) {
        await fireLang(page, lang);
      }
    }

    expect(await playingId(page)).toBe('gate');
    await expect(page.locator('.nav-speak.is-on')).toHaveCount(1);
    const line = await lastSpoken(page);
    expect(line.text).toMatch(GATE_COPY.uk);
    expect(line.lang.toLowerCase().startsWith('uk')).toBeTruthy();
    expect((await spoken(page)).length).toBe(1 + rounds * LANGS.length);
    expect(errors.filter((e) => !/webgl|three|WebGL/i.test(e))).toEqual([]);
  });

  test('simultaneous clicks leave only the last chapter on', async ({ page }) => {
    await mockSpeech(page);
    await openSite(page);
    await page.evaluate((ids) => {
      ids.forEach((id) => {
        document.querySelector(`.nav-speak[data-speak="${id}"]`)?.click();
      });
    }, CHAPTERS);
    expect(await playingId(page)).toBe(CHAPTERS.at(-1));
    await expect(page.locator('.nav-speak.is-on')).toHaveCount(1);
    expect((await lastSpoken(page)).text.length).toBeGreaterThan(220);
  });

  test('viewport thrash while switching chapters does not throw', async ({ page }) => {
    await mockSpeech(page);
    const errors = watchPageErrors(page);
    await openSite(page);

    const sizes = [
      { width: 390, height: 844 },
      { width: 1280, height: 720 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ];
    for (let i = 0; i < 12; i++) {
      await page.setViewportSize(sizes[i % sizes.length]);
      await fireSpeak(page, CHAPTERS[i % CHAPTERS.length]);
    }

    await expect(page.locator('.nav-speak.is-on')).toHaveCount(1);
    expect((await spoken(page)).length).toBe(12);
    expect(errors.filter((e) => !/webgl|three|WebGL/i.test(e))).toEqual([]);
  });

  test('mobile menu open/close hammer still plays', async ({ page }) => {
    await mockSpeech(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openSite(page);
    const burger = page.locator('.nav-burger');

    for (let i = 0; i < 10; i++) {
      await burger.click();
      await expect(page.locator('#nav')).toHaveClass(/menu-open/);
      await fireSpeak(page, CHAPTERS[i % CHAPTERS.length]);
      await expect(page.locator('#nav')).not.toHaveClass(/menu-open/);
    }

    expect(await playingId(page)).toBe(CHAPTERS[9 % CHAPTERS.length]);
    expect((await spoken(page)).length).toBe(10);
  });

  test('Chrome keep-alive pokes pause/resume on a long chapter', async ({ page }) => {
    test.slow();
    await mockSpeech(page);
    await openSite(page);
    await fireSpeak(page, 'gate');
    expect(await playingId(page)).toBe('gate');
    await page.waitForTimeout(12_200);
    const stats = await ttsStats(page);
    expect(stats.pause).toBeGreaterThanOrEqual(1);
    expect(stats.resume).toBeGreaterThanOrEqual(1);
    expect(await playingId(page)).toBe('gate');
  });
});
