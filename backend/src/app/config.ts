import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Environment = 'local' | 'staging' | 'production';

export type AppConfig = {
	apiV1Str: string;
	secretKey: string;
	accessTokenExpireMinutes: number;
	frontendHost: string;
	environment: Environment;
	/** BACKEND_CORS_ORIGINS plus FRONTEND_HOST. */
	corsOrigins: string[];
	projectName: string;
	postgresServer: string;
	postgresPort: number;
	postgresUser: string;
	postgresPassword: string;
	postgresDb: string;
	databaseUrl: string;
	redisHost: string;
	redisPort: number;
	redisDb: number;
	redisPassword: string;
	redisUrl: string;
	firstSuperuser: string;
	firstSuperuserPassword: string;
	appHost: string;
	appPort: number;
	bcryptCost: number;
};

type Env = Record<string, string | undefined>;

/** Parse `KEY=VALUE` lines (comments, `export`, simple quotes). */
export function parseEnvFile(content: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const raw of content.split(/\r?\n/)) {
		let line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		if (line.startsWith('export ')) line = line.slice(7);
		const eq = line.indexOf('=');
		if (eq < 1) continue;
		const key = line.slice(0, eq).trim();
		let value = line.slice(eq + 1).trim();
		const quoted =
			value.length >= 2 &&
			((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")));
		if (quoted) value = value.slice(1, -1);
		else {
			const comment = value.indexOf(' #');
			if (comment >= 0) value = value.slice(0, comment).trim();
		}
		out[key] = value;
	}
	return out;
}

/** `.env` (first one found in `.`, `..`, `../..`) overridden by non-empty real environment variables. */
export function loadEnv(processEnv: Env = process.env, cwd = process.cwd()): Record<string, string> {
	const merged: Record<string, string> = {};
	for (const dir of ['.', '..', '../..']) {
		const path = join(cwd, dir, '.env');
		if (existsSync(path)) {
			Object.assign(merged, parseEnvFile(readFileSync(path, 'utf8')));
			break;
		}
	}
	for (const [key, value] of Object.entries(processEnv)) {
		if (value) merged[key] = value;
	}
	return merged;
}

function text(env: Env, key: string, fallback: string) {
	const value = env[key];
	return value ? value : fallback;
}

function num(env: Env, key: string, fallback: number) {
	const value = env[key];
	if (!value) return fallback;
	const parsed = Number(value.trim());
	if (!Number.isInteger(parsed)) throw new Error(`invalid value for ${key}: ${value}`);
	return parsed;
}

function parseCors(raw: string): string[] {
	const trimmed = raw.trim();
	let items: string[];
	if (trimmed.startsWith('[')) {
		try {
			const parsed: unknown = JSON.parse(trimmed);
			items = Array.isArray(parsed) ? parsed.map(String) : [];
		} catch {
			items = [];
		}
	} else {
		items = trimmed.split(',');
	}
	return items.map((item) => item.trim().replace(/\/+$/, '')).filter(Boolean);
}

export function loadConfig(env: Env = loadEnv()): AppConfig {
	const environment = text(env, 'ENVIRONMENT', 'local');
	if (environment !== 'local' && environment !== 'staging' && environment !== 'production') {
		throw new Error(`invalid value for ENVIRONMENT: ${environment}`);
	}
	const postgresPassword = text(env, 'POSTGRES_PASSWORD', '');
	const postgresUser = text(env, 'POSTGRES_USER', 'postgres');
	const postgresServer = text(env, 'POSTGRES_SERVER', 'localhost');
	const postgresPort = num(env, 'POSTGRES_PORT', 5432);
	const postgresDb = text(env, 'POSTGRES_DB', '');
	const redisPassword = text(env, 'REDIS_PASSWORD', '');
	const redisHost = text(env, 'REDIS_HOST', 'localhost');
	const redisPort = num(env, 'REDIS_PORT', 6379);
	const redisDb = num(env, 'REDIS_DB', 0);

	const frontendHost = text(env, 'FRONTEND_HOST', 'http://dashboard.localhost');
	const corsOrigins = parseCors(text(env, 'BACKEND_CORS_ORIGINS', ''));
	const host = frontendHost.trim().replace(/\/+$/, '');
	if (host && !corsOrigins.includes(host)) corsOrigins.push(host);

	const user = encodeURIComponent(postgresUser);
	const auth = postgresPassword ? `${user}:${encodeURIComponent(postgresPassword)}@` : `${user}@`;

	return {
		apiV1Str: text(env, 'API_V1_STR', '/api/v1'),
		secretKey: text(env, 'SECRET_KEY', 'changethis'),
		accessTokenExpireMinutes: num(env, 'ACCESS_TOKEN_EXPIRE_MINUTES', 60 * 24 * 8),
		frontendHost,
		environment,
		corsOrigins,
		projectName: text(env, 'PROJECT_NAME', 'elysia-svelte'),
		postgresServer,
		postgresPort,
		postgresUser,
		postgresPassword,
		postgresDb,
		databaseUrl: `postgresql://${auth}${postgresServer}:${postgresPort}/${postgresDb}`,
		redisHost,
		redisPort,
		redisDb,
		redisPassword,
		redisUrl: `redis://${redisPassword ? `:${encodeURIComponent(redisPassword)}@` : ''}${redisHost}:${redisPort}/${redisDb}`,
		firstSuperuser: text(env, 'FIRST_SUPERUSER', 'admin@example.com'),
		firstSuperuserPassword: text(env, 'FIRST_SUPERUSER_PASSWORD', 'changethis'),
		appHost: text(env, 'APP_HOST', '0.0.0.0'),
		appPort: num(env, 'APP_PORT', 8000),
		bcryptCost: num(env, 'BCRYPT_COST', 12)
	};
}

export function isLocal(config: AppConfig) {
	return config.environment === 'local';
}

/** Outside `local`, refuse the placeholder secrets. */
export function validateConfig(config: AppConfig) {
	if (isLocal(config)) return;
	if (config.secretKey === 'changethis') throw new Error('SECRET_KEY must be set in production');
	if (config.firstSuperuserPassword === 'changethis') {
		throw new Error('FIRST_SUPERUSER_PASSWORD must be set in production');
	}
}
