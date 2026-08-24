import { expect, test } from '@playwright/test';
import {
  CHAPTERS,
  fireSpeak,
  GATE_COPY,
  LANGS,
  lastSpoken,
  mockSpeech,
  openSite,
  playingId,
  spoken,
  ttsStats,
  watchPageErrors,
} from './helpers.js';

test.describe('chapter speech stress', () => {
  test.describe.configure({ timeout: 15_000 });

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
    expect(errors).toEqual([]);
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
    expect(errors).toEqual([]);
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
    await page.evaluate(
      ({ langs, rounds: n }) => {
        for (let i = 0; i < n; i++) {
          for (const lang of langs) {
            document.querySelector(`#lingua-list [data-lang="${lang}"]`)?.click();
          }
        }
      },
      { langs: LANGS, rounds }
    );

    expect(await playingId(page)).toBe('gate');
    await expect(page.locator('.nav-speak.is-on')).toHaveCount(1);
    const line = await lastSpoken(page);
    expect(line.text).toMatch(GATE_COPY.uk);
    expect(line.lang.toLowerCase().startsWith('uk')).toBeTruthy();
    expect((await spoken(page)).length).toBe(1 + rounds * LANGS.length);
    expect(errors).toEqual([]);
  });

  test('simultaneous clicks leave only the last chapter on', async ({ page }) => {
    await mockSpeech(page);
    await openSite(page);
    await page.evaluate((ids) => {
      ids.forEach((id) => {
        document.querySelector(`.nav-speak[data-speak="${id}"]`)?.click();
      });
    }, CHAPTERS);
    expect(await playingId(page)).toBe(CHAPTERS[CHAPTERS.length - 1]);
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
    for (let i = 0; i < sizes.length; i++) {
      await page.setViewportSize(sizes[i]);
      await fireSpeak(page, CHAPTERS[i % CHAPTERS.length]);
    }

    await expect(page.locator('.nav-speak.is-on')).toHaveCount(1);
    expect((await spoken(page)).length).toBe(sizes.length);
    expect(errors).toEqual([]);
  });

  test('mobile menu open/close hammer still plays', async ({ page }) => {
    await mockSpeech(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openSite(page);
    await page.evaluate((ids) => {
      const burger = document.querySelector('.nav-burger');
      const nav = document.getElementById('nav');
      for (let i = 0; i < ids.length * 2; i++) {
        burger.click();
        if (!nav.classList.contains('menu-open')) throw new Error('menu did not open');
        document.querySelector(`.nav-speak[data-speak="${ids[i % ids.length]}"]`)?.click();
        if (nav.classList.contains('menu-open')) throw new Error('menu stayed open');
      }
    }, CHAPTERS);

    expect(await playingId(page)).toBe(CHAPTERS[CHAPTERS.length - 1]);
    expect((await spoken(page)).length).toBe(CHAPTERS.length * 2);
  });

  test('Chrome keep-alive pokes pause/resume on a long chapter', async ({ page }) => {
    await mockSpeech(page);
    await openSite(page);
    await fireSpeak(page, 'gate');
    expect(await playingId(page)).toBe('gate');
    await expect
      .poll(async () => (await ttsStats(page)).pause, { timeout: 800 })
      .toBeGreaterThanOrEqual(1);
    const stats = await ttsStats(page);
    expect(stats.resume).toBeGreaterThanOrEqual(1);
    expect(await playingId(page)).toBe('gate');
  });
});
