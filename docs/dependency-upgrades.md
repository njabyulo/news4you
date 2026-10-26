# Dependency upgrades

Direct workspace dependencies were updated using `pnpm update --recursive --latest`
and checked against the registry on 25 October 2026. `pnpm outdated --recursive
--format json` returned `{}`. The lockfile records resolved versions; this does
not force transitive packages outside their maintainers' declared ranges.

| Tool/library | Updated version |
| ------------ | --------------- |
| Oxlint       | 1.89.0          |
| Oxfmt        | 0.74.0          |
| TypeScript   | 7.0.2           |
| Vite         | 8.3.5           |
| Vitest       | 5.0.5           |
| Zod          | 4.6.7           |
| Drizzle ORM  | 0.45.4          |
| Wrangler     | 4.152.0         |
| jsdom        | 30.1.3          |
| npm-run-all2 | 9.0.4           |

Node 26.12+ is the workspace baseline, including CI and prepared publisher jobs.
Wrangler and jsdom are no longer held at their old compatibility pins. Vite's
chunk configuration now uses a function accepted by the new bundler, and Zod's
updated type signatures are used at response-validation boundaries. The
browser-safe core utility export keeps database composition out of demo data.

CI action releases were checked through GitHub's official release API and pinned
to checkout v7.0.1, setup-node v7.1.0 and pnpm/action-setup v6.1.0. Automatic package
caching is explicitly disabled, preserving the free-only/no-retained-cache
workflow policy. GitHub workflows remain uninstalled while commits are prohibited.

ESLint and Prettier were removed from workspace tooling. Perfectionist was tested
as a possible Oxlint JS plugin but not retained: its peer range excludes the
latest TypeScript and its module rule cannot express imports/variables. The
requested module policy is implemented and tested as a local Oxlint plugin.

Verification includes source/test type checks, Oxlint, Oxfmt, deterministic tests,
real D1/Drizzle regression tests and builds. Latest local Wrangler bundling is
verified by dry-run; it does not establish that production deployment has been
exercised on the upgraded toolchain. No production deployment or commit is part
of this upgrade.
