-- Dance studio management: initial schema.
-- Money is stored as whole rupees (no paise). Dates are calendar dates in the studio's timezone.
-- Keys are auto-increment bigints; only login users (Supabase Auth) are UUIDs.
-- Students also get a per-studio student_number (1, 2, 3...) for the owner to see and quote.

-- Internal helpers live here: the API only exposes the public schema, so these can't be called as RPCs.
create schema if not exists private;

-- =====================================================================
-- Studios and access
-- =====================================================================

create table public.studios (
  id                    bigint generated always as identity primary key,
  name                  text not null check (length(trim(name)) > 0),
  timezone              text not null default 'Asia/Kolkata',
  currency              text not null default 'INR',
  expiring_soon_days    integer not null default 7 check (expiring_soon_days between 1 and 60),
  recently_expired_days integer not null default 7 check (recently_expired_days between 1 and 90),
  created_at            timestamptz not null default now()
);

create table public.studio_members (
  studio_id  bigint not null references public.studios (id),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (studio_id, user_id)
);

create function private.is_studio_member(p_studio_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.studio_members m
    where m.studio_id = p_studio_id and m.user_id = auth.uid()
  );
$$;

-- Same error for "missing" and "not yours" so ids from other studios can't be probed.
create function private.assert_studio_member(p_studio_id bigint)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_studio_id is null or not private.is_studio_member(p_studio_id) then
    raise exception 'not found or not authorised' using errcode = '42501';
  end if;
end;
$$;

-- auth.uid() is null only for admin contexts (SQL editor, service role).
create function private.studio_today(p_studio_id bigint)
returns date
language sql stable security definer set search_path = ''
as $$
  select (now() at time zone s.timezone)::date
  from public.studios s
  where s.id = p_studio_id and (auth.uid() is null or private.is_studio_member(p_studio_id));
$$;

-- =====================================================================
-- Master data
-- =====================================================================

create table public.instructors (
  id         bigint generated always as identity primary key,
  studio_id  bigint not null references public.studios (id),
  full_name  text not null check (length(trim(full_name)) > 0),
  phone      text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (studio_id, id)
);

create table public.durations (
  id         bigint generated always as identity primary key,
  studio_id  bigint not null references public.studios (id),
  days       integer not null check (days between 1 and 1095),
  label      text not null check (length(trim(label)) > 0),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (studio_id, days),
  unique (studio_id, id)
);

create table public.batches (
  id            bigint generated always as identity primary key,
  studio_id     bigint not null references public.studios (id),
  name          text not null check (length(trim(name)) > 0),
  dance_style   text,
  level         text,
  instructor_id bigint,
  location      text,
  capacity      integer check (capacity > 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (studio_id, id),
  foreign key (studio_id, instructor_id) references public.instructors (studio_id, id)
);
create unique index batches_name_uq on public.batches (studio_id, lower(name));

create table public.batch_schedules (
  id          bigint generated always as identity primary key,
  studio_id   bigint not null,
  batch_id    bigint not null,
  day_of_week smallint not null check (day_of_week between 1 and 7), -- ISO: 1 = Monday
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time),
  unique (batch_id, day_of_week),
  foreign key (studio_id, batch_id) references public.batches (studio_id, id)
);

create table public.batch_prices (
  id           bigint generated always as identity primary key,
  studio_id    bigint not null,
  batch_id     bigint not null,
  duration_id  bigint not null,
  price_rupees integer not null check (price_rupees > 0),
  created_at   timestamptz not null default now(),
  unique (batch_id, duration_id),
  foreign key (studio_id, batch_id) references public.batches (studio_id, id),
  foreign key (studio_id, duration_id) references public.durations (studio_id, id)
);

create table public.combos (
  id         bigint generated always as identity primary key,
  studio_id  bigint not null references public.studios (id),
  name       text not null check (length(trim(name)) > 0),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (studio_id, id)
);
create unique index combos_name_uq on public.combos (studio_id, lower(name));

create table public.combo_batches (
  studio_id bigint not null,
  combo_id  bigint not null,
  batch_id  bigint not null,
  primary key (combo_id, batch_id),
  foreign key (studio_id, combo_id) references public.combos (studio_id, id),
  foreign key (studio_id, batch_id) references public.batches (studio_id, id)
);

create table public.combo_prices (
  id           bigint generated always as identity primary key,
  studio_id    bigint not null,
  combo_id     bigint not null,
  duration_id  bigint not null,
  price_rupees integer not null check (price_rupees > 0),
  created_at   timestamptz not null default now(),
  unique (combo_id, duration_id),
  foreign key (studio_id, combo_id) references public.combos (studio_id, id),
  foreign key (studio_id, duration_id) references public.durations (studio_id, id)
);

-- =====================================================================
-- People
-- =====================================================================

-- Gapless per-studio counter: the row lock makes concurrent inserts wait, and a failed insert rolls it back.
create table public.student_number_counters (
  studio_id  bigint primary key references public.studios (id),
  last_value integer not null check (last_value >= 0)
);

-- id is internal; student_number is what the owner sees (1, 2, 3... in each studio, no gaps).
create table public.students (
  id                      bigint generated always as identity primary key,
  studio_id               bigint not null references public.studios (id),
  student_number          integer not null check (student_number > 0),
  full_name               text not null check (length(trim(full_name)) > 0),
  phone                   text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email                   text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  date_of_birth           date not null check (date_of_birth > date '1900-01-01'),
  guardian_name           text,
  guardian_phone          text check (guardian_phone ~ '^\+[1-9][0-9]{7,14}$'),
  emergency_contact_name  text,
  emergency_contact_phone text check (emergency_contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  photo_path              text,
  source                  text,
  notes                   text,
  joined_on               date not null,
  archived_at             timestamptz,
  created_at              timestamptz not null default now(),
  check ((guardian_name is null) = (guardian_phone is null)),
  -- Children often have no phone of their own; reminders then go to the guardian.
  check (phone is not null or guardian_phone is not null),
  unique (studio_id, id),
  unique (studio_id, student_number)
);
-- Not unique: siblings may share a parent's number (the app warns instead).
create index students_phone_idx on public.students (studio_id, phone);
create index students_guardian_phone_idx on public.students (studio_id, guardian_phone);

create table public.enrollments (
  id          bigint generated always as identity primary key,
  studio_id   bigint not null,
  student_id  bigint not null,
  batch_id    bigint not null,
  enrolled_on date not null,
  ended_on    date,
  created_at  timestamptz not null default now(),
  check (ended_on is null or ended_on >= enrolled_on),
  unique (studio_id, id),
  foreign key (studio_id, student_id) references public.students (studio_id, id),
  foreign key (studio_id, batch_id) references public.batches (studio_id, id)
);
create unique index enrollments_one_open_uq on public.enrollments (student_id, batch_id) where ended_on is null;
create index enrollments_batch_idx on public.enrollments (batch_id);

create table public.leads (
  id                   bigint generated always as identity primary key,
  studio_id            bigint not null references public.studios (id),
  full_name            text not null check (length(trim(full_name)) > 0),
  phone                text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email                text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  age                  smallint check (age between 1 and 120),
  interested_style     text,
  source               text,
  notes                text,
  status               text not null default 'new' check (status in (
                         'new', 'contacted', 'trial_scheduled', 'trial_attended', 'follow_up',
                         'converted', 'not_interested', 'no_response')),
  next_follow_up_on    date,
  converted_student_id bigint,
  created_at           timestamptz not null default now(),
  check ((status = 'converted') = (converted_student_id is not null)),
  unique (studio_id, id),
  foreign key (studio_id, converted_student_id) references public.students (studio_id, id)
);

create table public.trials (
  id           bigint generated always as identity primary key,
  studio_id    bigint not null,
  lead_id      bigint not null,
  batch_id     bigint not null,
  trial_date   date not null,
  is_cancelled boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (lead_id, batch_id, trial_date),
  unique (studio_id, id),
  foreign key (studio_id, lead_id) references public.leads (studio_id, id),
  foreign key (studio_id, batch_id) references public.batches (studio_id, id)
);
create index trials_batch_date_idx on public.trials (batch_id, trial_date);

-- =====================================================================
-- Memberships and payments
-- =====================================================================

-- Each membership keeps its own "bill": price and discount are copied at creation and never change.
create table public.memberships (
  id               bigint generated always as identity primary key,
  studio_id        bigint not null,
  student_id       bigint not null,
  combo_id         bigint,
  duration_days    integer not null check (duration_days > 0),
  list_price_rupees integer not null check (list_price_rupees > 0),
  discount_rupees   integer not null default 0 check (discount_rupees >= 0),
  amount_due_rupees integer generated always as (list_price_rupees - discount_rupees) stored,
  lifecycle        text not null check (lifecycle in ('pending_activation', 'activated', 'cancelled')),
  start_date       date,
  end_date         date generated always as (start_date + (duration_days - 1)) stored,
  cancelled_at     timestamptz,
  cancel_reason    text,
  created_at       timestamptz not null default now(),
  created_by       uuid,
  check (discount_rupees < list_price_rupees),
  check (
       (lifecycle = 'pending_activation' and start_date is null     and cancelled_at is null)
    or (lifecycle = 'activated'          and start_date is not null and cancelled_at is null)
    or (lifecycle = 'cancelled'          and cancelled_at is not null and coalesce(length(trim(cancel_reason)), 0) > 0)
  ),
  unique (studio_id, id),
  foreign key (studio_id, student_id) references public.students (studio_id, id),
  foreign key (studio_id, combo_id) references public.combos (studio_id, id)
);
create index memberships_student_idx on public.memberships (student_id);
create index memberships_end_date_idx on public.memberships (studio_id, end_date);

-- Which batches a membership covers, frozen at creation (a later combo edit doesn't rewrite history).
create table public.membership_batches (
  studio_id     bigint not null,
  membership_id bigint not null,
  batch_id      bigint not null,
  primary key (membership_id, batch_id),
  foreign key (studio_id, membership_id) references public.memberships (studio_id, id),
  foreign key (studio_id, batch_id) references public.batches (studio_id, id)
);
create index membership_batches_batch_idx on public.membership_batches (batch_id);

create table public.payments (
  id            bigint generated always as identity primary key,
  studio_id     bigint not null,
  membership_id bigint not null,
  amount_rupees integer not null check (amount_rupees > 0),
  paid_on       date not null,
  method        text not null check (method in ('upi', 'cash', 'bank_transfer', 'card', 'other')),
  reference     text,
  notes         text,
  created_at    timestamptz not null default now(),
  created_by    uuid,
  voided_at     timestamptz,
  voided_by     uuid,
  void_reason   text,
  check ((voided_at is null) = (void_reason is null)),
  check (void_reason is null or length(trim(void_reason)) > 0),
  unique (studio_id, id),
  foreign key (studio_id, membership_id) references public.memberships (studio_id, id)
);
create index payments_membership_idx on public.payments (membership_id);
create index payments_paid_on_idx on public.payments (studio_id, paid_on);

-- =====================================================================
-- Attendance
-- =====================================================================

create table public.class_sessions (
  id           bigint generated always as identity primary key,
  studio_id    bigint not null,
  batch_id     bigint not null,
  session_date date not null,
  created_at   timestamptz not null default now(),
  created_by   uuid,
  unique (batch_id, session_date),
  unique (studio_id, id),
  foreign key (studio_id, batch_id) references public.batches (studio_id, id)
);

create table public.attendance (
  id         bigint generated always as identity primary key,
  studio_id  bigint not null,
  session_id bigint not null,
  student_id bigint,
  trial_id   bigint,
  status     text not null check (status in ('present', 'absent')),
  marked_at  timestamptz not null default now(),
  marked_by  uuid,
  check (num_nonnulls(student_id, trial_id) = 1),
  unique (session_id, student_id),
  unique (session_id, trial_id),
  foreign key (studio_id, session_id) references public.class_sessions (studio_id, id),
  foreign key (studio_id, student_id) references public.students (studio_id, id),
  foreign key (studio_id, trial_id) references public.trials (studio_id, id)
);
create index attendance_student_idx on public.attendance (student_id);

-- =====================================================================
-- Reminders and audit
-- =====================================================================

create table public.reminder_logs (
  id            bigint generated always as identity primary key,
  studio_id     bigint not null,
  membership_id bigint not null,
  recipient     text not null check (recipient in ('guardian', 'student')),
  phone         text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  message       text not null check (length(trim(message)) > 0),
  reminder_kind text not null check (reminder_kind in ('expiring_soon', 'expires_today', 'recently_expired', 'expired', 'balance_due')),
  -- iOS reports sent/cancelled itself; Android reports nothing, so the owner confirms.
  outcome       text not null check (outcome in (
                  'sent_reported_by_phone', 'cancelled_reported_by_phone',
                  'owner_confirmed_sent', 'owner_confirmed_not_sent')),
  platform      text not null check (platform in ('ios', 'android')),
  created_at    timestamptz not null default now(),
  created_by    uuid not null default auth.uid(),
  foreign key (studio_id, membership_id) references public.memberships (studio_id, id)
);
create index reminder_logs_membership_idx on public.reminder_logs (membership_id, created_at desc);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  studio_id  bigint,
  table_name text not null,
  row_id     bigint,
  action     text not null,
  old_row    jsonb,
  new_row    jsonb,
  reason     text,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index audit_log_studio_idx on public.audit_log (studio_id, changed_at desc);

-- =====================================================================
-- Triggers
-- =====================================================================

create function public.tg_default_studio_today()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_column text := tg_argv[0];
begin
  if to_jsonb(new) ->> v_column is null then
    new := jsonb_populate_record(new, jsonb_build_object(v_column, private.studio_today(new.studio_id)));
  end if;
  return new;
end;
$$;

create trigger students_default_joined_on before insert on public.students
  for each row execute function public.tg_default_studio_today('joined_on');
create trigger enrollments_default_enrolled_on before insert on public.enrollments
  for each row execute function public.tg_default_studio_today('enrolled_on');

-- An invalid timezone would break every "today" calculation.
create function public.tg_studios_validate()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  perform now() at time zone new.timezone;
  return new;
end;
$$;

create trigger studios_validate before insert or update on public.studios
  for each row execute function public.tg_studios_validate();

create function public.tg_students_assign_number()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.student_number is not null then
    raise exception 'student number is assigned automatically';
  end if;
  insert into public.student_number_counters as c (studio_id, last_value)
  values (new.studio_id, 1)
  on conflict (studio_id) do update set last_value = c.last_value + 1
  returning c.last_value into new.student_number;
  return new;
end;
$$;

create trigger students_assign_number before insert on public.students
  for each row execute function public.tg_students_assign_number();

create function public.tg_students_validate()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.student_number is distinct from old.student_number then
    raise exception 'student number cannot be changed';
  end if;
  if tg_op = 'UPDATE' and new.studio_id is distinct from old.studio_id then
    raise exception 'a student cannot be moved to another studio';
  end if;
  if new.date_of_birth > private.studio_today(new.studio_id) then
    raise exception 'date of birth cannot be in the future';
  end if;
  return new;
end;
$$;

create trigger students_validate before insert or update on public.students
  for each row execute function public.tg_students_validate();

create function public.tg_students_archive()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.archived_at is null and new.archived_at is not null then
    update public.enrollments e
    set ended_on = greatest(e.enrolled_on, private.studio_today(new.studio_id))
    where e.student_id = new.id and e.ended_on is null;
  end if;
  return null;
end;
$$;

create trigger students_archive_end_enrollments after update of archived_at on public.students
  for each row execute function public.tg_students_archive();

-- A student can't hold two activated memberships covering the same batch on overlapping dates.
-- Deferred to commit so it sees the membership's batches, which are inserted after the membership row.
create function public.tg_memberships_no_overlap()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_id       bigint := coalesce((to_jsonb(new) ->> 'membership_id')::bigint, (to_jsonb(new) ->> 'id')::bigint);
  v_student  bigint;
  v_conflict bigint;
begin
  select m.student_id into v_student from public.memberships m where m.id = v_id;
  -- Serialises concurrent transactions for the same student so both can't pass the check.
  perform 1 from public.students s where s.id = v_student for update;

  select o.id into v_conflict
  from public.memberships m
  join public.membership_batches mb on mb.membership_id = m.id
  join public.membership_batches ob on ob.batch_id = mb.batch_id and ob.membership_id <> m.id
  join public.memberships o on o.id = ob.membership_id
  where m.id = v_id
    and m.lifecycle = 'activated' and o.lifecycle = 'activated'
    and o.student_id = m.student_id
    and daterange(m.start_date, m.end_date, '[]') && daterange(o.start_date, o.end_date, '[]')
  limit 1;

  if v_conflict is not null then
    raise exception 'this student already has a membership for the same batch on overlapping dates'
      using errcode = '23P01';
  end if;
  return null;
end;
$$;

create constraint trigger memberships_no_overlap after insert or update on public.memberships
  deferrable initially deferred for each row execute function public.tg_memberships_no_overlap();
create constraint trigger membership_batches_no_overlap after insert on public.membership_batches
  deferrable initially deferred for each row execute function public.tg_memberships_no_overlap();

create function public.tg_block_delete()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception '% rows cannot be deleted', tg_table_name;
end;
$$;

create function public.tg_block_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception '% rows cannot be changed', tg_table_name;
end;
$$;

create function public.tg_payments_before_insert()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_due       integer;
  v_lifecycle text;
  v_paid      integer;
begin
  -- Row lock serialises concurrent payments for the same membership.
  select m.amount_due_rupees, m.lifecycle into v_due, v_lifecycle
  from public.memberships m
  where m.id = new.membership_id and m.studio_id = new.studio_id
  for update;

  if v_lifecycle is null then
    raise exception 'membership not found';
  end if;
  if v_lifecycle = 'cancelled' then
    raise exception 'cannot add a payment to a cancelled membership';
  end if;
  if new.voided_at is not null then
    raise exception 'a new payment cannot be voided';
  end if;

  new.paid_on := coalesce(new.paid_on, private.studio_today(new.studio_id));
  if new.paid_on > private.studio_today(new.studio_id) then
    raise exception 'payment date cannot be in the future';
  end if;

  select coalesce(sum(p.amount_rupees), 0) into v_paid
  from public.payments p
  where p.membership_id = new.membership_id and p.voided_at is null;

  if v_paid + new.amount_rupees > v_due then
    raise exception 'payment exceeds the outstanding amount (Rs % outstanding)', v_due - v_paid;
  end if;
  return new;
end;
$$;

create function public.tg_payments_before_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (new.id, new.studio_id, new.membership_id, new.amount_rupees, new.paid_on, new.method,
      new.reference, new.notes, new.created_at, new.created_by)
     is distinct from
     (old.id, old.studio_id, old.membership_id, old.amount_rupees, old.paid_on, old.method,
      old.reference, old.notes, old.created_at, old.created_by) then
    raise exception 'payments cannot be edited; void it and record a new one';
  end if;
  if old.voided_at is not null then
    raise exception 'payment is already voided';
  end if;
  if new.voided_at is null then
    raise exception 'the only allowed change to a payment is voiding it';
  end if;
  return new;
end;
$$;

create function public.tg_memberships_before_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (new.id, new.studio_id, new.student_id, new.combo_id, new.duration_days,
      new.list_price_rupees, new.discount_rupees, new.created_at, new.created_by)
     is distinct from
     (old.id, old.studio_id, old.student_id, old.combo_id, old.duration_days,
      old.list_price_rupees, old.discount_rupees, old.created_at, old.created_by) then
    raise exception 'membership price and terms cannot be changed; cancel it and create a new one';
  end if;
  if old.lifecycle = 'cancelled' then
    raise exception 'membership is cancelled';
  end if;
  if old.lifecycle = 'activated' and new.lifecycle = 'pending_activation' then
    raise exception 'an activated membership cannot go back to awaiting activation';
  end if;
  if old.start_date is not null and new.start_date is distinct from old.start_date
     and coalesce(current_setting('app.change_reason', true), '') = '' then
    raise exception 'a reason is required to change the start date';
  end if;
  return new;
end;
$$;

create trigger payments_before_insert before insert on public.payments
  for each row execute function public.tg_payments_before_insert();
create trigger payments_before_update before update on public.payments
  for each row execute function public.tg_payments_before_update();
create trigger memberships_before_update before update on public.memberships
  for each row execute function public.tg_memberships_before_update();
create trigger membership_batches_no_update before update on public.membership_batches
  for each row execute function public.tg_block_update();
create trigger audit_log_no_update before update on public.audit_log
  for each row execute function public.tg_block_update();

-- Financial history can't be deleted by anyone, including the service role.
create trigger payments_no_delete before delete on public.payments
  for each row execute function public.tg_block_delete();
create trigger memberships_no_delete before delete on public.memberships
  for each row execute function public.tg_block_delete();
create trigger membership_batches_no_delete before delete on public.membership_batches
  for each row execute function public.tg_block_delete();
create trigger audit_log_no_delete before delete on public.audit_log
  for each row execute function public.tg_block_delete();

create function public.tg_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
begin
  insert into public.audit_log (studio_id, table_name, row_id, action, old_row, new_row, reason, changed_by)
  values (
    case when tg_table_name = 'studios' then (v_row ->> 'id')::bigint else (v_row ->> 'studio_id')::bigint end,
    tg_table_name,
    (v_row ->> 'id')::bigint,
    lower(tg_op),
    v_old,
    v_new,
    nullif(current_setting('app.change_reason', true), ''),
    auth.uid()
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'studios', 'studio_members', 'instructors', 'durations', 'batches', 'batch_schedules', 'batch_prices',
    'combos', 'combo_batches', 'combo_prices', 'students', 'enrollments', 'leads', 'trials',
    'memberships', 'membership_batches', 'payments', 'class_sessions', 'attendance', 'reminder_logs'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.tg_audit()',
      t || '_audit', t);
  end loop;
end;
$$;

-- =====================================================================
-- Views (security_invoker so row-level security applies to the caller)
-- =====================================================================

create view public.membership_overview with (security_invoker = true) as
with paid as (
  select p.membership_id, sum(p.amount_rupees)::integer as paid_rupees
  from public.payments p
  where p.voided_at is null
  group by p.membership_id
)
select
  m.id,
  m.studio_id,
  m.student_id,
  m.combo_id,
  m.duration_days,
  m.list_price_rupees,
  m.discount_rupees,
  m.amount_due_rupees,
  coalesce(pd.paid_rupees, 0)                       as paid_rupees,
  m.amount_due_rupees - coalesce(pd.paid_rupees, 0) as outstanding_rupees,
  m.lifecycle,
  m.start_date,
  m.end_date,
  case when m.end_date >= t.today then m.end_date - t.today end as days_left,
  case
    when m.lifecycle = 'cancelled'                                          then 'cancelled'
    when m.lifecycle = 'pending_activation'                                 then 'awaiting_activation'
    when m.start_date > t.today                                             then 'upcoming'
    when m.end_date = t.today                                               then 'expires_today'
    when m.end_date > t.today and m.end_date - t.today <= s.expiring_soon_days then 'expiring_soon'
    when m.end_date > t.today                                               then 'active'
    when t.today - m.end_date <= s.recently_expired_days                    then 'recently_expired'
    else 'expired'
  end as status,
  m.created_at
from public.memberships m
join public.studios s on s.id = m.studio_id
cross join lateral (select (now() at time zone s.timezone)::date as today) t
left join paid pd on pd.membership_id = m.id;

create view public.student_overview with (security_invoker = true) as
select
  st.id,
  st.studio_id,
  st.student_number,
  st.full_name,
  st.phone,
  st.email,
  st.guardian_name,
  st.guardian_phone,
  st.date_of_birth,
  extract(year from age(t.today, st.date_of_birth))::integer as age_years,
  st.joined_on,
  st.archived_at,
  case
    when st.archived_at is not null                                         then 'archived'
    when bool_or(mo.status in ('active', 'expiring_soon', 'expires_today')) then 'active'
    when bool_or(mo.status = 'awaiting_activation')                         then 'awaiting_activation'
    when bool_or(mo.status = 'upcoming')                                    then 'upcoming'
    when bool_or(mo.status = 'recently_expired')                            then 'recently_expired'
    when bool_or(mo.status = 'expired')                                     then 'inactive'
    else 'new'
  end as status,
  coalesce(sum(mo.outstanding_rupees) filter (where mo.status <> 'cancelled'), 0)::integer as outstanding_rupees,
  max(mo.end_date) filter (where mo.status <> 'cancelled') as latest_end_date
from public.students st
join public.studios s on s.id = st.studio_id
cross join lateral (select (now() at time zone s.timezone)::date as today) t
left join public.membership_overview mo on mo.student_id = st.id
group by st.id, t.today;

create view public.batch_overview with (security_invoker = true) as
select
  b.id,
  b.studio_id,
  b.name,
  b.dance_style,
  b.level,
  b.instructor_id,
  b.capacity,
  b.is_active,
  count(e.id)::integer as enrolled_count,
  (b.capacity is not null and count(e.id) >= b.capacity) as is_full
from public.batches b
left join public.enrollments e on e.batch_id = b.id and e.ended_on is null
group by b.id;

create view public.todays_classes with (security_invoker = true) as
select
  b.id            as batch_id,
  b.studio_id,
  b.name          as batch_name,
  bs.start_time,
  bs.end_time,
  t.today         as session_date,
  cs.id           as session_id,
  (cs.id is not null) as attendance_taken
from public.batches b
join public.studios s on s.id = b.studio_id
cross join lateral (select (now() at time zone s.timezone)::date as today) t
join public.batch_schedules bs on bs.batch_id = b.id and bs.day_of_week = extract(isodow from t.today)
left join public.class_sessions cs on cs.batch_id = b.id and cs.session_date = t.today
where b.is_active;

-- =====================================================================
-- Write functions (the only way to change memberships, payments and attendance)
-- =====================================================================

create function public.create_membership(
  p_student_id      bigint,
  p_duration_id     bigint,
  p_payment_rupees  integer,
  p_payment_method  text,
  p_batch_id        bigint  default null,
  p_combo_id        bigint  default null,
  p_discount_rupees integer default 0,
  p_paid_on         date    default null,
  p_activate        boolean default true,
  p_start_date      date    default null,
  p_reference       text    default null,
  p_notes           text    default null
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_studio_id     bigint;
  v_days          integer;
  v_price         integer;
  v_due           integer;
  v_batch_ids     bigint[];
  v_membership_id bigint;
begin
  select s.studio_id into v_studio_id
  from public.students s
  where s.id = p_student_id and s.archived_at is null;
  perform private.assert_studio_member(v_studio_id);

  if (p_batch_id is null) = (p_combo_id is null) then
    raise exception 'choose exactly one of a batch or a combo';
  end if;
  if p_activate is null then
    raise exception 'activate must be true or false';
  end if;

  select d.days into v_days
  from public.durations d
  where d.id = p_duration_id and d.studio_id = v_studio_id and d.is_active;
  if v_days is null then
    raise exception 'duration not found';
  end if;

  if p_batch_id is not null then
    select bp.price_rupees into v_price
    from public.batch_prices bp
    join public.batches b on b.id = bp.batch_id
    where bp.batch_id = p_batch_id and bp.duration_id = p_duration_id
      and b.studio_id = v_studio_id and b.is_active;
    v_batch_ids := array[p_batch_id];
  else
    select cp.price_rupees into v_price
    from public.combo_prices cp
    join public.combos c on c.id = cp.combo_id
    where cp.combo_id = p_combo_id and cp.duration_id = p_duration_id
      and c.studio_id = v_studio_id and c.is_active;
    select array_agg(cb.batch_id) into v_batch_ids
    from public.combo_batches cb
    where cb.combo_id = p_combo_id;
    if exists (
      select 1 from public.combo_batches cb
      join public.batches b on b.id = cb.batch_id
      where cb.combo_id = p_combo_id and not b.is_active) then
      raise exception 'the combo includes an inactive batch';
    end if;
  end if;

  if v_price is null then
    raise exception 'no price is set for this batch/combo and duration';
  end if;
  if coalesce(cardinality(v_batch_ids), 0) = 0 then
    raise exception 'the combo has no batches';
  end if;
  if p_discount_rupees is null or p_discount_rupees < 0 or p_discount_rupees >= v_price then
    raise exception 'discount must be 0 or more and less than the price';
  end if;

  v_due := v_price - p_discount_rupees;
  if p_payment_rupees is null or p_payment_rupees <= 0 or p_payment_rupees > v_due then
    raise exception 'payment must be more than 0 and at most the amount due (Rs %)', v_due;
  end if;
  if p_payment_rupees = v_due and not p_activate then
    raise exception 'a fully paid membership is always activated';
  end if;
  if p_activate and p_start_date is null then
    raise exception 'a start date is required';
  end if;
  if not p_activate and p_start_date is not null then
    raise exception 'the start date is set when the membership is activated';
  end if;

  perform set_config('app.change_reason', 'membership created', true);

  insert into public.memberships (
    studio_id, student_id, combo_id, duration_days, list_price_rupees, discount_rupees,
    lifecycle, start_date, created_by)
  values (
    v_studio_id, p_student_id, p_combo_id, v_days, v_price, p_discount_rupees,
    case when p_activate then 'activated' else 'pending_activation' end, p_start_date, auth.uid())
  returning id into v_membership_id;

  insert into public.membership_batches (studio_id, membership_id, batch_id)
  select v_studio_id, v_membership_id, b.batch_id
  from unnest(v_batch_ids) as b(batch_id);

  insert into public.enrollments (studio_id, student_id, batch_id, enrolled_on)
  select v_studio_id, p_student_id, b.batch_id, coalesce(p_start_date, private.studio_today(v_studio_id))
  from unnest(v_batch_ids) as b(batch_id)
  where not exists (
    select 1 from public.enrollments e
    where e.student_id = p_student_id and e.batch_id = b.batch_id and e.ended_on is null);

  insert into public.payments (studio_id, membership_id, amount_rupees, paid_on, method, reference, notes, created_by)
  values (v_studio_id, v_membership_id, p_payment_rupees, p_paid_on, p_payment_method, p_reference, p_notes, auth.uid());

  return v_membership_id;
end;
$$;

create function public.record_payment(
  p_membership_id       bigint,
  p_amount_rupees       integer,
  p_method              text,
  p_paid_on             date default null,
  p_reference           text default null,
  p_notes               text default null,
  p_activate_start_date date default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_m           public.memberships%rowtype;
  v_payment_id  bigint;
  v_outstanding integer;
begin
  select * into v_m from public.memberships m where m.id = p_membership_id for update;
  perform private.assert_studio_member(v_m.studio_id);

  if p_activate_start_date is not null and v_m.lifecycle <> 'pending_activation' then
    raise exception 'membership is not awaiting activation';
  end if;

  perform set_config('app.change_reason', 'payment recorded', true);
  insert into public.payments (studio_id, membership_id, amount_rupees, paid_on, method, reference, notes, created_by)
  values (v_m.studio_id, p_membership_id, p_amount_rupees, p_paid_on, p_method, p_reference, p_notes, auth.uid())
  returning id into v_payment_id;

  select v_m.amount_due_rupees - coalesce(sum(p.amount_rupees), 0)::integer into v_outstanding
  from public.payments p
  where p.membership_id = p_membership_id and p.voided_at is null;

  if p_activate_start_date is not null then
    perform set_config('app.change_reason', 'activated with payment', true);
    update public.memberships
    set lifecycle = 'activated', start_date = p_activate_start_date
    where id = p_membership_id;
    v_m.lifecycle := 'activated';
  end if;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'outstanding_rupees', v_outstanding,
    'lifecycle', v_m.lifecycle,
    'needs_activation', v_m.lifecycle = 'pending_activation' and v_outstanding = 0);
end;
$$;

create function public.activate_membership(p_membership_id bigint, p_start_date date)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_m public.memberships%rowtype;
begin
  select * into v_m from public.memberships m where m.id = p_membership_id for update;
  perform private.assert_studio_member(v_m.studio_id);

  if v_m.lifecycle <> 'pending_activation' then
    raise exception 'membership is not awaiting activation';
  end if;
  if p_start_date is null then
    raise exception 'a start date is required';
  end if;

  perform set_config('app.change_reason', 'membership activated', true);
  update public.memberships
  set lifecycle = 'activated', start_date = p_start_date
  where id = p_membership_id;
end;
$$;

create function public.correct_membership_start_date(p_membership_id bigint, p_start_date date, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_m public.memberships%rowtype;
begin
  select * into v_m from public.memberships m where m.id = p_membership_id for update;
  perform private.assert_studio_member(v_m.studio_id);

  if v_m.lifecycle <> 'activated' then
    raise exception 'only an activated membership can have its start date corrected';
  end if;
  if p_start_date is null then
    raise exception 'a start date is required';
  end if;
  if coalesce(length(trim(p_reason)), 0) = 0 then
    raise exception 'a reason is required';
  end if;

  perform set_config('app.change_reason', trim(p_reason), true);
  update public.memberships set start_date = p_start_date where id = p_membership_id;
end;
$$;

create function public.cancel_membership(p_membership_id bigint, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_m public.memberships%rowtype;
begin
  select * into v_m from public.memberships m where m.id = p_membership_id for update;
  perform private.assert_studio_member(v_m.studio_id);

  if v_m.lifecycle = 'cancelled' then
    raise exception 'membership is already cancelled';
  end if;
  if coalesce(length(trim(p_reason)), 0) = 0 then
    raise exception 'a reason is required';
  end if;

  perform set_config('app.change_reason', trim(p_reason), true);
  update public.payments
  set voided_at = now(), voided_by = auth.uid(), void_reason = 'membership cancelled: ' || trim(p_reason)
  where membership_id = p_membership_id and voided_at is null;

  update public.memberships
  set lifecycle = 'cancelled', cancelled_at = now(), cancel_reason = trim(p_reason)
  where id = p_membership_id;
end;
$$;

create function public.void_payment(p_payment_id bigint, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_p public.payments%rowtype;
begin
  select * into v_p from public.payments p where p.id = p_payment_id for update;
  perform private.assert_studio_member(v_p.studio_id);

  if v_p.voided_at is not null then
    raise exception 'payment is already voided';
  end if;
  if coalesce(length(trim(p_reason)), 0) = 0 then
    raise exception 'a reason is required';
  end if;

  perform set_config('app.change_reason', trim(p_reason), true);
  update public.payments
  set voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason)
  where id = p_payment_id;
end;
$$;

-- p_entries: [{"student_id": "...", "status": "present"}, {"trial_id": "...", "status": "absent"}]
create function public.mark_attendance(p_batch_id bigint, p_session_date date, p_entries jsonb)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_studio_id  bigint;
  v_session_id bigint;
  v_invalid    integer;
begin
  select b.studio_id into v_studio_id from public.batches b where b.id = p_batch_id;
  perform private.assert_studio_member(v_studio_id);

  if p_session_date is null or p_session_date > private.studio_today(v_studio_id) then
    raise exception 'attendance cannot be marked for a future date';
  end if;
  if jsonb_typeof(p_entries) is distinct from 'array' or jsonb_array_length(p_entries) = 0 then
    raise exception 'entries must be a non-empty array';
  end if;

  select count(*) into v_invalid
  from jsonb_to_recordset(p_entries) as e(student_id bigint, trial_id bigint, status text)
  where num_nonnulls(e.student_id, e.trial_id) <> 1
     or e.status is null or e.status not in ('present', 'absent')
     or (e.student_id is not null and not exists (
           select 1 from public.enrollments en
           where en.student_id = e.student_id and en.batch_id = p_batch_id
             and en.enrolled_on <= p_session_date
             and (en.ended_on is null or en.ended_on >= p_session_date)))
     or (e.trial_id is not null and not exists (
           select 1 from public.trials tr
           where tr.id = e.trial_id and tr.batch_id = p_batch_id
             and tr.trial_date = p_session_date and not tr.is_cancelled));
  if v_invalid > 0 then
    raise exception '% attendance entries are invalid (not enrolled on that date, wrong trial, or bad status)', v_invalid;
  end if;

  -- Students and trials are checked separately: student #1 and trial #1 are different people.
  if (select count(e.student_id) <> count(distinct e.student_id) or count(e.trial_id) <> count(distinct e.trial_id)
      from jsonb_to_recordset(p_entries) as e(student_id bigint, trial_id bigint)) then
    raise exception 'each student or trial can appear only once';
  end if;

  perform set_config('app.change_reason', 'attendance marked', true);

  insert into public.class_sessions (studio_id, batch_id, session_date, created_by)
  values (v_studio_id, p_batch_id, p_session_date, auth.uid())
  on conflict (batch_id, session_date) do nothing;

  select cs.id into v_session_id
  from public.class_sessions cs
  where cs.batch_id = p_batch_id and cs.session_date = p_session_date;

  insert into public.attendance (studio_id, session_id, student_id, status, marked_by)
  select v_studio_id, v_session_id, e.student_id, e.status, auth.uid()
  from jsonb_to_recordset(p_entries) as e(student_id bigint, status text)
  where e.student_id is not null
  on conflict (session_id, student_id)
  do update set status = excluded.status, marked_at = now(), marked_by = excluded.marked_by;

  insert into public.attendance (studio_id, session_id, trial_id, status, marked_by)
  select v_studio_id, v_session_id, e.trial_id, e.status, auth.uid()
  from jsonb_to_recordset(p_entries) as e(trial_id bigint, status text)
  where e.trial_id is not null
  on conflict (session_id, trial_id)
  do update set status = excluded.status, marked_at = now(), marked_by = excluded.marked_by;

  -- Attending a trial moves the lead forward so the follow-up becomes due.
  update public.leads l
  set status = 'trial_attended'
  from jsonb_to_recordset(p_entries) as e(trial_id bigint, status text)
  join public.trials tr on tr.id = e.trial_id
  where e.status = 'present' and l.id = tr.lead_id
    and l.status in ('new', 'contacted', 'trial_scheduled');

  return v_session_id;
end;
$$;

-- Same enrollment/trial rules as mark_attendance, so the list shown always matches what can be saved.
create function public.attendance_roster(p_batch_id bigint, p_session_date date)
returns table (student_id bigint, student_number integer, trial_id bigint, full_name text, is_trial boolean, attendance_status text)
language sql stable security invoker set search_path = ''
as $$
  select en.student_id, st.student_number, null::bigint, st.full_name, false, a.status
  from public.enrollments en
  join public.students st on st.id = en.student_id
  left join public.class_sessions cs on cs.batch_id = en.batch_id and cs.session_date = p_session_date
  left join public.attendance a on a.session_id = cs.id and a.student_id = en.student_id
  where en.batch_id = p_batch_id
    and en.enrolled_on <= p_session_date
    and (en.ended_on is null or en.ended_on >= p_session_date)
  union all
  select null::bigint, null::integer, tr.id, l.full_name, true, a.status
  from public.trials tr
  join public.leads l on l.id = tr.lead_id
  left join public.class_sessions cs on cs.batch_id = tr.batch_id and cs.session_date = p_session_date
  left join public.attendance a on a.session_id = cs.id and a.trial_id = tr.id
  where tr.batch_id = p_batch_id and tr.trial_date = p_session_date and not tr.is_cancelled
  order by 5, 4;
$$;

-- The app passes the lead's phone as either the student's or the guardian's number.
create function public.convert_lead_to_student(
  p_lead_id        bigint,
  p_date_of_birth  date,
  p_phone          text default null,
  p_guardian_name  text default null,
  p_guardian_phone text default null,
  p_full_name      text default null,
  p_email          text default null
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead       public.leads%rowtype;
  v_student_id bigint;
begin
  select * into v_lead from public.leads l where l.id = p_lead_id for update;
  perform private.assert_studio_member(v_lead.studio_id);

  if v_lead.status = 'converted' then
    raise exception 'lead is already converted';
  end if;

  perform set_config('app.change_reason', 'lead converted', true);

  insert into public.students (
    studio_id, full_name, phone, email, date_of_birth, guardian_name, guardian_phone, source, notes)
  values (
    v_lead.studio_id, coalesce(nullif(trim(p_full_name), ''), v_lead.full_name), p_phone,
    coalesce(p_email, v_lead.email), p_date_of_birth, p_guardian_name, p_guardian_phone,
    v_lead.source, v_lead.notes)
  returning id into v_student_id;

  update public.leads
  set status = 'converted', converted_student_id = v_student_id
  where id = p_lead_id;

  return v_student_id;
end;
$$;

-- Run once from the Supabase SQL editor after creating the owner's login. Not callable from the app.
create function private.admin_create_studio(p_name text, p_owner_user_id uuid)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_studio_id bigint;
begin
  insert into public.studios (name) values (p_name) returning id into v_studio_id;
  insert into public.studio_members (studio_id, user_id, role) values (v_studio_id, p_owner_user_id, 'owner');
  insert into public.durations (studio_id, days, label) values
    (v_studio_id, 30, '1 month'),
    (v_studio_id, 90, '3 months'),
    (v_studio_id, 180, '6 months'),
    (v_studio_id, 365, '12 months');
  return v_studio_id;
end;
$$;

-- =====================================================================
-- Row-level security
-- =====================================================================

alter table public.studios            enable row level security;
alter table public.studio_members     enable row level security;
alter table public.student_number_counters enable row level security;
alter table public.instructors        enable row level security;
alter table public.durations          enable row level security;
alter table public.batches            enable row level security;
alter table public.batch_schedules    enable row level security;
alter table public.batch_prices       enable row level security;
alter table public.combos             enable row level security;
alter table public.combo_batches      enable row level security;
alter table public.combo_prices       enable row level security;
alter table public.students           enable row level security;
alter table public.enrollments        enable row level security;
alter table public.leads              enable row level security;
alter table public.trials             enable row level security;
alter table public.memberships        enable row level security;
alter table public.membership_batches enable row level security;
alter table public.payments           enable row level security;
alter table public.class_sessions     enable row level security;
alter table public.attendance         enable row level security;
alter table public.reminder_logs      enable row level security;
alter table public.audit_log          enable row level security;

create policy studios_select on public.studios for select to authenticated
  using (private.is_studio_member(id));
create policy studios_update on public.studios for update to authenticated
  using (private.is_studio_member(id)) with check (private.is_studio_member(id));

create policy studio_members_select on public.studio_members for select to authenticated
  using (user_id = auth.uid());

do $$
declare
  t text;
begin
  -- Read for every studio-owned table.
  foreach t in array array[
    'instructors', 'durations', 'batches', 'batch_schedules', 'batch_prices', 'combos', 'combo_batches',
    'combo_prices', 'students', 'enrollments', 'leads', 'trials', 'memberships', 'membership_batches',
    'payments', 'class_sessions', 'attendance', 'reminder_logs', 'audit_log'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.is_studio_member(studio_id))',
                   t || '_select', t);
  end loop;

  -- Direct create/edit for master data and people.
  foreach t in array array[
    'instructors', 'durations', 'batches', 'batch_schedules', 'batch_prices', 'combos', 'combo_batches',
    'combo_prices', 'students', 'enrollments', 'leads', 'trials'
  ] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_studio_member(studio_id))',
                   t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_studio_member(studio_id)) with check (private.is_studio_member(studio_id))',
                   t || '_update', t);
  end loop;

  -- Deletes only where nothing historical depends on the row.
  foreach t in array array['batch_schedules', 'batch_prices', 'combo_batches', 'combo_prices'] loop
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_studio_member(studio_id))',
                   t || '_delete', t);
  end loop;
end;
$$;

create policy reminder_logs_insert on public.reminder_logs for insert to authenticated
  with check (private.is_studio_member(studio_id) and created_by = auth.uid());

-- =====================================================================
-- Privileges (Supabase grants everything to anon/authenticated by default; narrow it)
-- =====================================================================

-- Start from nothing, then grant exactly what the app needs (doesn't rely on project defaults).
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;

grant select on all tables in schema public to authenticated;
revoke select on public.student_number_counters from authenticated;
grant update on public.studios to authenticated;
grant insert, update on
  public.instructors, public.durations, public.batches, public.batch_schedules, public.batch_prices,
  public.combos, public.combo_batches, public.combo_prices, public.students, public.enrollments,
  public.leads, public.trials
to authenticated;
grant delete on public.batch_schedules, public.batch_prices, public.combo_batches, public.combo_prices to authenticated;
grant insert on public.reminder_logs to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- Row-level security policies and triggers call these as the signed-in user.
grant usage on schema private to authenticated;
grant execute on function private.is_studio_member(bigint), private.studio_today(bigint) to authenticated;

-- The only API entry points for changing money and attendance; each checks studio membership first.
grant execute on function
  public.create_membership(bigint, bigint, integer, text, bigint, bigint, integer, date, boolean, date, text, text),
  public.record_payment(bigint, integer, text, date, text, text, date),
  public.activate_membership(bigint, date),
  public.correct_membership_start_date(bigint, date, text),
  public.cancel_membership(bigint, text),
  public.void_payment(bigint, text),
  public.mark_attendance(bigint, date, jsonb),
  public.attendance_roster(bigint, date),
  public.convert_lead_to_student(bigint, date, text, text, text, text, text)
to authenticated;
