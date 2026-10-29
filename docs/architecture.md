# Architecture

Elysia-Svelte follows the FoxG folder contract. The Svelte site lives in `frontend/`. It is a copy of Fast-Svelte's UI.

```text
elysia-svelte/
├── frontend/
├── backend/                 `backend/src/modules/{apps,base,system}`, `app/`, `db/`, `jobs/`, `redis/`, `lib/`
├── tests/
├── traefik/
├── docs/
├── __plans__/
└── __ctrl__/                Python CLI
```

Request flow: Route (Elysia) → Service → Repository (Drizzle) → PostgreSQL. `createApp()` in `backend/src/app/app.ts` builds the repositories and services and mounts each module under `/api/v1`. `src/main.ts` starts the API; `src/jobs/workers/index.ts` starts the worker.

Routes speak the [wire contract](../../../../CONTRACT.md): `/api/v1`, `snake_case` JSON, `{"detail": "..."}` errors, form login, JWT HS256, bcrypt `$2b$`. Data is PostgreSQL with the Fast schema. Redis is the cache and the job queue. Both degrade softly: a missing Redis never fails a request.
