import { defineConfig } from 'drizzle-kit';

// Only `drizzle-kit generate` needs this file; the URL matters for push/studio.
const url = process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5432/app';

export default defineConfig({
	schema: './src/db/schema/index.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url }
});
