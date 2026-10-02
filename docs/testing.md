# Testing

`test backend` runs `bun test ../tests/backend` in `backend/` (the tests live in `tests/backend/`, mirroring the module paths: `apps/sample`, `base/auth`, `base/users`, `system`, `core`, `worker`). The tests run the app on in-memory Postgres (PGlite) with an in-memory cache and job queue, so they need neither Postgres nor Redis. They cover auth, the superuser routes, notes isolation and caching, the local-only private routes, the Redis list job protocol, config, and the migration SQL.

`test frontend` runs Vitest (`tests/frontend`) and `svelte-check`.

`test contract` runs the shared [contract test](../../../../contract/contract_test.py) against a running API. See [tests/README.md](../tests/README.md).
