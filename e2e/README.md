# showcase e2e

Playwright click-through of the live showcase products: sayab, multi-tier-app, skill-tree-explorer.
Chromium at 1280 px (desktop) and 400 px (phone). Each spec clicks through the real page, asserts what
renders, fails on any console error or sideways scroll, and saves a screenshot per step to `shots/` (gitignored).

Run (Node 22 or newer): `cd e2e && npm ci && npx playwright install chromium && npm run e2e`

Targets can be overridden with `SAYAB_URL`, `MULTI_TIER_URL`, `SKILL_TREE_URL`.
The suite reads public pages only; it needs no secrets. Not covered: cloudifystudio.app, kosarcuisine.com, digital-art-store, ui-builder.
