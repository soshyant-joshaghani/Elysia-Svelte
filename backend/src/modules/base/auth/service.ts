import type { AppConfig } from '../../../app/config';
import type { UserRow } from '../../../db/schema';
import { HttpError, invalidCredentials, notAuthenticated } from '../../../lib/errors/app-error';
import { createAccessToken, verifyAccessToken, verifyPassword } from '../../../lib/security';
import type { UserRepository } from '../users/repository';

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService(deps: {
	users: UserRepository;
	config: Pick<AppConfig, 'secretKey' | 'accessTokenExpireMinutes'>;
}) {
	const { users, config } = deps;

	return {
		/** Form login. A wrong email or password is 400, an inactive user is 400. */
		async login(email: string, password: string) {
			const user = await users.findByEmail(email);
			if (!user || !(await verifyPassword(password, user.hashedPassword))) {
				throw new HttpError(400, 'Incorrect email or password');
			}
			if (!user.isActive) throw new HttpError(400, 'Inactive user');
			const accessToken = await createAccessToken(user.id, config.secretKey, config.accessTokenExpireMinutes);
			return { access_token: accessToken, token_type: 'bearer' };
		},

		/** Resolve `Authorization: Bearer <jwt>` to a user. Auth is never cached. */
		async authenticate(header: string | null): Promise<UserRow> {
			if (!header) throw notAuthenticated();
			const [scheme, value] = header.split(' ', 2);
			if (scheme?.toLowerCase() !== 'bearer' || !value) throw notAuthenticated();
			const sub = await verifyAccessToken(value.trim(), config.secretKey);
			if (!sub) throw invalidCredentials();
			const user = await users.findById(sub);
			if (!user) throw invalidCredentials();
			return user;
		}
	};
}
