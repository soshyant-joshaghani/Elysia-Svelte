# Progress

| Stage | Status | Note |
|-------|--------|------|
| Folder contract | done | frontend, backend, tests, traefik, docs, __plans__, __ctrl__ |
| Module groups | done | apps/sample, base/auth, base/users, system |
| Wire contract | done | Follows CONTRACT.md: Fast routes, snake_case, `detail` errors, form login |
| Shared frontend | done | Copy of the canonical Svelte UI; plain `fetch`, no Eden |
| Redis cache and jobs | done | Soft-degrading cache, Redis list queue and worker (BullMQ removed) |
| Python CLI | done | dev, test (incl. `test contract`), app, prod, logs, flatten, remote |
| Backend tests | done | `tests/backend/` mirrors module paths; PGlite, in-memory cache and queue; run from `backend/` |
| Live contract run | done | `contract_test.py --local --jobs` against Postgres 18, Redis 8, the API and the worker |

Last update: 2026-10-01
