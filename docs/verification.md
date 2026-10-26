# Verification — 24 October 2026

Implemented in the sibling `feature-platform` worktree. The primary `main` checkout is clean. No commits or pushes were made.

## Deployed and verified

- Dashboard: https://news4you.njabulomajozi.com, including public `/demo`.
- Hono API: https://api-news4you.njabulomajozi.com; `/health` returns 200 and private resources return 401 without a valid token.
- D1 database `news4you` created and both migrations applied locally and remotely.
- Auth0 SPA callbacks, API audience and user-delegated application access configured with the user.
- User completed sign-in, saved settings, explicitly requested generation and confirmed reading the published edition at `/today`.
- Published daily edition: “Daily Briefing: Space Science and Global News,” local date `2026-10-24`, five-minute setting, six saved source references.
- Two initial editorial attempts failed safely without publication. The third succeeded after disabling Gemma thinking and tuning the source/output budgets. Production uses `google/gemma-4-26b-a4b-it`, with no paid fallback.
- Model smoke test passed with the user's free-tier Google project. Live RSS and weather collection succeeded. Inbox/calendar entries are labelled fictional sample data.
- Desktop and 390px viewport inspected; no horizontal overflow. Keyboard Tab traversed the skip link, navigation, sign-in button, source links and final call to action, all with visible focus outlines. Layout uses visible focus styles and respects reduced motion.
- Formatting, linting, all workspace and test TypeScript checks, production builds, and 24 automated tests passed.
- D1 integration tests with a mocked GitHub API verified concurrent requests share one run and one dispatch; a 60-second dispatch cooldown bounds uncertain retries. Migration `0002_dispatch_cooldown.sql` adds the dispatch marker.
- Sample-data export verified with `pnpm sample /tmp/news4you-sample.json`.

## Prepared, awaiting activation

The GitHub workflow files exist locally; they cannot run on GitHub until the files reach the repository's default branch. This work does not commit or push them.

GitHub secrets configured: `GEMMA_API_KEY`, `PUBLISHER_TOKEN`. Repository variables configured: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `MODEL_FREE_TIER_CONFIRMED=true`, `FREE_TIER_BUDGETS_CONFIRMED=true`.

Configuration and activation state:

1. `GITHUB_DISPATCH_TOKEN` is now stored as a Cloudflare Worker secret. Its Actions API access returned HTTP 200. The repository currently has zero workflows and no remote branches, so a dispatch cannot succeed until workflow installation.
2. The user chose local Wrangler deployment. Existing secret Wrangler credentials deploy both Workers; no additional Cloudflare API token is required for that workflow. `CLOUDFLARE_ACCOUNT_ID` was configured as a GitHub secret, but GitHub deployment is not enabled.
3. The user confirmed Cloudflare Workers Free. `FREE_TIER_BUDGETS_CONFIRMED=true` is configured. GitHub verified the repository is public; all jobs use free standard Linux runners, require public visibility, and retain no artifact uploads or caches. The publisher gate is configured; workflow installation remains pending. Google free-tier billing was confirmed by the user.
4. Commit/push or otherwise install the workflow files on the default branch only when the user authorizes that separately.

Until activation, explicitly requested runs can be processed locally:

```sh
API_URL=https://api-news4you.njabulomajozi.com pnpm --filter @news4you/publisher start
```

The Cloudflare subscription lookup returned 403 with the existing Wrangler credentials; the user then confirmed Workers Free. Both Google and Cloudflare free-tier states are user-confirmed.

## Public explanation page

`https://news4you.njabulomajozi.com/explained` is deployed as a self-contained HTML page generated from `apps/dashboard/src/ExplainedPage.tsx`. It uses the existing site colours and system typography, with two accessible inline SVG diagrams. The same component is also registered as a public React route; footer links lead to the explanation.

Verified on 24 October 2026: HTTP 200 at the exact clean URL, two labelled diagram SVGs, zero scripts in the served document, no external resource requests, no page overflow at a 390px viewport, keyboard ArrowRight scrolling inside the diagram, and Enter opening the native disclosure notes. The installed diagram-design self-check passed. Text colour roles pass 4.5:1 contrast on the three diagram surfaces. Build, lint, formatting and TypeScript checks passed. Visual brand review remains with the user. The installed skill and global profile library were left unchanged; project tokens are in `docs/diagram-style-guide.md`. No commits or pushes were made.

## Personal-day edition increment (local, 24 October 2026)

Implemented Google Connected Accounts controls, a separate confidential Auth0 authorization-code/PKCE callback for background access, encrypted reader-bound Auth0 refresh-token storage, and Token Vault exchange inside Hono. The publisher receives collected content only, through a valid run lease. Label selection is limited to the user's custom Gmail labels; message queries always include the selected label and fetched messages are checked again for membership. No label means no Gmail reads. Primary-calendar events are filtered to the run's local date, including exclusive all-day end dates. Raw attachments are skipped. Live OAuth/provider calls remain pending account configuration and consent.

Real publication no longer inserts fictional personal sources. The model receives the edition date/timezone and prioritizes supplied meetings, delivery updates and newsletters. Calendar snapshots are stored separately from AI stories. The public demo shows fictional examples, and editions include a browser print / save-as-PDF button.

Validation: 37 tests passed, including real Miniflare D1 migrations, same-reader OAuth validation, encrypted-token binding, single-use states, PKCE, label ownership/filtering, revoked consent, valid publisher leases and saved calendar snapshots. Lint, type checks (including tests), formatting and production builds passed. The updated explained artifact passed the diagram-design self-check. Browser checks at 1440px and 390px confirmed no page overflow; calendar examples and the print control remain readable. Applying the print stylesheet in-browser hid navigation, controls and sidebar, retained calendar/source content and used a white page; physical printing and PDF pagination were not tested.

These changes have not been deployed or committed. Google controls are now enabled locally; provider consent remains pending. See `google-setup.md` for the account-side steps and env fields. Automatic GitHub execution still requires installing the workflow, which remains constrained by the user's no-commit instruction.

Source-failure follow-up: public-feed outages no longer block an edition that has available personal sources. Google consent/collection failures still stop publication explicitly, so a generic paper cannot imply an empty calendar. Tests cover both cases, all-day exclusive end dates and text attachments. Google responses are limited while streaming, before allocating an unbounded body.

## Auth0 connection repair (25 October 2026)

Through the signed-in Auth0 dashboard, activated the built-in My Account API in tenant `dev-bqbiqw7tlva270ni` and verified identifier `https://dev-bqbiqw7tlva270ni.us.auth0.com/me/`. After explicit user confirmation, granted only the three Connected Accounts scopes to `news4you-dashboard`; Auth0 reported 3 / 8 permissions granted and a successful client-grant creation. Enabled that API in the SPA's MRRT policy and verified the save confirmation.

Live retry exposed an unsupported `authorization_params.access_type` field in the connect request. Removed provider authorization parameters, added the required `profile` scope, and retained Auth0's connection-level offline-access setting. Added an explicit popup approval path for `consent_required` / session renewal errors. A subsequent retry reached Google's account chooser with the expected read-only Gmail and Calendar scopes and offline access. No account was selected and no Google provider consent was granted by the agent. The user's provider selection, consent, daily-access authorization and first real personal edition remain to be verified. No commits or deployments were made.

## Public-access preparation (25 October 2026)

User clarified that hackathon access should be available to all users. Inspected Google Cloud project `news4you-512621-n0`: External / Testing, zero approved test users; Publish app is disabled because branding is incomplete. The homepage and privacy policy fields are empty. The configured OAuth client matches the Auth0 connection’s authorization request, so this is not a wrong-client problem. No tester was added and no publishing-status change was made.

Added local public privacy and terms drafts, static HTML generation, and footer links. They are not deployed. Added a pre-request guard blocking email/calendar items from the unpaid hosted model endpoint after verifying Google's unpaid-service data terms. A regression test proves no hosted model call occurs for either private-source kind. All 38 tests, type checks, lint and the dashboard production build passed. Personal-content editing is explicitly incomplete pending a privacy-compatible processing path; Google scope/brand verification and any required independent assessment remain external launch requirements.

## Policy-page publication (25 October 2026)

After the user approved publishing the privacy and terms drafts without committing, added the requested DEV Community Hacktoberfest Open-Source AI Challenge: Week 3 link under a Hackathon context section on the privacy page. Published `/privacy` and `/terms`, plus Privacy/Terms navigation links, through the existing local Wrangler login. Dashboard Worker version: `0dfa9e78-7156-4d0f-aa37-94b77a77f0b5`.

This release used a snapshot of the existing production application assets and explained page, with the new policy documents added. The five deployed JS/CSS assets and explained document were preserved byte-for-byte; the Google integration remains local and the API/publisher were not deployed by this release. Verified HTTP 200 and exact release-content matches for the homepage, both policy pages, the explained page and all five application assets. The privacy page contains the exact requested challenge URL; both policy documents are public, self-contained HTML with no scripts. Git HEAD remains `517372b` (`Initialize News4You repository`); no commits or pushes were made. Google publishing/verification status was not changed.

## Google production OAuth and local private editor (25 October 2026)

Saved the Google consent-screen app name, homepage, privacy/terms URLs and owned domain. Declared openid, email/profile, Gmail read-only and Calendar events read-only. The operator explicitly confirmed production publishing; Google now shows **In production**. Branding checks passed and verified branding was published. Data-access review is not submitted: the Google form requires scope justifications, intended data usage and a real YouTube walkthrough. Drafts and the evidence checklist are preserved in `google-verification.md`. The unverified-app warning and lifetime 100-user cap remain.

A real connection retry exposed Auth0 `unmet_authentication_requirements`. Added an interactive fresh-sign-in recovery button using prompt=login and max_age=0, preserving the My Account API security policy. Browser verification showed the recovery reached Google's account chooser and displayed the new News4You branding and privacy/terms links. Selecting the intended account then returned a Google HTTP 500; a reload was attempted. No provider consent or private collection has completed.

Added an optional Mastra local Gemma editor with a fixed loopback OpenAI-compatible endpoint, explicit local Gemma 4 model allowlist, five-minute timeout and no hosted fallback. Private sources still fail before any hosted request unless a local model is selected. Public sources can use the same local path or the existing free hosted editor. Added a synthetic private-source smoke command and local setup documentation. The installed Ollama server is running with cloud inference disabled; `gemma4:e2b` is downloading in exec session 81052. Before smoke testing, restart the server with OLLAMA_CONTEXT_LENGTH=32768 as documented. This is not yet live-model verified or deployed.

All 40 tests passed, including local routing, cloud-name rejection and no-fallback regression tests. Full type checks, lint, formatting and the dashboard production build passed. Production assets have not changed in this step. HEAD remains `517372b`; no commit or push occurred.

## Live Google personal edition and all-mail mode (25 October 2026)

Completed Google's approved read-only consent and the SDK Connected Accounts link. Found and fixed the memory-cache callback problem: the dedicated return view obtains a fresh My Account token interactively before calling the SDK's state/PKCE-validated completion; it then restores the newspaper API session. Tokens remain in memory. Protected-route sign-in now preserves the requested Settings destination. Browser verification reached “Google is connected” and returned to Settings successfully.

The operator approved publisher daily access. Initial server callbacks did not receive an offline refresh token. Added fixed-stage diagnostics and safe provider-code/status logging, then verified the actual cause in Auth0: Allow Offline Access on news4you-api was disabled. Enabled and saved it as part of the approved daily-access setup, preserving per-app authorization. A fresh server flow completed Token Vault exchange and saved one encrypted local connection. Settings showed Connected / daily access enabled, and custom Gmail labels loaded.

The operator then requested whole-Gmail capability. Added explicit No email / All recent mail / A label I choose modes. Existing records keep their old label-only or disabled behavior. All recent mail reads at most eight messages from the last seven days across Gmail, with Spam/Trash exclusions checked again after fetch; attachments are skipped. Saved All recent mail for the operator's local account. Updated local policy and setup text; the production feature/policy release remains to be deployed.

Downloaded gemma4:e2b successfully, restarted loopback Ollama with cloud inference disabled and a 32768-token context, and passed a synthetic private-source smoke test. Ollama reported local GPU inference. A real dashboard generation request was processed by the local publisher against localhost:8787 using 12 source items. Run d9fb67ca-fc9e-46fa-8b54-dd24250f1edb completed and saved the edition. Browser verification at localhost:5173/today showed a readable edition with live Gmail newsletter/update citations and public sources. The calendar snapshot was empty for this date; no appointments were fabricated. D1 confirms emailMode=all, a completed run with an edition ID and a completed Google sync. No private text was sent to the hosted model.

All 43 tests passed, with added coverage for legacy mode preservation, explicit all-mail selection, collection bounds and exclusion checks, and safe callback diagnostics. Full type checks, lint, formatting and dashboard build passed. A later private-error sanitization change also passed publisher tests and type checks. No commits or pushes; HEAD is still 517372b. Google data-access verification still needs a real video and external approval, and GitHub automation remains uninstalled under the no-commit instruction.

## Production personal edition and publisher preparation (25 October 2026)

Applied the Google migration remotely and deployed the Google integration through the existing local Wrangler login. Verified production sign-in, Google connection and encrypted daily-access storage, then explicitly selected All recent mail for the operator. A production generation request, run `4b340dd7-6a1f-49bb-87cc-7df539d4e867`, completed using 12 sources and local Gemma. The production Today page showed the 25 October edition with real Gmail newsletter/update references and public sources. The calendar contained no appointments for that date. Private source text was processed locally, with no hosted-model fallback.

Prepared the GitHub publisher to run local Gemma on a temporary standard Linux runner. A standalone preflight schedules due work and checks for pending work before dependencies or the model are downloaded. Its authenticated API endpoint does not claim leases or disclose reader data, and retires exhausted abandoned runs. The Ollama release is pinned to 0.40.5 with the official release SHA-256 checked before extraction. Cloud inference is disabled, model storage is temporary, no artifacts or caches are uploaded, and the publisher token is scoped to the preflight and publication steps. This workflow remains uninstalled under the no-commit instruction; Linux CPU inference has not been exercised on GitHub.

All 44 tests passed, including an isolated Miniflare test for pending, leased, recoverable and exhausted runs and unauthorized access. Type checks, lint, formatting, production build, actionlint and the diagram-design self-check passed. Live production preflight returned “No publication work is pending”; unauthenticated POST /internal/pending returned 401 and /health returned 200.

The final API and dashboard deployments were verified. All nine deployed HTML/JS/CSS files matched the current build byte-for-byte. Browser review confirmed the updated public explanation and readable diagram labels. The privacy page retains the requested hackathon link. HEAD remains `517372b`; no commits or pushes were made. Google data-access review still requires a real demonstration video and external approval; the unverified warning and lifetime 100-user cap remain.

## LLD refactor and Oxlint (25 October 2026)

Separated publisher composition, publication orchestration, HTTP transport, workflow adaptation and editor policy. Publication now depends on typed queue/editor/collector/logger interfaces and an injected clock. Shared Zod contracts validate claimed runs, source items and publication results; Hono reuses the publication result schema. Edition and generation repository reads now use explicit D1 row types. Existing privacy gates, fencing tokens, invocation limits and failure behaviour remain covered by regression tests.

Installed and pinned Oxlint 1.89.0. The root lint command runs correctness/React checks with warnings denied before the existing ESLint checks. The CI lint step uses that combined command. Fixed all five initial React findings by introducing a session readiness boundary and a shared draft-value hook, rather than suppressing the rules. The session boundary clears credentials/cache on unmount and ignores late asynchronous completion; form drafts survive server refetches. Design decisions and SOLID/pattern mappings are in `low-level-design.md`.

Validation: 59 tests pass across seven files, including the HTTP client against the actual Hono/Miniflare claim route and four React component regressions. Oxlint, ESLint, full TypeScript checks, formatting, all workspace builds and actionlint passed. API build was a Wrangler dry run. The DOM test dependency is pinned to jsdom 26.1.0, compatible with the documented Node 22.14 baseline. Manual browser verification of this refactor was interrupted; automated component tests cover the changed React behaviour. No live model call, production deployment, commit or push was performed for this refactor.

## Source and test structure (25 October 2026)

Inspected the reference `frad3ail/apps/cli/context/src` and its sibling `tests` folder. Applied its separation of executable startup, application wiring, configuration, routes, middleware and adapters to News4You. The reference was read only. The dashboard now has an 18-line mount entry, a separate app/provider/router composition module, route pages and focused shared/auth/Google components. Hono now has a two-line Worker entry and a 47-line composition module, with route groups, middleware, bindings and repositories in named folders. Publisher code is grouped into services, adapters, config, types and commands.

Moved every test out of production source and the workspace-wide tests folder into its owning app/package's sibling `tests` directory. Moved public-source tests from the core suite to the publisher suite, preserving all assertions. Vitest discovers eight test files with the same 59 tests. Dashboard tests have a browser/Vite test tsconfig, separate from backend tests' Cloudflare declarations. Updated imports, mocks, D1 migration fixture paths, Wrangler and publisher entry paths, shadcn CSS configuration, static renderer paths and current design documentation. Placement conventions are documented in `project-structure.md`.

Validation: all 59 tests pass across eight files; Oxlint/ESLint, full source and test type checks, formatting and all six workspace builds pass. API bundling used Wrangler dry-run. All three standalone public documents match their pre-reorganization SHA-256 hashes. The sample-data command runs successfully using the relocated fixture. An inventory confirms all eight test files live in package-owned tests folders and none under src. No deployment, commit or push was performed.

## Standards, domain DI and Drizzle upgrade (25 October 2026)

Applied the current reference layouts for API/worker transport, feature-based web code and core main/subdomains. Core now owns newspaper, auth (including connected accounts) and editor-policy domains. Shared contracts and cross-package ports are split across six `packages/shared/src/types/[domain].ts` modules; private dependency/port types remain beside their classes. All 14 service/repository modules expose classes and exported create factories. API handlers/middleware call injected services, services call repository ports, and concrete repositories use the Drizzle D1 client. An audit found no repository imports in API code and no production raw prepared queries in API/core.

Updated all direct dependencies to latest registry releases, including TypeScript 7, Vite 8, Vitest 5, Zod 4, Drizzle 0.45.4 and Wrangler 4.152. Node 26.12+ is the local/CI baseline. `pnpm outdated --recursive --format json` returned `{}` and a frozen offline install succeeded. Configured Oxlint as the only linter and Oxfmt as the formatter. The tested local Oxlint JS rule enforces the requested module groups with dependency and execution-order safeguards. It replaces the unsupported Perfectionist grouping without retaining ESLint or an incompatible TypeScript peer dependency.

Root scripts now aggregate dev, lint, test, build and deploy prefix tasks with npm-run-all2. Lint includes code and source/test type checking. All six project build targets run through Turbo; API/dashboard deployment targets build their projects and preserve Wrangler variables. Deployment commands were configured but not run. Prepared CI uses current action releases and disables automatic package caching; workflows remain uninstalled under the no-commit instruction.

Validation: 81 tests pass across 14 owner-local test files. These include fake-repository/verifier DI tests, real Drizzle/Miniflare migration checks, concurrent single-claim publication, expired-lease batch rollback, private-model routing, Google consent/ownership, React state and nine actual Oxlint CLI/fixer regressions. Root `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build` and actionlint passed. The updated local demo rendered in a fresh browser tab with its agenda, reading content and print control. No live model call or production deployment was performed. Git HEAD remains 517372b; nothing was committed or pushed.

Persistence-error follow-up: generic API failures log a fixed operational message instead of Drizzle error text, which can include bound private parameters. A failing-database regression verifies both the response and captured logs exclude the synthetic private marker. The updated API dry build passed after this change. The temporary demo-only development server was stopped after browser verification.

## RSS controls, 24-hour Gmail collection and calendar sidebar — 25 October 2026

Readers can add, rename, edit, enable/disable and remove up to ten public HTTPS RSS/Atom feeds in Settings. URL/schema validation happens before saving; feed contents are checked during collection. Migration `0004_source_configuration.sql` distinguishes a reader who removed all feeds from a reader who has never configured them. Existing selections are preserved. API integration tests cover add/edit/disable/remove, empty-list persistence, reader isolation and invalid inputs; dashboard tests cover add/remove, editable names and the ten-feed limit.

Gmail now uses an epoch-second search spanning the 24 hours before collection starts, with an exact `internalDate` check excluding older and future messages. The existing eight-message maximum, explicit all-mail/label choice, Spam/Trash checks and attachment exclusion remain. Boundary tests cover exactly 24 hours, one millisecond outside either end and the second-granularity search. Settings, privacy and Google setup/verification documents describe the current window; raw-source retention remains seven days.

The saved full-day calendar snapshot now sits directly after “A CLEARER PICTURE” in the reading sidebar, with the edition publication timestamp and timezone. Empty snapshots have an explicit message; legacy editions with no snapshot do not invent events. Mobile shows the sidebar and print rules preserve the calendar while hiding the other sidebar material. Chrome checks confirmed ordering, two fictional demo events, timestamp rendering and no horizontal overflow on desktop and a 390px mobile viewport. Applying the stylesheet’s print rules in the local browser confirmed the calendar remains visible.

Validation: 89 tests across 15 files pass; Oxlint, workspace/source/test TypeScript checks, Oxfmt and all six workspace builds pass. Applied migration 0004 remotely; Wrangler confirms no pending migrations. Deployed API version `0133c9e8-a7ae-41a9-86f9-4b2f4ed11f45` and dashboard version `37278229-e89f-41bb-bcd7-5c289107de45` using the existing local Wrangler OAuth login. Production `/demo` has the new calendar placement, `/privacy.html` describes 24 hours, API `/health` returns 200 and unauthenticated `/v1/sources` returns 401. Production main JS/CSS SHA-256 hashes match the verified local build. Authenticated feed persistence and Google collection were tested with isolated local fixtures; no live inbox collection or model call was made for this release.

No git commit or push was made. HEAD remains `517372bbabf988a65239b399417cd5bc2b6995f2`.

## Live generation release — 25 October 2026

Implemented progressive headline, introduction and story rendering with draft labels, source links, elapsed time, last-update time, failure/retry handling and final model-reported usage. Partial JSON is parsed and schema-filtered by the publisher; only validated output becomes an edition. Draft checkpoints use a lease-fenced, sequence-ordered generation record. The authenticated SSE endpoint returns the latest owned snapshot on reconnect, emits heartbeats and rotates connections after 25 seconds. Client streams and reconnect timers are cleaned up on navigation/retry. Existing polling remains a fallback. Technical details and the local watcher command are in `live-generation.md`.

Validation: 105 tests across 20 files pass. Tests cover live output before completion, final validation, wrong-reader isolation, stale/expired leases, ordering, reconnect/refresh snapshots, failed drafts and explicit retry, UTF-8/SSE frame splitting, safe text rendering and stable story-card DOM. Oxlint, source/test TypeScript checks, Oxfmt and all workspace builds pass. A real loopback Gemma smoke call with fictional personal fixtures emitted six draft checkpoints before its edition passed validation. A browser-only fixture of the actual draft component grew a story in the same card at a 390px viewport without horizontal overflow; this fixture was not added as a product route or saved as a real edition.

Applied migration 0005 remotely. Deployed API version `b166b2fa-3065-4a84-b569-2d9c121206f6` and final dashboard version `805dd4dc-173d-40f0-b6cb-7bc664c1fe3d`. The operator’s account had no saved edition but had a waiting generation request; cleared that request and its edition-related records after the first streaming deployment, keeping Hacker News as its only RSS feed and keeping Google connected. Started a detached production-targeted local publisher watcher because GitHub has no installed workflow and no publisher was running. The watcher uses the existing local secrets and Ollama; its API URL is overridden in its process environment. No Git commit or push was made.

## Hosted publisher migration — 25 October 2026

Production publishing moved from the operator's detached Node/Ollama watcher to `news4you-publisher` on Cloudflare. API workflow creation dispatches explicit requests; a minute-7 hourly Cron Trigger schedules due editions and starts scoped workflows. The old watcher (PID 62368) was stopped, its command removed, and the obsolete uninstalled GitHub publication workflow removed. The operator's Ollama server was left alone; production no longer calls it.

The Mastra editor accepts public RSS/weather only. Core orchestration filters personal kinds before ranking, citations and AI. The adapter independently rejects personal inputs. Gmail requests metadata only (subject, sender, received time), never full bodies/snippets/attachments. Email metadata and edition-day calendar events become direct snapshots; migration 0006 stores email snapshots. Today/print rendering, Settings, privacy and the branded public explanation were updated and deployed.

Quality checks: 114 tests in 22 files pass, including hosted dispatch deduplication, targeted claims, the schedule handler, public-only model input, direct email rendering, and Cloudflare fetch/SSRF/redirect/body-size boundaries. Lint, source/test type checks, formatting and builds pass. The deployed explanation was inspected at desktop and 390px widths; diagram labels fit and horizontal scrolling is contained inside diagram panels.

Hosted smoke instances `d790d32b-a82c-4186-b4ec-b38f92946d23` and its `-retry` ran in Cloudflare with the local watcher stopped. The first exposed an unbound native fetch receiver; fixed and covered by a regression test. The retry collected live weather, wrote progress, reached hosted Gemma and failed with Google's HTTP 402 / depleted prepayment-credit response. AI Studio visibly reports the News4You project `gen-lang-client-0610344048` as Tier 1 / Prepay / No credits. A request to return the project to Free tier is pending. No credits were bought and billing was not changed. The free-tier-confirmed deployment flag is now false until this contradiction is resolved. At that point, successful hosted generation remained unverified and the goal was incomplete.

A temporary Cloudflare-only source probe confirmed the canonical Hacker News RSS URL returns HTTP 419 from Workers and the hnrss.org front-page mirror returns HTTP 200 with 20 RSS entries. The publisher now falls back to that mirror for this exact canonical source only. The probe Worker was deleted. Synthetic smoke reader/run records were removed after the failed smoke tests; real reader data was preserved. No Git commits or pushes were made; HEAD remains 517372bbabf988a65239b399417cd5bc2b6995f2.

## Free-tier restoration and hosted live verification — 25 October 2026

The user explicitly approved returning the AI Studio project to Free tier. Disabled the billing link for **only** `gen-lang-client-0610344048` in Google Cloud's project billing list. The console confirmed “Billing is disabled”; AI Studio then showed “Free tier”. No credits were purchased, no billing account was closed, and the separate OAuth project and other projects were left unchanged. Restored `MODEL_FREE_TIER_CONFIRMED=true` and deployed publisher version `8e2ad9ed-8db5-489a-a96c-1d379abe7d2a`.

Cloudflare Workflow instance `99c3124d-b063-4f37-94da-1ced8f1e3a8f` completed successfully in one attempt with one model call, using 12 public source items. Its generation record saved 18 progress checkpoints and an edition with six references. The local publisher remained stopped. Tail reported 133 ms aggregate CPU and an isolate cleanup outcome of “canceled”; the authoritative Workflow instance status was complete with successful step output and D1 publication committed. Aggregate tail CPU is above the documented Workers Free per-step allowance, so future CPU enforcement remains a free-tier availability limit; no paid upgrade is configured.

A second hosted preview, run `214dc126-8305-4b5b-85a2-c159f0a4f440`, completed for the signed-in operator. Edition `cdb8b3b9-7b05-4512-90aa-01d752cd90ae` contains eight direct email snapshots and zero calendar events, with 18 progress checkpoints and 630 output tokens. D1 verified zero Gmail citations in AI stories and zero new personal source items in source history. The signed-in browser shows all eight Gmail links, sender metadata, the direct-display note and the empty calendar below the source note. Print preview rendered four pages and was cancelled without creating a file or print job. Existing daily editions and reader settings were preserved.

All workspace builds pass with the final free-tier configuration. The 114-test suite, lint, source/test type checks and formatting checks passed for the current code. The deployed hourly Cron Trigger fired at 10:07 UTC with an `ok` invocation outcome. It created workflow `48176c71-6fdd-4704-89cd-04f8d591926f-b3f07f74-a580-4f4e-a90f-a25841c11692` via its binding, and the scheduled edition completed at 10:07:33 UTC on its first attempt with 14 progress checkpoints. No local publisher or manual workflow trigger was involved in that daily run. The isolated synthetic reader, its preview/daily editions and related records were removed after verification. The real reader’s hosted preview remains available for review.

Final deployments: API `6eaaf7f6-91af-4cd4-9a36-49c0b5f2e56c`, dashboard `b065adc6-8854-49ed-b6da-55b09ffe5df7`, publisher `8e2ad9ed-8db5-489a-a96c-1d379abe7d2a`. Live dashboard, privacy and explanation HTML matched the local deployment build. API/publisher health checks passed and unauthenticated generation returned 401. No commit or push was made.

## Submission code and secret review (26 October 2026)

Reviewed authentication and reader ownership, Google OAuth state/PKCE/nonce checks and reader-bound encryption, publisher authorization and lease fencing, public-only model inputs, source-fetch boundaries, and log sanitization. No blocking issue was identified in those reviewed paths. This is a focused code review, not an independent security audit. Google data-access review and free-tier availability constraints remain as described above.

Before staging, compared the publication candidate against all six local secret values identified in the ignored env files; no exact matches were found. Gitleaks also scanned the candidate. Its initial findings were a synthetic test lease UUID and historical deployment IDs, not credentials. The fixture now uses an unmistakably synthetic UUID, and the historical line no longer includes deployment IDs. The production dashboard configuration now includes its public Auth0 SPA identifiers so a fresh build retains sign-in support. The SPA client ID is intentionally public and has a narrowly placed inline scanner annotation; no client secret is present. Private env files and local state remain excluded, including env variants covered by the expanded ignore rules.

All 114 tests in 22 files, lint, application/test TypeScript checks, formatting, and all workspace builds passed. The production dependency audit reported zero known vulnerabilities. An isolated source snapshot using example local env files served the six-story fictional demo without a login or model key. Local D1 migrations applied successfully; the local API health route returned 200 and unauthenticated Today returned 401. No live model call or production deployment was required for this review.

README now starts with local development instructions followed by the submission narrative. The prior operational guide is preserved in development.md. The README contains no em dashes, and its local documentation links resolve. Implementation commits will be published on the feature branch for review in a pull request; main remains the initialization baseline until the owner merges it.
