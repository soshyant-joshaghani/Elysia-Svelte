# Modules

| Group | Role |
|-------|------|
| `apps/sample` | Canonical notes example |
| `base/auth`, `base/users` | Login, session, user records |
| `system` | Utils and private dev routes |

Paths: `backend/src/modules/{apps,base,system}`.

```bat
__ctrl__\elysia-svelte-ctrl.bat app create myfeature
```

1. Copy `backend/src/modules/apps/sample/` to `backend/src/modules/apps/<name>/` (routes, service, repository).
2. `.use(<name>Routes(...))` in the `/api/v1` group of `backend/src/app/app.ts`.
3. Add the Drizzle table and `backend/drizzle/NNNN_<name>.sql` (with `IF NOT EXISTS`) when tables change.
4. Add `frontend/src/lib/modules/apps/<name>/api.ts` and a route under `frontend/src/routes/(dashboard)/`.
5. Add tests in `tests/backend/` (mirroring the module path, for example `tests/backend/apps/<name>/`).
