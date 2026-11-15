import postgres from "postgres";
import { readFile } from "node:fs/promises";
import path from "node:path";

// One pool per process; survives Next dev hot reloads via globalThis.
const g = globalThis as unknown as { __sql?: postgres.Sql };

export const sql: postgres.Sql =
  g.__sql ??
  postgres(process.env.DATABASE_URL ?? "postgres://bizzassist:bizzassist@localhost:5432/bizzassist", {
    max: 10,
    idle_timeout: 30,
    // keep column names as written in schema.sql (snake_case)
    transform: { undefined: null },
  });

if (process.env.NODE_ENV !== "production") g.__sql = sql;

/** Applies db/schema.sql (idempotent). Called once at server start from instrumentation.ts. */
export async function applySchema() {
  const file = path.join(process.cwd(), "db", "schema.sql");
  const ddl = await readFile(file, "utf8");
  await sql.unsafe(ddl);
}
