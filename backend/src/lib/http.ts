import { t } from 'elysia';

// Wire shapes from CONTRACT.md. JSON is snake_case, errors are {"detail": "..."}.

export const uuidParam = t.Object({ id: t.String({ format: 'uuid' }) });

export const detail = t.Object({ detail: t.String() });

export const message = t.Object({ message: t.String() });

export const token = t.Object({ access_token: t.String(), token_type: t.String() });

export const userPublic = t.Object({
	id: t.String({ format: 'uuid' }),
	email: t.String(),
	is_active: t.Boolean(),
	is_superuser: t.Boolean(),
	full_name: t.Union([t.String(), t.Null()])
});

export const usersPublic = t.Object({ data: t.Array(userPublic), count: t.Number() });

const email = t.String({ format: 'email', maxLength: 255 });
const password = t.String({ minLength: 8, maxLength: 128 });
const fullName = t.Union([t.String({ maxLength: 255 }), t.Null()]);

export const userCreate = t.Object({
	email,
	password,
	is_active: t.Optional(t.Boolean()),
	is_superuser: t.Optional(t.Boolean()),
	full_name: t.Optional(fullName)
});

export const userUpdate = t.Object({
	email: t.Optional(email),
	password: t.Optional(password),
	full_name: t.Optional(fullName),
	is_active: t.Optional(t.Boolean()),
	is_superuser: t.Optional(t.Boolean())
});

export const privateUserCreate = t.Object({
	email: t.String({ maxLength: 255 }),
	password,
	full_name: t.Optional(fullName)
});

export const loginForm = t.Object({ username: t.String(), password: t.String() });

export const notePublic = t.Object({
	id: t.String({ format: 'uuid' }),
	title: t.String(),
	content: t.String(),
	owner_id: t.String({ format: 'uuid' }),
	created_at: t.String(),
	updated_at: t.String()
});

export const noteCreate = t.Object({
	title: t.String({ minLength: 1, maxLength: 255 }),
	content: t.Optional(t.String({ maxLength: 10000 }))
});

export const noteUpdate = t.Object({
	title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
	content: t.Optional(t.String({ maxLength: 10000 }))
});

export type UserPublic = typeof userPublic.static;
export type UserCreate = typeof userCreate.static;
export type UserUpdate = typeof userUpdate.static;
export type NotePublic = typeof notePublic.static;
export type NoteCreate = typeof noteCreate.static;
export type NoteUpdate = typeof noteUpdate.static;
