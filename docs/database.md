# Database

PostgreSQL 18. The schema is the one Fast's Alembic creates (`"user"` and `note`), so one database works under any FoxG backend.

Drizzle tables are in `backend/src/db/schema/`. SQL migrations are in `backend/drizzle/`. The API applies them when it starts (`backend/src/db/migrate.ts`; Drizzle records them in its own `drizzle.__drizzle_migrations` table). Every statement is `IF NOT EXISTS`, so the API can start against a database Fast already built. `drizzle-kit generate` writes plain `CREATE` statements; add the guards by hand.

Adminer: http://adminer.localhost, server `db`, port 5432, credentials from `.env`. From the host or an IDE use `localhost:5432`.

After a Postgres volume change: `dev purge infra`, then `dev run infra`.

## Postgres 18 volumes

Postgres 18 declares `VOLUME /var/lib/postgresql`. Compose mounts `db-data` at that path and sets `PGDATA` to `/var/lib/postgresql/18/docker`. Redis uses `redis-data:/data`. Mounting `/var/lib/postgresql/data` instead leaves an anonymous hex volume.
