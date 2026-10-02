import { beforeAll, describe, expect, test } from 'bun:test';
import { createTestApp, ADMIN_EMAIL, ADMIN_PASSWORD } from '../../helpers';

type Ctx = Awaited<ReturnType<typeof createTestApp>>;
let t: Ctx;
let admin: string;
const NOTE_KEYS = ['content', 'created_at', 'id', 'owner_id', 'title', 'updated_at'];
beforeAll(async () => {
	t = await createTestApp();
	admin = await t.login(ADMIN_EMAIL, ADMIN_PASSWORD);
});

describe('sample notes', () => {
	let token: string;
	let other: string;

	beforeAll(async () => {
		await t.createUser(admin, 'owner@example.com');
		await t.createUser(admin, 'stranger@example.com');
		token = await t.login('owner@example.com', 'userpass123');
		other = await t.login('stranger@example.com', 'userpass123');
	});

	test('the sample root is public', async () => {
		const reply = await t.call('GET', '/sample');
		expect(reply.status).toBe(200);
		expect(typeof reply.json.message).toBe('string');
	});

	test('notes need auth', async () => {
		expect((await t.call('GET', '/sample/notes')).status).toBe(401);
		expect((await t.call('POST', '/sample/notes', { json: { title: 'x' } })).status).toBe(401);
	});

	test('create trims, returns NotePublic, and lists', async () => {
		const created = await t.call('POST', '/sample/notes', { token, json: { title: '  Hello  ', content: '  body  ' } });
		expect(created.status).toBe(201);
		expect(Object.keys(created.json).sort()).toEqual(NOTE_KEYS);
		expect(created.json).toMatchObject({ title: 'Hello', content: 'body' });
		expect(created.json.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);

		const list = await t.call('GET', '/sample/notes', { token });
		expect(list.json.some((n: { id: string }) => n.id === created.json.id)).toBe(true);
		expect((await t.call('GET', '/sample/notes', { token: other })).json).toEqual([]);
	});

	test('content defaults to an empty string', async () => {
		const created = await t.call('POST', '/sample/notes', { token, json: { title: 'No body' } });
		expect(created.json.content).toBe('');
	});

	test('title rules: blank, empty, missing and too long are 422', async () => {
		const blank = await t.call('POST', '/sample/notes', { token, json: { title: '   ' } });
		expect(blank.status).toBe(422);
		expect(blank.json).toEqual({ detail: 'Title cannot be empty' });
		for (const json of [{ title: '' }, { content: 'no title' }, { title: 'x'.repeat(256) }, { title: 'ok', content: 'c'.repeat(10001) }]) {
			const reply = await t.call('POST', '/sample/notes', { token, json });
			expect(reply.status).toBe(422);
			expect(typeof reply.json.detail).toBe('string');
		}
	});

	test('get, patch, delete with owner isolation', async () => {
		const note = (await t.call('POST', '/sample/notes', { token, json: { title: 'Mine', content: 'keep' } })).json;
		const url = `/sample/notes/${note.id}`;

		expect((await t.call('GET', url, { token })).json.title).toBe('Mine');

		const patched = await t.call('PATCH', url, { token, json: { title: '  Renamed  ' } });
		expect(patched.json).toMatchObject({ title: 'Renamed', content: 'keep' });
		expect(patched.json.updated_at >= note.updated_at).toBe(true);
		expect((await t.call('PATCH', url, { token, json: { title: '   ' } })).status).toBe(422);
		expect((await t.call('GET', '/sample/notes', { token })).json.find((n: { id: string }) => n.id === note.id).title).toBe('Renamed');

		for (const method of ['GET', 'PATCH', 'DELETE']) {
			const reply = await t.call(method, url, { token: other, json: method === 'PATCH' ? { title: 'hijack' } : undefined });
			expect(reply.status).toBe(403);
			expect(reply.json).toEqual({ detail: 'Not allowed to access this note' });
		}

		const unknown = await t.call('GET', `/sample/notes/${crypto.randomUUID()}`, { token });
		expect(unknown.status).toBe(404);
		expect(unknown.json).toEqual({ detail: 'Note not found' });
		expect((await t.call('GET', '/sample/notes/not-a-uuid', { token })).status).toBe(422);

		const removed = await t.call('DELETE', url, { token });
		expect(removed.status).toBe(204);
		expect(removed.text).toBe('');
		expect((await t.call('GET', url, { token })).status).toBe(404);
		expect((await t.call('GET', '/sample/notes', { token })).json.some((n: { id: string }) => n.id === note.id)).toBe(false);
	});

	test('cache keys, TTL-free read-through and invalidation', async () => {
		const owner = (await t.call('GET', '/base/login/me', { token })).json.id as string;
		const created = (await t.call('POST', '/sample/notes', { token, json: { title: 'Cached' } })).json;
		const noteKey = `sample:notes:v1:note:${owner}:${created.id}`;
		const listKey = `sample:notes:v1:list:${owner}`;

		// create sets the note key and drops the list key
		expect(t.cache.keys()).toContain(noteKey);
		expect(t.cache.keys()).not.toContain(listKey);

		await t.call('GET', '/sample/notes', { token });
		expect(t.cache.keys()).toContain(listKey);
		expect(JSON.parse((await t.cache.get(listKey))!).some((n: { id: string }) => n.id === created.id)).toBe(true);

		await t.call('PATCH', `/sample/notes/${created.id}`, { token, json: { title: 'Cached 2' } });
		expect(t.cache.keys()).not.toContain(listKey);
		expect(JSON.parse((await t.cache.get(noteKey))!).title).toBe('Cached 2');

		await t.call('DELETE', `/sample/notes/${created.id}`, { token });
		expect(t.cache.keys()).not.toContain(noteKey);
		expect(t.cache.keys()).not.toContain(listKey);
	});
});
