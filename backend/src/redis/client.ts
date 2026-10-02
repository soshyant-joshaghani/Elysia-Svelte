import { Redis } from 'ioredis';
import type { AppConfig } from '../app/config';
import { log } from '../lib/logger';

/** Connections share one lazily created client that is rebuilt after it gives up. */
export type RedisHandle = {
	/** The live client, created on first use. Throws when Redis cannot be reached. */
	client(): Redis;
	close(): void;
};

export function createRedisHandle(config: Pick<AppConfig, 'redisHost' | 'redisPort' | 'redisDb' | 'redisPassword'>): RedisHandle {
	let current: Redis | null = null;
	return {
		client() {
			if (!current || current.status === 'end') {
				const redis = new Redis({
					host: config.redisHost,
					port: config.redisPort,
					db: config.redisDb,
					password: config.redisPassword || undefined,
					connectTimeout: 800,
					commandTimeout: 800,
					maxRetriesPerRequest: 0,
					// Give up quickly; the next call builds a fresh client, so Redis can come back later.
					retryStrategy: () => null
				});
				redis.on('error', (error: Error) => log.warn('redis error', { error: error.message }));
				current = redis;
			}
			return current;
		},
		close() {
			current?.disconnect();
			current = null;
		}
	};
}

/** Read-through cache. Every call is a no-op when Redis is unreachable. */
export type Cache = {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, ttlSeconds: number): Promise<void>;
	del(...keys: string[]): Promise<void>;
	delPrefix(prefix: string): Promise<void>;
};

export function createRedisCache(handle: RedisHandle): Cache {
	return {
		async get(key) {
			try {
				return await handle.client().get(key);
			} catch {
				return null;
			}
		},
		async set(key, value, ttlSeconds) {
			try {
				await handle.client().set(key, value, 'EX', ttlSeconds);
			} catch {
				/* cache is optional */
			}
		},
		async del(...keys) {
			if (keys.length === 0) return;
			try {
				await handle.client().del(...keys);
			} catch {
				/* cache is optional */
			}
		},
		async delPrefix(prefix) {
			try {
				const redis = handle.client();
				let cursor = '0';
				do {
					const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
					cursor = next;
					if (keys.length > 0) await redis.del(...keys);
				} while (cursor !== '0');
			} catch {
				/* cache is optional */
			}
		}
	};
}

export function memoryCache(): Cache & { keys(): string[] } {
	const values = new Map<string, { value: string; expires: number }>();
	return {
		keys: () => [...values.keys()],
		async get(key) {
			const hit = values.get(key);
			if (!hit || hit.expires < Date.now()) return null;
			return hit.value;
		},
		async set(key, value, ttlSeconds) {
			values.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
		},
		async del(...keys) {
			for (const key of keys) values.delete(key);
		},
		async delPrefix(prefix) {
			for (const key of [...values.keys()]) {
				if (key.startsWith(prefix)) values.delete(key);
			}
		}
	};
}
