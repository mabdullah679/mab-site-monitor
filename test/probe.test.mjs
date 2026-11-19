import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { probeOne, push } from '../scripts/probe.mjs';

const serve = (handler) => new Promise((r) => { const s = http.createServer(handler).listen(0, '127.0.0.1', () => r(s)); });
const base = (s) => `http://127.0.0.1:${s.address().port}`;

test('probeOne marks a good site up and records status and latency', async () => {
  const s = await serve((q, r) => { r.setHeader('content-type', 'text/html'); r.end(q.url === '/h' ? '{"ok":true}' : 'hello Muhammad'); });
  const out = await probeOne({ project: 'x', url: base(s), marker: 'Muhammad', health: '/h' });
  s.close();
  assert.deepEqual(out.checks.map((c) => [c.name, c.ok, c.status]), [['home page', true, 200], ['backend health', true, 200]]);
  assert.ok(out.checks[0].latencyMs >= 0);
});

test('probeOne marks a wrong marker and a bad health body down', async () => {
  const s = await serve((q, r) => r.end(q.url === '/h' ? '{"ok":false}' : 'nothing here'));
  const out = await probeOne({ project: 'x', url: base(s), marker: 'Muhammad', health: '/h' });
  s.close();
  assert.deepEqual(out.checks.map((c) => c.ok), [false, false]);
});

test('probeOne reports an unreachable site as down, not as an exception', async () => {
  const out = await probeOne({ project: 'x', url: 'http://127.0.0.1:1', marker: null, health: null }, 1500);
  assert.equal(out.checks[0].ok, false);
  assert.equal(out.checks[0].status, null);
});

test('push sends the bearer token and the project body', async () => {
  let seen;
  const s = await serve((q, r) => { let b = ''; q.on('data', (d) => (b += d)); q.on('end', () => { seen = { auth: q.headers.authorization, body: JSON.parse(b) }; r.statusCode = 201; r.end('{}'); }); });
  const code = await push(base(s) + '/api/admin/ingest', 'tok', { project: 'p', checks: [] });
  s.close();
  assert.equal(code, 201);
  assert.equal(seen.auth, 'Bearer tok');
  assert.equal(seen.body.project, 'p');
});

test('without a token the script is NOT RUN (exit 2), never a pass', () => {
  const r = spawnSync(process.execPath, ['scripts/probe.mjs'], { env: { PATH: process.env.PATH }, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /NOT RUN/);
});

test('the token never appears in the output', async () => {
  const s = await serve((q, r) => { r.statusCode = 201; r.end('{}'); });
  const f = join(mkdtempSync(join(tmpdir(), 'probe-')), 'p.json');
  writeFileSync(f, JSON.stringify([{ project: 'local', url: base(s), marker: null, health: null }]));
  const r = spawnSync(process.execPath, ['scripts/probe.mjs'], { env: { PATH: process.env.PATH, PROJECTS_FILE: f, INGEST_TOKEN: 'SECRETVALUE123', INGEST_URL: base(s) + '/api/admin/ingest' }, encoding: 'utf8', timeout: 60000 });
  s.close();
  assert.ok(!r.stdout.includes('SECRETVALUE123') && !r.stderr.includes('SECRETVALUE123'));
});
