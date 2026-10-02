import { migrate as run } from 'drizzle-orm/bun-sql/migrator';
import { join } from 'node:path';
import { loadConfig } from '../app/config';
import { log } from '../lib/logger';
import { createDatabase } from './client';

export function migrationsFolder() {
	return join(import.meta.dir, '../../drizzle');
}

/** Apply `backend/drizzle/*.sql`. Every statement is IF NOT EXISTS, so a database that Fast's Alembic built is fine. */
export async function migrate(databaseUrl: string) {
	const folder = migrationsFolder();
	log.info('applying migrations', { folder });
	await run(createDatabase(databaseUrl), { migrationsFolder: folder });
}

if (import.meta.main) {
	await migrate(loadConfig().databaseUrl);
	log.info('migrations complete');
}
