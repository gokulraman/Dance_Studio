// Runs smoke_test.sql (the script you paste into the Supabase SQL Editor) against a local database.
import { readFileSync } from 'node:fs';
import { createDatabase } from './lib/supabase-standin.mjs';

const PLACEHOLDER = '00000000-0000-0000-0000-000000000000';
const OWNER = '33333333-3333-3333-3333-333333333333';
const EXPECTED = 'ALL SMOKE TESTS PASSED - nothing was saved';

const sql = readFileSync(new URL('./smoke_test.sql', import.meta.url), 'utf8');
if (!sql.includes(PLACEHOLDER)) {
  console.log(`SMOKE ERROR: owner placeholder ${PLACEHOLDER} not found in smoke_test.sql`);
  process.exit(1);
}

const db = await createDatabase(process.argv[2]);
await db.query(`insert into auth.users (id) values ($1)`, [OWNER]);

try {
  const results = await db.exec(sql.replaceAll(PLACEHOLDER, OWNER));
  const message = results[results.length - 1].rows[0]?.result;
  const leftovers = (await db.query(`select count(*)::int as n from public.studios`)).rows[0].n;
  console.log(message);
  if (message !== EXPECTED || leftovers !== 0) {
    console.log(`SMOKE ERROR: expected "${EXPECTED}" and 0 studios left, got ${leftovers}`);
    process.exit(1);
  }
} catch (e) {
  console.log('SMOKE ERROR: ' + e.message);
  process.exit(1);
}
