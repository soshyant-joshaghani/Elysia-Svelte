import type { NoteRow, UserRow } from '../../../db/schema';
import { HttpError } from '../../../lib/errors/app-error';
import type { NoteCreate, NotePublic, NoteUpdate } from '../../../lib/http';
import type { Cache } from '../../../redis/client';
import type { NotePatch, NoteRepository } from './repository';

// Canonical read-cache example (CONTRACT.md, "Cache"): list and get read through Redis,
// writes invalidate the owner's keys. Redis down means Postgres only.
const PREFIX = 'sample:notes:v1:';
const TTL_LIST = 120;
const TTL_NOTE = 300;

const listKey = (owner: string) => `${PREFIX}list:${owner}`;
const noteKey = (owner: string, id: string) => `${PREFIX}note:${owner}:${id}`;

export function toPublicNote(row: NoteRow): NotePublic {
	return {
		id: row.id,
		title: row.title,
		content: row.content,
		owner_id: row.ownerId,
		created_at: row.createdAt.toISOString(),
		updated_at: row.updatedAt.toISOString()
	};
}

function parse<T>(raw: string | null): T | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

export type NotesService = ReturnType<typeof createNotesService>;

export function createNotesService(deps: { notes: NoteRepository; cache: Cache }) {
	const { notes, cache } = deps;

	async function invalidateOwner(owner: string) {
		await cache.delPrefix(listKey(owner));
	}

	/** Load from Postgres (never the cache) and check ownership. */
	async function owned(actor: UserRow, id: string) {
		const note = await notes.findById(id);
		if (!note) throw new HttpError(404, 'Note not found');
		if (note.ownerId !== actor.id) throw new HttpError(403, 'Not allowed to access this note');
		return note;
	}

	return {
		sampleRoot: () => ({ message: 'Sample module — see /sample/notes for the canonical CRUD example' }),

		async list(actor: UserRow) {
			const key = listKey(actor.id);
			const cached = parse<NotePublic[]>(await cache.get(key));
			if (Array.isArray(cached)) return cached;
			const out = (await notes.listByOwner(actor.id)).map(toPublicNote);
			await cache.set(key, JSON.stringify(out), TTL_LIST);
			return out;
		},

		async create(actor: UserRow, input: NoteCreate) {
			const title = input.title.trim();
			if (!title) throw new HttpError(422, 'Title cannot be empty');
			const now = new Date();
			const created = await notes.insert({
				id: crypto.randomUUID(),
				title,
				content: (input.content ?? '').trim(),
				ownerId: actor.id,
				createdAt: now,
				updatedAt: now
			});
			const pub = toPublicNote(created);
			await invalidateOwner(actor.id);
			await cache.set(noteKey(actor.id, pub.id), JSON.stringify(pub), TTL_NOTE);
			return pub;
		},

		async get(actor: UserRow, id: string) {
			const key = noteKey(actor.id, id);
			const cached = parse<NotePublic>(await cache.get(key));
			if (cached && typeof cached === 'object' && cached.owner_id === actor.id) return cached;
			const pub = toPublicNote(await owned(actor, id));
			await cache.set(key, JSON.stringify(pub), TTL_NOTE);
			return pub;
		},

		async update(actor: UserRow, id: string, input: NoteUpdate) {
			const note = await owned(actor, id);
			const patch: NotePatch = {};
			if (input.title !== undefined) {
				const title = input.title.trim();
				if (!title) throw new HttpError(422, 'Title cannot be empty');
				patch.title = title;
			}
			if (input.content !== undefined) patch.content = input.content.trim();
			if (Object.keys(patch).length > 0) patch.updatedAt = new Date();
			const updated = Object.keys(patch).length > 0 ? await notes.update(note.id, patch) : note;
			if (!updated) throw new HttpError(404, 'Note not found');
			const pub = toPublicNote(updated);
			await invalidateOwner(actor.id);
			await cache.set(noteKey(actor.id, id), JSON.stringify(pub), TTL_NOTE);
			return pub;
		},

		async remove(actor: UserRow, id: string) {
			const note = await owned(actor, id);
			await notes.remove(note.id);
			await cache.del(noteKey(actor.id, id));
			await invalidateOwner(actor.id);
		}
	};
}
