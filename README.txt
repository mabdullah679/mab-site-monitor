MAB-SITE-MONITOR

An outside health check for mab.observer. It runs on GitHub Actions in this
public repo, so it uses free standard runners and is not on Cloudflare. If
Cloudflare is down, this still runs and still alerts.

How it flows: every 5 minutes GitHub runs scripts/check.mjs, which looks at
the home page and at /api/health. If the site is up, any open "Site is DOWN"
issue is closed. If it is down 4 or more runs in a row, one issue is opened (GitHub emails you).
Any down run shows red.

Not covered: a second, independent monitor. If GitHub itself is down, nothing
here runs.


STATUS

The schedule is ON (every 5 minutes), checking the repository variable SITE_URL,
which is https://mab.observer. The site went live on 2026-11-17. To pause it,
comment out the schedule lines in .github/workflows/health.yml.


WHAT COUNTS AS DOWN

Two checks, each tried 3 times, 10 seconds apart, with a 10 second timeout.
Home page: must answer 200 and contain the text "Muhammad Abdullah", so a parked
or error page does not count as up.
Backend health: /api/health must answer 200 with ok true.
If the check cannot run at all (no SITE_URL), the run goes red. That is never
reported as up.


ALERTS

A site that fails the check more than 3 runs in a row (about 20 minutes at a
5 minute schedule) opens one GitHub issue labelled site-down, assigned to and
mentioning mabdullah679, so GitHub emails that account. A recovery closes it.
Shorter blips make the run red but send no issue.
For the alert to reach you, GitHub notifications must be on for issues in this
repo and email or the GitHub mobile app must be enabled. Issues here are
public, so an outage is visible to anyone. No secrets are used in this repo.
Unverified: GitHub sends the email to the account's notification address,
which I cannot read. Confirm in GitHub Settings, Notifications, that it is
muhammad.abdullah.0913@gmail.com.


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
