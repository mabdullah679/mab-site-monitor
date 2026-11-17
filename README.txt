MAB-SITE-MONITOR

An outside health check for mab.observer. It runs on GitHub Actions in this
public repo, so it uses free standard runners and is not on Cloudflare. If
Cloudflare is down, this still runs and still alerts.

How it flows: every 5 minutes GitHub runs scripts/check.mjs, which looks at
the home page and at /api/health. If the site is up, any open "Site is DOWN"
issue is closed. If it is down, one issue is opened (GitHub emails you) and the
run shows red.

Not covered: a second, independent monitor. If GitHub itself is down, nothing
here runs.


STATUS

The schedule is OFF. The site is not deployed yet, so a schedule would report
"down" every 5 minutes. To turn it on:
1. In the repo settings, under Secrets and variables, Actions, Variables, add
   SITE_URL = https://mab.observer
2. In .github/workflows/health.yml, uncomment the three schedule lines.


WHAT COUNTS AS DOWN

Two checks, each tried 3 times, 10 seconds apart, with a 10 second timeout.
Home page: must answer 200 and contain the text "Muhammad Abdullah", so a parked
or error page does not count as up.
Backend health: /api/health must answer 200 with ok true.
If the check cannot run at all (no SITE_URL), the run goes red. That is never
reported as up.


ALERTS

A down site opens one GitHub issue labelled site-down. A recovery closes it.
For the alert to reach you, GitHub notifications must be on for issues in this
repo and email or the GitHub mobile app must be enabled. Issues here are
public, so an outage is visible to anyone. No secrets are used in this repo.


KNOWN LIMITS

GitHub's shortest schedule is 5 minutes, and runs can be delayed or dropped at
busy times, especially at the start of each hour.
GitHub turns off scheduled workflows in a public repo after 60 days with no
repository activity. The heartbeat workflow commits weekly to prevent that.
Whether it fully prevents the shutdown is unproven until 60 days pass.
The heartbeat pushes straight to main. If branch protection is turned on later,
it needs an exception.


TESTS

npm test runs 8 tests of the check script against local fake servers (up,
server error, parked page, bad backend, dead port, missing address, retry).
They do not touch the real site.
