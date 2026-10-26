# Development and deployment guide

A quiet, personal daily newspaper. React/Vite dashboard, Auth0, a Hono API on Cloudflare Workers, D1, and a durable Cloudflare Workflows/Mastra publisher using Gemma 4 26B A4B (a free-tier model). Google Calendar and Gmail support up to eight messages from the preceding 24 hours across Gmail, a chosen label, or no email collection behind setup controls. Readers can add, edit, disable and remove up to ten RSS/Atom feeds in Settings. Google OAuth is in production with an unverified-app warning and a lifetime 100-user cap until data-access review is approved. Hosted Gemma edits public RSS/news/weather only. Email subjects, senders and received times, and calendar events, appear directly without AI rewriting; email bodies are not collected. Personal demo data is fictional and labelled. Editions have a browser print / save-as-PDF view. Live drafts stream into Today while generation runs; see [live generation](live-generation.md) for the hosted publication flow.

## Workspace

- `apps/dashboard`: React Router, Tailwind, shadcn-style Radix button, Redux Toolkit/RTK Query, Auth0 SPA SDK.
- `apps/api`: Hono, Zod, JWKS authentication, reader ownership, internal publisher API.
- `apps/workers/publisher`: RSS/weather collection, ranking, one Mastra editor, publication workflow.
- `packages/shared`: Zod API contracts and shared types.
- `packages/core`: domain services and injected Drizzle repositories for newspaper, auth and editor policy.
- `packages/database`: domain schemas, the Drizzle D1 client and versioned migrations. Hono calls core services, which call repositories.

The repository uses a pnpm workspace. A separate Git worktree was used during development; contributors can use a normal clone.

## Local setup

Use Node 26.12+ and pnpm 10.28.2 (`corepack enable` if needed).

```sh
pnpm install
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/workers/publisher/.env.example apps/workers/publisher/.env
pnpm db:migrate
```

Do not overwrite existing configured env files. They are ignored by Git. Set:

| File                          | Values                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `apps/dashboard/.env.local`   | `VITE_AUTH0_DOMAIN` (tenant domain, no protocol), `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`                                    |
| `apps/api/.dev.vars`          | matching `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, random `PUBLISHER_TOKEN`                                                                |
| `apps/workers/publisher/.env` | same `PUBLISHER_TOKEN`, `API_URL`; `GOOGLE_GENERATIVE_AI_API_KEY`, `MODEL_FREE_TIER_CONFIRMED=true` for a billing-disabled project |

Create an Auth0 Single Page Application and an RS256 API with identifier `https://api-news4you.njabulomajozi.com`. Allow callbacks `http://localhost:5173/today` and `https://news4you.njabulomajozi.com/today`; allow web origins and logout URLs at both base origins. In the API’s Application Access tab, authorize the SPA for User-Delegated Access (per-app authorization). Use the API access token, not an ID token. Tokens require issuer, audience, subject, expiration and issued-at claims. The browser uses in-memory token caching.

Start the API and dashboard in separate terminals:

```sh
pnpm --filter @news4you/api dev
pnpm --filter @news4you/dashboard dev --host localhost
```

Visit `http://localhost:5173/explained` for the public illustrated explanation, or `http://localhost:5173/demo` without credentials, or sign in at `/` and open `/settings`. Save preferences, open `/today`, then explicitly select **Generate today's edition**. Reading a missing edition never generates one. Production generation starts a Cloudflare Workflow immediately; the Mac can be switched off. A Cloudflare Cron Trigger checks for due editions hourly. Local Node execution (`pnpm --filter @news4you/publisher start`) is a development utility only and is not required by the live app.

The publisher also enqueues due scheduled editions. To test only an explicit request, turn off automatic publication in settings. Defaults: five minutes, Johannesburg weather, Africa/Johannesburg, 06:00. The hourly job runs at minute 7, so delivery occurs on its first check after the selected time, not at an exact minute. History shows daily editions and previews separately; edition dates are reader-local dates fixed at enqueue time.

## Quality checks and sample data

```sh
pnpm format:check
pnpm lint # lint:code (Oxlint), then lint:type (TypeScript)
pnpm test
pnpm build
pnpm sample /tmp/news4you-sample.json
pnpm smoke:model
```

Tests use signed RSA tokens and a real local D1/Miniflare database. They cover authentication, audience/expiry checks, ownership, CORS, preferences validation, duplicate runs, leases, interruption recovery, publication, citations, feedback and seven-day retention, plus deterministic editorial fixtures. The model smoke test performs exactly one bounded live call and never falls back to another model. The hosted path requires the free-tier flag and key. Personal inputs are rejected before a model call, including with injected policies. Live model testing is not part of CI. Full Auth0 browser login needs a configured tenant; fixtures do not claim to verify that external service.

## Publication and data guarantees

`POST /v1/generations` accepts `{ "kind": "daily" }` or `preview` and returns 202 with `runId`. A unique partial index enforces one daily run and edition per reader/local date. Repeated daily requests return the same run. An atomic 60-second dispatch cooldown coalesces concurrent requests and allows later recovery from a failed or uncertain Cloudflare Workflow creation. One active preview per reader is allowed. An explicit retry can reset a failed daily run. Successful editions are immutable.

Internal endpoints require a separate bearer secret: `/internal/schedule`, `/internal/pending`, `/internal/dispatchable`, `/internal/claim`, `/internal/runs/:id/result`, and `/internal/runs/:id/fail`. Claims are atomic with an eight-minute lease, unique fencing token and three-attempt ceiling. A stale publisher cannot submit a result. Publication uses one D1 transaction for edition, story rows, reference snapshots, source items and run completion. Expired leases are recovered by the next invocation.

RSS requests have public HTTPS address validation, public-address DNS checks (the optional Node collector also pins its connection), no redirects, a 12-second timeout and 500 KB response ceiling. External source text is untrusted, stripped of HTML, bounded and supplied as data to a tool-free editor. Titles are normalized for deduplication and checked against that reader's published history. Rephrased syndicated stories may still need better semantic deduplication. Hacker News’s canonical feed rejects Workers with HTTP 419, so that exact feed can fall back to the hnrss.org front-page RSS mirror, retaining original article links. Other configured feeds are not substituted. Failed sources are isolated; all live-source failure stops publication. Model output is parsed with Zod, all citations must identify supplied items, and the reading budget is checked before persistence. This verifies structure and attribution, not factual truth.

Source content expires after seven days during scheduled maintenance. Published editions and reference metadata remain available. History returns the latest 60 editions. Each hosted workflow processes one run with at most one model call, no model or step retries, a 90-second model timeout, a maximum of 12 source items, a 65,000-character input limit and at most 5,000 output tokens per call. The hosted editor uses the provider’s `minimal` thinking setting so the bounded output budget is used for the edition. The job stops at its first error. Known failures offer an explicit retry; interrupted leases retain bounded automatic recovery.

## Deploy

1. Create a free Cloudflare D1 database named `news4you`, and put its returned ID in `apps/api/wrangler.toml`. Keep the account on Workers Free to enforce Cloudflare's free hard limits.
2. The dashboard deploys as a static-assets Cloudflare Worker named `news4you-dashboard`, with SPA fallback and custom domain `news4you.njabulomajozi.com`. Ensure the zone is in your account. The API custom domain is configured in Wrangler as `api-news4you.njabulomajozi.com`.
3. Run `pnpm --filter @news4you/api exec wrangler d1 migrations apply news4you --remote`.
4. Store the shared `PUBLISHER_TOKEN` as a secret in the API and publisher Workers. In `apps/workers/publisher`, also store `GOOGLE_GENERATIVE_AI_API_KEY` with `pnpm exec wrangler secret put GOOGLE_GENERATIVE_AI_API_KEY`. Keep secrets out of Vite variables and Git.
5. Deploy the publisher first with `pnpm --filter @news4you/publisher run deploy`. Its Wrangler configuration creates `news4you-publication`, binds the API service and installs the hourly Cron Trigger. `MODEL_FREE_TIER_CONFIRMED=true` is valid only for the confirmed billing-disabled Google project.
6. Deploy the API with `pnpm --filter @news4you/api run deploy --keep-vars`. Its external workflow binding targets `news4you-publisher`.
7. Build and deploy the dashboard: `pnpm build:dashboard` then `pnpm --filter @news4you/dashboard run deploy --keep-vars`.

The Workers run in Cloudflare after deployment. They require no running computer, GitHub publication job, repository commit or push. CI remains on GitHub for code checks. D1 leases and scoped claims prevent overlapping workflow instances from publishing the same run. A failed dispatch leaves the request queued for the hourly hosted check. A workflow runs for at most six minutes, with an eight-minute publication lease and three-attempt recovery ceiling for interrupted runs. Model errors become failed runs requiring an explicit retry.

## Free-tier and sponsor usage

Use Google AI Studio with billing **disabled** and Cloudflare Workers Free. A 429 or exhausted quota stops the run; there is no paid fallback. Workers Free and Workflows Free impose their own request, CPU, step and storage limits. Exhausting free limits may delay or stop publication. Do not upgrade the account or attach model billing to work around failures. Deployment uses the existing local Wrangler login; runtime execution is hosted. Account billing settings remain the source of truth.

No sponsor allocation or credentials have been supplied. Track any future sponsor allowance in the provider dashboards and keep the same hard spending limits; sponsor credits do not authorize overages. No sponsored editorial insertions or paid integrations are implemented.

Google connection setup: [docs/google-setup.md](google-setup.md).

Deferred: Sentry, Docker, direct printer integration, server-generated PDF files and email delivery.

## Public explanation

`/explained` shows the architecture, publication validation flow and product boundaries. `apps/dashboard/src/features/public/components/ExplainedPage.tsx` is the shared React source; `apps/dashboard/src/styles/explained.css` carries the project palette. The dashboard build renders a self-contained `public/explained.html` before Vite packages it for Cloudflare’s clean HTML route. The route also renders inside the SPA for local development. No browser JavaScript or external assets are required for the standalone page. Project diagram tokens and typography are documented in `docs/diagram-style-guide.md`.

## Code design

The publisher uses typed ports, dependency injection, HTTP/workflow adapters and an explicit editor policy. See [the low-level design notes](low-level-design.md) for module responsibilities, pattern choices, SOLID principles and regression coverage.

Oxlint is the only linter and Oxfmt is the formatter. `pnpm lint` runs all `lint:*` scripts; `lint:code` includes the tested local Oxlint module-order rule, and `lint:type` checks application and test types. `pnpm format` writes formatting and `pnpm format:check` checks it. See [the Oxlint guide](https://oxc.rs/docs/guide/usage/linter) and [the Oxfmt guide](https://oxc.rs/docs/guide/usage/formatter).

All direct dependencies were updated to their latest registry releases. Major upgrades include TypeScript 7, Vite 8, Vitest 5, Zod 4, Drizzle 0.45 and Wrangler 4.152. Node 26.12 is the local and CI baseline. The dependency notes and validation limits are recorded in [Dependency upgrades](dependency-upgrades.md).

| Aggregate     | Tasks                                                                           |
| ------------- | ------------------------------------------------------------------------------- |
| `pnpm dev`    | All `dev:*` tasks in parallel: API and dashboard servers.                       |
| `pnpm lint`   | All `lint:*` tasks: Oxlint code checks and TypeScript checks.                   |
| `pnpm test`   | All `test:*` tasks; `test:unit` currently runs the self-contained Vitest suite. |
| `pnpm build`  | All `build:*` tasks: shared, database, core, API, dashboard and publisher.      |
| `pnpm deploy` | Build and deploy publisher, API, then dashboard through Wrangler.               |

Individual project tasks are available, such as `pnpm build:api`, `pnpm build:dashboard`, `pnpm deploy:api` and `pnpm dev:dashboard`. The production publisher is a Cloudflare Workflow with an hourly Cron Trigger. Future `test:integration` or `test:e2e` scripts will be included automatically by the aggregate. No placeholder tasks are defined. Deployment commands change remote Workers.

File placement and the sibling `src` / `tests` convention are documented in [Project structure](project-structure.md).
