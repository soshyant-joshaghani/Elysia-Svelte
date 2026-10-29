import { jwtVerify, SignJWT } from 'jose';

// JWT HS256 with claims `sub` (user uuid) and `exp`. Passwords are bcrypt ($2b$),
// so hashes written by the other FoxG backends verify here and the reverse.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
	return UUID.test(value);
}

export async function createAccessToken(subject: string, secret: string, expireMinutes: number) {
	return new SignJWT({})
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setSubject(subject)
		.setExpirationTime(Math.floor(Date.now() / 1000) + expireMinutes * 60)
		.sign(new TextEncoder().encode(secret));
}

/** Returns the `sub` claim, or null for a bad, expired or malformed token. */
export async function verifyAccessToken(token: string, secret: string): Promise<string | null> {
	try {
		const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
		return typeof payload.sub === 'string' && isUuid(payload.sub) ? payload.sub : null;
	} catch {
		return null;
	}
}

export function hashPassword(password: string, cost: number) {
	return Bun.password.hash(password, { algorithm: 'bcrypt', cost });
}

export async function verifyPassword(password: string, hash: string) {
	try {
		return await Bun.password.verify(password, hash);
	} catch {
		return false;
	}
}
