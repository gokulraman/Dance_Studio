-- Smoke test for the initial schema. Run in the Supabase SQL Editor.
-- Everything runs in one transaction and is rolled back: nothing is saved.
-- Before running: replace the UUID on the line marked "OWNER USER ID" with a real User UID
-- from Authentication -> Users.

begin;

select set_config('smoke.owner', '00000000-0000-0000-0000-000000000000', true); -- OWNER USER ID
set constraints all immediate;

-- ---------------------------------------------------------------------
-- Setup (as admin)
-- ---------------------------------------------------------------------
do $$
declare
  v_owner uuid := current_setting('smoke.owner')::uuid;
  v_studio bigint;
  v_other bigint;
  v_other_d30 bigint;
begin
  if not exists (select 1 from auth.users where id = v_owner) then
    raise exception 'SMOKE SETUP: replace the OWNER USER ID placeholder with a real User UID';
  end if;

  v_studio := private.admin_create_studio('SMOKE TEST STUDIO', v_owner);
  insert into public.studios (name) values ('SMOKE OTHER STUDIO') returning id into v_other;
  insert into public.durations (studio_id, days, label) values (v_other, 30, '1 month') returning id into v_other_d30;

  perform set_config('smoke.studio', v_studio::text, true);
  perform set_config('smoke.other_d30', v_other_d30::text, true);
end;
$$;

-- ---------------------------------------------------------------------
-- As the studio owner
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('smoke.owner'), 'role', 'authenticated')::text, true);

do $$
declare
  v_studio bigint := current_setting('smoke.studio')::bigint;
  v_today  date := private.studio_today(current_setting('smoke.studio')::bigint);
  v_d30 bigint; v_d90 bigint; v_batch bigint; v_batch2 bigint; v_combo bigint;
  v_stu bigint; v_kid bigint; v_m bigint; v_m2 bigint; v_mk bigint; v_pay bigint;
  v_lead bigint; v_trial bigint; v_conv bigint; v_s bigint;
  v_r jsonb; v_n integer; v_case record;
begin
  assert v_today is not null, 'SMOKE FAIL: studio_today returned null for the owner';

  select id into v_d30 from public.durations where studio_id = v_studio and days = 30;
  select id into v_d90 from public.durations where studio_id = v_studio and days = 90;
  assert v_d30 is not null and v_d90 is not null, 'SMOKE FAIL: default durations missing';

  insert into public.batches (studio_id, name, capacity) values (v_studio, 'Smoke Bollywood', 1) returning id into v_batch;
  insert into public.batches (studio_id, name) values (v_studio, 'Smoke HipHop') returning id into v_batch2;
  insert into public.batch_schedules (studio_id, batch_id, day_of_week, start_time, end_time)
    values (v_studio, v_batch, extract(isodow from v_today)::int, '18:00', '19:00');
  insert into public.batch_prices (studio_id, batch_id, duration_id, price_rupees) values
    (v_studio, v_batch, v_d30, 2000), (v_studio, v_batch, v_d90, 5000), (v_studio, v_batch2, v_d30, 2500);
  insert into public.combos (studio_id, name) values (v_studio, 'Smoke Combo') returning id into v_combo;
  insert into public.combo_batches (studio_id, combo_id, batch_id) values (v_studio, v_combo, v_batch), (v_studio, v_combo, v_batch2);
  insert into public.combo_prices (studio_id, combo_id, duration_id, price_rupees) values (v_studio, v_combo, v_d30, 4000);

  insert into public.students (studio_id, full_name, phone, date_of_birth)
    values (v_studio, 'Smoke Adult', '+919900000001', '1995-01-01') returning id into v_stu;
  insert into public.students (studio_id, full_name, date_of_birth, guardian_name, guardian_phone)
    values (v_studio, 'Smoke Kid', '2016-01-01', 'Smoke Parent', '+919900000002') returning id into v_kid;
  -- The smoke studio is brand new, so its numbering must start at 1 regardless of other studios.
  perform 1 from public.students where id = v_stu and student_number = 1;
  assert found, 'SMOKE FAIL: first student in a new studio is not number 1';
  perform 1 from public.students where id = v_kid and student_number = 2;
  assert found, 'SMOKE FAIL: student numbers are not consecutive';

  -- Student validation
  begin
    insert into public.students (studio_id, full_name, date_of_birth) values (v_studio, 'No Phone', '2000-01-01');
    raise exception 'SMOKE FAIL: student with no phone was allowed';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like '%check constraint%' then raise exception 'SMOKE FAIL: no-phone rule: %', sqlerrm; end if;
  end;
  begin
    insert into public.students (studio_id, full_name, phone, date_of_birth) values (v_studio, 'Future', '+919900000003', v_today + 1);
    raise exception 'SMOKE FAIL: future date of birth was allowed';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like '%future%' then raise exception 'SMOKE FAIL: future DOB rule: %', sqlerrm; end if;
  end;
  begin
    update public.studios set timezone = 'Mars/Base' where id = v_studio;
    raise exception 'SMOKE FAIL: invalid timezone was allowed';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like '%time zone%' then raise exception 'SMOKE FAIL: timezone rule: %', sqlerrm; end if;
  end;

  -- Full payment with discount
  v_m := public.create_membership(p_student_id => v_stu, p_duration_id => v_d30, p_payment_rupees => 1800,
           p_payment_method => 'upi', p_batch_id => v_batch, p_discount_rupees => 200, p_start_date => v_today);
  perform 1 from public.membership_overview
  where id = v_m and list_price_rupees = 2000 and discount_rupees = 200 and amount_due_rupees = 1800
    and outstanding_rupees = 0 and status = 'active' and days_left = 29;
  assert found, 'SMOKE FAIL: full payment membership has wrong values';
  perform 1 from public.enrollments where student_id = v_stu and batch_id = v_batch and ended_on is null;
  assert found, 'SMOKE FAIL: student was not auto-enrolled';

  -- Overlap on the same batch is blocked
  begin
    perform public.create_membership(p_student_id => v_stu, p_duration_id => v_d30, p_payment_rupees => 2000,
      p_payment_method => 'cash', p_batch_id => v_batch, p_start_date => v_today + 10);
    raise exception 'SMOKE FAIL: overlapping membership was allowed';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like '%overlapping%' then raise exception 'SMOKE FAIL: overlap rule: %', sqlerrm; end if;
  end;

  -- Partial combo payment, awaiting activation, then fully paid and activated
  v_mk := public.create_membership(p_student_id => v_kid, p_duration_id => v_d30, p_payment_rupees => 1000,
            p_payment_method => 'cash', p_combo_id => v_combo, p_activate => false);
  perform 1 from public.membership_overview where id = v_mk and status = 'awaiting_activation' and outstanding_rupees = 3000;
  assert found, 'SMOKE FAIL: partial combo membership has wrong values';
  select count(*) into v_n from public.membership_batches where membership_id = v_mk;
  assert v_n = 2, 'SMOKE FAIL: combo should cover 2 batches';
  begin
    perform public.record_payment(v_mk, 3001, 'upi');
    raise exception 'SMOKE FAIL: overpayment was allowed';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like '%exceeds the outstanding%' then raise exception 'SMOKE FAIL: overpayment rule: %', sqlerrm; end if;
  end;
  v_r := public.record_payment(v_mk, 3000, 'card');
  assert (v_r ->> 'outstanding_rupees')::int = 0 and (v_r ->> 'needs_activation')::boolean,
    'SMOKE FAIL: clearing the balance should ask for activation';
  perform public.activate_membership(v_mk, v_today);
  perform 1 from public.membership_overview where id = v_mk and status = 'active';
  assert found, 'SMOKE FAIL: activated membership is not active';

  perform 1 from public.batch_overview where id = v_batch and enrolled_count = 2 and is_full;
  assert found, 'SMOKE FAIL: capacity flag is wrong';

  -- Void a payment, then cancel the membership
  v_m2 := public.create_membership(p_student_id => v_stu, p_duration_id => v_d30, p_payment_rupees => 500,
            p_payment_method => 'cash', p_batch_id => v_batch2, p_start_date => v_today);
  select id into v_pay from public.payments where membership_id = v_m2;
  perform public.void_payment(v_pay, 'smoke test void');
  perform 1 from public.membership_overview where id = v_m2 and paid_rupees = 0 and outstanding_rupees = 2500;
  assert found, 'SMOKE FAIL: voided payment still counted';
  perform public.cancel_membership(v_m2, 'smoke test cancel');
  perform 1 from public.membership_overview where id = v_m2 and status = 'cancelled';
  assert found, 'SMOKE FAIL: cancelled membership has wrong status';

  -- Start date correction is audited with its reason
  perform public.correct_membership_start_date(v_m, v_today - 1, 'smoke correction');
  perform 1 from public.audit_log where row_id = v_m and reason = 'smoke correction';
  assert found, 'SMOKE FAIL: start date correction not audited';

  -- Status buckets
  for v_case in select * from (values (-22, 'expiring_soon'), (-29, 'expires_today'), (-33, 'recently_expired'),
                                      (-40, 'expired'), (5, 'upcoming')) as c(off, expected) loop
    insert into public.students (studio_id, full_name, phone, date_of_birth)
      values (v_studio, 'Smoke Status ' || v_case.off, '+9199000010' || lpad((v_case.off + 50)::text, 2, '0'), '1990-01-01')
      returning id into v_s;
    v_m2 := public.create_membership(p_student_id => v_s, p_duration_id => v_d30, p_payment_rupees => 2500,
              p_payment_method => 'cash', p_batch_id => v_batch2, p_start_date => v_today + v_case.off);
    perform 1 from public.membership_overview where id = v_m2 and status = v_case.expected;
    assert found, format('SMOKE FAIL: start offset %s should be %s', v_case.off, v_case.expected);
  end loop;

  -- Trial + attendance roster + marking
  insert into public.leads (studio_id, full_name, phone, status, source)
    values (v_studio, 'Smoke Lead', '+919900000099', 'trial_scheduled', 'walk-in') returning id into v_lead;
  insert into public.trials (studio_id, lead_id, batch_id, trial_date) values (v_studio, v_lead, v_batch, v_today)
    returning id into v_trial;
  select count(*) into v_n from public.attendance_roster(v_batch, v_today);
  assert v_n = 3, format('SMOKE FAIL: roster should have 2 students + 1 trial, got %s', v_n);
  perform public.mark_attendance(v_batch, v_today, jsonb_build_array(
    jsonb_build_object('student_id', v_stu, 'status', 'present'),
    jsonb_build_object('student_id', v_kid, 'status', 'absent'),
    jsonb_build_object('trial_id', v_trial, 'status', 'present')));
  select count(*) into v_n from public.attendance_roster(v_batch, v_today) where attendance_status is not null;
  assert v_n = 3, 'SMOKE FAIL: attendance not saved for all 3';
  perform 1 from public.leads where id = v_lead and status = 'trial_attended';
  assert found, 'SMOKE FAIL: trial attendance did not update the lead';
  perform 1 from public.todays_classes where batch_id = v_batch and attendance_taken;
  assert found, 'SMOKE FAIL: today''s classes does not show attendance taken';

  -- Lead conversion
  v_conv := public.convert_lead_to_student(v_lead, '2015-05-05', p_guardian_name => 'Lead Parent', p_guardian_phone => '+919900000099');
  perform 1 from public.leads where id = v_lead and status = 'converted' and converted_student_id = v_conv;
  assert found, 'SMOKE FAIL: lead not marked converted';

  -- Archiving ends enrolments
  update public.students set archived_at = now() where id = v_kid;
  perform 1 from public.enrollments where student_id = v_kid and ended_on is null;
  assert not found, 'SMOKE FAIL: archived student still has open enrolments';

  -- Reminder log
  insert into public.reminder_logs (studio_id, membership_id, recipient, phone, message, reminder_kind, outcome, platform)
    values (v_studio, v_m, 'student', '+919900000001', 'Smoke reminder', 'expiring_soon', 'owner_confirmed_sent', 'android');

  -- Money tables can't be written directly
  begin
    insert into public.payments (studio_id, membership_id, amount_rupees, paid_on, method) values (v_studio, v_m, 1, v_today, 'cash');
    raise exception 'SMOKE FAIL: direct payment insert was allowed';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like 'permission denied%' then raise exception 'SMOKE FAIL: direct payment insert: %', sqlerrm; end if;
  end;
  begin
    update public.memberships set discount_rupees = 0 where id = v_m;
    raise exception 'SMOKE FAIL: direct membership update was allowed';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like 'permission denied%' then raise exception 'SMOKE FAIL: direct membership update: %', sqlerrm; end if;
  end;
  begin
    delete from public.students where id = v_stu;
    raise exception 'SMOKE FAIL: student delete was allowed';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like 'permission denied%' then raise exception 'SMOKE FAIL: student delete: %', sqlerrm; end if;
  end;

  -- Rows can't point at another studio's data
  begin
    insert into public.batch_prices (studio_id, batch_id, duration_id, price_rupees)
      values (v_studio, v_batch2, current_setting('smoke.other_d30')::bigint, 100);
    raise exception 'SMOKE FAIL: cross-studio reference was allowed';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like '%foreign key%' then raise exception 'SMOKE FAIL: cross-studio reference: %', sqlerrm; end if;
  end;

  perform set_config('smoke.membership', v_m::text, true);
end;
$$;

-- ---------------------------------------------------------------------
-- As a logged-in user who is NOT a member of the studio
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);

do $$
declare
  v_studio bigint := current_setting('smoke.studio')::bigint;
  v_n integer;
begin
  select count(*) into v_n from public.students where studio_id = v_studio;
  assert v_n = 0, 'SMOKE FAIL: outsider can see students';
  select count(*) into v_n from public.membership_overview where studio_id = v_studio;
  assert v_n = 0, 'SMOKE FAIL: outsider can see memberships';
  select count(*) into v_n from public.payments where studio_id = v_studio;
  assert v_n = 0, 'SMOKE FAIL: outsider can see payments';
  select count(*) into v_n from public.audit_log where studio_id = v_studio;
  assert v_n = 0, 'SMOKE FAIL: outsider can see the audit log';
  assert private.studio_today(v_studio) is null, 'SMOKE FAIL: studio_today answers for an outsider';

  begin
    perform public.record_payment(current_setting('smoke.membership')::bigint, 1, 'cash');
    raise exception 'SMOKE FAIL: outsider recorded a payment';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like '%not authorised%' then raise exception 'SMOKE FAIL: outsider payment: %', sqlerrm; end if;
  end;
  begin
    insert into public.students (studio_id, full_name, phone, date_of_birth) values (v_studio, 'Intruder', '+919900000777', '2000-01-01');
    raise exception 'SMOKE FAIL: outsider inserted a student';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like '%row-level security%' then raise exception 'SMOKE FAIL: outsider insert: %', sqlerrm; end if;
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- As an anonymous (logged-out) caller
-- ---------------------------------------------------------------------
set local role anon;

do $$
begin
  begin
    perform 1 from public.students;
    raise exception 'SMOKE FAIL: anonymous user can read students';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like 'permission denied%' then raise exception 'SMOKE FAIL: anon read: %', sqlerrm; end if;
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- As admin: financial history can't be deleted or rewritten
-- ---------------------------------------------------------------------
reset role;

do $$
declare
  v_m bigint := current_setting('smoke.membership')::bigint;
begin
  -- Internal helpers must not be reachable through the API (which only exposes the public schema).
  perform 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('is_studio_member', 'assert_studio_member', 'studio_today', 'admin_create_studio');
  assert not found, 'SMOKE FAIL: an internal helper function is in the public (API-exposed) schema';
  begin
    delete from public.payments where membership_id = v_m;
    raise exception 'SMOKE FAIL: admin deleted a payment';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like '%cannot be deleted%' then raise exception 'SMOKE FAIL: admin payment delete: %', sqlerrm; end if;
  end;
  begin
    update public.payments set amount_rupees = 1 where membership_id = v_m;
    raise exception 'SMOKE FAIL: admin edited a payment amount';
  exception when others then
    if sqlerrm like 'SMOKE FAIL%' or sqlerrm not like '%cannot be edited%' then raise exception 'SMOKE FAIL: admin payment edit: %', sqlerrm; end if;
  end;
end;
$$;

rollback;

select 'ALL SMOKE TESTS PASSED - nothing was saved' as result;
