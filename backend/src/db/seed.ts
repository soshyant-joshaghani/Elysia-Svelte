import { loadConfig, type AppConfig } from '../app/config';
import { log } from '../lib/logger';
import { createNoteRepository } from '../modules/apps/sample/repository';
import { createUserRepository } from '../modules/base/users/repository';
import { createUsersService } from '../modules/base/users/service';
import { createDatabase, type Database } from './client';

/** Create FIRST_SUPERUSER when missing. */
export async function seed(config: AppConfig, db: Database = createDatabase(config.databaseUrl)) {
	const users = createUsersService({ users: createUserRepository(db), notes: createNoteRepository(db), config });
	const created = await users.ensureSuperuser(config.firstSuperuser, config.firstSuperuserPassword);
	log.info(created ? 'seeded superuser' : 'superuser already present', { email: config.firstSuperuser });
}

if (import.meta.main) {
	await seed(loadConfig());
}
