#!/usr/bin/env node
// Health check for the site. Exit codes: 0 up, 1 down, 2 NOT RUN (never treat 2 as up).
import { appendFileSync } from 'node:fs';

const base = (process.env.SITE_URL ?? '').trim().replace(/\/+$/, '');
const marker = process.env.PAGE_MARKER ?? 'Muhammad Abdullah';
const healthPath = process.env.HEALTH_PATH ?? '/api/health';
const attempts = Number(process.env.ATTEMPTS ?? 3);
const delayMs = Number(process.env.RETRY_DELAY_MS ?? 10000);
const timeoutMs = Number(process.env.TIMEOUT_MS ?? 10000);

if (!/^https?:\/\/.+/.test(base)) {
  console.error('NOT RUN: SITE_URL is missing or not a web address. This is not a pass.');
  process.exit(2);
}

const checks = [
  { name: 'home page', path: '/', ok: (res, text) => res.status === 200 && text.includes(marker) },
];
if (healthPath !== 'skip') {
  checks.push({
    name: 'backend health',
    path: healthPath,
    ok: (res, text) => {
      if (res.status !== 200) return false;
      try { return JSON.parse(text).ok === true; } catch { return false; }
    },
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(check) {
  let last = 'no attempt made';
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(base + check.path, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
      const text = await res.text();
      if (check.ok(res, text)) return { ...check, up: true, detail: `HTTP ${res.status}` };
      last = `HTTP ${res.status}, response did not look right`;
    } catch (err) {
      last = `request failed: ${err?.name ?? 'error'}`;
    }
    if (i < attempts) await sleep(delayMs);
  }
  return { ...check, up: false, detail: `${last} (after ${attempts} tries)` };
}

const results = [];
for (const check of checks) results.push(await run(check));

const lines = results.map((r) => `${r.up ? 'UP  ' : 'DOWN'} ${r.name}: ${r.detail}`);
const allUp = results.every((r) => r.up);
console.log(`${base}\n${lines.join('\n')}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${allUp ? 'Site is up' : 'Site is DOWN'}\n\n${base}\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`);
}
process.exit(allUp ? 0 : 1);
