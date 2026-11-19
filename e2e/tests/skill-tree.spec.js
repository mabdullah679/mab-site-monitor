const { test, expect, URLS } = require('./helpers');

const header = (page) => page.locator('header');
const node = (page, i) => page.locator('button.skill-node').nth(i);

async function signInAs(page, role) {
  await page.goto(URLS.skillTree + 'auth');
  await page.getByRole('button', { name: new RegExp(role) }).click();
}

test.describe('skill-tree-explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URLS.skillTree + 'auth');
    await page.evaluate(() => localStorage.clear());
  });

  test('role picker: explains itself, neutral branding, tight layout', async ({ page, guard }) => {
    await page.goto(URLS.skillTree);
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page).toHaveTitle('Skill Tree Explorer');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Skill Tree Explorer');
    await expect(page.getByTestId('what-this-is')).toContainText('gamified career skill tree');
    await expect(page.locator('body')).not.toContainText(/create futures/i);
    await expect(page.getByRole('button', { name: /Apprentice/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Admin/ })).toBeVisible();
    const box = await page.getByRole('heading', { level: 1 }).boundingBox();
    expect(box.y, 'heading should sit in the top of the page, not mid-screen').toBeLessThan(250);
    await guard.assertNoHScroll('role picker');
    await guard.shot('picker');
  });

  test('apprentice: seeded XP, earn XP on a node, persists, Switch Role, Reset Progress', async ({ page, guard }) => {
    await signInAs(page, 'Apprentice');
    await expect(header(page)).toContainText('470');
    await expect(header(page)).toContainText('3/26');
    await expect(page.locator('button.skill-node')).toHaveCount(26);
    await guard.assertNoHScroll('tree');
    await guard.shot('tree');

    await node(page, 3).click();
    await expect(page.getByTestId('prereq-name').first()).toHaveText('CDL Class A');
    await guard.shot('node-open');
    await page.getByRole('button', { name: 'Complete Stage 1' }).click();
    await expect(page.getByText('XP Rewarded: 30')).toBeVisible();
    await expect(header(page)).toContainText('500');
    await expect(header(page)).toContainText('4/26');
    await guard.shot('xp-earned');

    await page.reload();
    await expect(header(page)).toContainText('500');

    await header(page).getByRole('button', { name: /Reset Progress/ }).click();
    await expect(page.getByText('Reset all progress?')).toBeVisible();
    await guard.shot('reset-dialog');
    await page.getByRole('alertdialog').getByRole('button', { name: /Reset/ }).last().click();
    await expect(header(page)).toContainText('470');
    await expect(header(page)).toContainText('3/26');
    await guard.shot('reset-done');

    await header(page).getByRole('button', { name: /Switch Role/ }).click();
    await expect(page).toHaveURL(/\/auth$/);
    await guard.shot('switched');
  });

  test('locked skill offers no Start button; unlocked one opens its learning page', async ({ page, guard }) => {
    await signInAs(page, 'Apprentice');
    await node(page, 25).click();
    await expect(page.getByText('Complete prerequisites to unlock this skill')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Learning' })).toHaveCount(0);
    await guard.shot('locked');
    await page.keyboard.press('Escape');
    await node(page, 3).click();
    await page.getByRole('button', { name: 'Complete Stage 1' }).click();
    await node(page, 4).click();
    await page.getByRole('button', { name: 'Start Learning' }).click();
    await expect(page).toHaveURL(/\/learn\/.+/);
    await expect(page.getByRole('heading', { name: /Rigging & Knots/ })).toBeVisible();
    await guard.assertNoHScroll('learn page');
    await guard.shot('learn');
  });

  test('admin: lands on the panel, phases expand, no sideways scroll; apprentice cannot open /admin', async ({ page, guard }) => {
    await signInAs(page, 'Apprentice');
    await page.goto(URLS.skillTree + 'admin');
    await expect(page).not.toHaveURL(/\/admin$/);
    await signInAs(page, 'Admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText('Admin Panel')).toBeVisible();
    await expect(page.getByText('Import from Spreadsheet')).toBeVisible();
    await expect(page.getByRole('button', { name: /Add New Stage/ }).first()).toBeVisible();
    await guard.assertNoHScroll('admin');
    await guard.shot('admin');
    await page.getByRole('button', { name: /Edit/ }).nth(1).click();
    await guard.shot('admin-edit');
  });
});
