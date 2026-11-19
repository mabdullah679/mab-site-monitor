Showcase e2e, in plain words

This is a robot that opens three of our live demo sites in a real browser, clicks through them like a visitor, and checks that what shows up on screen is right. It does this twice: once at laptop width and once at phone width. It fails if the page scrolls sideways, if the browser reports any error, or if the words on screen are wrong. It takes a picture at every step and saves them in the shots folder.

To run it: go into the e2e folder, run npm ci, then npx playwright install chromium, then npm run e2e. It needs Node 22 or newer.

The sites it checks are sayab, multi-tier-app and skill-tree-explorer. It only uses public pages and needs no passwords. It does not cover cloudifystudio.app, kosarcuisine.com, digital-art-store or ui-builder.
