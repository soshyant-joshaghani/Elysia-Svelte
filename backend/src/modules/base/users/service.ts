import type { AppConfig } from '../../../app/config';
import type { UserRow } from '../../../db/schema';
import { HttpError, notEnoughPrivileges } from '../../../lib/errors/app-error';
import type { UserCreate, UserPublic, UserUpdate } from '../../../lib/http';
import { hashPassword } from '../../../lib/security';
import type { NoteRepository } from '../../apps/sample/repository';
import type { UserPatch, UserRepository } from './repository';

const EMAIL_TAKEN = 'The user with this email already exists in the system.';

export function toPublicUser(row: UserRow): UserPublic {
	return {
		id: row.id,
		email: row.email,
		is_active: row.isActive,
		is_superuser: row.isSuperuser,
		full_name: row.fullName
	};
}

function isUniqueViolation(error: unknown) {
	const code = (error as { code?: string; errno?: string } | null)?.code ?? (error as { errno?: string } | null)?.errno;
	return code === '23505' || /duplicate key|unique constraint/i.test(String((error as Error)?.message ?? ''));
}

export type UsersService = ReturnType<typeof createUsersService>;

export function createUsersService(deps: {
	users: UserRepository;
	notes: NoteRepository;
	config: Pick<AppConfig, 'bcryptCost'>;
}) {
	const { users, notes, config } = deps;

	function requireSuperuser(actor: UserRow) {
		if (!actor.isSuperuser) throw notEnoughPrivileges();
	}

	async function insert(input: {
		email: string;
		password: string;
		fullName: string | null;
		isActive: boolean;
		isSuperuser: boolean;
	}) {
		if (await users.findByEmail(input.email)) throw new HttpError(400, EMAIL_TAKEN);
		try {
			return await users.insert({
				id: crypto.randomUUID(),
				email: input.email,
				isActive: input.isActive,
				isSuperuser: input.isSuperuser,
				fullName: input.fullName,
				hashedPassword: await hashPassword(input.password, config.bcryptCost)
			});
		} catch (error) {
			if (isUniqueViolation(error)) throw new HttpError(400, EMAIL_TAKEN);
			throw error;
		}
	}

	return {
		async list(actor: UserRow, skip: number, limit: number) {
			requireSuperuser(actor);
			const [rows, total] = await Promise.all([users.list(skip, limit), users.count()]);
			return { data: rows.map(toPublicUser), count: total };
		},

		async create(actor: UserRow, input: UserCreate) {
			requireSuperuser(actor);
			const created = await insert({
				email: input.email,
				password: input.password,
				fullName: input.full_name ?? null,
				isActive: input.is_active ?? true,
				isSuperuser: input.is_superuser ?? false
			});
			return toPublicUser(created);
		},

		/** Local-only `/private/users`: no authentication, never a superuser. */
		async createPrivate(input: { email: string; password: string; full_name?: string | null }) {
			const created = await insert({
				email: input.email,
				password: input.password,
				fullName: input.full_name ?? null,
				isActive: true,
				isSuperuser: false
			});
			return toPublicUser(created);
		},

		/** Start-up seed: create FIRST_SUPERUSER when missing. Returns true when it was created. */
		async ensureSuperuser(email: string, password: string) {
			if (await users.findByEmail(email)) return false;
			await insert({ email, password, fullName: null, isActive: true, isSuperuser: true });
			return true;
		},

		async get(actor: UserRow, id: string) {
			const found = await users.findById(id);
			if (found && found.id === actor.id) return toPublicUser(found);
			requireSuperuser(actor);
			if (!found) throw new HttpError(404, 'User not found');
			return toPublicUser(found);
		},

		async update(actor: UserRow, id: string, input: UserUpdate) {
			requireSuperuser(actor);
			const existing = await users.findById(id);
			if (!existing) throw new HttpError(404, 'The user with this id does not exist in the system');
			if (input.email) {
				const clash = await users.findByEmail(input.email);
				if (clash && clash.id !== id) throw new HttpError(409, 'User with this email already exists');
			}
			const patch: UserPatch = {};
			if (input.email !== undefined) patch.email = input.email;
			if (input.full_name !== undefined) patch.fullName = input.full_name;
			if (input.is_active !== undefined) patch.isActive = input.is_active;
			if (input.is_superuser !== undefined) patch.isSuperuser = input.is_superuser;
			if (input.password !== undefined) patch.hashedPassword = await hashPassword(input.password, config.bcryptCost);
			try {
				const updated = await users.update(id, patch);
				if (!updated) throw new HttpError(404, 'The user with this id does not exist in the system');
				return toPublicUser(updated);
			} catch (error) {
				if (isUniqueViolation(error)) throw new HttpError(409, 'User with this email already exists');
				throw error;
			}
		},

		async remove(actor: UserRow, id: string) {
			requireSuperuser(actor);
			const found = await users.findById(id);
			if (!found) throw new HttpError(404, 'User not found');
			if (found.id === actor.id) throw new HttpError(403, 'Super users are not allowed to delete themselves');
			await notes.removeByOwner(id);
			await users.remove(id);
			return { message: 'User deleted successfully' };
		}
	};
}
