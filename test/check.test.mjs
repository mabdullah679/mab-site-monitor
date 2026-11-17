import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

let server, base, mode = 'up';
before(async () => {
  server = createServer((req, res) => {
    if (mode === 'down') { res.statusCode = 500; return res.end('boom'); }
    if (req.url === '/api/health') {
      res.setHeader('content-type', 'application/json');
      return res.end(mode === 'badapi' ? '{"ok":false}' : '{"ok":true}');
    }
    res.end(mode === 'wrongpage' ? '<h1>parked domain</h1>' : '<h1>Muhammad Abdullah</h1>');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const run = (env) =>
  new Promise((resolve) => {
    const { spawn } = require_spawn();
    const p = spawn(process.execPath, ['scripts/check.mjs'], { env: { PATH: process.env.PATH, ATTEMPTS: '2', RETRY_DELAY_MS: '10', TIMEOUT_MS: '1000', ...env } });
    let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, out }));
  });
import { spawn } from 'node:child_process';
const require_spawn = () => ({ spawn });

test('up site exits 0', async () => { mode = 'up'; assert.equal((await run({ SITE_URL: base })).code, 0); });
test('server error exits 1', async () => { mode = 'down'; assert.equal((await run({ SITE_URL: base })).code, 1); });
test('wrong page (parked domain) exits 1', async () => { mode = 'wrongpage'; assert.equal((await run({ SITE_URL: base })).code, 1); });
test('backend reporting not ok exits 1', async () => { mode = 'badapi'; assert.equal((await run({ SITE_URL: base })).code, 1); });
test('nothing listening exits 1', async () => assert.equal((await run({ SITE_URL: 'http://127.0.0.1:1' })).code, 1));
test('missing SITE_URL exits 2 (not run, not a pass)', async () => { const r = await run({}); assert.equal(r.code, 2); assert.match(r.out, /NOT RUN/); });
test('garbage SITE_URL exits 2', async () => assert.equal((await run({ SITE_URL: 'mab.observer' })).code, 2));
test('retry rides out one failure', async () => {
  mode = 'up';
  let hits = 0;
  const flaky = createServer((req, res) => { if (hits++ === 0) { res.statusCode = 503; return res.end('x'); } res.setHeader('content-type', 'application/json'); res.end(req.url === '/api/health' ? '{"ok":true}' : 'Muhammad Abdullah'); });
  await new Promise((r) => flaky.listen(0, '127.0.0.1', r));
  const r = await run({ SITE_URL: `http://127.0.0.1:${flaky.address().port}`, ATTEMPTS: '3' });
  flaky.close();
  assert.equal(r.code, 0);
});
