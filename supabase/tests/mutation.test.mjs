// Breaks one business rule at a time in a copy of the migrations and checks schema.test.mjs notices.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MIGRATIONS_DIR } from './lib/supabase-standin.mjs';

const TARGET = '20261001000000_initial_schema.sql';
const SCHEMA_TEST = fileURLToPath(new URL('./schema.test.mjs', import.meta.url));

const MUTANTS = [
  ['no_overpayment_guard', 'if v_paid + new.amount_rupees > v_due then', 'if false then'],
  ['no_tenant_check_in_select', 'for select to authenticated using (private.is_studio_member(studio_id))', 'for select to authenticated using (true)'],
  ['off_by_one_end_date', 'start_date + (duration_days - 1)', 'start_date + duration_days'],
  ['no_overlap_check', 'if v_conflict is not null then', 'if false then'],
  ['no_archive_end_enrolment', 'if old.archived_at is null and new.archived_at is not null then', 'if false then'],
  ['no_phone_rule', 'check (phone is not null or guardian_phone is not null),', ''],
  ['studio_today_leaks', '(auth.uid() is null or private.is_studio_member(p_studio_id))', 'true'],
  ['no_trial_lead_update', "and l.status in ('new', 'contacted', 'trial_scheduled')", 'and false'],
  ['student_numbers_skip', 'set last_value = c.last_value + 1', 'set last_value = c.last_value + 2'],
  ['shared_numbering', 'values (new.studio_id, 1)', 'values ((select min(s.id) from public.studios s), 1)'],
  ['attendance_dup_check_old',
    'count(e.student_id) <> count(distinct e.student_id) or count(e.trial_id) <> count(distinct e.trial_id)',
    'count(*) <> count(distinct coalesce(e.student_id, e.trial_id))'],
];

let caught = 0;
for (const [name, from, to] of MUTANTS) {
  const dir = mkdtempSync(join(tmpdir(), 'dlegacy-mutant-'));
  try {
    cpSync(MIGRATIONS_DIR, dir, { recursive: true });
    const file = join(dir, TARGET);
    const src = readFileSync(file, 'utf8');
    const mutated = src.replaceAll(from, to);
    if (mutated === src) {
      console.log(`${name}: NOT APPLIED - pattern not found, update this mutant`);
      continue;
    }
    writeFileSync(file, mutated);
    const run = spawnSync(process.execPath, [SCHEMA_TEST, dir], { encoding: 'utf8' });
    // Only failing checks count; a migration that doesn't even load proves nothing about the rule.
    const failed = /FAILED: (\d+)/.exec(run.stdout ?? '');
    if (run.status !== 0 && failed) {
      caught++;
      const first = (run.stdout.split('\n').find((l) => l.startsWith('  - ')) ?? '').trim();
      console.log(`${name}: caught (${failed[1]} failing checks, e.g. ${first})`);
    } else if (run.status === 0) {
      console.log(`${name}: SURVIVED - no check noticed the broken rule`);
    } else {
      console.log(`${name}: BROKEN - mutant did not run: ${(run.stderr || run.stdout).split('\n')[0]}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\nMUTANTS CAUGHT: ${caught}/${MUTANTS.length}`);
if (caught !== MUTANTS.length) process.exit(1);
