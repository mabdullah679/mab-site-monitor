# mab-site-monitor

Outside health check for mab.observer. It runs on GitHub Actions in this public repo, so it uses free standard runners and is not on Cloudflare: if Cloudflare is down, this still runs and still alerts.

```
GitHub schedule (every 5 min) --> scripts/check.mjs --> https://mab.observer/ and /api/health
                                        |
                       up: close any open "Site is DOWN" issue
            down 4+ times in a row: open one issue (GitHub emails you)
            any down run: that run shows red
```

Not covered: a second, independent monitor. If GitHub itself is down, nothing here runs.

## Status

The schedule is **off**. The site is not deployed yet, so a schedule would report "down" every 5 minutes. Turning it on is two steps:

1. Settings > Secrets and variables > Actions > Variables: add `SITE_URL` = `https://mab.observer`
2. In [health.yml](.github/workflows/health.yml), uncomment the three `schedule` lines.

## What counts as down

Two checks, each tried 3 times, 10 seconds apart, 10 second timeout:

| Check | Passes when |
|-------|-------------|
| home page | HTTP 200 and the page contains the text "Muhammad Abdullah" (so a parked or error page does not count as up) |
| backend health | `/api/health` returns HTTP 200 and `{"ok": true}` |

If the check cannot run at all (no `SITE_URL`), it exits 2 and the run goes red. That is never reported as up.

## Alerts

A site that fails the check **more than 3 runs in a row** (about 20 minutes at a 5 minute schedule) opens one GitHub issue labelled `site-down`, assigned to and mentioning `mabdullah679`, so GitHub emails that account. A recovery closes it. Shorter blips make the run red but send no issue. For the alert to reach you, GitHub notifications must be on for issues in this repo (Watch > Participating and mentions, or All activity) and email or the GitHub mobile app enabled. Failed scheduled runs also email the person who last edited the schedule. **Unverified:** GitHub sends these to the account's notification address, which I cannot read. Confirm in GitHub Settings > Notifications that it is muhammad.abdullah.0913@gmail.com.

Issues here are public, so an outage is visible to anyone. No secrets are used in this repo.

## Known limits

- GitHub's shortest schedule is 5 minutes, and runs can be delayed or dropped at busy times (the start of each hour especially).
- GitHub disables scheduled workflows in a public repo after 60 days without repository activity. [heartbeat.yml](.github/workflows/heartbeat.yml) commits weekly to prevent that. Whether it fully prevents the shutdown is unproven until 60 days pass.
- The heartbeat pushes straight to `main`. If branch protection is ever turned on, it needs an exception.

## Tests

`npm test` runs 8 tests of the check script against local fake servers (up, 500, parked page, bad backend, dead port, missing address, retry). They do not touch the real site.

## Layout

| Path | Role |
|------|------|
| [scripts/check.mjs](scripts/check.mjs) | The health check |
| [test/check.test.mjs](test/check.test.mjs) | Its tests |
| [.github/workflows/health.yml](.github/workflows/health.yml) | Runs the check, opens and closes outage issues |
| [.github/workflows/heartbeat.yml](.github/workflows/heartbeat.yml) | Weekly commit that keeps the schedule alive |
