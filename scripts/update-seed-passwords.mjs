// One-off, idempotent updater for Kontora's SEED-USER passwords (dev/training
// data only). It UPDATEs *only* users.passwordHash, matched by email, for the
// known seed accounts — it never deletes, truncates, or touches any other
// column, row, or table. Safe to re-run any number of times.
//
// The hash is NOT weakened: bcrypt at the same cost (12) the seed uses. Only
// the plaintext is a common, rockyou.txt-crackable password, by design — so a
// leaked hash (e.g. via the SQLi sinks) cracks offline to a plaintext and
// enables account takeover. Keep the map below in sync with the ANSWER KEY in
// db/prisma/seed.ts.
//
// It is written as plain ESM (.mjs) on purpose so the SAME file runs by `node`
// with no TypeScript toolchain — both locally and when piped into the
// production api container (which ships only compiled JS, but has bcryptjs, pg,
// and DATABASE_URL available). See the apply commands at the bottom.

import bcrypt from "bcryptjs";
import pg from "pg";

const BCRYPT_COST = 12; // MUST match db/prisma/seed.ts — do not lower.

// email -> plaintext (every value is a guaranteed rockyou.txt entry).
const SEED_PASSWORDS = {
  "owner@acme.test": "iloveyou",
  "accountant@acme.test": "password1",
  "member@acme.test": "sunshine",
  "member2@acme.test": "princess",
  "client@acme.test": "letmein",
  "owner@nimbus.test": "superman",
  "accountant@nimbus.test": "trustno1",
  "member@nimbus.test": "monkey",
  "client@nimbus.test": "football",
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

let updated = 0;
let missing = 0;
try {
  for (const [email, plaintext] of Object.entries(SEED_PASSWORDS)) {
    const passwordHash = await bcrypt.hash(plaintext, BCRYPT_COST);
    // Parameterized — the ONLY column written is passwordHash, matched by email.
    const res = await client.query(
      'UPDATE users SET "passwordHash" = $1 WHERE email = $2',
      [passwordHash, email],
    );
    if (res.rowCount > 0) {
      updated += res.rowCount;
      console.log(`updated  ${email.padEnd(24)} -> ${plaintext}`);
    } else {
      missing += 1;
      console.log(`SKIPPED  ${email.padEnd(24)} (no such user)`);
    }
  }
} finally {
  await client.end();
}

console.log(`\nDone. ${updated} user(s) updated, ${missing} not found.`);
console.log("Owners (your likely logins): owner@acme.test / iloveyou  |  owner@nimbus.test / superman");
