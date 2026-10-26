# Project structure

The API and worker follow the separation in `frad3ail/apps/api/relay/src`, the
web follows `frad3ail/apps/dashboard/gateway/src`, and core follows the domain /
subdomain layout in `frad3ail/packages/core/src/context`. The reference project
was read only. News4You keeps its Hono, D1, React and batch-worker runtimes.

```text
apps/api/
  src/
    main.ts                     # Worker entry
    app.ts                      # Request DI composition and route wiring
    config/env.ts               # Worker bindings and service context
    handlers/[feature]/index.ts # HTTP input/output mapped to core services
    routes/                     # Route registration
    middlewares/                # Auth-service and error adapters
    adapters/                   # Auth0 verification and Google provider calls
  tests/

apps/workers/publisher/
  src/
    main.ts                     # Batch entry and exit status
    app.ts                      # Job wiring
    config/env.ts               # Runtime configuration
    handlers/publication/       # Wire an injected PublicationService
    adapters/ai/
      agents.ts                 # Public-news Mastra agent definitions
      instructions.ts           # Editorial instructions
      editor.ts                 # Injected MastraEditionEditor class and factory
      workflow.ts               # Publication workflow factory
      workflow-editor.ts        # Injected workflow-to-EditionEditor adapter
      index.ts                  # Concrete AI composition and Mastra registration
    adapters/http/              # Internal API transport
    adapters/sources/           # RSS/weather transport
    commands/                   # Controlled model smoke command
  tests/

apps/dashboard/
  src/
    main.tsx                    # Mount React
    app.tsx                     # Provider and router composition
    features/
      edition/                  # api.ts, format.ts, components/, hooks/, data/
      preferences/              # api.ts and components/
      google/                   # api.ts and components/
      auth/components/          # Sign-in, route guard, session and return UI
      public/components/        # Landing, explained and policy documents
    components/                 # Shared UI and layout
    hooks/                      # Shared UI hooks
    lib/api.ts                  # Authenticated RTK Query base transport
    state/store.ts              # Store composition
    styles/
  tests/
  scripts/                      # Static document renderer

packages/core/
  src/
    newspaper/                  # Main newspaper domain
      container.ts              # Repository/service composition
      service.ts                # Aggregate NewspaperService
      util.ts                   # Browser-safe date helpers
      edition/                  # service.ts, repository.ts, util.ts, index.ts
      generation/               # service.ts, repository.ts, index.ts
      reader/                   # service.ts, repository.ts, index.ts
      source/                   # service.ts, repository.ts, util.ts, index.ts
      publication/              # Injected batch orchestration service
    auth/                       # Authentication service and diagnostic policy
      connection/               # Connected-account service/repository
    editor/                     # Local/hosted editing policy service
  tests/

packages/shared/
  src/types/
    auth.ts                     # Google choices and identity/verifier contracts
    edition.ts                  # Edition, agenda and feedback contracts
    generation.ts               # Runs, claims and lease request contracts
    publication.ts              # Publisher result and cross-package ports
    reader.ts                   # Preferences
    source.ts                   # Source settings and items
  src/index.ts                  # Public exports only

packages/database/
  migrations/                   # Existing versioned DDL
  src/
    schema/
      reader/index.ts
      source/index.ts
      generation/index.ts
      edition/index.ts
      connection/index.ts
      index.ts
    client/index.ts             # createDatabaseClient and inferred client type
    index.ts
  tests/

tools/oxlint/
  module-order.mjs              # Oxlint JS plugin
  tests/                        # Actual Oxlint CLI/fixer regressions
```

## Dependency direction

HTTP handler → core service → injected repository → Drizzle → D1.

API handlers receive services in Hono context and import no repository. Services
accept repository ports through their constructors. Repositories receive a
Drizzle client; the composition root creates the concrete graph. Provider APIs,
JWT libraries and model SDKs stay in adapters; their policies and domain state
stay in core. The batch publisher uses the same pattern through publication,
editor and source ports.

Services and repositories are classes with exported `const createXService` or
`const createXRepository` factories. Repository ports are structural public views
of their classes, so unit tests can supply objects with fake methods and no D1
client. Private constructor options and derived repository types stay beside
their code. Shared data contracts and cross-package ports live in
`packages/shared/src/types/[domain].ts`, with their runtime schemas colocated.
Browser consumers use pure core subpaths such as `@news4you/core/auth/util`.

## Tests and commands

Every owner has sibling `src` and `tests` folders. Vitest discovers app, package
and tooling tests under `tests`; none live under `src`. Backend/tool tests use
`tsconfig.check.json`; dashboard tests use their own Vite/browser config. No
empty folders or placeholder integration/e2e commands are added.

Root aggregates expand their matching scripts with npm-run-all2: `dev:*` in
parallel and `lint:*`, `test:*`, `build:*`, `deploy:*` sequentially. Each
`build:[project]` uses Turbo so dependency builds are respected and cached.
CI runs format checking, lint (code and types), tests and builds. Deployment is
an explicit separate command and remains subject to the operator's review.
