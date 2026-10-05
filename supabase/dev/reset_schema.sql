-- DEV ONLY: removes every object created by the initial schema so the migration can be re-applied.
-- Refuses to run if the database contains any students or payments.

do $$
begin
  if to_regclass('public.students') is not null then
    if exists (select 1 from public.students) then
      raise exception 'ABORTED: students exist - this is not an empty dev database';
    end if;
  end if;
  if to_regclass('public.payments') is not null then
    if exists (select 1 from public.payments) then
      raise exception 'ABORTED: payments exist - this is not an empty dev database';
    end if;
  end if;
end;
$$;

drop view if exists
  public.todays_classes, public.batch_overview, public.student_overview, public.membership_overview;

drop table if exists
  public.audit_log, public.reminder_logs, public.attendance, public.class_sessions, public.payments,
  public.membership_batches, public.memberships, public.trials, public.leads, public.enrollments,
  public.students, public.id_counters, public.student_number_counters, public.combo_prices, public.combo_batches, public.combos,
  public.batch_prices, public.batch_schedules, public.batches, public.durations, public.instructors,
  public.studio_members, public.studios
cascade;

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.proname = any (array[
        'is_studio_member', 'assert_studio_member', 'studio_today', 'tg_default_studio_today',
        'tg_studios_validate', 'tg_students_assign_id', 'tg_students_assign_number', 'tg_students_validate', 'tg_students_archive',
        'tg_memberships_no_overlap', 'tg_block_delete', 'tg_block_update', 'tg_payments_before_insert',
        'tg_payments_before_update', 'tg_memberships_before_update', 'tg_audit', 'create_membership',
        'record_payment', 'activate_membership', 'correct_membership_start_date', 'cancel_membership',
        'void_payment', 'mark_attendance', 'attendance_roster', 'convert_lead_to_student', 'admin_create_studio'])
  loop
    execute format('drop function %s', r.sig);
  end loop;
end;
$$;

-- Not cascade: if anything else was ever put in this schema, this fails instead of deleting it.
drop schema if exists private;

select 'Schema removed - you can now run the migration again' as result;
