# Backend

Bun + Elysia + Drizzle. Modules: `src/modules/{apps,base,system}`. Wire contract: [CONTRACT.md](../../../../CONTRACT.md).

```bat
bun install
bun run dev          # API on :8000 (APP_PORT), reads ../.env
bun run worker       # Redis list worker
bun run db:migrate   # apply drizzle/*.sql (the API also does this on start)
bun run test         # bun test ../tests/backend; PGlite + in-memory cache and queue, no services needed
```

Drizzle SQL is in `drizzle/`. Every statement is `IF NOT EXISTS`, so the API can start against a database that Fast's Alembic built.
