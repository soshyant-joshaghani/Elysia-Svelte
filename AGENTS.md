# AGENTS.md: AI development contract

Read this file before architectural changes in Elysia-Svelte.

Elysia-Svelte is a product-agnostic starter foundation: SvelteKit + Bun + Elysia + Drizzle + PostgreSQL + Redis. Implement features inside this architecture. Do not reshape it as FastAPI, Hono, or Go.

## Start here

| Question | Answer |
|----------|--------|
| What to read first? | This file → [`__plans__/PROGRESS.md`](__plans__/PROGRESS.md) → [docs/architecture.md](docs/architecture.md) → [CONTRACT.md](../../../CONTRACT.md) |
| Where does a feature go? | `backend/src/modules/apps/<name>/` and `frontend/src/lib/modules/apps/<name>/` |
| What is the reference? | `backend/src/modules/apps/sample/` (notes) |
| Where is business logic? | Service |
| Where is database access? | Repository (Drizzle) |
| How does the UI call the API? | `fetch` in the feature `api.ts`, base URL from `$lib/config/backend`. No Eden, no backend types in the frontend |
| How do migrations work? | SQL in `backend/drizzle`, applied by the API on start (Drizzle migrator) |
| How are jobs added? | Enqueue from a service after the write succeeds; register the task in `backend/src/jobs/tasks.ts` |
| How to run it? | `__ctrl__\elysia-svelte-ctrl.bat dev run all` |

## Plan loop

1. Take the first eligible `pending` stage in `__plans__/PROGRESS.md`, or the stage the user named.
2. Mark it `in_progress`.
3. Implement it.
4. Run `__ctrl__\elysia-svelte-ctrl.bat test all` for the touched surface.
5. Mark `done` only when tests pass.

Do not gitignore `__plans__/`.

## Backend layers

Route (Elysia) → Service → Repository (Drizzle) → PostgreSQL

| Layer | Responsibility |
|-------|----------------|
| Route | HTTP only: TypeBox schema on the route, call a service, shape the response |
| Service | Rules, authorization, cache, enqueue |
| Repository | Queries and writes only |
| Core | `app/config.ts`, `db/`, `redis/`, `jobs/`, `lib/` (errors, security, schemas) |

Modules are factory functions (`sampleRoutes(auth, notes)`) that take their services, so `createApp()` wires everything and tests can inject a PGlite database, a memory cache, and a memory queue.

Errors are `HttpError(status, detail)` in `backend/src/lib/errors/app-error.ts`. The response is always `{"detail": "..."}` with the status from [CONTRACT.md](../../../CONTRACT.md); validation failures are `422` with a string `detail`. Do not invent a second error envelope.

## Frontend

- Svelte 5 runes. Modules only under `base/` and `apps/`. There is no `components/` folder.
- Tailwind classes on elements. Tokens only in `frontend/src/app.css`.
- Do not hard-code the API origin. Use `apiBaseUrl()` from `$lib/config/backend`.
- The frontend is shared with Fast-Svelte. Do not fork the wire format for this kit.

## Data

- PostgreSQL is the system of record. The schema is Fast's (`"user"`, `note`); Drizzle tables in `backend/src/db/schema/` must stay identical to the contract.
- New tables go in a new `backend/drizzle/NNNN_name.sql` with `IF NOT EXISTS`. `drizzle-kit generate` writes plain `CREATE`; add the guards by hand.
- Redis cache helpers no-op when Redis is down. Do not cache auth.
- Sample notes is the cache example: list and get read the cache, writes invalidate the owner prefix.
- Jobs use the Redis list protocol in the contract (`foxg:jobs`). Do not add a queue library.

## What not to do

- Do not port Python, Hono, or Go shapes into this kit. Follow the contract.
- Do not turn the kit into a product (CMS, shop, AI app).
- Do not put business rules in routes.
- Do not add a dependency without a reason.

## Definition of done

- Module files in the right places
- Migration if tables changed
- Auth on anything that is not public
- Tests for behavior that can fail
- `__plans__/PROGRESS.md` updated when a stage was in progress
