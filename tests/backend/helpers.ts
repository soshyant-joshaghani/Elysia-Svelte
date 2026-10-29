import { setDefaultTimeout } from 'bun:test';
import { PGlite, drizzle, migrate } from '../../backend/test-support/deps';
import { createApp } from '../../backend/src/app/app';
import { loadConfig, type AppConfig } from '../../backend/src/app/config';
import type { Database } from '../../backend/src/db/client';
import * as schema from '../../backend/src/db/schema';
import { seed } from '../../backend/src/db/seed';
import { memoryJobs } from '../../backend/src/jobs';
import { migrationsFolder } from '../../backend/src/db/migrate';
import { memoryCache } from '../../backend/src/redis/client';

// PGlite start-up and migrations are slower than the 5s default.
setDefaultTimeout(60_000);

export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = 'adminpass123';

export function testConfig(overrides: Record<string, string> = {}): AppConfig {
	return loadConfig({
		ENVIRONMENT: 'local',
		SECRET_KEY: 'test-secret-key',
		FIRST_SUPERUSER: ADMIN_EMAIL,
		FIRST_SUPERUSER_PASSWORD: ADMIN_PASSWORD,
		BCRYPT_COST: '4',
		BACKEND_CORS_ORIGINS: 'http://localhost:5000',
		...overrides
	});
}

/** An app on in-memory Postgres (PGlite), an in-memory cache and an in-memory job queue. */
export async function createTestApp(overrides: Record<string, string> = {}) {
	const config = testConfig(overrides);
	const client = new PGlite();
	const pg = drizzle(client, { schema });
	await migrate(pg, { migrationsFolder: migrationsFolder() });
	const db = pg as unknown as Database;
	await seed(config, db);
	const cache = memoryCache();
	const jobs = memoryJobs();
	const app = createApp({ config, db, cache, jobs });

	async function call(method: string, path: string, options: { token?: string; json?: unknown; form?: Record<string, string> } = {}) {
		const headers: Record<string, string> = {};
		let body: string | undefined;
		if (options.token) headers.authorization = `Bearer ${options.token}`;
		if (options.json !== undefined) {
			headers['content-type'] = 'application/json';
			body = JSON.stringify(options.json);
		}
		if (options.form) {
			headers['content-type'] = 'application/x-www-form-urlencoded';
			body = new URLSearchParams(options.form).toString();
		}
		const response = await app.handle(new Request(`http://localhost${config.apiV1Str}${path}`, { method, headers, body }));
		const text = await response.text();
		let json: unknown = undefined;
		try {
			json = text ? JSON.parse(text) : undefined;
		} catch {
			json = text;
		}
		return { status: response.status, headers: response.headers, json: json as any, text };
	}

	async function login(email: string, password: string) {
		const reply = await call('POST', '/base/login/access-token', { form: { username: email, password } });
		return reply.json?.access_token as string;
	}

	async function createUser(adminToken: string, email: string, password = 'userpass123', extra: Record<string, unknown> = {}) {
		const reply = await call('POST', '/base/users/admin', { token: adminToken, json: { email, password, ...extra } });
		return reply.json as { id: string; email: string };
	}

	return { app, config, db, client, cache, jobs, call, login, createUser };
}
