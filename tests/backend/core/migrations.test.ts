import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { PGlite } from '../../../backend/test-support/deps';
import { migrationsFolder } from '../../../backend/src/db/migrate';

describe('migrations', () => {
	test('the SQL is IF NOT EXISTS safe and builds the contract schema', async () => {
		const sql = readFileSync(join(migrationsFolder(), '0000_init.sql'), 'utf8');
		const statements = sql.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
		const pg = new PGlite();
		for (let run = 0; run < 2; run++) for (const statement of statements) await pg.exec(statement);

		const columns = await pg.query<{ table_name: string; column_name: string; data_type: string; is_nullable: string; character_maximum_length: number | null }>(
			`select table_name, column_name, data_type, is_nullable, character_maximum_length
			   from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`
		);
		const shape = columns.rows.map((c) => `${c.table_name}.${c.column_name}:${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ''}${c.is_nullable === 'YES' ? '?' : ''}`);
		expect(shape).toEqual([
			'note.id:uuid',
			'note.title:character varying(255)',
			'note.content:character varying(10000)',
			'note.owner_id:uuid',
			'note.created_at:timestamp with time zone',
			'note.updated_at:timestamp with time zone',
			'user.id:uuid',
			'user.email:character varying(255)',
			'user.is_active:boolean',
			'user.is_superuser:boolean',
			'user.full_name:character varying(255)?',
			'user.hashed_password:character varying'
		]);
		const indexes = await pg.query<{ indexname: string }>(`select indexname from pg_indexes where schemaname = 'public' order by indexname`);
		expect(indexes.rows.map((r) => r.indexname)).toEqual(['ix_note_owner_id', 'ix_user_email', 'note_pkey', 'user_pkey']);
		const fk = await pg.query(`select 1 from information_schema.table_constraints where constraint_type = 'FOREIGN KEY' and table_name = 'note'`);
		expect(fk.rows).toHaveLength(1);
	});
});

