#!/usr/bin/env node
// Probes each project in projects.json (public signals only: status code and latency) and pushes the
// result to the admin page's ingest endpoint. Nothing here is secret except INGEST_TOKEN, which the
// workflow reads from AWS Parameter Store at run time and masks.
// Exit codes: 0 pushed, 1 a push failed, 2 NOT RUN (never treat 2 as pass).
import { readFileSync } from 'node:fs';

export async function probeOne(p, timeoutMs = 10000) {
  const targets = [{ name: 'home page', path: '/', marker: p.marker }];
  if (p.health) targets.push({ name: 'backend health', path: p.health, json: true });
  const checks = [];
  for (const t of targets) {
    const started = Date.now();
    try {
      const res = await fetch(p.url.replace(/\/+$/, '') + t.path, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
      const text = await res.text();
      let ok = res.status === 200;
      if (ok && t.marker) ok = text.includes(t.marker);
      if (ok && t.json) { try { ok = JSON.parse(text).ok === true; } catch { ok = false; } }
      checks.push({ name: t.name, ok, status: res.status, latencyMs: Date.now() - started, note: ok ? '' : 'unexpected response' });
    } catch (err) {
      checks.push({ name: t.name, ok: false, status: null, latencyMs: null, note: `request failed: ${err?.name ?? 'error'}` });
    }
  }
  return { project: p.project, checks };
}

export async function push(ingestUrl, token, body) {
  const res = await fetch(ingestUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  return res.status;
}

async function main() {
  const token = process.env.INGEST_TOKEN ?? '';
  const ingestUrl = process.env.INGEST_URL ?? '';
  if (!token || !/^https:\/\//.test(ingestUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(ingestUrl)) {
    console.error('NOT RUN: INGEST_TOKEN or INGEST_URL is missing. This is not a pass.');
    process.exit(2);
  }
  const projects = JSON.parse(readFileSync(process.env.PROJECTS_FILE ?? new URL('../projects.json', import.meta.url), 'utf8'));
  let failed = 0;
  for (const p of projects) {
    const result = await probeOne(p);
    const status = await push(ingestUrl, token, result);
    const up = result.checks.filter((c) => c.ok).length;
    console.log(`${p.project}: ${up}/${result.checks.length} up, pushed -> HTTP ${status}`);
    if (status !== 201) failed++;
  }
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
