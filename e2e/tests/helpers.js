const fs = require('node:fs');
const path = require('node:path');
const { test: base, expect } = require('@playwright/test');

const SHOTS = path.join(__dirname, '..', 'shots');

const URLS = {
  sayab: process.env.SAYAB_URL || 'https://hti5gehhgooawm33auws625esm0vbymx.lambda-url.ap-southeast-2.on.aws/',
  multiTier: process.env.MULTI_TIER_URL || 'https://multi-tier-app.pages.dev/',
  skillTree: process.env.SKILL_TREE_URL || 'https://skill-tree-explorer.pages.dev/',
};

// Fixture: collects console errors, page errors and failed same-origin requests; exposes shot() and
// assertNoHScroll(). The test fails in afterEach if any console error was seen.
const test = base.extend({
  guard: async ({ page }, use, testInfo) => {
    const errors = [];
    const allowed = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      if (allowed.some((re) => re.test(m.text()))) return;
      errors.push(`console: ${m.text()}`);
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    const dir = path.join(SHOTS, testInfo.project.name);
    fs.mkdirSync(dir, { recursive: true });
    let n = 0;
    const slug = testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40);
    const api = {
      errors,
      // Only for a step that deliberately provokes an HTTP error (the browser logs it as a console error).
      allowConsole(re) {
        allowed.push(re);
      },
      async shot(step) {
        n += 1;
        const file = path.join(dir, `${slug}-${String(n).padStart(2, '0')}-${step}.png`);
        await page.screenshot({ path: file, fullPage: true });
        return file;
      },
      async assertNoHScroll(label = '') {
        const m = await page.evaluate(() => ({
          doc: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          inner: window.innerWidth,
        }));
        expect(m.doc, `${label} documentElement scrollWidth ${m.doc} > viewport ${m.inner}`).toBeLessThanOrEqual(m.inner);
        expect(m.body, `${label} body scrollWidth ${m.body} > viewport ${m.inner}`).toBeLessThanOrEqual(m.inner);
      },
    };
    await use(api);
    expect(errors, 'console/page errors').toEqual([]);
  },
});

module.exports = { test, expect, URLS };
