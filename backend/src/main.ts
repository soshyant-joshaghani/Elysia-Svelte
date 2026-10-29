import { createApp } from './app/app';
import { loadConfig, validateConfig } from './app/config';
import { createDatabase } from './db/client';
import { migrate } from './db/migrate';
import { seed } from './db/seed';
import { log } from './lib/logger';

const config = loadConfig();
validateConfig(config);

// Postgres can still be starting when the API comes up (compose, host dev).
async function withRetry<T>(label: string, work: () => Promise<T>, attempts = 30) {
	for (let attempt = 1; ; attempt++) {
		try {
			return await work();
		} catch (error) {
			if (attempt >= attempts) throw error;
			log.warn(`${label} failed, retrying in 2s`, { error: error instanceof Error ? error.message : String(error) });
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}
	}
}

await withRetry('migrate', () => migrate(config.databaseUrl));
const db = createDatabase(config.databaseUrl);
await seed(config, db);

const app = createApp({ config, db });
app.listen({ port: config.appPort, hostname: config.appHost });
log.info('api listening', { port: config.appPort, env: config.environment, docs: '/docs', scalar: '/sdoc' });
