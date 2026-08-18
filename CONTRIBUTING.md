# Contributing to Bookmarked

Welcome! This repo is a sprint-phase project for the freeCodeCamp/NHCarrigan
Summer 2026 Cohort. Everyone is working out of the same [Issues](../../issues)
list, so the workflow below exists to keep people from duplicating effort.

## 1. Find an issue

Browse the [issue tracker](../../issues) and look for one that matches your
comfort level:

- `difficulty:easy` - good first issue, should take a few hours
- `difficulty:medium` - a half-day to a day of focused work
- `difficulty:hard` - a meatier feature, expect to spend most of a sprint day (or more) on it

Issues are also labelled by area (`area:frontend`, `area:backend`,
`area:tests`, `area:docs`, `area:design`) so you can filter to what you want
to practice.

## 2. Claim it

**Comment on the issue** saying you're picking it up (e.g. "claiming this").
Do not start work on an issue someone else has already claimed - check the
comments first.

- You have **48 hours** from your claiming comment to open a PR that
  references the issue. If 48 hours pass with no PR and no update comment,
  the issue is considered released and someone else can claim it.
- If you need more time, just comment on the issue before the 48 hours are up
  - nobody's going to snipe you for asking.
- If you decide you no longer want the issue, comment to release it so
  someone else can pick it up.

## 3. Fork, branch, build

1. Fork this repository to your own account.
2. Create a branch off `main` for your change (e.g. `add-emoji-reaction`).
3. Make your change. Keep PRs scoped to the issue you claimed - if you spot
   something else worth fixing, open a separate issue for it rather than
   scope-creeping your PR.

## 4. Run tests locally before opening a PR

```bash
# API
cd api
npm install
npm test

# Frontend
cd web
npm install
npm test
```

If you're changing API behavior, add or update a Supertest case. If you're
changing frontend behavior, a Testing Library test is appreciated but not
mandatory.

CI runs the same test suites automatically on your PR (see
`.github/workflows/ci.yml`), so you'll see the results either way - running
locally first just means fewer surprises.

## 5. Open your PR

- **Link your PR to its issue.** Put `Closes #<issue-number>` (or `Fixes
#<issue-number>`) somewhere in the PR description so it auto-links and
  auto-closes on merge.
- Describe what you changed and why, and how you tested it.
- Keep the diff focused on the issue. Small, reviewable PRs get merged faster.

## Not a coder yet, or contributing something other than code?

Design feedback, documentation improvements, and content suggestions are all
welcome and labelled `area:design` / `area:docs` in the issue tracker - you
don't need to write application code to contribute here. See the
`.activity-log` repo for how to log non-code work so it still counts toward
your daily activity.

## Code style

There's no enforced linter/formatter config in this starter repo yet beyond
ESLint on the frontend - match the style of the surrounding code (the
existing routes and components are a good reference).

## Questions

If anything about an issue is unclear, ask in the issue's comment thread
before you start - it's faster for everyone than guessing.
