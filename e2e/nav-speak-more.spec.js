import { expect, test } from '@playwright/test';
import {
  CHAPTERS,
  GATE_COPY,
  LANGS,
  PLAY_LABEL,
  STOP_LABEL,
  finishSpeech,
  fireLang,
  lastSpoken,
  mockSpeech,
  openSite,
  playingId,
  spoken,
} from './helpers.js';

test('nav link scrolls without starting speech', async ({ page }) => {
  await mockSpeech(page);
  await openSite(page);
  await page.locator('.nav-link[href="#eternity"]').click();
  await expect(page.locator('#eternity')).toBeInViewport();
  expect(await spoken(page)).toEqual([]);
  expect(await playingId(page)).toBeNull();
});

test('hash load does not autoplay a chapter', async ({ page }) => {
  await mockSpeech(page);
  await openSite(page, '/?lang=sk#suburb');
  await expect(page.locator('#suburb')).toBeInViewport();
  expect(await spoken(page)).toEqual([]);
});

test('every chapter has its own long spoken copy', async ({ page }) => {
  await mockSpeech(page);
  await openSite(page);
  const texts = [];
  for (const id of CHAPTERS) {
    await page.locator(`.nav-speak[data-speak="${id}"]`).click();
    const line = await lastSpoken(page);
    expect(line.text.length).toBeGreaterThan(220);
    texts.push(line.text);
  }
  expect(new Set(texts).size).toBe(CHAPTERS.length);
  expect(await playingId(page)).toBe('eternity');
  await expect(page.locator('.nav-speak.is-on')).toHaveCount(1);
});

test('keyboard Enter starts and Space stops a chapter', async ({ page }) => {
  await mockSpeech(page);
  await openSite(page);
  const btn = page.locator('.nav-speak[data-speak="gate"]');
  await btn.focus();
  await btn.press('Enter');
  await expect(btn).toHaveClass(/is-on/);
  expect((await lastSpoken(page)).text).toMatch(GATE_COPY.sk);
  await btn.press('Space');
  await expect(btn).not.toHaveClass(/is-on/);
  expect((await spoken(page)).length).toBe(1);
});

test('finished chapter can be played again', async ({ page }) => {
  await mockSpeech(page);
  await openSite(page);
  const btn = page.locator('.nav-speak[data-speak="pathways"]');
  await btn.click();
  await finishSpeech(page);
  await expect(btn).not.toHaveClass(/is-on/);
  await btn.click();
  await expect(btn).toHaveClass(/is-on/);
  expect((await spoken(page)).length).toBe(2);
});

test('idle language switch does not speak', async ({ page }) => {
  await mockSpeech(page);
  await openSite(page);
  await page.locator('#lingua-btn').click();
  await page.locator('#lingua-list [data-lang="pl"]').click();
  await expect(page.locator('#lingua-now')).toHaveText('PL');
  expect(await spoken(page)).toEqual([]);
  await expect(page.locator('.nav-speak[data-speak="gate"]')).toHaveAttribute(
    'aria-label',
    PLAY_LABEL.pl
  );
});

for (const lang of LANGS) {
  test(`gate chapter speaks ${lang.toUpperCase()} copy`, async ({ page }) => {
    await mockSpeech(page);
    await openSite(page, `/?lang=${lang}`);
    await page.locator('.nav-speak[data-speak="gate"]').click();
    await expect(page.locator('.nav-speak[data-speak="gate"]')).toHaveAttribute(
      'aria-label',
      STOP_LABEL[lang]
    );
    const line = await lastSpoken(page);
    expect(line.text).toMatch(GATE_COPY[lang]);
    expect(line.lang.toLowerCase().startsWith(lang)).toBeTruthy();
    expect(line.rate).toBe(lang === 'en' || lang === 'cs' ? 0.94 : 0.91);
  });
}

test('voices arriving late still start the chapter', async ({ page }) => {
  await mockSpeech(page, { voicesDelayMs: 400 });
  await openSite(page);
  await page.locator('.nav-speak[data-speak="lessons"]').click();
  await expect(page.locator('.nav-speak[data-speak="lessons"]')).toHaveClass(/is-on/, {
    timeout: 5000,
  });
  expect((await lastSpoken(page)).text.length).toBeGreaterThan(220);
});

test('missing speechSynthesis does not throw', async ({ page }) => {
  await mockSpeech(page, { disable: true });
  await openSite(page);
  await page.locator('.nav-speak[data-speak="gate"]').click();
  await expect(page.locator('.nav-speak[data-speak="gate"]')).not.toHaveClass(/is-on/);
  await expect(page.locator('#lessons')).toBeVisible();
});

test('error pages have no chapter playback', async ({ page }) => {
  for (const path of ['/404.html', '/500.html']) {
    await page.goto(path);
    await expect(page.locator('.nav-speak, #snd, .snd')).toHaveCount(0);
  }
});

test('chapter play ends the dusk tour when WebGL is up', async ({ page }) => {
  await mockSpeech(page);
  await openSite(page, '/?lang=sk', { reducedMotion: false });
  await page.locator('#tour-btn').click();
  const touring = await page.locator('html').evaluate((el) => el.classList.contains('is-tour'));
  if (!touring) {
    test.info().annotations.push({ type: 'note', description: 'tour skipped (no WebGL)' });
    return;
  }
  await page.locator('.nav-speak[data-speak="gate"]').click();
  await expect(page.locator('html')).not.toHaveClass(/is-tour/);
  await expect(page.locator('#tour')).toBeHidden();
  await expect(page.locator('.nav-speak[data-speak="gate"]')).toHaveClass(/is-on/);
  expect((await lastSpoken(page)).text).toMatch(GATE_COPY.sk);
});
