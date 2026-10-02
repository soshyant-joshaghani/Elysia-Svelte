import { Elysia, t } from 'elysia';
import { authenticated } from '../../../app/plugins/authenticated';
import { detail, message, noteCreate, notePublic, noteUpdate, uuidParam } from '../../../lib/http';
import type { AuthService } from '../../base/auth/service';
import type { NotesService } from './service';

const SECURITY = [{ OAuth2PasswordBearer: [] }];
const errors = { 401: detail, 403: detail, 404: detail, 422: detail };

export const sampleRoutes = (auth: AuthService, notes: NotesService) =>
	new Elysia({ prefix: '/sample', tags: ['[APPS] Sample'] })
		.get('', () => notes.sampleRoot(), {
			response: { 200: message },
			detail: { summary: 'Sample Root' }
		})
		.use(authenticated(auth))
		.get('/notes', ({ user }) => notes.list(user), {
			response: { 200: t.Array(notePublic), 401: detail },
			detail: { summary: 'List Notes', security: SECURITY }
		})
		.post(
			'/notes',
			async ({ user, body, set }) => {
				const created = await notes.create(user, body);
				set.status = 201;
				return created;
			},
			{
				body: noteCreate,
				response: { 201: notePublic, 401: detail, 422: detail },
				detail: { summary: 'Create Note', security: SECURITY }
			}
		)
		.get('/notes/:id', ({ user, params }) => notes.get(user, params.id), {
			params: uuidParam,
			response: { 200: notePublic, ...errors },
			detail: { summary: 'Read Note', security: SECURITY }
		})
		.patch('/notes/:id', ({ user, params, body }) => notes.update(user, params.id, body), {
			params: uuidParam,
			body: noteUpdate,
			response: { 200: notePublic, ...errors },
			detail: { summary: 'Update Note', security: SECURITY }
		})
		.delete(
			'/notes/:id',
			async ({ user, params, set }) => {
				await notes.remove(user, params.id);
				set.status = 204;
				return undefined;
			},
			{
				params: uuidParam,
				response: { 204: t.Void(), 401: detail, 403: detail, 404: detail, 422: detail },
				detail: { summary: 'Delete Note', security: SECURITY }
			}
		);
