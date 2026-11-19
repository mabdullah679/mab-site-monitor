const { test, expect, URLS } = require('./helpers');

test.describe('sayab (Flask on Lambda)', () => {
  test('form page: explains itself, calm colours, no sideways scroll', async ({ page, guard }) => {
    await page.goto(URLS.sayab);
    await expect(page.getByRole('heading', { name: 'Welcome! Please enter your name:' })).toBeVisible();
    await expect(page.locator('#what-this-is')).toContainText('greets you by name');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg, 'body background must not be the old garish orange').not.toBe('rgb(255, 165, 0)');
    const footerBg = await page.evaluate(() => getComputedStyle(document.querySelector('footer')).backgroundColor);
    expect(footerBg, 'footer must not be the old pink').not.toBe('rgb(255, 192, 203)');
    await guard.assertNoHScroll('form page');
    await guard.shot('form');
  });

  test('click-through: type a name, Enter, see the greeting, Back', async ({ page, guard }) => {
    await page.goto(URLS.sayab);
    await page.getByLabel('Your name').fill('jane   doe');
    await guard.shot('typed');
    await page.getByRole('button', { name: 'Enter' }).click();
    await expect(page.locator('#greeting')).toHaveText('Welcome, Jane Doe!');
    await guard.assertNoHScroll('greeting page');
    await guard.shot('greeting');
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome! Please enter your name:' })).toBeVisible();
    await guard.shot('back');
  });

  test('blank name falls back to Guest', async ({ page, guard }) => {
    await page.goto(URLS.sayab);
    await page.getByRole('button', { name: 'Enter' }).click();
    await expect(page.locator('#greeting')).toHaveText('Welcome, Guest!');
    await guard.assertNoHScroll('guest page');
    await guard.shot('guest');
  });

  test('health endpoints answer (backend check, separate from the UI steps above)', async ({ request }) => {
    const h = await request.get(URLS.sayab + 'healthz');
    expect(await h.json()).toEqual({ status: 'ok' });
    const r = await request.get(URLS.sayab + 'readyz');
    expect(await r.json()).toEqual({ status: 'ready' });
  });
});
