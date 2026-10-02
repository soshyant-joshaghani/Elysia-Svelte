import { count, eq } from 'drizzle-orm';
import type { Database } from '../../../db/client';
import { users, type UserRow } from '../../../db/schema';

export type UserPatch = Partial<Omit<UserRow, 'id'>>;

/** Queries and writes only. Rules live in the service. */
export function createUserRepository(db: Database) {
	return {
		async findById(id: string) {
			const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
			return rows[0] ?? null;
		},
		async findByEmail(email: string) {
			const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
			return rows[0] ?? null;
		},
		async list(skip: number, limit: number) {
			return db.select().from(users).orderBy(users.email).offset(skip).limit(limit);
		},
		async count() {
			const rows = await db.select({ value: count() }).from(users);
			return Number(rows[0]?.value ?? 0);
		},
		async insert(row: UserRow) {
			const rows = await db.insert(users).values(row).returning();
			const created = rows[0];
			if (!created) throw new Error('Could not create user');
			return created;
		},
		async update(id: string, patch: UserPatch) {
			if (Object.keys(patch).length === 0) return this.findById(id);
			const rows = await db.update(users).set(patch).where(eq(users.id, id)).returning();
			return rows[0] ?? null;
		},
		async remove(id: string) {
			await db.delete(users).where(eq(users.id, id));
		}
	};
}

export type UserRepository = ReturnType<typeof createUserRepository>;
