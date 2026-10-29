import { cors } from '@elysia/cors';
import { openapi } from '@elysia/openapi';
import { Elysia } from 'elysia';
import { createDatabase, type Database } from '../db/client';
import type { JobQueue } from '../jobs';
import { createRedisJobQueue } from '../jobs/queue';
import { HttpError } from '../lib/errors/app-error';
import { log } from '../lib/logger';
import { createNoteRepository } from '../modules/apps/sample/repository';
import { sampleRoutes } from '../modules/apps/sample/routes';
import { createNotesService } from '../modules/apps/sample/service';
import { authRoutes } from '../modules/base/auth/routes';
import { createAuthService } from '../modules/base/auth/service';
import { createUserRepository } from '../modules/base/users/repository';
import { usersRoutes } from '../modules/base/users/routes';
import { createUsersService } from '../modules/base/users/service';
import { privateRoutes } from '../modules/system/private/routes';
import { utilsRoutes } from '../modules/system/utils/routes';
import { createRedisCache, createRedisHandle, type Cache } from '../redis/client';
import { isLocal, loadConfig, type AppConfig } from './config';

export type AppDeps = {
	config?: AppConfig;
	db?: Database;
	cache?: Cache;
	jobs?: JobQueue;
};

const SWAGGER_PAGE = (title: string, specUrl: string) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title} - Swagger UI</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: ${JSON.stringify(specUrl)}, dom_id: '#swagger-ui', persistAuthorization: true });</script>
</body>
</html>`;

function validationDetail(error: { all?: { path?: string; message?: string }[]; message: string }) {
	const items = (error.all ?? [])
		.filter((item) => item.message)
		.map((item) => {
			const path = (item.path ?? '').replace(/^\//, '');
			return path ? `${path}: ${item.message}` : String(item.message);
		});
	return items.length > 0 ? items.join('; ') : 'Validation error';
}

export function createApp(deps: AppDeps = {}) {
	const config = deps.config ?? loadConfig();
	const db = deps.db ?? createDatabase(config.databaseUrl);
	const redis = createRedisHandle(config);
	const cache = deps.cache ?? createRedisCache(redis);
	const jobs = deps.jobs ?? createRedisJobQueue(redis);

	const userRepo = createUserRepository(db);
	const noteRepo = createNoteRepository(db);
	const users = createUsersService({ users: userRepo, notes: noteRepo, config });
	const auth = createAuthService({ users: userRepo, config });
	const notes = createNotesService({ notes: noteRepo, cache });

	const specPath = `${config.apiV1Str}/openapi.json`;

	return new Elysia()
		.onError({ as: 'global' }, ({ code, error, set }) => {
			if (error instanceof HttpError) {
				set.status = error.status;
				for (const [name, value] of Object.entries(error.headers)) set.headers[name] = value;
				return { detail: error.detail };
			}
			if (code === 'VALIDATION') {
				if (error.type === 'response') {
					log.error('response validation failed', { error: error.message });
					set.status = 500;
					return { detail: 'Internal Server Error' };
				}
				set.status = 422;
				return { detail: validationDetail(error) };
			}
			if (code === 'PARSE') {
				set.status = 422;
				return { detail: 'Invalid request body' };
			}
			if (code === 'NOT_FOUND') {
				set.status = 404;
				return { detail: 'Not Found' };
			}
			log.error('unhandled error', { error: error instanceof Error ? error.message : String(error) });
			set.status = 500;
			return { detail: 'Internal Server Error' };
		})
		.use(cors({ origin: config.corsOrigins, credentials: true, methods: '*', allowedHeaders: '*' }))
		.use(
			openapi({
				path: '/sdoc',
				provider: 'scalar',
				specPath,
				documentation: {
					info: { title: config.projectName, version: '0.1.0' },
					components: {
						securitySchemes: {
							OAuth2PasswordBearer: {
								type: 'oauth2',
								flows: { password: { tokenUrl: `${config.apiV1Str}/base/login/access-token`, scopes: {} } }
							}
						}
					}
				},
				scalar: { theme: 'elysiajs', persistAuth: true }
			})
		)
		.get(
			'/docs',
			() =>
				new Response(SWAGGER_PAGE(config.projectName, specPath), {
					headers: { 'content-type': 'text/html; charset=utf-8' }
				}),
			{ detail: { hide: true } }
		)
		.group(config.apiV1Str, (api) =>
			api
				.use(utilsRoutes())
				.use(authRoutes(auth))
				.use(usersRoutes(auth, users))
				.use(sampleRoutes(auth, notes))
				.use(isLocal(config) ? privateRoutes(users, jobs) : new Elysia())
		);
}

export type App = ReturnType<typeof createApp>;
