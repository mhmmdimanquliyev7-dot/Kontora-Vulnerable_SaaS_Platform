import pg from "pg";

// Chapter 14 — SQL-injection lab (INTENTIONALLY VULNERABLE, training only).
//
// A deliberately-unsafe raw database path used by this chapter's injectable
// sinks (invoice search, the login email lookup, and the second-order member
// report). Unlike the rest of the app — which goes through Prisma with bound
// parameters — this talks to Postgres with node-postgres (`pg`) DIRECTLY over
// the *simple query protocol*: the query text is sent verbatim with NO
// parameter array, so multiple `;`-separated statements are reachable. It
// reuses the app's existing (superuser) DATABASE_URL; no new credentials are
// introduced. Any concatenation of user input into a string passed to
// runRawSql() is an injection sink by design.

const { Pool } = pg;

// One shared pool for the whole process, same connection string Prisma uses.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// A database error raised while running one of this chapter's raw sinks. The
// individual sink endpoints catch this and echo the Postgres message straight
// back to the caller (so error-based injection works) WITHOUT touching the
// global errorHandler or changing any other endpoint's error behaviour.
export class SqlSurfaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SqlSurfaceError";
  }
}

// Runs an already-built SQL string through the simple query protocol (no
// parameter array — the whole point of this chapter). On a DB error it throws
// a SqlSurfaceError carrying the raw Postgres message for the sink to surface.
export async function runRawSql<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  try {
    const result = await pool.query(sql);
    return result.rows as T[];
  } catch (err) {
    throw new SqlSurfaceError(err instanceof Error ? err.message : String(err));
  }
}
