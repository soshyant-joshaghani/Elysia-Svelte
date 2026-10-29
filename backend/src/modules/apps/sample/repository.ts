import { desc, eq } from 'drizzle-orm';
import type { Database } from '../../../db/client';
import { notes, type NoteRow } from '../../../db/schema';

export type NotePatch = Partial<Pick<NoteRow, 'title' | 'content' | 'updatedAt'>>;

/** Queries and writes only. Rules, ownership and cache live in the service. */
export function createNoteRepository(db: Database) {
	return {
		async listByOwner(ownerId: string) {
			return db.select().from(notes).where(eq(notes.ownerId, ownerId)).orderBy(desc(notes.updatedAt));
		},
		async findById(id: string) {
			const rows = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
			return rows[0] ?? null;
		},
		async insert(row: NoteRow) {
			const rows = await db.insert(notes).values(row).returning();
			const created = rows[0];
			if (!created) throw new Error('Could not create note');
			return created;
		},
		async update(id: string, patch: NotePatch) {
			const rows = await db.update(notes).set(patch).where(eq(notes.id, id)).returning();
			return rows[0] ?? null;
		},
		async remove(id: string) {
			await db.delete(notes).where(eq(notes.id, id));
		},
		async removeByOwner(ownerId: string) {
			await db.delete(notes).where(eq(notes.ownerId, ownerId));
		}
	};
}

export type NoteRepository = ReturnType<typeof createNoteRepository>;
