# Low-level design

The application flow is **handler → service → repository → Drizzle client**.
HTTP handlers translate statuses; core services own validation, reader ownership
and publication policy. Services depend on repository ports instead of concrete
clients. Repositories own typed persistence queries. `newspaper/container.ts`
creates the concrete graph for the API; publisher handlers wire transport ports
into a PublicationService. Composition modules are not request business logic.

## Class and factory convention

Every domain service/repository is a class with an exported factory constant.
For example, ReaderService receives a ReaderRepositoryPort; ReaderRepository
receives DatabaseClient. `createReaderService(fakeRepository)` needs no database.
EditionService receives edition, generation and reader repository ports plus a
clock. AuthService receives a TokenVerifier and publisher credential. EditorService
receives an environment reader. PublicationService receives queue, editor,
collector, source-service, clock and logging contracts.

Factories are lazy arrows and may appear before their classes under the module
ordering convention. Construction happens after the module has initialized.
Services do not instantiate concrete repositories; the composition root does.
Ports derived from a repository's public methods stay in that repository file.
Shared publisher/identity contracts live in `packages/shared/src/types`.

## Domains and responsibility

- `newspaper/edition`: reader-owned editions, feedback, structured validation and
  publication policy, backed by EditionRepository.
- `newspaper/generation`: date-aware requests, scheduling and lease policy,
  backed by GenerationRepository and reader/source repository ports.
- `newspaper/reader`: preference/source validation and persistence.
- `newspaper/source`: content selection, collection-failure policy and retention.
- `newspaper/publication`: the bounded background publication loop.
- `auth`: reader/publisher authentication policy and safe diagnostic formatting;
  `auth/connection` owns encrypted connection records and single-use OAuth state.
- `editor`: public-only input, privacy and free-tier policy. Mastra
  transports remain worker adapters.

Creational factories build explicit dependency graphs. Structural adapters keep
HTTP, JWT and Mastra-specific results outside domain contracts. Behavioural
strategies select an injected editor/verifier without changing services.

Single responsibility separates transport, policy, persistence and wiring.
Open/closed extension is through typed ports. Structural repository ports allow
substitution by deterministic fakes. Each dependency exposes the small public
contract its consumer needs. Dependency inversion puts service policy above
concrete Drizzle/SDK adapters.

## Persistence invariants

Production persistence uses Drizzle builders for selects, inserts, updates,
deletes, upserts, returning rows and batches. No application `.prepare()` or
`.bind()` queries remain. Small parameterized `sql` expressions cover arithmetic,
conditional retry status, JSON-kind filtering and constants in an insert/select;
complete handwritten SQL statements are absent from repositories. SQL files
remain the migration source of truth, and low-level test fixtures can exercise
that DDL directly.

Claims select and update a queue row in one statement. Publication uses a guarded
insert/select and one atomic D1 batch for the edition, stories, references,
source snapshots and completed run. If a lease expires before insertion,
foreign-key constraints roll the whole batch back. Reader/date uniqueness,
attempt ceilings, fencing tokens, bounded retention and original source links
remain intact. Private data is displayed directly and is rejected by the editor.

## Module ordering and tools

Oxlint is the linter and Oxfmt is the formatter. The local
`news4you/module-order` Oxlint JS rule enforces imports, types/interfaces,
variables, then remaining declarations. It alphabetizes within dependency-safe
sections. Runtime initialization dependencies, executed statements and
side-effect import order take precedence over alphabetical order. Fixes retain
headers, comments and shebangs and report eager dependency cycles without
rewriting them.

Perfectionist's module rule does not sort imports or variables; its current
TypeScript peer range also excludes TypeScript 7. The local Oxlint rule provides
the requested grouping without adding ESLint or pinning an older TypeScript.
Actual Oxlint CLI tests cover grouping, dependencies, lazy factories, IIFEs,
side-effect imports, comments, executable output and idempotence.

## Verification

Fake-repository tests exercise normalized preference writes, duplicate-source
rejection, reader-local date calculation and ownership checks without D1.
Miniflare tests exercise real migrations and Drizzle, including simultaneous
claims and expired-lease rollback. Existing API, provider-consent, editorial,
privacy, callback and React-state regressions remain in the suite. No live model
call is required for this refactor's checks.

Run `pnpm format:check`, `pnpm lint`, `pnpm test` and `pnpm build`. The aggregate
lint command includes both code and test/source type checks. Development and
deployment targets are listed in the README.
