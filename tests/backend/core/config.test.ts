import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { loadConfig, loadEnv, parseEnvFile, validateConfig } from '../../../backend/src/app/config';

describe('config', () => {
	test('defaults match the contract', () => {
		const c = loadConfig({});
		expect(c.apiV1Str).toBe('/api/v1');
		expect(c.appPort).toBe(8000);
		expect(c.appHost).toBe('0.0.0.0');
		expect(c.accessTokenExpireMinutes).toBe(11520);
		expect(c.frontendHost).toBe('http://dashboard.localhost');
		expect(c.environment).toBe('local');
		expect(c.redisUrl).toBe('redis://localhost:6379/0');
	});

	test('cors origins are BACKEND_CORS_ORIGINS plus FRONTEND_HOST', () => {
		const c = loadConfig({ BACKEND_CORS_ORIGINS: 'http://a.test/, http://b.test', FRONTEND_HOST: 'http://dash.test' });
		expect(c.corsOrigins).toEqual(['http://a.test', 'http://b.test', 'http://dash.test']);
	});

	test('database and redis urls are built from the Fast names', () => {
		const c = loadConfig({
			POSTGRES_SERVER: 'db',
			POSTGRES_PORT: '5433',
			POSTGRES_USER: 'u',
			POSTGRES_PASSWORD: 'p@ss',
			POSTGRES_DB: 'app',
			REDIS_HOST: 'cache',
			REDIS_PORT: '6380',
			REDIS_DB: '2',
			REDIS_PASSWORD: 'r/s'
		});
		expect(c.databaseUrl).toBe('postgresql://u:p%40ss@db:5433/app');
		expect(c.redisUrl).toBe('redis://:r%2Fs@cache:6380/2');
	});

	test('placeholder secrets are refused outside local', () => {
		expect(() => validateConfig(loadConfig({ ENVIRONMENT: 'production', FIRST_SUPERUSER_PASSWORD: 'x' }))).toThrow(/SECRET_KEY/);
		expect(() => validateConfig(loadConfig({ ENVIRONMENT: 'staging', SECRET_KEY: 'x' }))).toThrow(/FIRST_SUPERUSER_PASSWORD/);
		expect(() => validateConfig(loadConfig({ ENVIRONMENT: 'production', SECRET_KEY: 'x', FIRST_SUPERUSER_PASSWORD: 'y' }))).not.toThrow();
		expect(() => validateConfig(loadConfig({}))).not.toThrow();
		expect(() => loadConfig({ ENVIRONMENT: 'nope' })).toThrow();
	});

	test('.env is looked up in ., .. and ../.. and real env variables win', () => {
		const root = mkdtempSync(join(tmpdir(), 'elysia-env-'));
		try {
			writeFileSync(join(root, '.env'), 'SECRET_KEY=from-file\nPOSTGRES_DB="quoted"\n# comment\nAPP_PORT=9000 # trailing\n');
			const deep = join(root, 'a', 'b');
			mkdirSync(deep, { recursive: true });
			const env = loadEnv({ SECRET_KEY: 'from-env', EMPTY: '' }, deep);
			expect(env.SECRET_KEY).toBe('from-env');
			expect(env.POSTGRES_DB).toBe('quoted');
			expect(env.APP_PORT).toBe('9000');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
		expect(parseEnvFile('export A=1\n\nB = two')).toEqual({ A: '1', B: 'two' });
	});
});
