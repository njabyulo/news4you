# Getting started

Local development runs the dashboard and API on your computer. The optional Node publisher processes generation requests against that local API. This is a development setup, not a complete portable self-hosting release.

## Requirements

- Node.js 26.12 or newer and pnpm 10.28.2.
- Your own Auth0 SPA and API configuration for signed-in features.
- A Google AI Studio key from a billing-disabled project for real generation.
- Google Calendar and Gmail setup is optional. The fictional demo needs no account or model key.

## Install and configure

```sh
git clone https://github.com/njabyulo/news4you.git
cd news4you
pnpm install --frozen-lockfile
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/workers/publisher/.env.example apps/workers/publisher/.env
```

Do not overwrite existing env files. These local files are ignored by Git. Never put secrets in a `VITE_*` variable: Vite includes those values in browser code.

For signed-in development, configure:

| File                          | Required values                                                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/dashboard/.env.local`   | Your `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, and `VITE_AUTH0_AUDIENCE`; keep `VITE_API_URL=http://localhost:8787`.                                                           |
| `apps/api/.dev.vars`          | Matching `AUTH0_DOMAIN` and `AUTH0_AUDIENCE`, `DASHBOARD_ORIGIN=http://localhost:5173`, and a random `PUBLISHER_TOKEN`.                                                           |
| `apps/workers/publisher/.env` | `API_URL=http://localhost:8787`, the same `PUBLISHER_TOKEN`, your `GOOGLE_GENERATIVE_AI_API_KEY`, and `MODEL_FREE_TIER_CONFIRMED=true` only after confirming billing is disabled. |

In your Auth0 SPA, allow callback `http://localhost:5173/today`, logout URL `http://localhost:5173`, and web origin `http://localhost:5173`. Use an RS256 API and authorize the SPA's user-delegated access. The API audience must match in both local env files.

Keep `VITE_GOOGLE_CONNECTION_ENABLED=false` unless you configure the optional [Google connection](docs/google-setup.md).

## Start the app

Initialize the local D1 database, then start the dashboard and API:

```sh
pnpm db:migrate
pnpm dev
```

Open [the local demo](http://localhost:5173/demo) without signing in. Open [the local application](http://localhost:5173) for your configured Auth0 login.

For real local generation, request an edition in the dashboard and run this in another terminal:

```sh
pnpm --filter @news4you/publisher start
```

The Node publisher is a one-shot development command. Run it again for later requests. Local development does not install the hosted hourly schedule or automatically start the publisher.

## Check your changes

```sh
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

See the [development and deployment guide](docs/development.md) for production setup, free-tier constraints, and security boundaries. The committed production dashboard settings are public identifiers for the hosted demo. Replace them, along with Wrangler domains and database bindings, for your own deployment.

---

# News4You: My Whole Morning in One Place

_This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19)_

## What I Built

My morning information lives in different places: news in browser tabs, newsletters and delivery updates in Gmail, meetings in Google Calendar.

I built **News4You**, a personal daily newspaper that brings those pieces into one reading experience, with an ending.

Readers choose their interests, news feeds, reading length, timezone, and publication time. News4You turns public news and weather into a short, source-linked edition using Gemma.

Optional email and calendar snapshots sit alongside the news. Those personal details appear directly; they never pass through the AI editor.

The effort it saves is gathering everything before the day starts. Instead of checking several places, I wanted one place to answer: **what’s happening, and what does my day look like?**

## Demo

[Try News4You’s public demo](https://news4you.njabulomajozi.com/demo)

The demo needs no account or Gmail access. Personal examples are fictional and labelled.

[Open the full application](https://news4you.njabulomajozi.com)

Signed-in readers can configure sources, generate an edition, watch the draft arrive, and revisit saved editions. Optional Google connections add email and calendar snapshots.

[See how it works](https://news4you.njabulomajozi.com/explained)

The explanation page includes architecture diagrams, the publication flow, and privacy boundaries.

## Code

[News4You repository](https://github.com/njabyulo/news4you)

The code separates the dashboard, API, publisher, database, shared contracts, and core services.

## How I Built It

News4You uses React, Vite, and TypeScript for the dashboard, with a Hono API on Cloudflare Workers. D1 stores preferences, generation runs, and editions.

Cloudflare Workflows runs publication jobs. An hourly Cron trigger checks for scheduled editions. The deployed application keeps publishing when my computer is switched off.

The editorial layer uses **Gemma 4 26B A4B**, wrapped in a **Mastra agent and workflow**.

Before calling the model, the publisher collects RSS and weather data, ranks relevant items, and checks for duplicates against published history. Readers can configure up to ten RSS or Atom feeds.

The editor receives at most twelve ranked public items. It produces structured content within the reader’s chosen reading budget.

Before publication, the application validates the structure, source references, and reading budget. These checks enforce the publication contract; they do not guarantee factual accuracy.

While generation runs, readers see progress stages and a growing draft. Draft content stays labelled until validation finishes.

For personal content, I chose a separate path:

- Auth0 handles sign-in and Google-connected access through Token Vault.
- Readers can select recent Gmail messages, a specific label, or no email.
- Editions show subjects, senders, and received times for up to eight messages from the preceding 24 hours.
- Email bodies and attachments are not collected.
- Primary-calendar events appear for the edition date in the reader’s timezone.
- Email and calendar snapshots never go to Gemma.

Google’s data-access review remains pending. The connection currently has an unverified-app warning and user limits; the public demo works without it.

An early publisher setup depended on my laptop. Moving it into Cloudflare was an important correction: background publication needed to keep working after I closed my computer.

## Why Does Open Innovation Matter?

Gemma’s open weights make it possible to consider running the editorial model outside a single hosted API. Mastra’s open-source framework makes the agent and workflow code inspectable and adaptable.

My instructions, source-selection rules, validation, and reading limits live in the project. They are part of the application’s design.

The current deployment uses hosted inference. It is not offline or fully self-hostable yet.

That distinction matters. Open weights give me a possible local inference path; they do not automatically deliver one. Portable self-hosting is future work.

For this project, the value of open innovation is having room to change how the editor works and eventually where it runs.

## My Agent Session

I used Codex throughout discovery, planning, development, testing, and deployment. I brought the product idea and constraints; the agent helped turn them into designs, code, and checks. Several of my corrections changed the architecture.

### Discovery: decide what morning should feel like

I started with a personalised newspaper combining news, weather, email, and calendar events. My first instruction was: “Let’s discuss (not implement).”

We compared frameworks and explored delivery options, including email, PDFs, and printing. I narrowed the first experience to a website at `/today`. I also set a firm constraint: “I want free tier, I am not willing to pay for this hackathon.”

That ruled out the proposed paid GPU setup. I proposed a Cloudflare-based stack with Hono, D1, Auth0, Gemma, and Mastra. The agent helped work through how the pieces would fit.

### Planning: turn the idea into testable work

I asked for requirements and a high-level design grouped into frontend, backend, async, AI, database, and DevOps. We then turned those groups into implementation tasks.

The plan covered more than generating text: authenticated ownership, explicit generation requests, source references, duplicate prevention, reading budgets, failure states, and scheduled publication. We chose one editor agent inside a controlled workflow.

I also supplied a reference project for the repository structure and simplified the proposed application paths. Development moved into a separate feature worktree, with instructions not to commit while I reviewed the code.

### Development: use the product and challenge the design

The work grew through feedback from the running application. I configured services, completed consent steps, requested editions, and confirmed when I could read the result.

I asked for configurable RSS feeds, a rolling 24-hour email window, and calendar events below the edition’s source note. When generation felt slow, I asked whether readers could see content arriving like an AI chat. That became the live draft experience.

Privacy discussions changed the design too. Instead of sending personal content through hosted AI, I proposed generating the news and displaying personal details directly. The final hosted editor receives public sources; email metadata and calendar snapshots bypass it.

### Testing: check the boundaries and the real journey

The agent added automated checks for authentication, reader isolation, database migrations, duplicate requests, source filtering, publication recovery, and streaming progress. The final recorded suite passed 114 tests across 22 files, alongside lint, formatting, type checks, and builds.

We also checked the application in a browser at desktop and mobile widths. With my approval, live checks covered Google connection, real generation, and reading a saved edition. Fictional fixtures covered personal-data cases without repeatedly reading my accounts.

### Deployment: prove it works with my laptop out of the loop

The initial plan used GitHub Actions, and an interim publisher ran locally. I challenged that dependency: the application needed to keep working when my Mac was off.

Publication moved to Cloudflare Workflows with an hourly Cron trigger. With the local publisher stopped, both on-demand and scheduled generation completed in the hosted environment.

Deployment also exposed a model API billing mismatch. After I approved returning the project to Free tier, the agent corrected the configuration and repeated the hosted verification.

The session was useful because it made assumptions visible. I could question the cost, privacy, delivery, and hosting choices, then ask for evidence that the revised design worked.

## The Lazy Payoff

The payoff is one place to begin the morning.

Public news comes with source links. Recent email subjects can surface newsletters or delivery updates. Calendar events show what is ahead. The reader can finish the edition and leave.

I tested real generation and Google-connected publication during development. I have not measured long-term time savings, so I am not claiming a number.

The project currently runs on free-tier services, with quota limits. When those limits are reached, generation can fail or pause; there is no paid model fallback.

For the “Slow and Steady” theme, my goal was a small automation with a clear stopping point: **let the newspaper gather the morning, then let the reader get on with it.**

## Prize Categories

- **Best Use of Gemma:** Gemma edits ranked public news and weather into structured, source-linked editions.
- **Best Use of Mastra:** A Mastra agent and workflow execute the editorial step.
- **Best Use of Auth0 for AI Agents:** Auth0 provides authentication and Token Vault access for optional Google-connected publication.
