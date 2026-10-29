// Packages the tests under ../tests/backend need directly. Bun resolves bare imports from the
// importing file's directory and only backend/ has node_modules, so the tests import these
// re-exports by relative path instead of the packages themselves.
export { PGlite } from '@electric-sql/pglite';
export { drizzle } from 'drizzle-orm/pglite';
export { migrate } from 'drizzle-orm/pglite/migrator';
export { decodeJwt, decodeProtectedHeader } from 'jose';
