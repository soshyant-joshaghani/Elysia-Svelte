# Tests

```bat
__ctrl__\elysia-svelte-ctrl.bat test all
__ctrl__\elysia-svelte-ctrl.bat test backend
__ctrl__\elysia-svelte-ctrl.bat test frontend
__ctrl__\elysia-svelte-ctrl.bat test contract [--base http://localhost:8000]
```

- `test backend` runs `bun test ../tests/backend` in `backend/` (also `bun run test` there). The tests live in `tests/backend/`, mirroring the module paths (`apps/sample`, `base/auth`, `base/users`, `system`, `core` for config, cache and migrations, `worker`), with shared setup in `tests/backend/helpers.ts`. They import only `bun:test` and backend sources by relative path; the few packages they need directly (PGlite, drizzle, jose) are re-exported from `backend/test-support/deps.ts`, because only `backend/` has `node_modules`. They run the app on in-memory Postgres (PGlite) with an in-memory cache and job queue, so they need no services. They cover the wire contract (routes, status codes, `detail` errors, auth rules, trimming, owner isolation, cache keys), the Redis list job protocol, config and `.env` lookup, and the migration SQL.
- `test frontend` runs Vitest (`tests/frontend`, shared with Fast-Svelte) and `svelte-check`.
- `test contract` runs `tests/contract/contract_test.py` (a copy of `contract/contract_test.py` from foxg-kit) against a running API with `--local --jobs`, so start the API (`ENVIRONMENT=local`), Postgres, Redis and the worker first.
