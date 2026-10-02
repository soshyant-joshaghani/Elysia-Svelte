import { drizzle } from 'drizzle-orm/bun-sql';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import * as schema from './schema/index';

export type Database = BunSQLDatabase<typeof schema>;

export function createDatabase(url: string): Database {
	return drizzle(url, { schema });
}
