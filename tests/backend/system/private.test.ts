import { beforeAll, describe, expect, test } from 'bun:test';
import { createTestApp, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

type Ctx = Awaited<ReturnType<typeof createTestApp>>;
let t: Ctx;
let admin: string;
const USER_KEYS = ['email', 'full_name', 'id', 'is_active', 'is_superuser'];
beforeAll(async () => {
	t = await createTestApp();
	admin = await t.login(ADMIN_EMAIL, ADMIN_PASSWORD);
});

describe('system private', () => {
	test('private routes exist in local', async () => {
		expect((await t.call('GET', '/private/ping')).json).toEqual({ message: 'private ok' });
		const created = await t.call('POST', '/private/users', { json: { email: 'dev@example.com', password: 'longenough1', full_name: 'Dev' } });
		expect(created.status).toBe(200);
		expect(Object.keys(created.json).sort()).toEqual(USER_KEYS);
		expect(created.json.is_superuser).toBe(false);
		const again = await t.call('POST', '/private/users', { json: { email: 'dev@example.com', password: 'longenough1' } });
		expect(again.status).toBe(400);
		const short = await t.call('POST', '/private/users', { json: { email: 'x@example.com', password: 'short' } });
		expect(short.status).toBe(422);
		expect(typeof short.json.detail).toBe('string');
	});

	test('private routes are not mounted outside local', async () => {
		const prod = await createTestApp({ ENVIRONMENT: 'production' });
		const reply = await prod.call('GET', '/private/ping');
		expect(reply.status).toBe(404);
		expect(reply.json).toEqual({ detail: 'Not Found' });
		expect((await prod.call('POST', '/private/users', { json: { email: 'a@example.com', password: 'longenough1' } })).status).toBe(404);
	});

	test('private job ping enqueues on the Redis list protocol shape', async () => {
		const reply = await t.call('POST', '/private/jobs/ping?message=hello');
		expect(reply.status).toBe(200);
		expect(reply.json.message).toBe('hello');
		const job = t.jobs.jobs.find((item) => item.id === reply.json.job_id);
		expect(job?.task).toBe('ping');
		expect(job?.args).toEqual({ message: 'hello' });
		expect((await t.call('POST', '/private/jobs/ping')).json.message).toBe('ping');

		t.jobs.failWith('connection refused');
		const down = await t.call('POST', '/private/jobs/ping');
		expect(down.status).toBe(503);
		expect(down.json).toEqual({ detail: 'Redis unavailable: connection refused' });
		t.jobs.failWith(null);
	});

});
