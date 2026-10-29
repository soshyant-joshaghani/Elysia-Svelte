import { beforeAll, describe, expect, test } from 'bun:test';
import { createTestApp, ADMIN_EMAIL, ADMIN_PASSWORD } from '../../helpers';

type Ctx = Awaited<ReturnType<typeof createTestApp>>;
let t: Ctx;
let admin: string;
const USER_KEYS = ['email', 'full_name', 'id', 'is_active', 'is_superuser'];
beforeAll(async () => {
	t = await createTestApp();
	admin = await t.login(ADMIN_EMAIL, ADMIN_PASSWORD);
});

describe('users (admin)', () => {
	test('create, list ordered by email, read, patch, delete', async () => {
		const created = await t.call('POST', '/base/users/admin', {
			token: admin,
			json: { email: 'zed@example.com', password: 'userpass123', full_name: 'Zed' }
		});
		expect(created.status).toBe(200);
		expect(Object.keys(created.json).sort()).toEqual(USER_KEYS);
		expect(created.json).toMatchObject({ is_active: true, is_superuser: false, full_name: 'Zed' });
		const id = created.json.id;

		const dup = await t.call('POST', '/base/users/admin', { token: admin, json: { email: 'zed@example.com', password: 'userpass123' } });
		expect(dup.status).toBe(400);
		expect(dup.json).toEqual({ detail: 'The user with this email already exists in the system.' });

		const list = await t.call('GET', '/base/users/admin?skip=0&limit=100', { token: admin });
		expect(list.status).toBe(200);
		expect(list.json.count).toBe(list.json.data.length);
		const emails = list.json.data.map((u: { email: string }) => u.email);
		expect(emails).toEqual([...emails].sort());

		const page = await t.call('GET', '/base/users/admin?skip=1&limit=1', { token: admin });
		expect(page.json.data).toHaveLength(1);
		expect(page.json.count).toBe(list.json.count);

		expect((await t.call('GET', `/base/users/${id}/admin`, { token: admin })).json.email).toBe('zed@example.com');

		const patched = await t.call('PATCH', `/base/users/${id}/admin`, { token: admin, json: { full_name: 'Zed Two', password: 'newpassword1' } });
		expect(patched.status).toBe(200);
		expect(patched.json.full_name).toBe('Zed Two');
		expect(patched.json.email).toBe('zed@example.com');
		expect(await t.login('zed@example.com', 'newpassword1')).toBeTruthy();

		const unknown = await t.call('PATCH', `/base/users/${crypto.randomUUID()}/admin`, { token: admin, json: { full_name: 'x' } });
		expect(unknown.status).toBe(404);
		expect(unknown.json).toEqual({ detail: 'The user with this id does not exist in the system' });

		const clash = await t.call('PATCH', `/base/users/${id}/admin`, { token: admin, json: { email: ADMIN_EMAIL } });
		expect(clash.status).toBe(409);
		expect(clash.json).toEqual({ detail: 'User with this email already exists' });

		const removed = await t.call('DELETE', `/base/users/${id}/admin`, { token: admin });
		expect(removed.json).toEqual({ message: 'User deleted successfully' });
		expect((await t.call('DELETE', `/base/users/${id}/admin`, { token: admin })).json).toEqual({ detail: 'User not found' });
	});

	test('superusers cannot delete themselves', async () => {
		const me = await t.call('GET', '/base/login/me', { token: admin });
		const reply = await t.call('DELETE', `/base/users/${me.json.id}/admin`, { token: admin });
		expect(reply.status).toBe(403);
		expect(reply.json).toEqual({ detail: 'Super users are not allowed to delete themselves' });
	});

	test('a regular user: self read only, superuser routes are 403', async () => {
		const user = await t.createUser(admin, 'regular@example.com');
		const token = await t.login('regular@example.com', 'userpass123');
		const me = await t.call('GET', '/base/login/me', { token: admin });

		const list = await t.call('GET', '/base/users/admin', { token });
		expect(list.status).toBe(403);
		expect(list.json).toEqual({ detail: "The user doesn't have enough privileges" });
		expect((await t.call('GET', `/base/users/${user.id}/admin`, { token })).status).toBe(200);
		expect((await t.call('GET', `/base/users/${me.json.id}/admin`, { token })).status).toBe(403);
		expect((await t.call('PATCH', `/base/users/${user.id}/admin`, { token, json: { full_name: 'x' } })).status).toBe(403);
		expect((await t.call('POST', '/base/users/admin', { token, json: { email: 'n@example.com', password: 'userpass123' } })).status).toBe(403);
		expect((await t.call('GET', `/base/users/${crypto.randomUUID()}/admin`, { token: admin })).json).toEqual({ detail: 'User not found' });
	});

	test('validation failures are 422 with a string detail', async () => {
		const badEmail = await t.call('POST', '/base/users/admin', { token: admin, json: { email: 'nope', password: 'userpass123' } });
		expect(badEmail.status).toBe(422);
		expect(typeof badEmail.json.detail).toBe('string');
		const badId = await t.call('GET', '/base/users/not-a-uuid/admin', { token: admin });
		expect(badId.status).toBe(422);
	});

	test('deleting a user deletes their notes first', async () => {
		const user = await t.createUser(admin, 'withnotes@example.com');
		const token = await t.login('withnotes@example.com', 'userpass123');
		await t.call('POST', '/sample/notes', { token, json: { title: 'mine' } });
		expect((await t.call('DELETE', `/base/users/${user.id}/admin`, { token: admin })).status).toBe(200);
	});
});
