import { beforeAll, describe, expect, test } from 'bun:test';
import { decodeJwt, decodeProtectedHeader } from '../../../../backend/test-support/deps';
import { users } from '../../../../backend/src/db/schema';
import { createTestApp, ADMIN_EMAIL, ADMIN_PASSWORD } from '../../helpers';

type Ctx = Awaited<ReturnType<typeof createTestApp>>;
let t: Ctx;
let admin: string;

beforeAll(async () => {
	t = await createTestApp();
	admin = await t.login(ADMIN_EMAIL, ADMIN_PASSWORD);
});

describe('login', () => {
	test('form login returns a bearer token with HS256 sub and exp', async () => {
		const reply = await t.call('POST', '/base/login/access-token', { form: { username: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
		expect(reply.status).toBe(200);
		expect(reply.json.token_type).toBe('bearer');
		const token: string = reply.json.access_token;
		expect(decodeProtectedHeader(token).alg).toBe('HS256');
		const claims = decodeJwt(token);
		const me = await t.call('GET', '/base/login/me', { token });
		expect(claims.sub).toBe(me.json.id);
		expect(claims.exp! - Math.floor(Date.now() / 1000)).toBeGreaterThan(11500 * 60 - 120);
	});

	test('wrong password and unknown email are 400', async () => {
		for (const form of [
			{ username: ADMIN_EMAIL, password: 'wrong-password' },
			{ username: 'nobody@example.com', password: 'whatever123' }
		]) {
			const reply = await t.call('POST', '/base/login/access-token', { form });
			expect(reply.status).toBe(400);
			expect(reply.json).toEqual({ detail: 'Incorrect email or password' });
		}
	});

	test('a missing form field is 422 with a string detail', async () => {
		const reply = await t.call('POST', '/base/login/access-token', { form: { username: ADMIN_EMAIL } });
		expect(reply.status).toBe(422);
		expect(typeof reply.json.detail).toBe('string');
	});

	test('an inactive user is 400', async () => {
		await t.createUser(admin, 'inactive@example.com', 'userpass123', { is_active: false });
		const reply = await t.call('POST', '/base/login/access-token', { form: { username: 'inactive@example.com', password: 'userpass123' } });
		expect(reply.status).toBe(400);
		expect(reply.json).toEqual({ detail: 'Inactive user' });
	});

	test('a bcrypt $2b$ hash written by another backend verifies', async () => {
		// Hash produced by Python bcrypt for "Fast#1234".
		await t.db.insert(users).values({
			id: crypto.randomUUID(),
			email: 'fast@example.com',
			isActive: true,
			isSuperuser: false,
			fullName: null,
			hashedPassword: '$2b$04$FC/4EGoOPERLcoAdik2JK.hBIOmHqnT0TcT5z5kYVdyateFTlv6um'
		});
		expect(await t.login('fast@example.com', 'Fast#1234')).toBeTruthy();
		const row = (await t.db.select().from(users)).find((u) => u.email === ADMIN_EMAIL);
		expect(row?.hashedPassword.startsWith('$2b$')).toBe(true);
	});

	test('401 shapes carry WWW-Authenticate', async () => {
		const none = await t.call('GET', '/base/login/me');
		expect(none.status).toBe(401);
		expect(none.json).toEqual({ detail: 'Not authenticated' });
		expect(none.headers.get('www-authenticate')).toBe('Bearer');

		const bad = await t.call('GET', '/base/login/me', { token: 'not-a-jwt' });
		expect(bad.status).toBe(401);
		expect(bad.json).toEqual({ detail: 'Could not validate credentials' });
		expect(bad.headers.get('www-authenticate')).toBe('Bearer');
	});

	test('a token for a deleted user is 401', async () => {
		const user = await t.createUser(admin, 'gone@example.com');
		const token = await t.login('gone@example.com', 'userpass123');
		expect((await t.call('DELETE', `/base/users/${user.id}/admin`, { token: admin })).status).toBe(200);
		const reply = await t.call('GET', '/base/login/me', { token });
		expect(reply.status).toBe(401);
		expect(reply.json).toEqual({ detail: 'Could not validate credentials' });
	});
});
