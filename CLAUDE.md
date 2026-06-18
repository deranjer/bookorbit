# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is BookOrbit

A self-hosted digital library and reading platform (EPUB, PDF, CBZ, audiobooks). pnpm monorepo with three workspaces: `client/` (Vue 3 SPA), `server/` (NestJS + Fastify), and `packages/types/` (shared TypeScript types imported as `@bookorbit/types`).

## Commands

All commands run from repo root unless noted.

### Development

```bash
pnpm dev                    # Start server + client + types watcher (hot reload)
pnpm run dev:server         # Server only
pnpm run dev:client         # Client only
pnpm run db:up              # Start PostgreSQL via Docker (required before dev)
```

### Database

```bash
pnpm run db:migrate                      # Apply pending migrations
cd server && pnpm db:generate <name>     # Generate migration from schema changes
pnpm run db:seed                         # Seed baseline data
pnpm run db:reset                        # Drop, re-migrate, re-seed (dev only)
cd server && pnpm db:studio              # Open Drizzle Studio (visual DB browser)
```

### Testing

```bash
pnpm run test                            # All unit tests (server + client)
pnpm run test:server                     # Server unit tests only
pnpm run test:client                     # Client unit tests only
cd server && pnpm test:watch             # Server tests in watch mode
pnpm run e2e:run -- <suite-id>           # Run a single E2E suite
pnpm run e2e:list                        # List available E2E suite IDs
pnpm run e2e:db:prepare                  # Prepare E2E database before running suites
```

### Code Quality

```bash
pnpm run verify:fast        # Lint + typecheck (pre-push gate)
pnpm run verify             # Lint + typecheck + tests (use before opening PR)
pnpm run lint:fix           # ESLint auto-fix
pnpm run format             # Prettier format
pnpm run typecheck          # TypeScript check (server + client)
```

## Architecture

```
Client (Vue 3, Vite, Tailwind v4) ←→ Server (NestJS 11, Fastify) ←→ PostgreSQL 16 (Drizzle ORM)
         localhost:5173                    localhost:3000/api              pgvector extension
                         ↕ Socket.IO real-time events
```

### Server (`server/src/`)

- **`modules/`** — One directory per feature domain (e.g. `book/`, `library/`, `metadata/`, `kobo/`, `scanner/`). Each contains a controller, service, module, and `dto/` subfolder.
- **`db/schema/`** — Drizzle `pgTable()` definitions, one file per domain. Re-exported from `index.ts`. Use `$inferSelect`/`$inferInsert` for row types — never write manual type aliases.
- **`db/migrations/`** — Generated SQL (never hand-write). Run `cd server && pnpm db:generate <name>` to generate from schema diffs.
- **`common/`** — Guards, filters, decorators, interceptors, pipes shared across modules.
- **`config/`** — Typed NestJS config classes for app, db, and auth.

### Client (`client/src/`)

- **`features/`** — Self-contained feature modules. Each has `components/`, `composables/`, and `lib/`. State lives in composables unless it's genuinely app-wide.
- **`components/ui/`** — Shared UI primitives (built on `reka-ui`).
- **`components/`** — App-level layout components (AppHeader, AppSidebar, AppLayout).
- **`stores/`** — Pinia stores for truly global state (currently just `theme.ts`).
- **`lib/`** — API client (`api.ts` using native fetch), utilities, and echarts helpers.
- **`services/`** — `storage.ts` for localStorage/sessionStorage.

### Shared types (`packages/types/`)

Imported as `@bookorbit/types` by both client and server. Never duplicate types between workspaces.

## Key Conventions

### Backend

- **One module per feature.** New domain → new directory in `server/src/modules/` with controller, service, module, and `dto/` subfolder.
- **DTOs for all input.** Use `class-validator` decorators. The global `ValidationPipe` rejects unknown fields.
- **NestJS exceptions only.** Use `NotFoundException`, `BadRequestException`, `ForbiddenException`, etc. Never `throw new Error(...)`.
- **Multi-user ownership.** User-owned data needs a `userId` FK. Services must check ownership and throw `ForbiddenException` for non-owners.

### Frontend

- **`<script setup lang="ts">` only.** Never use the Options API.
- **Bare method references in templates.** Write `@click="handleFoo"`, not `@click="handleFoo()"` or `@click="() => handleFoo()"`. ESLint enforces this and will block commits.
- **Composables over stores.** Feature-local state lives in composables at `features/<name>/composables/use*.ts`. Pinia only for app-wide state.
- **Native fetch only.** No axios or other HTTP libraries.

### Android (`android/`)

The BookOrbit mobile client is a **native Kotlin app** under `android/` — a standalone Gradle project, isolated from the pnpm workspace (it does not participate in `pnpm install` / `pnpm dev`). Stack: Kotlin + Jetpack Compose (Material 3), MVVM + Hilt + Coroutines/Flow, Retrofit/OkHttp + kotlinx.serialization, **Media3/ExoPlayer** for audiobooks, Coil, Room + DataStore + EncryptedSharedPreferences, WorkManager for downloads, AppAuth for OIDC, Paging 3. Build/run: `cd android && ./gradlew :app:installDebug` (see `android/local.properties` for the SDK path; min SDK 26, compile/target 36). CI lives in `.github/workflows/android-build.yml` (lint + unit tests + `assembleDebug` on `android/**` changes). See `android/README.md` for the full setup guide.

- **No emoji as icons.** Never use emoji (e.g. 🙈, 👁) as icons or UI affordances unless a task explicitly asks for it. Use `androidx.compose.material.icons` (Material Symbols).
- **The server is unchanged.** API models are **hand-written** Kotlin `@Serializable` classes (`android/app/src/main/java/com/bookorbit/core/model/`) mirroring the server's API types; there is no OpenAPI codegen, so DTO changes must be mirrored from the server by hand. `BaseUrlInterceptor` rewrites every request onto the configured server + `/api/v1`, with single-flight token refresh.
- **The reader runs foliate.js in a WebView** — the only way to preserve byte-identical EPUB CFI sync with the web client + Kobo. It renders EPUB, MOBI/AZW3, FB2, CBZ/CBR (**not** PDF) with the **same foliate.js engine the web client uses**. Foliate is vendored, not a package: the web client serves it from `client/public/assets/foliate/`, and `android/app/src/main/assets/reader/` holds a copy of those files plus `bridge.js` + `index.html`. **Any update to the web client's foliate assets must be re-copied into `android/app/src/main/assets/reader/`.** Assets are served via `WebViewAssetLoader`; the host page (`index.html`) shims `window.ReactNativeWebView` onto an Android `@JavascriptInterface` so the vendored `bridge.js` runs unchanged.
- **The app owns all networking; the WebView only ever sees local content.** A book is resolved to a local file (offline download, else a cached fetch of `/books/files/:id/serve`) and streamed into the WebView as base64 chunks via a begin/chunk/commit protocol. Do not make the WebView call the server.
- **Reader themes are a THREE-way sync.** When changing reader themes keep these aligned: web `client/src/features/reader/epub/constants/themes.ts`, the `THEMES`/`generateCSS` block in `android/app/src/main/assets/reader/bridge.js` (the actual rendering CSS), and the settings-UI swatches in `android/.../feature/reader/ReaderThemes.kt`. Re-copy `bridge.js`/foliate into the Android assets whenever the web build changes.
- **Offline-first progress** (reader + audiobook) uses Room (`core/db/`) with a local-write + dirty-flag + flush-on-reconnect pattern.

### Database

Before production launch (current phase): migrations are rebased into a single `0000_*.sql`. When adding schema changes, regenerate from scratch:

```bash
rm -rf server/src/db/migrations
docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d --wait
cd server && pnpm db:generate baseline && pnpm run db:migrate
```

After production launch: each change gets its own incremental migration — never wipe.

## Commit Format

```
<type>(<scope>): <summary>
```

**Types:** `feat`, `fix`, `db`, `perf`, `refactor`, `style`, `docs`, `test`, `build`, `ci`, `chore`, `security`, `revert`

**Scopes:** `auth`, `books`, `library`, `metadata`, `kobo`, `opds`, `reader`, `collections`, `annotations`, `authors`, `series`, `cover`, `users`, `stats`, `notifications`, `settings`, `scanner`, `email`, `audit`, `smart-scope`, `types`, `docker`, `deps`, `server`, `client`

Body is required on all non-`docs` commits (min 20 chars, imperative mood, explains the _why_).

Only releasable types (`feat`, `fix`, `perf`, `security`, `db`, `style`) trigger version bumps.

## PR Requirements

- Branch name: `BO-<issue-number>-<short-description>` (e.g. `BO-123-fix-reader-sync`)
- PR title must follow the same Conventional Commits format as commit messages
- PR description must include a GitHub closing keyword + issue reference (e.g. `Closes #123`)
- Every PR must link to a maintainer-approved issue

## Testing Expectations

| Change type        | What's expected                                |
| ------------------ | ---------------------------------------------- |
| Bug fix            | Regression test proving the bug is fixed       |
| New backend API    | Server unit tests for the new behavior         |
| New frontend logic | Client unit tests (composables, utilities)     |
| UI-only change     | Manual verification (screenshot/video in PR)   |
| Refactor           | Existing tests stay green, no new tests needed |

Server unit test coverage threshold: 85% statements/lines/functions, 70% branches (CI enforced).

E2E tests use a dedicated `bookorbit_e2e` database and run in CI nightly. Suites that write data use `prepareDedicatedDatabase: true` (auto-reset before each run). Smoke-style suites share the E2E database without reset.

## Git Hooks

- **Pre-commit:** `lint-staged` — auto-fixes ESLint and formats staged files with Prettier.
- **Pre-push:** `pnpm run verify:fast` — blocks push if lint, typecheck, or tests fail.
