# Brand Pulse — Nike, today.

A Next.js App Router research application with an anonymous mobile survey at `/` and a password-protected results dashboard at `/dashboard`. The dashboard's response explorer and CSV exports require the same password. Survey wording lives in `lib/survey-config.ts`; new responses record version `1.4`. The dashboard defaults to this version and can filter older `1.0`–`1.3` responses separately, because some numeric scales and signal meanings differ.

## Run locally

Use Node.js 22.13+ (24 LTS recommended):

```sh
npm install
cp .env.example .env.local
```

```sh
npm run dev
```

The account-free survey is at http://127.0.0.1:3000/ and the password-protected dashboard is at http://127.0.0.1:3000/dashboard. Individual responses and exports are at `/dashboard/responses`. Set `DASHBOARD_PASSWORD` in the environment. If you set a 64-character hexadecimal `RESULTS_ACCESS_TOKEN`, the previous private URL `/results/<RESULTS_ACCESS_TOKEN>` remains available.

If no Supabase credentials are configured and `ALLOW_DEV_DEMO=true`, the dashboard shows deterministic **synthetic** records covering all four culture/product quadrants. Development survey submissions are also marked synthetic and saved to `work/demo-responses.json`, so they appear in the dashboard. To reset local records:

```sh
npm run seed
```

This only replaces the local synthetic data. Development demo mode is disabled in production even if its flag is set.

## Dashboard access

The `/dashboard` and `/dashboard/responses` routes ask for `DASHBOARD_PASSWORD` before loading or exposing results. The login cookie is HTTP-only, signed, and expires after seven days. Results pages also send `no-referrer` and `no-store` headers.

The survey itself requires no registration, name or email. Public requests cannot read the database directly. They can submit a fully validated response, while the server renders the public dashboard with its server-only key. Supabase Row Level Security denies direct reads and writes to `anon` and `authenticated`; only the server's service role accesses responses.

## Supabase setup

1. Create a Supabase project and apply the timestamped files in `supabase/migrations/` with `supabase db push`. For an existing database that already has these changes, reconcile its migration history before pushing. The last migration preserves historical responses while adding quick purchase and priority choices and making written answers optional.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` to `.env.local`. The secret key must never have a `NEXT_PUBLIC_` prefix. The legacy `SUPABASE_SERVICE_ROLE_KEY` is also accepted for existing projects.
3. Set `NEXT_PUBLIC_OWNER_CONTACT` and `NEXT_PUBLIC_RETENTION_MONTHS` before inviting respondents. The example contact is a placeholder. `RESULTS_ACCESS_TOKEN` is optional and only keeps the older `/results/<token>` route working.
4. Restart the app. Submit a response through `/` and verify that it appears at `/dashboard`. Do not mix synthetic seed data with real research.

Submission is atomic: a server-validated payload calls a service-role-only PostgreSQL function that inserts the response and its ten brand rankings together (13 for legacy `1.1` and eight for `1.0` responses). Session UUIDs make retries idempotent. The database generates gap and tier scores. No respondent names, emails, IPs, user agents or referrers are stored in response rows.

### Optional development database seed

Use a separate development Supabase project and never seed a real research dataset:

```sh
SEED_SYNTHETIC=true node --env-file=.env.local --import tsx scripts/seed.ts --supabase
```

Every seeded row has `is_synthetic=true`. Reruns do not duplicate rows. Remove them before collecting real responses:

```sql
delete from public.survey_responses where is_synthetic = true;
```

The brand rankings cascade on deletion.

## Research experience and analysis

The survey has 17 configured moments, with a conditional reason question skipped for neutral perception change. Perception and perception change share one screen; sneaker and apparel purchase consideration share another. Every numeric answer uses the same integer 0–10 slider, with 5 meaning no change for the perception-change question. It includes a searchable country picker, 12 fixed feeling options for each before/after answer, unrestricted multi-select questions and a ten-brand tier list usable by drag, touch, click or keyboard. Respondents can choose the brand and main reason for their most recent sneaker or sportswear purchase, plus their top Nike weakness, without typing. All text answers are optional. An unfinished draft stays in localStorage until successful submission; a failed request retains it. No hypothesis is shown to respondents.

Dashboard filters cover survey version, age, country, work, all four interests, last purchase and date. They update all metrics and charts. The Base view gives every respondent weight 1; the Weighted view gives Creative / Design and Fashion weight 1.2 and everyone else weight 1. Aggregate averages, shares, distributions, tier rankings and word frequencies follow the selected view. Sample sizes and individual points always show real people. This is an editorial lens for the target audience, not a correction that makes the convenience sample representative. Short captions explain how to read each chart. The culture/product matrix shows individual score pairs, counts and averages. Other views cover segment gaps, competitor tiers, strengths and weaknesses, the top weakness, recent purchase context, perception change, four Nike signals (seven in older versions), sneaker/apparel purchase consideration and searchable responses. Fixed feeling choices are counted exactly; open text uses a transparent word count, not AI analysis.

Exports include a response CSV with one tier column per brand and a separate normalized tier CSV. All fields are quoted, spreadsheet formulas neutralized, and empty exports retain headers. The text search affects the response explorer only; exports follow the global dashboard filters.

For the intended small sample, server-side reads load rows in pages of 500. At much larger scale, move aggregation and exports to database queries and streaming responses.

## Visual system

The interface uses the supplied P22 Mackinac Book for editorial headings and locally bundled Inter for body text and controls. Inter's license is included in `public/fonts/Inter-LICENSE.txt`. Its high-contrast layouts and accents draw from the supplied _Nike Empower 2021 Creative Guidelines_: red `#FF2200`, pink `#FF00FF`, purple `#912DDC`, blue `#1B24F1`, light blue `#4ADAFF`, green `#2FE600`, yellow `#FFEB07` and orange `#FFB939`. The research remains independent and does not use Nike's logo or claim to be an official Nike survey.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:production
```

PostgreSQL tests use PGlite to check migration syntax, atomic writes, duplicates, constraints and role permissions. Browser tests use Google Chrome at the default macOS path; set `PLAYWRIGHT_CHROME_PATH` elsewhere. They cover the full mobile survey, refresh recovery, keyboard tier placement, password-protected dashboard access, live filters, empty states and CSV download. Screenshots go to `work/`. The production smoke test checks that demo mode stays unavailable and incorrect results links return 404. Browser tests may add development submissions; `npm run seed` resets them.

## Deploy from the terminal

Run all commands from this `nike-pulse` directory. This folder sits inside an unrelated Git repository in the user's home directory, so run `git init` **here before `git add`** and verify `git rev-parse --show-toplevel` points to `nike-pulse`.

1. Install the Supabase and Vercel CLIs (`brew install supabase` and `npm i -g vercel` on macOS). The GitHub CLI `gh` is also needed. Run `gh auth login`, `supabase login` and `vercel login`; authentication may open a browser.
2. Run `supabase init`, then `supabase projects create nike-brand-pulse` (or use an existing project). Find its reference with `supabase projects list`; run `supabase link --project-ref <REF>`, `supabase db push --dry-run`, then `supabase db push`. For an existing database, review the dry run and migration history before applying anything. `supabase projects api-keys --project-ref <REF>` lists available server keys. Keep the secret key private.
3. Run `git init`, `git branch -M main`, `git add .`, `git status --short`, `git commit -m "Initial Nike survey"`, then `gh repo create nike-pulse --private --source=. --remote=origin --push`. Check the status before committing: `.env.local` and `work/` must be absent. Configure `git config user.name` and `git config user.email` locally first if Git asks for an identity.
4. Run `vercel link` and choose a new Vercel project with this directory as its root. Add Production values interactively with `vercel env add NEXT_PUBLIC_SUPABASE_URL production`, `vercel env add SUPABASE_SECRET_KEY production`, `vercel env add DASHBOARD_PASSWORD production`, `vercel env add NEXT_PUBLIC_OWNER_CONTACT production` and `vercel env add NEXT_PUBLIC_RETENTION_MONTHS production`. Use `https://<REF>.supabase.co` for the URL, a Supabase server secret key for `SUPABASE_SECRET_KEY`, `fixer` (or another private password) for `DASHBOARD_PASSWORD`, your contact email, and a retention period such as `12`. Do not set `ALLOW_DEV_DEMO` in production.
5. Run `vercel --prod`. Run `vercel git connect` to link the GitHub remote for later deployments on push. The survey is at `/`; the password-protected dashboard, response explorer and exports are at `/dashboard` and `/dashboard/responses`.

Submit one test response without signing in and confirm it appears on `/dashboard`. Delete it from Supabase before inviting participants. The local `work/demo-responses.json` is excluded from deployment; Vercel needs Supabase to persist responses. Environment variable changes require a new deployment.

This repository does not create a Supabase project or Vercel deployment. Without production database credentials, submissions fail closed and the dashboard cannot load. Without `DASHBOARD_PASSWORD`, the dashboard remains locked.

## Retention

The displayed retention period is a commitment for the owner to implement, not an automatic timer. Delete expired records and downloaded exports. One possible database cleanup after choosing a 12-month period:

```sql
delete from public.survey_responses
where completed_at < now() - interval '12 months';
```

Infrastructure providers may keep technical connection logs separately from the research database. The privacy page distinguishes those from the data collected by this app.
