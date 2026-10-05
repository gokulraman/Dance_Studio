// Business-rule checks for the schema, run as Supabase's roles (owner A, owner B, anon, admin).
// Usage: node schema.test.mjs [migrations-dir]
import { createDatabase } from './lib/supabase-standin.mjs';

let passed = 0;
const failures = [];
const db = await createDatabase(process.argv[2]);
passed++;

function report() {
  console.log(`\nPASSED: ${passed}`);
  if (failures.length) {
    console.log(`FAILED: ${failures.length}`);
    for (const f of failures) console.log('  - ' + f);
    process.exit(1);
  }
  console.log('ALL CHECKS PASSED');
}
// A broken rule can make a later unguarded step throw; still list everything that failed.
process.on('uncaughtException', (e) => {
  failures.push(`test stopped early: ${e.message}`);
  report();
});

function norm(row) {
  for (const k of Object.keys(row)) if (typeof row[k] === 'bigint') row[k] = Number(row[k]);
  return row;
}
async function q(sql, params) { return (await db.query(sql, params)).rows.map(norm); }
async function one(sql, params) { return (await q(sql, params))[0]; }
function check(name, cond, detail = '') {
  if (cond) passed++;
  else failures.push(`${name}${detail ? ' :: ' + detail : ''}`);
}
async function expectOk(name, sql, params) {
  try { await db.query(sql, params); passed++; }
  catch (e) { failures.push(`${name} :: unexpected error: ${e.message}`); }
}
async function expectError(name, sql, pattern, params) {
  try {
    await db.query(sql, params);
    failures.push(`${name} :: expected error matching ${pattern}, but it succeeded`);
  } catch (e) {
    if (pattern.test(e.message)) passed++;
    else failures.push(`${name} :: wrong error: ${e.message}`);
  }
}
async function asUser(userId) {
  await db.exec(`reset role; set role authenticated;`);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: userId, role: 'authenticated' })]);
}
async function asAnon() {
  await db.exec(`reset role; set role anon;`);
  await db.query(`select set_config('request.jwt.claims', '', false)`);
}
async function asAdmin() {
  await db.exec(`reset role;`);
  await db.query(`select set_config('request.jwt.claims', '', false)`);
}

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
await asAdmin();
await q(`insert into auth.users (id) values ($1), ($2)`, [A, B]);
const studioA = (await one(`select private.admin_create_studio('Studio A', $1) as id`, [A])).id;
const studioB = (await one(`select private.admin_create_studio('Studio B', $1) as id`, [B])).id;
check('studio ids are auto-increment numbers', studioA === 1 && studioB === 2, `${studioA}, ${studioB}`);
const today = (await one(`select private.studio_today($1) as d`, [studioA])).d;
const isoDow = (await one(`select extract(isodow from private.studio_today($1))::int as d`, [studioA])).d;

// ================= Owner A =================
await asUser(A);
let phoneSeq = 1000000;
async function newStudent(name) {
  phoneSeq++;
  return (await one(`insert into public.students (studio_id, full_name, phone, date_of_birth) values ($1, $2, $3, '2000-01-01') returning id`,
    [studioA, name, `+91990${phoneSeq}`])).id;
}

const d30 = (await one(`select id from public.durations where studio_id = $1 and days = 30`, [studioA])).id;
const d90 = (await one(`select id from public.durations where studio_id = $1 and days = 90`, [studioA])).id;
check('4 default durations seeded', (await q(`select 1 from public.durations where studio_id = $1`, [studioA])).length === 4);

await expectError('invalid timezone rejected', `update public.studios set timezone = 'Mars/Base' where id = $1`, /time zone/, [studioA]);
await expectOk('owner can change expiring-soon window', `update public.studios set expiring_soon_days = 7 where id = $1`, [studioA]);
await expectError('owner cannot create a studio', `insert into public.studios (name) values ('x')`, /permission denied/);

const instr = (await one(`insert into public.instructors (studio_id, full_name) values ($1, 'Asha') returning id`, [studioA])).id;
const bolly = (await one(`insert into public.batches (studio_id, name, dance_style, level, instructor_id, capacity)
  values ($1, 'Bollywood Beginners', 'Bollywood', 'Beginner', $2, 2) returning id`, [studioA, instr])).id;
const hiphop = (await one(`insert into public.batches (studio_id, name, dance_style) values ($1, 'Hip-Hop Inter', 'Hip-Hop') returning id`, [studioA])).id;
const salsa = (await one(`insert into public.batches (studio_id, name) values ($1, 'Salsa') returning id`, [studioA])).id;
check('batch ids are auto-increment numbers', typeof bolly === 'number' && hiphop === bolly + 1);
await expectError('explicit id on identity column rejected', `insert into public.batches (id, studio_id, name) values (999, $1, 'Explicit')`, /non-DEFAULT value|GENERATED ALWAYS/, [studioA]);
await expectError('duplicate batch name (case-insensitive) rejected', `insert into public.batches (studio_id, name) values ($1, 'bollywood beginners')`, /duplicate key/, [studioA]);
await expectOk('schedule today', `insert into public.batch_schedules (studio_id, batch_id, day_of_week, start_time, end_time) values ($1, $2, $3, '18:00', '19:00')`, [studioA, bolly, isoDow]);
await expectError('end time before start rejected', `insert into public.batch_schedules (studio_id, batch_id, day_of_week, start_time, end_time) values ($1, $2, 1, '19:00', '18:00')`, /check constraint/, [studioA, hiphop]);
await expectOk('batch prices', `insert into public.batch_prices (studio_id, batch_id, duration_id, price_rupees) values ($1, $2, $3, 2000), ($1, $2, $4, 5000)`, [studioA, bolly, d30, d90]);
await expectOk('hiphop/salsa prices', `insert into public.batch_prices (studio_id, batch_id, duration_id, price_rupees) values ($1, $2, $4, 2500), ($1, $3, $4, 1500)`, [studioA, hiphop, salsa, d30]);
await expectError('fractional rupees from the app rejected', `insert into public.batch_prices (studio_id, batch_id, duration_id, price_rupees) values ($1, $2, $3, $4)`, /invalid input syntax for type integer/, [studioA, hiphop, d90, '1799.5']);
const combo = (await one(`insert into public.combos (studio_id, name) values ($1, 'Bolly + HipHop') returning id`, [studioA])).id;
await expectOk('combo batches', `insert into public.combo_batches (studio_id, combo_id, batch_id) values ($1, $2, $3), ($1, $2, $4)`, [studioA, combo, bolly, hiphop]);
await expectOk('combo price', `insert into public.combo_prices (studio_id, combo_id, duration_id, price_rupees) values ($1, $2, $3, 4000)`, [studioA, combo, d30]);

// Students and gapless ids
const stu = (await one(`insert into public.students (studio_id, full_name, phone, date_of_birth, guardian_name, guardian_phone)
  values ($1, 'Priya', '+919876543210', '2014-05-01', 'Ravi', '+919800000001') returning id, student_number, joined_on`, [studioA]));
check('first student number in studio A is 1', stu.student_number === 1, String(stu.student_number));
check('joined_on defaults to studio today', String(stu.joined_on) === String(today), `${stu.joined_on} vs ${today}`);
await expectOk('sibling with same phone allowed', `insert into public.students (studio_id, full_name, phone, date_of_birth) values ($1, 'Riya', '+919876543210', '2016-01-01')`, [studioA]);
await expectOk('child with only guardian phone allowed', `insert into public.students (studio_id, full_name, date_of_birth, guardian_name, guardian_phone) values ($1, 'Kid', '2019-01-01', 'Mum', '+919800000002')`, [studioA]);
await expectError('no phone at all rejected', `insert into public.students (studio_id, full_name, date_of_birth) values ($1, 'NoPhone', '2010-01-01')`, /check constraint/, [studioA]);
await expectError('bad phone format rejected', `insert into public.students (studio_id, full_name, phone, date_of_birth) values ($1, 'X', '98765', '2010-01-01')`, /check constraint/, [studioA]);
await expectError('DOB required', `insert into public.students (studio_id, full_name, phone) values ($1, 'X', '+919876543211')`, /null value/, [studioA]);
await expectError('future DOB rejected', `insert into public.students (studio_id, full_name, phone, date_of_birth) values ($1, 'X', '+919876543211', private.studio_today($1) + 1)`, /future/, [studioA]);
await expectError('guardian name without phone rejected', `insert into public.students (studio_id, full_name, phone, date_of_birth, guardian_name) values ($1, 'X', '+919876543211', '2010-01-01', 'G')`, /check constraint/, [studioA]);
await expectError('explicit internal id rejected', `insert into public.students (id, studio_id, full_name, phone, date_of_birth) values (500, $1, 'X', '+919876543211', '2010-01-01')`, /non-DEFAULT value|GENERATED ALWAYS/, [studioA]);
await expectError('explicit student number rejected', `insert into public.students (student_number, studio_id, full_name, phone, date_of_birth) values (500, $1, 'X', '+919876543211', '2010-01-01')`, /assigned automatically/, [studioA]);
const afterFailures = await newStudent('Gapless Check');
const afterNo = (await one(`select student_number from public.students where id = $1`, [afterFailures])).student_number;
check('6 failed inserts left no gap: next student number is 4', afterNo === 4, String(afterNo));
await expectError('student number cannot be changed', `update public.students set student_number = 99 where id = $1`, /cannot be changed/, [afterFailures]);
await expectError('internal id cannot be changed', `update public.students set id = 99 where id = $1`, /can only be updated to DEFAULT/, [afterFailures]);
await expectError('counter table not readable by users', `select * from public.student_number_counters`, /permission denied/);
await expectError('counter table not writable by users', `update public.student_number_counters set last_value = 0`, /permission denied/);

// ---- Memberships & payments ----
const cm = (args) => `select public.create_membership(${args})`;
const fullM = (await one(cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 1800, p_payment_method => 'upi', p_batch_id => $3, p_discount_rupees => 200, p_start_date => private.studio_today($4)`) + ' as id', [stu.id, d30, bolly, studioA])).id;
check('membership id is a number', typeof fullM === 'number');
let mo = await one(`select * from public.membership_overview where id = $1`, [fullM]);
check('full payment: list price copied from batch', mo.list_price_rupees === 2000);
check('full payment: amount due = price - discount', mo.amount_due_rupees === 1800);
check('full payment: outstanding 0', mo.outstanding_rupees === 0);
check('full payment: activated', mo.lifecycle === 'activated');
check('full payment: status active (29 days left)', mo.status === 'active' && mo.days_left === 29, `${mo.status} ${mo.days_left}`);
check('auto-enrolled in batch', (await q(`select 1 from public.enrollments where student_id = $1 and batch_id = $2 and ended_on is null`, [stu.id, bolly])).length === 1);

await expectError('fully paid but not activated rejected', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 2000, p_payment_method => 'cash', p_batch_id => $3, p_activate => false`), /always activated/, [stu.id, d30, bolly]);
await expectError('activated without start date rejected', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 2000, p_payment_method => 'cash', p_batch_id => $3`), /start date is required/, [stu.id, d30, bolly]);
await expectError('zero first payment rejected', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 0, p_payment_method => 'cash', p_batch_id => $3, p_activate => false`), /more than 0/, [stu.id, d30, bolly]);
await expectError('discount >= price rejected', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 100, p_payment_method => 'cash', p_batch_id => $3, p_discount_rupees => 2000, p_activate => false`), /discount/, [stu.id, d30, bolly]);
await expectError('both batch and combo rejected', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 100, p_payment_method => 'cash', p_batch_id => $3, p_combo_id => $4, p_activate => false`), /exactly one/, [stu.id, d30, bolly, combo]);
await expectError('no price for duration rejected', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 100, p_payment_method => 'cash', p_batch_id => $3, p_activate => false`), /no price/, [stu.id, d90, hiphop]);
await expectError('invalid payment method rejected', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 100, p_payment_method => 'cheque', p_batch_id => $3, p_activate => false`), /check constraint/, [stu.id, d30, bolly]);
await expectError('future payment date rejected', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 100, p_payment_method => 'cash', p_batch_id => $3, p_activate => false, p_paid_on => private.studio_today($4) + 1`), /future/, [stu.id, d30, bolly, studioA]);

const partM = (await one(cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 1000, p_payment_method => 'cash', p_batch_id => $3, p_activate => false`) + ' as id', [stu.id, d90, bolly])).id;
mo = await one(`select * from public.membership_overview where id = $1`, [partM]);
check('partial: awaiting activation', mo.status === 'awaiting_activation' && mo.start_date === null);
check('partial: outstanding 4000', mo.outstanding_rupees === 4000);
await expectError('overpayment rejected', `select public.record_payment($1, 4001, 'upi')`, /exceeds the outstanding/, [partM]);
let r = (await one(`select public.record_payment($1, 1500, 'upi') as r`, [partM])).r;
check('second payment: outstanding 2500', r.outstanding_rupees === 2500 && r.needs_activation === false);
check('record_payment returns numeric payment id', typeof r.payment_id === 'number');
r = (await one(`select public.record_payment($1, 2500, 'card') as r`, [partM])).r;
check('balance cleared: needs_activation prompt', r.outstanding_rupees === 0 && r.needs_activation === true);
await expectError('activation needs start date', `select public.activate_membership($1, null)`, /start date is required/, [partM]);
await expectError('activation overlapping existing membership rejected', `select public.activate_membership($1, private.studio_today($2) + 3)`, /overlapping/, [partM, studioA]);
check('failed activation rolled back', (await one(`select lifecycle from public.memberships where id = $1`, [partM])).lifecycle === 'pending_activation');
await expectOk('activate after current membership ends', `select public.activate_membership($1, private.studio_today($2) + 30)`, [partM, studioA]);
check('activated in future: status upcoming', (await one(`select status from public.membership_overview where id = $1`, [partM])).status === 'upcoming');
check('end_date = start + days - 1', (await one(`select (end_date - start_date) as diff from public.memberships where id = $1`, [partM])).diff === 89);
await expectError('activate twice rejected', `select public.activate_membership($1, private.studio_today($2))`, /not awaiting/, [partM, studioA]);

const partNow = (await one(cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 500, p_payment_method => 'cash', p_batch_id => $3, p_start_date => private.studio_today($4)`) + ' as id', [stu.id, d30, hiphop, studioA])).id;
mo = await one(`select * from public.membership_overview where id = $1`, [partNow]);
check('partial activated now: active with outstanding', mo.lifecycle === 'activated' && mo.outstanding_rupees === 2000);

const partAct = (await one(cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 500, p_payment_method => 'cash', p_batch_id => $3, p_activate => false`) + ' as id', [stu.id, d30, salsa])).id;
r = (await one(`select public.record_payment($1, 1000, 'upi', p_activate_start_date => private.studio_today($2)) as r`, [partAct, studioA])).r;
check('record_payment can activate in the same call', r.lifecycle === 'activated' && r.needs_activation === false);

await expectError('direct payment insert blocked', `insert into public.payments (studio_id, membership_id, amount_rupees, paid_on, method) values ($1, $2, 1, current_date, 'cash')`, /permission denied/, [studioA, partM]);
await expectError('direct payment delete blocked', `delete from public.payments where membership_id = $1`, /permission denied/, [partM]);
await expectError('direct membership update blocked', `update public.memberships set discount_rupees = 0 where id = $1`, /permission denied/, [fullM]);
await expectError('direct membership insert blocked', `insert into public.memberships (studio_id, student_id, duration_days, list_price_rupees, lifecycle) values ($1, $2, 30, 100, 'pending_activation')`, /permission denied/, [studioA, stu.id]);
await expectError('direct attendance insert blocked', `insert into public.attendance (studio_id, session_id, student_id, status) values ($1, 1, $2, 'present')`, /permission denied/, [studioA, stu.id]);
await expectError('direct class session insert blocked', `insert into public.class_sessions (studio_id, batch_id, session_date) values ($1, $2, current_date)`, /permission denied/, [studioA, bolly]);
await expectError('studio_members update blocked', `update public.studio_members set role = 'staff'`, /permission denied/);
await expectError('audit log delete blocked', `delete from public.audit_log`, /permission denied/);
await expectError('student delete blocked', `delete from public.students where id = $1`, /permission denied/, [stu.id]);

const pay = (await one(`select id from public.payments where membership_id = $1 and amount_rupees = 500`, [partNow])).id;
await expectError('void without reason rejected', `select public.void_payment($1, '  ')`, /reason is required/, [pay]);
await expectOk('void payment', `select public.void_payment($1, 'entered twice')`, [pay]);
mo = await one(`select * from public.membership_overview where id = $1`, [partNow]);
check('voided payment excluded from paid', mo.paid_rupees === 0 && mo.outstanding_rupees === 2500);
await expectError('void twice rejected', `select public.void_payment($1, 'again')`, /already voided/, [pay]);
await expectError('cancel without reason rejected', `select public.cancel_membership($1, '')`, /reason is required/, [partNow]);
await expectOk('cancel membership', `select public.cancel_membership($1, 'recorded by mistake')`, [partNow]);
check('cancelled status', (await one(`select status from public.membership_overview where id = $1`, [partNow])).status === 'cancelled');
await expectError('payment on cancelled rejected', `select public.record_payment($1, 100, 'cash')`, /cancelled/, [partNow]);
await expectOk('new membership may overlap a cancelled one', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 2500, p_payment_method => 'cash', p_batch_id => $3, p_start_date => private.studio_today($4)`), [stu.id, d30, hiphop, studioA]);

await expectError('start date correction needs reason', `select public.correct_membership_start_date($1, private.studio_today($2) - 1, '')`, /reason is required/, [fullM, studioA]);
await expectOk('start date correction with reason', `select public.correct_membership_start_date($1, private.studio_today($2) - 1, 'owner typo')`, [fullM, studioA]);
const audit = await one(`select reason, row_id, old_row ->> 'start_date' as old_start, new_row ->> 'start_date' as new_start
  from public.audit_log where table_name = 'memberships' and row_id = $1 and action = 'update' order by id desc limit 1`, [fullM]);
check('audit captures reason, numeric row id and old/new start date', audit && audit.reason === 'owner typo' && audit.row_id === fullM && audit.old_start !== audit.new_start);
await expectError('correcting start date into an overlap rejected', `select public.correct_membership_start_date($1, private.studio_today($2) + 5, 'oops')`, /overlapping/, [fullM, studioA]);

const ov = await newStudent('Overlap Test');
await expectOk('first membership', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 1500, p_payment_method => 'cash', p_batch_id => $3, p_start_date => private.studio_today($4)`), [ov, d30, salsa, studioA]);
await expectError('overlapping same batch rejected', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 1500, p_payment_method => 'cash', p_batch_id => $3, p_start_date => private.studio_today($4) + 29`), /overlapping/, [ov, d30, salsa, studioA]);
check('rejected membership left no rows', (await q(`select 1 from public.memberships where student_id = $1`, [ov])).length === 1);
await expectOk('back-to-back renewal allowed', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 1500, p_payment_method => 'cash', p_batch_id => $3, p_start_date => private.studio_today($4) + 30`), [ov, d30, salsa, studioA]);
await expectOk('different batch on same dates allowed', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 2500, p_payment_method => 'cash', p_batch_id => $3, p_start_date => private.studio_today($4)`), [ov, d30, hiphop, studioA]);
await expectOk('pending membership may overlap until activated', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 100, p_payment_method => 'cash', p_batch_id => $3, p_activate => false`), [ov, d30, salsa]);

const stu3 = await newStudent('Meera');
const comboM = (await one(cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 4000, p_payment_method => 'bank_transfer', p_combo_id => $3, p_start_date => private.studio_today($4)`) + ' as id', [stu3, d30, combo, studioA])).id;
check('combo covers 2 batches', (await q(`select 1 from public.membership_batches where membership_id = $1`, [comboM])).length === 2);
check('combo auto-enrolls in both batches', (await q(`select 1 from public.enrollments where student_id = $1 and ended_on is null`, [stu3])).length === 2);
check('combo price copied', (await one(`select list_price_rupees from public.memberships where id = $1`, [comboM])).list_price_rupees === 4000);
await expectError('single batch overlapping a combo rejected', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 2500, p_payment_method => 'cash', p_batch_id => $3, p_start_date => private.studio_today($4) + 10`), /overlapping/, [stu3, d30, hiphop, studioA]);
const combo2 = (await one(`insert into public.combos (studio_id, name) values ($1, 'Salsa + Hiphop') returning id`, [studioA])).id;
await q(`insert into public.combo_batches (studio_id, combo_id, batch_id) values ($1, $2, $3), ($1, $2, $4)`, [studioA, combo2, salsa, hiphop]);
await q(`insert into public.combo_prices (studio_id, combo_id, duration_id, price_rupees) values ($1, $2, $3, 3500)`, [studioA, combo2, d30]);
const salsaFan = await newStudent('Salsa Fan');
await q(`update public.batches set is_active = false where id = $1`, [salsa]);
await expectError('combo with an inactive batch rejected', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 3500, p_payment_method => 'cash', p_combo_id => $3, p_start_date => private.studio_today($4)`), /inactive batch/, [salsaFan, d30, combo2, studioA]);
await q(`update public.batches set is_active = true where id = $1`, [salsa]);

const bo = await one(`select * from public.batch_overview where id = $1`, [bolly]);
check('batch full flag', bo.enrolled_count === 2 && bo.is_full === true, JSON.stringify(bo));
await expectOk('enrolling beyond capacity still allowed (app warns)', cm(`p_student_id => (select id from public.students where full_name = 'Riya'), p_duration_id => $1, p_payment_rupees => 100, p_payment_method => 'cash', p_batch_id => $2, p_activate => false`), [d30, bolly]);

const cases = [
  [-22, 'expiring_soon', 7], [-21, 'active', 8], [-29, 'expires_today', 0],
  [-30, 'recently_expired', null], [-36, 'recently_expired', null], [-37, 'expired', null], [5, 'upcoming', 34],
];
for (const [off, expected, daysLeft] of cases) {
  const s = await newStudent(`Status ${off}`);
  const id = (await one(cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 2500, p_payment_method => 'cash', p_batch_id => $3, p_start_date => private.studio_today($4) + $5::int`) + ' as id', [s, d30, hiphop, studioA, off])).id;
  const row = await one(`select status, days_left from public.membership_overview where id = $1`, [id]);
  check(`status for start ${off}: ${expected}`, row.status === expected && row.days_left === daysLeft, `${row.status}/${row.days_left}`);
}

const so = await one(`select * from public.student_overview where id = $1`, [stu.id]);
check('student overview: active, age computed', so.status === 'active' && so.age_years >= 11);
const stu5 = await newStudent('Lapsed');
await q(cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 2500, p_payment_method => 'cash', p_batch_id => $3, p_start_date => private.studio_today($4) - 60`), [stu5, d30, hiphop, studioA]);
check('student inactive after window', (await one(`select status from public.student_overview where id = $1`, [stu5])).status === 'inactive');

const lead = (await one(`insert into public.leads (studio_id, full_name, phone, status, source) values ($1, 'Trial Kid', '+919844444444', 'trial_scheduled', 'instagram') returning id`, [studioA])).id;
await expectError('converted lead needs student link', `update public.leads set status = 'converted' where id = $1`, /check constraint/, [lead]);
const trial = (await one(`insert into public.trials (studio_id, lead_id, batch_id, trial_date) values ($1, $2, $3, private.studio_today($1)) returning id`, [studioA, lead, bolly])).id;
const tc = await q(`select * from public.todays_classes where batch_id = $1`, [bolly]);
check('today\'s classes lists the batch', tc.length === 1 && tc[0].attendance_taken === false);

let roster = await q(`select * from public.attendance_roster($1, private.studio_today($2))`, [bolly, studioA]);
check('roster: 3 enrolled students + 1 trial, none marked yet', roster.length === 4 && roster.filter(x => x.is_trial).length === 1 && roster.every(x => x.attendance_status === null), JSON.stringify(roster));
check('roster: trial listed last', roster[roster.length - 1].is_trial === true);

const entries = JSON.stringify([{ student_id: stu.id, status: 'present' }, { student_id: stu3, status: 'absent' }, { trial_id: trial, status: 'present' }]);
const sess = (await one(`select public.mark_attendance($1, private.studio_today($2), $3::jsonb) as id`, [bolly, studioA, entries])).id;
check('attendance rows written (2 students + 1 trial)', (await q(`select 1 from public.attendance where session_id = $1`, [sess])).length === 3);
check('today\'s classes shows attendance taken', (await one(`select attendance_taken from public.todays_classes where batch_id = $1`, [bolly])).attendance_taken === true);
check('trial attended moves lead to trial_attended', (await one(`select status from public.leads where id = $1`, [lead])).status === 'trial_attended');
roster = await q(`select * from public.attendance_roster($1, private.studio_today($2))`, [bolly, studioA]);
check('roster shows saved statuses; unmarked student stays null', roster.filter(x => x.attendance_status !== null).length === 3 && roster.find(x => x.full_name === 'Riya').attendance_status === null, JSON.stringify(roster));
await expectOk('re-marking updates status', `select public.mark_attendance($1, private.studio_today($2), $3::jsonb)`, [bolly, studioA, JSON.stringify([{ student_id: stu3, status: 'present' }])]);
check('re-mark changed absent -> present', (await one(`select status from public.attendance where session_id = $1 and student_id = $2`, [sess, stu3])).status === 'present');
const outsider = await newStudent('Outsider');
await expectError('student not enrolled in batch rejected', `select public.mark_attendance($1, private.studio_today($2), $3::jsonb)`, /invalid/, [bolly, studioA, JSON.stringify([{ student_id: outsider, status: 'present' }])]);
await expectError('future date rejected', `select public.mark_attendance($1, private.studio_today($2) + 1, $3::jsonb)`, /future/, [bolly, studioA, entries]);
await expectError('duplicate entry rejected', `select public.mark_attendance($1, private.studio_today($2), $3::jsonb)`, /only once/, [bolly, studioA, JSON.stringify([{ student_id: stu.id, status: 'present' }, { student_id: stu.id, status: 'absent' }])]);
await expectError('duplicate trial entry rejected', `select public.mark_attendance($1, private.studio_today($2), $3::jsonb)`, /only once/, [bolly, studioA, JSON.stringify([{ trial_id: trial, status: 'present' }, { trial_id: trial, status: 'absent' }])]);
check('student #1 and trial #1 coexist in one session', trial === stu.id && (await q(`select 1 from public.attendance where session_id = $1 and (student_id = 1 or trial_id = 1)`, [sess])).length === 2);
await expectError('bad status rejected', `select public.mark_attendance($1, private.studio_today($2), $3::jsonb)`, /invalid/, [bolly, studioA, JSON.stringify([{ student_id: stu.id, status: 'late' }])]);

const maxBefore = (await one(`select max(student_number)::int as m from public.students where studio_id = $1`, [studioA])).m;
await expectError('conversion needs a phone', `select public.convert_lead_to_student($1, '2015-03-03')`, /check constraint/, [lead]);
const converted = (await one(`select public.convert_lead_to_student($1, '2015-03-03', p_guardian_name => 'Parent', p_guardian_phone => '+919844444444') as id`, [lead])).id;
const convertedNo = (await one(`select student_number from public.students where id = $1`, [converted])).student_number;
check('converted student gets the next gapless number', convertedNo === maxBefore + 1, `${convertedNo} vs ${maxBefore + 1}`);
const cs = await one(`select * from public.students where id = $1`, [converted]);
check('conversion copies name and source', cs.full_name === 'Trial Kid' && cs.source === 'instagram' && cs.guardian_phone === '+919844444444');
const cl = await one(`select status, converted_student_id from public.leads where id = $1`, [lead]);
check('lead marked converted and linked', cl.status === 'converted' && cl.converted_student_id === converted);
await expectError('converting twice rejected', `select public.convert_lead_to_student($1, '2015-03-03', p_phone => '+919844444444')`, /already converted/, [lead]);

await expectOk('archive student', `update public.students set archived_at = now() where id = $1`, [stu3]);
check('archived student has no open enrollments', (await q(`select 1 from public.enrollments where student_id = $1 and ended_on is null`, [stu3])).length === 0);
roster = await q(`select * from public.attendance_roster($1, private.studio_today($2))`, [bolly, studioA]);
check('archived student still in today\'s roster (ended today)', roster.some(x => x.student_id === stu3));
await expectError('archived student cannot get a new membership', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 100, p_payment_method => 'cash', p_batch_id => $3, p_activate => false`), /not authorised/, [stu3, d30, salsa]);

await expectOk('reminder log insert', `insert into public.reminder_logs (studio_id, membership_id, recipient, phone, message, reminder_kind, outcome, platform)
  values ($1, $2, 'guardian', '+919800000001', 'Hi Ravi, Priya''s membership expires soon.', 'expiring_soon', 'owner_confirmed_sent', 'android')`, [studioA, fullM]);
await expectOk('balance_due reminder kind accepted', `insert into public.reminder_logs (studio_id, membership_id, recipient, phone, message, reminder_kind, outcome, platform)
  values ($1, $2, 'student', '+919876543210', 'Balance due', 'balance_due', 'sent_reported_by_phone', 'ios')`, [studioA, fullM]);
await expectError('reminder log spoofed author rejected', `insert into public.reminder_logs (studio_id, membership_id, recipient, phone, message, reminder_kind, outcome, platform, created_by)
  values ($1, $2, 'student', '+919876543210', 'x', 'expired', 'owner_confirmed_sent', 'ios', $3)`, /row-level security/, [studioA, fullM, B]);
await expectError('reminder log edit blocked', `update public.reminder_logs set outcome = 'owner_confirmed_not_sent'`, /permission denied/);

// ================= Owner B (other studio) =================
await asUser(B);
check('B cannot see A\'s students', (await q(`select 1 from public.students where studio_id = $1`, [studioA])).length === 0);
check('B cannot see A\'s payments', (await q(`select 1 from public.payments where studio_id = $1`, [studioA])).length === 0);
check('B cannot see A\'s membership overview', (await q(`select 1 from public.membership_overview where studio_id = $1`, [studioA])).length === 0);
check('B cannot see A\'s audit log', (await q(`select 1 from public.audit_log where studio_id = $1`, [studioA])).length === 0);
check('B cannot see A\'s roster', (await q(`select * from public.attendance_roster($1, current_date)`, [bolly])).length === 0);
check('B sees only own studio', (await q(`select id from public.studios`)).length === 1);
check('studio_today returns nothing for another studio', (await one(`select private.studio_today($1) as d`, [studioA])).d === null);
const bStudent = (await one(`insert into public.students (studio_id, full_name, phone, date_of_birth) values ($1, 'B Student', '+919877777777', '2000-01-01') returning id, student_number`, [studioB]));
check('new studio B starts its own numbering at 1', bStudent.student_number === 1, String(bStudent.student_number));
const bStudent2 = (await one(`insert into public.students (studio_id, full_name, phone, date_of_birth) values ($1, 'B Student 2', '+919877777778', '2000-01-01') returning student_number`, [studioB]));
check('studio B second student is 2', bStudent2.student_number === 2);
await expectError('B cannot insert into A', `insert into public.students (studio_id, full_name, phone, date_of_birth) values ($1, 'Hack', '+919866666666', '2000-01-01')`, /row-level security/, [studioA]);
await expectError('B cannot create membership for A\'s student', cm(`p_student_id => $1, p_duration_id => $2, p_payment_rupees => 100, p_payment_method => 'cash', p_batch_id => $3, p_activate => false`), /not authorised/, [stu.id, d30, bolly]);
await expectError('B cannot record payment on A\'s membership', `select public.record_payment($1, 100, 'cash')`, /not authorised/, [partM]);
await expectError('B cannot void A\'s payment', `select public.void_payment($1, 'x')`, /not authorised/, [pay]);
await expectError('B cannot mark A\'s attendance', `select public.mark_attendance($1, current_date, $2::jsonb)`, /not authorised/, [bolly, entries]);
await expectError('B cannot convert A\'s lead', `select public.convert_lead_to_student($1, '2015-01-01', p_phone => '+919800000009')`, /not authorised/, [lead]);
check('B cannot update A\'s student', (await q(`update public.students set full_name = 'Hacked' where id = $1 returning id`, [stu.id])).length === 0);
const dB = (await one(`select id from public.durations where studio_id = $1 and days = 30`, [studioB])).id;
await expectError('B cannot attach a price to A\'s batch', `insert into public.batch_prices (studio_id, batch_id, duration_id, price_rupees) values ($1, $2, $3, 100)`, /foreign key/, [studioB, bolly, dB]);
await expectError('admin function not callable by users', `select private.admin_create_studio('x', $1)`, /permission denied/, [B]);
await expectError('assert helper not callable by users', `select private.assert_studio_member($1)`, /permission denied/, [studioB]);
check('no internal helper left in the API-exposed public schema', (await q(`select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('is_studio_member', 'assert_studio_member', 'studio_today', 'admin_create_studio')`)).length === 0);

// ================= Anonymous =================
await asAnon();
await expectError('anon cannot read students', `select * from public.students`, /permission denied/);
await expectError('anon cannot read views', `select * from public.membership_overview`, /permission denied/);
await expectError('anon cannot call functions', `select public.record_payment($1, 1, 'cash')`, /permission denied/, [partM]);
await expectError('anon cannot use private helpers', `select private.is_studio_member($1)`, /permission denied/, [studioA]);

// ================= Admin =================
await asAdmin();
await expectError('even admin cannot delete payments', `delete from public.payments where id = $1`, /cannot be deleted/, [pay]);
await expectError('even admin cannot delete memberships', `delete from public.memberships where id = $1`, /cannot be deleted|foreign key/, [fullM]);
await expectError('even admin cannot edit payment amount', `update public.payments set amount_rupees = 1 where id = $1`, /cannot be edited/, [pay]);
await expectError('even admin cannot change membership price', `update public.memberships set discount_rupees = 0 where id = $1`, /cannot be changed/, [fullM]);
await expectError('even admin cannot change start date without reason', `update public.memberships set start_date = start_date + 1 where id = $1`, /reason is required/, [fullM]);
await expectError('null cancel reason rejected by constraint', `update public.memberships set lifecycle = 'cancelled', cancelled_at = now(), cancel_reason = null where id = $1`, /check constraint/, [partM]);
await expectError('audit log is append-only', `update public.audit_log set reason = 'x'`, /cannot be changed/);
await expectError('even admin cannot change a student number', `update public.students set student_number = 999 where id = $1`, /cannot be changed/, [stu.id]);
await expectError('student cannot be moved to another studio', `update public.students set studio_id = $2 where id = $1`, /cannot be moved/, [afterFailures, studioB]);
check('audit log populated', (await one(`select count(*)::int as n from public.audit_log`)).n > 50);
const numsA = (await q(`select student_number from public.students where studio_id = $1 order by student_number`, [studioA])).map(x => x.student_number);
check('studio A numbers are exactly 1..N with no gaps', numsA.every((v, i) => v === i + 1), JSON.stringify(numsA));
const numsB = (await q(`select student_number from public.students where studio_id = $1 order by student_number`, [studioB])).map(x => x.student_number);
check('studio B numbers are exactly 1..N with no gaps', JSON.stringify(numsB) === '[1,2]', JSON.stringify(numsB));
check('student_overview exposes student_number', (await one(`select student_number from public.student_overview where id = $1`, [stu.id])).student_number === 1);

report();
