/** HTTP error rendered as `{"detail": "<message>"}`. */
export class HttpError extends Error {
	constructor(
		readonly status: number,
		readonly detail: string,
		readonly headers: Record<string, string> = {}
	) {
		super(detail);
		this.name = 'HttpError';
	}
}

const BEARER = { 'WWW-Authenticate': 'Bearer' };

export const notAuthenticated = () => new HttpError(401, 'Not authenticated', BEARER);
export const invalidCredentials = () => new HttpError(401, 'Could not validate credentials', BEARER);
export const notEnoughPrivileges = () => new HttpError(403, "The user doesn't have enough privileges");
