import { Elysia } from 'elysia';
import type { AuthService } from '../../modules/base/auth/service';

/** Adds `user` (the authenticated account) to the routes registered after it. 401 comes before validation. */
export const authenticated = (auth: AuthService) =>
	new Elysia().derive({ as: 'scoped' }, async ({ request }) => ({
		user: await auth.authenticate(request.headers.get('authorization'))
	}));
