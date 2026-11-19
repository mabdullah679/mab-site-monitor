// Real click-through suite against LIVE public URLs. No secrets, no local servers.
// Override a target with SAYAB_URL / MULTI_TIER_URL / SKILL_TREE_URL (e.g. to test a preview).
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    // Phone width 400, Chromium (deviceScaleFactor/isMobile kept off so layout viewport is exactly 400).
    { name: 'phone-400', use: { ...devices['Desktop Chrome'], viewport: { width: 400, height: 800 } } },
  ],
});
