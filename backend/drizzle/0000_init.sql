-- Same tables as Fast's Alembic revisions 001 and 002 (see CONTRACT.md, "Data").
-- Every statement is IF NOT EXISTS so the API can start against a database Fast already built.
-- drizzle-kit generate writes plain CREATE statements; keep the IF NOT EXISTS when you add migrations.
CREATE TABLE IF NOT EXISTS "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"is_active" boolean NOT NULL,
	"is_superuser" boolean NOT NULL,
	"full_name" varchar(255),
	"hashed_password" varchar NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_user_email" ON "user" USING btree ("email");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "note" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" varchar(10000) NOT NULL,
	"owner_id" uuid NOT NULL REFERENCES "user" ("id"),
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_note_owner_id" ON "note" USING btree ("owner_id");
