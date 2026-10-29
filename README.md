[![](./FoxG-Kit.png)](./FoxG-Kit.png)

# Elysia-Svelte

GitHub: [Elysia-Svelte](https://github.com/soshyant-joshaghani/Elysia-Svelte)

**Bun + Elysia + Drizzle + SvelteKit + PostgreSQL + Redis.**

The starter-tier Elysia kit of the FoxG family. It speaks the [FoxG wire contract](../../../CONTRACT.md), so the SvelteKit `frontend/` is the same one Fast-Svelte ships and a project can change backend without touching the UI, the database, or the Redis keys.

**Docs:** [AGENTS.md](AGENTS.md) · [ROADMAP.md](ROADMAP.md) · [docs/](docs/) · [plans](__plans__/PROGRESS.md) · [`__ctrl__`](__ctrl__/README.md)

```bat
__ctrl__\elysia-svelte-ctrl.bat setup-local
__ctrl__\elysia-svelte-ctrl.bat dev run all
```

Linux and macOS use `__ctrl__/elysia-svelte-ctrl.sh`. `setup-local` runs `bun install` in `backend/` and `npm install` at the kit root for the Svelte app. Prerequisites: Bun 1.2+, Node.js 22, Python 3.12+ for `__ctrl__`, Docker.

| Service | URL |
|---------|-----|
| Dashboard | http://dashboard.localhost |
| Sample notes | http://dashboard.localhost/sample/notes |
| API (Swagger) | http://api.localhost/docs |
| API (Scalar) | http://api.localhost/sdoc |
| Adminer | http://adminer.localhost |
| Traefik | http://localhost:8080 |
| Direct Vite | http://localhost:5000 |
| Direct API | http://localhost:8000/docs |
| Superuser | `admin@example.com` / `Admin@1234` |

Stop: `__ctrl__\elysia-svelte-ctrl.bat dev stop all`. Only one stack can bind ports 80, 5432, and 6379, so stop the other Traefik before `dev run all`.

## Layout

```text
backend/                    Bun + Elysia API and worker
  src/main.ts               API entry (migrate, seed, listen)
  src/app/                  createApp(), config, plugins
  src/modules/apps/sample   notes, the canonical example
  src/modules/base/         auth and users
  src/modules/system/       utils and private dev routes
  src/db/                   Drizzle schema, migrate, seed
  src/jobs/                 Redis list queue and worker
  src/redis/                cache client
  drizzle/                  SQL migrations (IF NOT EXISTS)
frontend/                   SvelteKit (copy of Fast-Svelte's UI)
tests/                      backend/ (bun:test), frontend/ (Vitest) and contract/
traefik/ docs/ __plans__/
__ctrl__/                   Python CLI: dev, test, app, prod, remote
compose.yml compose.dev.yml compose.traefik.yml
```

Layers: Route (Elysia) → Service → Repository (Drizzle) → PostgreSQL. See [docs/architecture.md](docs/architecture.md).

## Runtime profiles

| Profile | Command | Includes |
|---------|---------|----------|
| Full | `dev run all` | Postgres, Redis, worker, Traefik, Adminer, API, Vite |
| Slim | `dev run all --slim` | Postgres, Traefik, Adminer, API, Vite |

Production always runs the full stack. See [docs/runtime-profiles.md](docs/runtime-profiles.md).

## Adding a feature

1. Copy `backend/src/modules/apps/sample/` to `backend/src/modules/apps/<name>/` (routes, service, repository).
2. `.use(<name>Routes(...))` inside the `/api/v1` group in `backend/src/app/app.ts`.
3. Add a Drizzle table in `backend/src/db/schema/` and a migration in `backend/drizzle/` when tables change. Keep `IF NOT EXISTS`.
4. Add `frontend/src/lib/modules/apps/<name>/api.ts` and a route under `frontend/src/routes/(dashboard)/`.
5. Add tests in `tests/backend/` (mirroring the module path, for example `tests/backend/apps/<name>/`).

`__ctrl__\elysia-svelte-ctrl.bat app create <name>` writes the stubs. Copy the depth of `sample` before adding rules.

## Changing backend

The Svelte `frontend/`, `traefik/`, `tests/frontend`, the module names, the wire contract, and the PostgreSQL schema are shared with [Fast-Svelte](../../../fast-kit/fast-template/fast-svelte/README.md). To move a project from another family:

1. Take the target template (`fast-svelte`, `rust-svelte`, `dotnet-svelte`, and so on).
2. Copy the product's `frontend/src/lib/modules/apps/<name>/` and its routes into it.
3. Rebuild `<name>` under the target's backend path. Keep the routes and JSON from [CONTRACT.md](../../../CONTRACT.md).
4. Point it at the same database. Fast's Alembic tables and this kit's `backend/drizzle` are the same schema.

Jobs use the contract's Redis list (`foxg:jobs`), so queued jobs carry between Elysia, Hono, Go, Rust, and DotNet. Fast keeps ARQ. Index: [foxg-kit](../../../README.md).

## Tests

```bat
__ctrl__\elysia-svelte-ctrl.bat test all
__ctrl__\elysia-svelte-ctrl.bat test contract --base http://localhost:8000
```

`test backend` runs `bun test` in `backend/` (in-memory Postgres via PGlite, in-memory cache and queue). `test frontend` runs Vitest and `svelte-check`. `test contract` runs [`tests/contract/contract_test.py`](tests/contract/contract_test.py) against a running API. See [docs/testing.md](docs/testing.md).

## Production

```bat
__ctrl__\elysia-svelte-ctrl.bat setup
__ctrl__\elysia-svelte-ctrl.bat clone
__ctrl__\elysia-svelte-ctrl.bat env
__ctrl__\elysia-svelte-ctrl.bat start
```

See [docs/deployment.md](docs/deployment.md).

## Environment

Copy `.env.example` to `.env`. Variable names match Fast (`SECRET_KEY`, `POSTGRES_*`, `REDIS_*`, `FIRST_SUPERUSER*`, `ENVIRONMENT`, `APP_PORT`). The API and the worker read real environment variables first, then `.env` from `.`, `..`, or `../..` of their working directory (the kit root when started by `__ctrl__`). `PUBLIC_API_BASE_URL` is where the frontend calls the API (`/api/v1` through the Vite proxy in dev).

Other families: [Fast-Svelte](../../../fast-kit/fast-template/fast-svelte/README.md), [Hono-Svelte](../../../hono-kit/hono-template/hono-svelte/README.md), [Go-Svelte](../../../go-kit/go-template/go-svelte/README.md), [Rust-Svelte](../../../rust-kit/rust-template/rust-svelte/README.md), [DotNet-Svelte](../../../dotnet-kit/dotnet-template/dotnet-svelte/README.md).
