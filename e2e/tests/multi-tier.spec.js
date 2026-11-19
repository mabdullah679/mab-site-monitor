const { test, expect, URLS } = require('./helpers');

test.describe('multi-tier-app (React + API)', () => {
  test('landing: heading, what-it-demonstrates line, backend OK badge, no sideways scroll', async ({ page, guard }) => {
    await page.goto(URLS.multiTier);
    await expect(page.getByRole('heading', { name: 'Hello, Multi-Tier App!' })).toBeVisible();
    await expect(page.getByTestId('demonstrates')).toContainText('What this demonstrates');
    await expect(page.getByTestId('health')).toContainText('Backend OK (served by');
    await guard.assertNoHScroll('landing');
    await guard.shot('landing');
  });

  test('Re-check re-queries the API and the badge settles on OK', async ({ page, guard }) => {
    await page.goto(URLS.multiTier);
    await expect(page.getByTestId('health')).toContainText('Backend OK');
    const [resp] = await Promise.all([
      page.waitForResponse((r) => new URL(r.url()).pathname === '/api/health'),
      page.getByRole('button', { name: 'Re-check' }).click(),
    ]);
    expect(resp.status()).toBe(200);
    await expect(page.getByTestId('health')).toContainText('Backend OK (served by');
    await guard.shot('rechecked');
  });

  test('Greet shows a clear result block with the name and who answered', async ({ page, guard }) => {
    await page.goto(URLS.multiTier);
    await page.getByLabel('Your name').fill('Ada Lovelace');
    await page.getByRole('button', { name: 'Greet' }).click();
    const box = page.getByTestId('greet-result');
    await expect(box).toContainText('Hello, Ada Lovelace!');
    await expect(box).toContainText('Answered by the API on:');
    await expect(box).toBeInViewport();
    await guard.assertNoHScroll('greet result');
    await guard.shot('greeted');
  });

  test('bad input is rejected with a visible message, not a crash', async ({ page, guard }) => {
    guard.allowConsole(/status of 400/); // the browser logs the deliberate 400 as a console error
    await page.goto(URLS.multiTier);
    await page.getByLabel('Your name').fill('<script>');
    await page.getByRole('button', { name: 'Greet' }).click();
    await expect(page.getByRole('alert')).toContainText('may only contain letters');
    await expect(page.getByTestId('greet-result')).toHaveCount(0);
    await guard.shot('rejected');
    await page.getByLabel('Your name').fill('');
    await page.getByRole('button', { name: 'Greet' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await guard.shot('empty');
  });
});
