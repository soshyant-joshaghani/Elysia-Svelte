import { Elysia, t } from 'elysia';
import { detail, message, userCreate, userPublic, userUpdate, usersPublic, uuidParam } from '../../../lib/http';
import { authenticated } from '../../../app/plugins/authenticated';
import type { AuthService } from '../auth/service';
import type { UsersService } from './service';

const SECURITY = [{ OAuth2PasswordBearer: [] }];
const errors = { 401: detail, 403: detail, 404: detail, 422: detail };

export const usersRoutes = (auth: AuthService, users: UsersService) =>
	new Elysia({ prefix: '/base/users', tags: ['[SUPERADMIN] Core - User Management'] })
		.use(authenticated(auth))
		.get('/admin', ({ user, query }) => users.list(user, query.skip ?? 0, query.limit ?? 100), {
			query: t.Object({
				skip: t.Optional(t.Numeric({ minimum: 0 })),
				limit: t.Optional(t.Numeric({ minimum: 0 }))
			}),
			response: { 200: usersPublic, ...errors },
			detail: { summary: 'Read Users', security: SECURITY }
		})
		.post('/admin', ({ user, body }) => users.create(user, body), {
			body: userCreate,
			response: { 200: userPublic, 400: detail, ...errors },
			detail: { summary: 'Create User', security: SECURITY }
		})
		.get('/:id/admin', ({ user, params }) => users.get(user, params.id), {
			params: uuidParam,
			response: { 200: userPublic, ...errors },
			detail: { summary: 'Read User By Id', security: SECURITY }
		})
		.patch('/:id/admin', ({ user, params, body }) => users.update(user, params.id, body), {
			params: uuidParam,
			body: userUpdate,
			response: { 200: userPublic, 409: detail, ...errors },
			detail: { summary: 'Update User', security: SECURITY }
		})
		.delete('/:id/admin', ({ user, params }) => users.remove(user, params.id), {
			params: uuidParam,
			response: { 200: message, ...errors },
			detail: { summary: 'Delete User', security: SECURITY }
		});
