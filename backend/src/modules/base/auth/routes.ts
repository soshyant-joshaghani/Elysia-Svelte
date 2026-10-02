import { Elysia, t } from 'elysia';
import { detail, token, userPublic } from '../../../lib/http';
import { toPublicUser } from '../users/service';
import { authenticated } from '../../../app/plugins/authenticated';
import type { AuthService } from './service';

export const authRoutes = (auth: AuthService) =>
	new Elysia({ prefix: '/base/login', tags: ['[BASE] Auth'] })
		.post('/access-token', ({ body }) => auth.login(body.username, body.password), {
			body: t.Object({ username: t.String(), password: t.String() }),
			response: { 200: token, 400: detail, 422: detail },
			detail: { summary: 'Login Access Token' }
		})
		.use(authenticated(auth))
		.get('/me', ({ user }) => toPublicUser(user), {
			response: { 200: userPublic, 401: detail },
			detail: { summary: 'Read Users Me', security: [{ OAuth2PasswordBearer: [] }] }
		});
