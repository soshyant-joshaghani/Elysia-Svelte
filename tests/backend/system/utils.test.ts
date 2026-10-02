import { beforeAll, describe, expect, test } from 'bun:test';
import { createTestApp, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

type Ctx = Awaited<ReturnType<typeof createTestApp>>;
let t: Ctx;
let admin: string;

beforeAll(async () => {
	t = await createTestApp();
	admin = await t.login(ADMIN_EMAIL, ADMIN_PASSWORD);
});

describe('system utils', () => {
	test('health-check is true', async () => {
		const reply = await t.call('GET', '/utils/health-check');
		expect(reply.status).toBe(200);
		expect(reply.json).toBe(true);
	});

	test('docs pages and the openapi document', async () => {
		for (const path of ['/docs', '/sdoc']) {
			const reply = await t.app.handle(new Request(`http://localhost${path}`));
			expect(reply.status).toBe(200);
			expect(reply.headers.get('content-type')).toContain('text/html');
		}
		const spec = await t.call('GET', '/openapi.json');
		expect(spec.status).toBe(200);
		expect(spec.json.paths['/api/v1/base/login/access-token']).toBeDefined();
		expect(spec.json.components.securitySchemes.OAuth2PasswordBearer.type).toBe('oauth2');
	});


	test('CORS allows the configured origins', async () => {
		const reply = await t.app.handle(
			new Request('http://localhost/api/v1/utils/health-check', { headers: { origin: 'http://localhost:5000' } })
		);
		expect(reply.headers.get('access-control-allow-origin')).toBe('http://localhost:5000');
		expect(reply.headers.get('access-control-allow-credentials')).toBe('true');
	});
});
