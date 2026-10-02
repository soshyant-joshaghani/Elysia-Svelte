import { Elysia, t } from 'elysia';
import { HttpError } from '../../../lib/errors/app-error';
import { detail, message, privateUserCreate, userPublic } from '../../../lib/http';
import type { JobQueue } from '../../../jobs';
import type { UsersService } from '../../base/users/service';

/** Local development helpers. Only mounted when ENVIRONMENT=local. */
export const privateRoutes = (users: UsersService, jobs: JobQueue) =>
	new Elysia({ prefix: '/private', tags: ['[SYSTEM] System - Private'] })
		.get('/ping', () => ({ message: 'private ok' }), {
			response: { 200: message },
			detail: { summary: 'Private Ping' }
		})
		.post('/users', ({ body }) => users.createPrivate(body), {
			body: privateUserCreate,
			response: { 200: userPublic, 400: detail, 422: detail },
			detail: { summary: 'Create User (local only)' }
		})
		.post(
			'/jobs/ping',
			async ({ query }) => {
				const text = query.message ?? 'ping';
				try {
					const jobId = await jobs.enqueue('ping', { message: text });
					return { job_id: jobId, message: text };
				} catch (error) {
					const reason = error instanceof Error ? error.message : String(error);
					throw new HttpError(503, `Redis unavailable: ${reason}`);
				}
			},
			{
				query: t.Object({ message: t.Optional(t.String()) }),
				response: { 200: t.Object({ job_id: t.String(), message: t.String() }), 503: detail },
				detail: { summary: 'Enqueue Ping Job (local only)' }
			}
		);
