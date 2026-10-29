import { describe, expect, test } from 'bun:test';
import { createRedisCache, createRedisHandle } from '../../../backend/src/redis/client';

describe('cache soft-degradation', () => {
	test('every call is a no-op when Redis is unreachable', async () => {
		const handle = createRedisHandle({ redisHost: '127.0.0.1', redisPort: 1, redisDb: 0, redisPassword: '' });
		const cache = createRedisCache(handle);
		expect(await cache.get('k')).toBeNull();
		await cache.set('k', 'v', 10);
		await cache.del('k');
		await cache.delPrefix('k');
		handle.close();
	});
});
