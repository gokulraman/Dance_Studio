# DLegacy — exact rebuild guide

## 0. Rules for the AI doing this rebuild

1. Recreate every file in **§9** exactly: the file content is the text between its opening and closing fence lines, saved as UTF-8 with LF line endings. Do not rename, reformat, refactor, "improve", add or remove anything.
2. Run the commands in **§4** exactly, in order, from the folder stated. After each step, compare against the **Expect** line; if anything differs, stop and report — do not improvise a fix.
3. Add no dependencies, files, screens or features that are not in this document.
4. Never put the Supabase **secret** / `service_role` key or the database password in the app or the repo.

## 1. What this is

DLegacy: dance-studio management app for one owner / one studio, India only (timezone Asia/Kolkata, money in **whole rupees**). Two parts:

- `supabase/` — PostgreSQL schema (tables, row-level security, triggers, write RPCs; all money rules enforced in the database) + a local test suite (PGlite).
- Repository root — Expo SDK 57 / React Native 0.86 app (TypeScript, Expo Router). Runs on iOS/Android (Expo Go) and web from one codebase. Talks directly to Supabase.

## 2. Prerequisites

- Node **24.x** (built with v24.15.0) and npm.
- A Supabase project. The existing one is **`d-legacy-dev`** (org "D'Legacy", Free plan, Postgres 17). It already has the schema applied, the real studio **D'Legacy** (`studios.id = 3`), a **TEST** studio and its own test login.
- Optional: Expo Go on the phone (phone and computer on the same network).

## 3. Final repo layout

```
dLegacy/
├─ .gitignore
├─ .env.example  .env.local (you create; never committed)
├─ app.json  eslint.config.js  package.json  tsconfig.json
├─ src/
│  ├─ app/_layout.tsx  app/sign-in.tsx
│  ├─ app/(app)/_layout.tsx
│  ├─ app/(app)/(tabs)/_layout.tsx  index.tsx  students.tsx  batches.tsx  memberships.tsx
│  ├─ app/(app)/batch/[id].tsx
│  ├─ app/(app)/student/new.tsx  student/[id].tsx
│  ├─ app/(app)/enroll/[studentId].tsx
│  ├─ components/ui.tsx  components/student-form.tsx
│  └─ lib/device-storage.ts  device-storage.native.ts  format.ts  session.tsx  studio.tsx  supabase.ts  theme.tsx  use-load.ts
├─ supabase/
│  ├─ migrations/20261001000000_initial_schema.sql
│  ├─ dev/reset_schema.sql            # DEV ONLY – never run against a project with real data
│  └─ tests/
│     ├─ package.json
│     ├─ lib/supabase-standin.mjs
│     ├─ schema.test.mjs
│     ├─ smoke.local.mjs
│     ├─ mutation.test.mjs
│     └─ smoke_test.sql
└─ .gitignore
```

## 4. Build steps

### 4.1 Root
Create folder `dLegacy` and the root `.gitignore` from §9.

### 4.2 Database package and tests
1. Create every `supabase/...` file from §9.
2. From `dLegacy/supabase/tests`:
   ```
   npm install
   npm test
   npm run test:mutation
   ```
   **Expect:** `PASSED: 172`, `ALL CHECKS PASSED`, `ALL SMOKE TESTS PASSED - nothing was saved`, then `MUTANTS CAUGHT: 11/11`.

### 4.3 App
1. From `dLegacy`:
   ```
   npx create-expo-app@5.0.0 . --template default@sdk-57
   ```
2. **Delete the whole `src` folder** (template demo screens).
3. Overwrite/create these from §9: `package.json`, `app.json`, `tsconfig.json`, `.gitignore`, `eslint.config.js`, `.env.example`, and every `src/...` file. Leave all other template files (assets, `scripts/`, `README.md`, `AGENTS.md`, `.vscode/`) as generated.
4. From `dLegacy`:
   ```
   npm install
   npm ls --depth=0
   ```
   **Expect:** every version equals §5. For any mismatch run `npm install <name>@<exact version from §5>`.
5. Create `.env.local` in `dLegacy` (never commit it):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   Values: Supabase dashboard → **Connect** → Mobile Frameworks → Expo React Native (or Project Settings → API Keys). Use the **publishable** key only.
6. From `dLegacy`, start once so Expo generates route types (`.expo/types`), then stop it (`Ctrl+C`):
   ```
   npx expo start --web
   ```
7. Verify, from `dLegacy`:
   ```
   npx tsc --noEmit
   npx expo lint
   npx expo-doctor
   ```
   **Expect:** tsc prints nothing (exit 0); lint prints no problems; `21/21 checks passed. No issues detected!`

### 4.4 Run
Always run Expo commands **from the repository root** (from anywhere else, npx offers to install `expo` — answer `n`).
- Browser: `npx expo start --web` → http://localhost:8081. Browser tab title must read **DLegacy**.
- Phone: `npx expo start`, scan the QR with Expo Go. If the phone times out, the computer's firewall is blocking it (set the Wi-Fi network to Private / allow Node).

## 5. Exact versions (direct dependencies)

| Project root | version | Project root | version |
|---|---|---|---|
| expo | 57.0.26 | expo-router | 57.0.24 |
| react | 19.2.3 | react-dom | 19.2.3 |
| react-native | 0.86.3 | react-native-web | 0.21.3 |
| @supabase/supabase-js | 2.117.2 | expo-sqlite | 57.0.3 |
| @expo/vector-icons | 15.1.1 | @expo/ui | 57.0.21 |
| expo-constants | 57.0.20 | expo-device | 57.0.2 |
| expo-font | 57.0.4 | expo-glass-effect | 57.0.4 |
| expo-image | 57.0.5 | expo-linking | 57.0.11 |
| expo-splash-screen | 57.0.9 | expo-status-bar | 57.0.1 |
| expo-symbols | 57.0.3 | expo-system-ui | 57.0.4 |
| expo-web-browser | 57.0.3 | react-native-gesture-handler | 2.32.0 |
| react-native-reanimated | 4.5.1 | react-native-safe-area-context | 5.7.0 |
| react-native-screens | 4.26.2 | react-native-worklets | 0.10.1 |
| typescript | 6.0.3 | @types/react | 19.2.18 |
| eslint | 9.39.5 | eslint-config-expo | 57.0.2 |

`supabase/tests`: `@electric-sql/pglite` **0.5.8** (pinned exactly).

## 6. Supabase

**A. Re-using the existing project `d-legacy-dev` (normal case):** do nothing to the database. The schema, real studio and test studio already exist. Only create `.env.local` (§4.3 step 5). **Never** re-run the migration or `reset_schema.sql` there.

**B. Only for a brand-new empty project** (dashboard → SQL Editor; the CLI is not used):
1. Run the full contents of `supabase/migrations/20261001000000_initial_schema.sql` once.
2. Authentication → Users → **Add user** (owner email + password). Copy its **User UID**.
3. Run once:
   ```sql
   select private.admin_create_studio('D''Legacy', '<owner-user-uid>')
   where not exists (select 1 from public.studios);
   ```
   Check (expect 1 row, role `owner`, 4 durations):
   ```sql
   select s.id, s.name, s.timezone, u.email, m.role,
          (select count(*) from public.durations d where d.studio_id = s.id) as durations
   from public.studios s
   join public.studio_members m on m.studio_id = s.id
   join auth.users u on u.id = m.user_id;
   ```
4. Test studio: add a second user, then `select private.admin_create_studio('D''Legacy TEST', '<test-user-uid>');`. Do all testing signed in as the test user (payments and memberships can never be deleted).
5. Optional smoke test: paste `supabase/tests/smoke_test.sql`, replace `00000000-0000-0000-0000-000000000000` with a real User UID, run. **Expect:** `ALL SMOKE TESTS PASSED - nothing was saved`.
6. Authentication settings: turn **off** "Allow new users to sign up"; minimum password length 12 with all character types.
7. Security Advisor — expected and accepted: 8 warnings "authenticated SECURITY DEFINER function executable" (the 8 write RPCs, each checks studio membership) and "Leaked password protection" (Pro plan only).

## 7. Behaviour the finished app must show (acceptance checks)

- **Sign in** (email + password; no sign-up screen by design). Signed-out users only see sign-in. A login not linked to a studio sees "This login is not linked to a studio yet." + Sign out.
- **Header & tab bar** black with gold in both themes. Tabs: Today, Students, Batches, Memberships. "Sign out" top-right.
- **Today:** "Needs attention" (expiring ≤7 days, expired last 7 days, awaiting activation, total balance due), today's classes with attendance badge, **Appearance: Auto / Light / Dark** (saved on device under `dlegacy.theme`; Auto follows the phone).
- **Students:** search (name, number, phone); card shows `#number name`, status badge, phone, end date, due; **pencil** opens Edit student; tapping the card does nothing; centred bottom **+** opens New student.
- **New student:** name, DOB `YYYY-MM-DD` (not future), student phone and/or guardian name+phone (10 digits → `+91…`), email. Shared phone → warning, second tap "Save anyway". Then goes to Enrol.
- **Enrol:** pick batch (only batches with prices) → duration (shows price) → discount → paid now (defaults to amount due) → method (UPI, Cash, Bank transfer, Card, Other) → reference. Full payment: start date required (default today). Part payment: "Start now" or "Start when fully paid". Calls RPC `create_membership`.
- **Edit student:** edit details; per membership: batch (read-only — batches are never switched mid-membership), dates, status, fee, due; **Record payment** (amount ≤ due; on an awaiting membership: part payment → Start now / Wait until fully paid; full payment → start date required; RPC `record_payment`, one transaction); **Change start date** (reason required; RPC `correct_membership_start_date`) or **Set start date** for awaiting (RPC `activate_membership`); **Add to another batch** → Enrol.
- **Batches:** card shows name, style · level, enrolled of capacity, Inactive/Full badge; **pencil** opens editor; **+** creates. Editor: name (unique, case-insensitive), style, level, capacity, Active/Inactive (edit only), weekly schedule (day chips, `HH:MM` 24h, end > start), price per duration. Save is blocked unless ≥1 schedule day **and** ≥1 price.
- **Memberships:** filters All / Expiring / Expired / Awaiting / Balance due; card shows student, status, dates, days left, fee, due.
- **Theme palette:** black `#000000`, silver `#E6E6E8` / `#A8A9AD`, steel `#4A4B4F`, gold `#D4A62A` / `#A67C1A` / `#F2CE5C`, white; red only for error text.

## 8. Product rules already decided (for future work — do not change)

Money = whole rupees. Durations in days (30/90/180/365 + custom); end = start + days − 1. Each membership stores its own price/discount (never changes after creation). Part payment: owner activates now or leaves "awaiting"; clearing the balance on an awaiting membership requires a start date and activates it. Overlapping activated memberships for the same batch are blocked. Cancelling needs a reason and voids its payments; payments are void-only, never edited or deleted; no refunds in V1. Statuses: expiring soon ≤7 days, recently expired 1–7 days, inactive >7 days. Student number per studio, gapless, starts at 1, never changes. Either student or guardian phone required; duplicate phone = warning only. DOB required. Trials are free and appear in the batch attendance roster. Reminders (later) = SMS from the owner's phone (no WhatsApp, no SMS provider). Email+password login only; no offline mode; no receipts in V1.

**Not built yet:** attendance marking screen (DB RPCs `attendance_roster` / `mark_attendance` exist), leads/trials screens, reminders, combos UI, cancel membership / void payment UI, staff roles.

## 9. Files (verbatim)

Each file: a heading with its path relative to `dLegacy/`, then its exact content.

### `.gitignore`

````
node_modules/
.env*
!.env.example
supabase/Database config.txt
````

### `supabase/migrations/20261001000000_initial_schema.sql`

````sql
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
````

### `supabase/dev/reset_schema.sql`

````sql
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
````

### `supabase/tests/package.json`

````json
{
  "name": "dlegacy-db-tests",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node schema.test.mjs && node smoke.local.mjs",
    "test:mutation": "node mutation.test.mjs",
    "test:all": "npm test && npm run test:mutation"
  },
  "devDependencies": {
    "@electric-sql/pglite": "0.5.8"
  }
}
````

### `supabase/tests/lib/supabase-standin.mjs`

````js
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations/', import.meta.url));

// The parts of Supabase the migrations rely on: auth schema, auth.uid(), API roles and their default grants.
const SUPABASE_STANDIN = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export async function createDatabase(migrationsDir = MIGRATIONS_DIR) {
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) throw new Error(`No .sql migrations found in ${migrationsDir}`);
  const db = new PGlite();
  await db.exec(SUPABASE_STANDIN);
  for (const f of files) await db.exec(readFileSync(join(migrationsDir, f), 'utf8'));
  return db;
}
````

### `supabase/tests/schema.test.mjs`

````js
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
````

### `supabase/tests/smoke.local.mjs`

````js
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
````

### `supabase/tests/mutation.test.mjs`

````js
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
````

### `supabase/tests/smoke_test.sql`

````sql
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
````

### `package.json`

````json
{
  "name": "mobile",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "dependencies": {
    "@expo/ui": "~57.0.21",
    "@expo/vector-icons": "^15.0.2",
    "@supabase/supabase-js": "^2.117.2",
    "expo": "~57.0.26",
    "expo-constants": "~57.0.20",
    "expo-device": "~57.0.2",
    "expo-font": "~57.0.4",
    "expo-glass-effect": "~57.0.4",
    "expo-image": "~57.0.5",
    "expo-linking": "~57.0.11",
    "expo-router": "~57.0.24",
    "expo-splash-screen": "~57.0.9",
    "expo-sqlite": "~57.0.3",
    "expo-status-bar": "~57.0.1",
    "expo-symbols": "~57.0.3",
    "expo-system-ui": "~57.0.4",
    "expo-web-browser": "~57.0.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.86.3",
    "react-native-gesture-handler": "~2.32.0",
    "react-native-reanimated": "4.5.1",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "~4.26.0",
    "react-native-web": "~0.21.0",
    "react-native-worklets": "0.10.1"
  },
  "devDependencies": {
    "@types/react": "~19.2.2",
    "eslint": "^9.0.0",
    "eslint-config-expo": "~57.0.2",
    "typescript": "~6.0.3"
  },
  "scripts": {
    "start": "expo start",
    "reset-project": "node ./scripts/reset-project.js",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "expo lint"
  },
  "private": true
}
````

### `app.json`

````json
{
  "expo": {
    "name": "DLegacy",
    "slug": "mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "mobile",
    "userInterfaceStyle": "automatic",
    "ios": {
      "icon": "./assets/expo.icon"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#000000",
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 76
        }
      ],
      "expo-sqlite"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
}
````

### `tsconfig.json`

````json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": [
        "./src/*"
      ],
      "@/assets/*": [
        "./assets/*"
      ]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
````

### `.gitignore`

````
# Learn more https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files

# dependencies
node_modules/

# Expo
.expo/
dist/
web-build/
expo-env.d.ts

# Native
.kotlin/
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# local env files
.env*.local

# typescript
*.tsbuildinfo

example

# generated native folders
/ios
/android
````

### `eslint.config.js`

````js
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  }
]);
````

### `.env.example`

````
# Copy to .env.local and fill in from Supabase: Project Settings > API Keys (publishable key) and the project URL.
# Both are public by design; row-level security protects the data. Never put the secret key or DB password here.
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
````

### `src/app/_layout.tsx`

````tsx
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/lib/session';
import { AppThemeProvider } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <SessionProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SessionProvider>
    </AppThemeProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useSession();
  if (isLoading) return null;
  SplashScreen.hide();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
````

### `src/app/sign-in.tsx`

````tsx
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, Field } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { makeStyles } from '@/lib/theme';

export default function SignIn() {
  const styles = useStyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    // On success the session listener swaps this screen for the app.
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.brand}>D&apos;LEGACY</Text>
          <View style={styles.rule} />
          <Text style={styles.subtitle}>Studio manager</Text>
        </View>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={signIn}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <Button label="Sign in" onPress={signIn} busy={busy} disabled={!email.trim() || !password} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.background },
  body: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  header: { alignItems: 'center', marginBottom: 16, gap: 8 },
  brand: { fontSize: 32, fontWeight: '700', letterSpacing: 4, color: t.accent },
  rule: { width: 64, height: 2, backgroundColor: t.chromeAccent },
  subtitle: { fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', color: t.muted },
}));
````

### `src/app/(app)/_layout.tsx`

````tsx
import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Spinner } from '@/components/ui';
import { StudioProvider, useStudio } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { makeStyles, useAppTheme } from '@/lib/theme';

export default function AppLayout() {
  return (
    <StudioProvider>
      <StudioGate />
    </StudioProvider>
  );
}

function StudioGate() {
  const { studio, error, isLoading } = useStudio();
  const styles = useStyles();
  const theme = useAppTheme();

  if (isLoading) return <View style={styles.center}><Spinner /></View>;
  if (!studio) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{error ?? 'This login is not linked to a studio yet.'}</Text>
        <Button label="Sign out" variant="plain" onPress={() => supabase.auth.signOut()} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.chrome },
        headerTintColor: theme.chromeText,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="batch/[id]" options={{ title: 'Batch' }} />
      <Stack.Screen name="student/new" options={{ title: 'New student' }} />
      <Stack.Screen name="student/[id]" options={{ title: 'Edit student' }} />
      <Stack.Screen name="enroll/[studentId]" options={{ title: 'Enrol' }} />
    </Stack>
  );
}

const useStyles = makeStyles((t) => ({
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: t.background },
  message: { textAlign: 'center', fontSize: 16, color: t.text },
}));
````

### `src/app/(app)/(tabs)/_layout.tsx`

````tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, Text, type ColorValue } from 'react-native';

import { useStudio } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

function SignOutButton() {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="button" hitSlop={8} onPress={() => supabase.auth.signOut()} style={{ marginRight: 16 }}>
      <Text style={{ color: theme.chromeAccent, fontSize: 15 }}>Sign out</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { studio } = useStudio();
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerRight: SignOutButton,
        headerStyle: { backgroundColor: theme.chrome },
        headerTintColor: theme.chromeText,
        tabBarStyle: { backgroundColor: theme.chrome, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.chromeAccent,
        tabBarInactiveTintColor: theme.chromeMuted,
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', headerTitle: studio?.name, tabBarIcon: icon('today-outline') }} />
      <Tabs.Screen name="students" options={{ title: 'Students', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="batches" options={{ title: 'Batches', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="memberships" options={{ title: 'Memberships', tabBarIcon: icon('card-outline') }} />
    </Tabs>
  );
}
````

### `src/app/(app)/(tabs)/index.tsx`

````tsx
import { useMemo } from 'react';
import { FlatList, View } from 'react-native';

import { Badge, Card, Choices, Muted, Row, SectionHeader, StateMessage, Title } from '@/components/ui';
import { clockTime, rupees } from '@/lib/format';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useThemeChoice, type ThemeChoice } from '@/lib/theme';
import { useLoad } from '@/lib/use-load';

type ClassRow = { batch_id: number; batch_name: string; start_time: string; end_time: string; attendance_taken: boolean };
type MembershipRow = { status: string; outstanding_rupees: number };

const fetchClasses = (studioId: number) =>
  supabase
    .from('todays_classes')
    .select('batch_id, batch_name, start_time, end_time, attendance_taken')
    .eq('studio_id', studioId)
    .order('start_time')
    .then((r) => ({ data: r.data as ClassRow[] | null, error: r.error }));

const fetchMemberships = (studioId: number) =>
  supabase
    .from('membership_overview')
    .select('status, outstanding_rupees')
    .eq('studio_id', studioId)
    .neq('status', 'cancelled')
    .then((r) => ({ data: r.data as MembershipRow[] | null, error: r.error }));

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function Today() {
  const studioId = useStudioId();
  const classes = useLoad(fetchClasses, studioId);
  const memberships = useLoad(fetchMemberships, studioId);
  const [themeChoice, setThemeChoice] = useThemeChoice();

  const attention = useMemo(() => {
    const rows = memberships.data ?? [];
    const count = (...statuses: string[]) => rows.filter((m) => statuses.includes(m.status)).length;
    return {
      expiring: count('expiring_soon', 'expires_today'),
      recentlyExpired: count('recently_expired'),
      awaiting: count('awaiting_activation'),
      outstanding: rows.reduce((sum, m) => sum + m.outstanding_rupees, 0),
    };
  }, [memberships.data]);

  return (
    <FlatList
      data={classes.data ?? []}
      keyExtractor={(c) => String(c.batch_id)}
      refreshing={classes.isLoading}
      onRefresh={() => {
        void classes.reload();
        void memberships.reload();
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={
        <View>
          <SectionHeader>Needs attention</SectionHeader>
          <Card>
            <Row><Muted>Expiring in the next 7 days</Muted><Title>{attention.expiring}</Title></Row>
            <Row><Muted>Expired in the last 7 days</Muted><Title>{attention.recentlyExpired}</Title></Row>
            <Row><Muted>Awaiting activation</Muted><Title>{attention.awaiting}</Title></Row>
            <Row><Muted>Total balance due</Muted><Title>{rupees(attention.outstanding)}</Title></Row>
          </Card>
          <SectionHeader>Today&apos;s classes</SectionHeader>
        </View>
      }
      ListEmptyComponent={<StateMessage isLoading={classes.isLoading} error={classes.error} empty="No classes scheduled today." />}
      ListFooterComponent={
        <View>
          <SectionHeader>Appearance</SectionHeader>
          <View style={{ paddingHorizontal: 16 }}>
            <Choices options={THEME_OPTIONS} value={themeChoice} onChange={setThemeChoice} />
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <Row>
            <Title>{item.batch_name}</Title>
            <Badge label={item.attendance_taken ? 'Attendance taken' : 'Not taken'} tone={item.attendance_taken ? 'good' : 'warn'} />
          </Row>
          <Muted>{clockTime(item.start_time)} – {clockTime(item.end_time)}</Muted>
        </Card>
      )}
    />
  );
}
````

### `src/app/(app)/(tabs)/students.tsx`

````tsx
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Badge, Card, Fab, FAB_CLEARANCE, Field, IconButton, Muted, Row, StateMessage, Title } from '@/components/ui';
import { rupees, shortDate, statusInfo } from '@/lib/format';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';

type StudentRow = {
  id: number;
  student_number: number;
  full_name: string;
  phone: string | null;
  guardian_phone: string | null;
  status: string;
  outstanding_rupees: number;
  latest_end_date: string | null;
};

const fetchStudents = (studioId: number) =>
  supabase
    .from('student_overview')
    .select('id, student_number, full_name, phone, guardian_phone, status, outstanding_rupees, latest_end_date')
    .eq('studio_id', studioId)
    .neq('status', 'archived')
    .order('student_number')
    .then((r) => ({ data: r.data as StudentRow[] | null, error: r.error }));

export default function Students() {
  const studioId = useStudioId();
  const { data, error, isLoading, reload } = useLoad(fetchStudents, studioId);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        String(s.student_number) === q.replace(/^#/, '') ||
        s.phone?.includes(q) ||
        s.guardian_phone?.includes(q),
    );
  }, [data, query]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={visible}
        keyExtractor={(s) => String(s.id)}
        refreshing={isLoading}
        onRefresh={reload}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <Field label="Search" placeholder="Name, number or phone" value={query} onChangeText={setQuery} autoCorrect={false} />
          </View>
        }
        ListEmptyComponent={
          <StateMessage isLoading={isLoading} error={error} empty={query ? 'No students match.' : 'No students yet. Tap + to add one.'} />
        }
        renderItem={({ item }) => {
          const status = statusInfo(item.status);
          return (
            <Card>
              <Row>
                <Title>#{item.student_number} {item.full_name}</Title>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Badge label={status.label} tone={status.tone} />
                  <IconButton
                    icon="create-outline"
                    label={`Edit ${item.full_name}`}
                    onPress={() => router.push({ pathname: '/student/[id]', params: { id: String(item.id) } })}
                  />
                </View>
              </Row>
              <Muted>{item.phone ?? `Guardian ${item.guardian_phone}`}</Muted>
              <Row>
                <Muted>Ends {shortDate(item.latest_end_date)}</Muted>
                {item.outstanding_rupees > 0 && <Muted>Due {rupees(item.outstanding_rupees)}</Muted>}
              </Row>
            </Card>
          );
        }}
      />
      <Fab label="Add student" onPress={() => router.push('/student/new')} />
    </View>
  );
}
````

### `src/app/(app)/(tabs)/batches.tsx`

````tsx
import { router } from 'expo-router';
import { FlatList, View } from 'react-native';

import { Badge, Card, Fab, FAB_CLEARANCE, IconButton, Muted, Row, StateMessage, Title } from '@/components/ui';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';

type BatchRow = {
  id: number;
  name: string;
  dance_style: string | null;
  level: string | null;
  capacity: number | null;
  enrolled_count: number;
  is_full: boolean;
  is_active: boolean;
};

const fetchBatches = (studioId: number) =>
  supabase
    .from('batch_overview')
    .select('id, name, dance_style, level, capacity, enrolled_count, is_full, is_active')
    .eq('studio_id', studioId)
    .order('is_active', { ascending: false })
    .order('name')
    .then((r) => ({ data: r.data as BatchRow[] | null, error: r.error }));

export default function Batches() {
  const studioId = useStudioId();
  const { data, error, isLoading, reload } = useLoad(fetchBatches, studioId);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(b) => String(b.id)}
        refreshing={isLoading}
        onRefresh={reload}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: FAB_CLEARANCE }}
        ListEmptyComponent={<StateMessage isLoading={isLoading} error={error} empty="No batches yet. Tap + to add one." />}
        renderItem={({ item }) => (
          <Card>
            <Row>
              <Title>{item.name}</Title>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {!item.is_active ? (
                  <Badge label="Inactive" tone="neutral" />
                ) : item.is_full ? (
                  <Badge label="Full" tone="warn" />
                ) : null}
                <IconButton
                  icon="create-outline"
                  label={`Edit ${item.name}`}
                  onPress={() => router.push({ pathname: '/batch/[id]', params: { id: String(item.id) } })}
                />
              </View>
            </Row>
            {(item.dance_style || item.level) && <Muted>{[item.dance_style, item.level].filter(Boolean).join(' · ')}</Muted>}
            <Muted>
              {item.enrolled_count} enrolled{item.capacity ? ` of ${item.capacity}` : ''}
            </Muted>
          </Card>
        )}
      />
      <Fab label="New batch" onPress={() => router.push({ pathname: '/batch/[id]', params: { id: 'new' } })} />
    </View>
  );
}
````

### `src/app/(app)/(tabs)/memberships.tsx`

````tsx
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Badge, Card, Choices, Muted, Row, StateMessage, Title } from '@/components/ui';
import { rupees, shortDate, statusInfo } from '@/lib/format';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';

type MembershipRow = {
  id: number;
  student_id: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  days_left: number | null;
  amount_due_rupees: number;
  outstanding_rupees: number;
};
type StudentName = { id: number; student_number: number; full_name: string };
type Item = MembershipRow & { student: StudentName | undefined };

async function fetchMemberships(studioId: number) {
  const [m, s] = await Promise.all([
    supabase
      .from('membership_overview')
      .select('id, student_id, status, start_date, end_date, days_left, amount_due_rupees, outstanding_rupees')
      .eq('studio_id', studioId)
      .neq('status', 'cancelled')
      .order('end_date', { ascending: true, nullsFirst: true }),
    supabase.from('students').select('id, student_number, full_name').eq('studio_id', studioId),
  ]);
  const error = m.error ?? s.error;
  if (error) return { data: null, error };
  const names = new Map((s.data as StudentName[]).map((x) => [x.id, x]));
  return { data: (m.data as MembershipRow[]).map((x): Item => ({ ...x, student: names.get(x.student_id) })), error: null };
}

const FILTERS: { label: string; match: (m: Item) => boolean }[] = [
  { label: 'All', match: () => true },
  { label: 'Expiring', match: (m) => m.status === 'expiring_soon' || m.status === 'expires_today' },
  { label: 'Expired', match: (m) => m.status === 'recently_expired' || m.status === 'expired' },
  { label: 'Awaiting', match: (m) => m.status === 'awaiting_activation' },
  { label: 'Balance due', match: (m) => m.outstanding_rupees > 0 },
];

export default function Memberships() {
  const studioId = useStudioId();
  const { data, error, isLoading, reload } = useLoad(fetchMemberships, studioId);
  const [filter, setFilter] = useState(0);

  const visible = useMemo(() => (data ?? []).filter(FILTERS[filter].match), [data, filter]);

  return (
    <FlatList
      data={visible}
      keyExtractor={(m) => String(m.id)}
      refreshing={isLoading}
      onRefresh={reload}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={
        <View style={{ padding: 16 }}>
          <Choices options={FILTERS.map((f, i) => ({ value: i, label: f.label }))} value={filter} onChange={setFilter} />
        </View>
      }
      ListEmptyComponent={<StateMessage isLoading={isLoading} error={error} empty="No memberships here." />}
      renderItem={({ item }) => {
        const status = statusInfo(item.status);
        return (
          <Card>
            <Row>
              <Title>
                {item.student ? `#${item.student.student_number} ${item.student.full_name}` : `Student ${item.student_id}`}
              </Title>
              <Badge label={status.label} tone={status.tone} />
            </Row>
            <Muted>
              {item.start_date ? `${shortDate(item.start_date)} – ${shortDate(item.end_date)}` : 'Start date not set'}
              {item.days_left !== null ? ` · ${item.days_left} days left` : ''}
            </Muted>
            <Row>
              <Muted>Fee {rupees(item.amount_due_rupees)}</Muted>
              {item.outstanding_rupees > 0 && <Muted>Due {rupees(item.outstanding_rupees)}</Muted>}
            </Row>
          </Card>
        );
      }}
    />
  );
}
````

### `src/app/(app)/batch/[id].tsx`

````tsx
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Choices, ErrorText, Field, Muted, SectionHeader, Spinner } from '@/components/ui';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { makeStyles } from '@/lib/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const WHOLE = /^\d+$/;

type Day = { on: boolean; start: string; end: string };
type Duration = { id: number; days: number; label: string };
type DbError = { message: string; code?: string };

const emptyWeek = (): Day[] => DAYS.map(() => ({ on: false, start: '18:00', end: '19:00' }));

function friendly(e: DbError) {
  if (e.code === '23505' && e.message.includes('batches_name_uq')) return 'A batch with this name already exists.';
  return e.message;
}

export default function BatchEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studioId = useStudioId();
  const styles = useStyles();

  // Becomes the real id after the first successful insert, so a retry never creates a duplicate.
  const [batchId, setBatchId] = useState<number | null>(id === 'new' ? null : Number(id));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [style, setStyle] = useState('');
  const [level, setLevel] = useState('');
  const [capacity, setCapacity] = useState('');
  const [active, setActive] = useState(true);
  const [week, setWeek] = useState<Day[]>(emptyWeek);
  const [durations, setDurations] = useState<Duration[]>([]);
  const [prices, setPrices] = useState<Record<number, string>>({});

  useEffect(() => {
    const existing = id === 'new' ? null : Number(id);
    (async () => {
      const d = await supabase.from('durations').select('id, days, label').eq('studio_id', studioId).eq('is_active', true).order('days');
      if (d.error) return setError(d.error.message);
      setDurations(d.data as Duration[]);
      if (existing === null) return;

      const [b, s, p] = await Promise.all([
        supabase.from('batches').select('name, dance_style, level, capacity, is_active').eq('id', existing).single(),
        supabase.from('batch_schedules').select('day_of_week, start_time, end_time').eq('batch_id', existing),
        supabase.from('batch_prices').select('duration_id, price_rupees').eq('batch_id', existing),
      ]);
      const failed = b.error ?? s.error ?? p.error;
      if (failed) return setError(failed.message);

      const batch = b.data as { name: string; dance_style: string | null; level: string | null; capacity: number | null; is_active: boolean };
      setName(batch.name);
      setStyle(batch.dance_style ?? '');
      setLevel(batch.level ?? '');
      setCapacity(batch.capacity ? String(batch.capacity) : '');
      setActive(batch.is_active);
      const w = emptyWeek();
      for (const row of s.data as { day_of_week: number; start_time: string; end_time: string }[]) {
        w[row.day_of_week - 1] = { on: true, start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) };
      }
      setWeek(w);
      setPrices(Object.fromEntries((p.data as { duration_id: number; price_rupees: number }[]).map((x) => [x.duration_id, String(x.price_rupees)])));
    })().finally(() => setLoading(false));
  }, [id, studioId]);

  function setDay(i: number, patch: Partial<Day>) {
    setWeek((w) => w.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  function validate(): string | null {
    if (!name.trim()) return 'Enter a batch name.';
    if (capacity && (!WHOLE.test(capacity) || Number(capacity) < 1)) return 'Capacity must be a whole number above 0, or left empty.';
    for (const [i, d] of week.entries()) {
      if (!d.on) continue;
      if (!TIME.test(d.start) || !TIME.test(d.end)) return `${DAYS[i]}: use 24-hour times like 18:30.`;
      if (d.end <= d.start) return `${DAYS[i]}: end time must be after start time.`;
    }
    if (!week.some((d) => d.on)) return 'Pick at least one class day in the weekly schedule.';
    for (const d of durations) {
      const v = prices[d.id]?.trim();
      if (v && (!WHOLE.test(v) || Number(v) < 1)) return `${d.label}: price must be whole rupees above 0, or left empty.`;
    }
    if (!durations.some((d) => prices[d.id]?.trim())) return 'Set a price for at least one duration.';
    return null;
  }

  async function save() {
    const invalid = validate();
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    try {
      const fields = {
        name: name.trim(),
        dance_style: style.trim() || null,
        level: level.trim() || null,
        capacity: capacity ? Number(capacity) : null,
        is_active: active,
      };
      let bid = batchId;
      if (bid === null) {
        const { data, error } = await supabase.from('batches').insert({ studio_id: studioId, ...fields }).select('id').single();
        if (error) throw error;
        bid = data.id as number;
        setBatchId(bid);
      } else {
        const { error } = await supabase.from('batches').update(fields).eq('id', bid);
        if (error) throw error;
      }

      const offDays = week.flatMap((d, i) => (d.on ? [] : [i + 1]));
      const onDays = week.flatMap((d, i) =>
        d.on ? [{ studio_id: studioId, batch_id: bid, day_of_week: i + 1, start_time: d.start, end_time: d.end }] : [],
      );
      if (offDays.length) {
        const { error } = await supabase.from('batch_schedules').delete().eq('batch_id', bid).in('day_of_week', offDays);
        if (error) throw error;
      }
      if (onDays.length) {
        const { error } = await supabase.from('batch_schedules').upsert(onDays, { onConflict: 'batch_id,day_of_week' });
        if (error) throw error;
      }

      const unpriced = durations.filter((d) => !prices[d.id]?.trim()).map((d) => d.id);
      const priced = durations
        .filter((d) => prices[d.id]?.trim())
        .map((d) => ({ studio_id: studioId, batch_id: bid, duration_id: d.id, price_rupees: Number(prices[d.id]) }));
      if (unpriced.length) {
        const { error } = await supabase.from('batch_prices').delete().eq('batch_id', bid).in('duration_id', unpriced);
        if (error) throw error;
      }
      if (priced.length) {
        const { error } = await supabase.from('batch_prices').upsert(priced, { onConflict: 'batch_id,duration_id' });
        if (error) throw error;
      }

      router.back();
    } catch (e) {
      setError(friendly(e as DbError));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: batchId === null ? 'New batch' : 'Edit batch' }} />

      <Field label="Batch name" value={name} onChangeText={setName} placeholder="e.g. Bollywood Beginners" />
      <Field label="Dance style" value={style} onChangeText={setStyle} placeholder="Optional" />
      <Field label="Level" value={level} onChangeText={setLevel} placeholder="Optional" />
      <Field label="Capacity" value={capacity} onChangeText={setCapacity} placeholder="Optional" keyboardType="number-pad" />
      {batchId !== null && (
        <Choices
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          value={active ? 'active' : 'inactive'}
          onChange={(v) => setActive(v === 'active')}
        />
      )}

      <SectionHeader>Weekly schedule</SectionHeader>
      <Muted>Pick at least one day.</Muted>
      <View style={styles.days}>
        {DAYS.map((label, i) => (
          <Pressable key={label} onPress={() => setDay(i, { on: !week[i].on })} style={[styles.chip, week[i].on && styles.chipOn]}>
            <Text style={[styles.chipText, week[i].on && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {week.map((d, i) =>
        d.on ? (
          <View key={DAYS[i]} style={styles.timeRow}>
            <Text style={styles.dayLabel}>{DAYS[i]}</Text>
            <View style={styles.flex}>
              <Field label="Start" value={d.start} onChangeText={(v) => setDay(i, { start: v })} placeholder="18:00" />
            </View>
            <View style={styles.flex}>
              <Field label="End" value={d.end} onChangeText={(v) => setDay(i, { end: v })} placeholder="19:00" />
            </View>
          </View>
        ) : null,
      )}

      <SectionHeader>Prices (₹)</SectionHeader>
      <Muted>Set at least one price. Leave a duration empty if this batch isn&apos;t sold for that length.</Muted>
      {durations.map((d) => (
        <Field
          key={d.id}
          label={d.label}
          value={prices[d.id] ?? ''}
          onChangeText={(v) => setPrices((p) => ({ ...p, [d.id]: v }))}
          placeholder="Not offered"
          keyboardType="number-pad"
        />
      ))}

      {error && <ErrorText>{error}</ErrorText>}
      <Button label="Save" onPress={save} busy={busy} />
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  chipOn: { backgroundColor: t.primary, borderColor: t.primary },
  chipText: { color: t.text, fontSize: 14 },
  chipTextOn: { color: t.onPrimary, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  dayLabel: { width: 40, fontSize: 15, fontWeight: '600', color: t.text, paddingBottom: 12 },
  flex: { flex: 1 },
}));
````

### `src/app/(app)/student/new.tsx`

````tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import {
  EMPTY_STUDENT,
  findPhoneMatches,
  SharedPhoneNotice,
  StudentFields,
  validateStudent,
  type PhoneMatch,
  type StudentValues,
} from '@/components/student-form';
import { Button, ErrorText } from '@/components/ui';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';

export default function NewStudent() {
  const studioId = useStudioId();
  const [values, setValues] = useState<StudentValues>(EMPTY_STUDENT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharedWith, setSharedWith] = useState<PhoneMatch[] | null>(null);

  async function save() {
    setError(null);
    const result = validateStudent(values);
    if ('error' in result) return setError(result.error);

    setBusy(true);
    try {
      if (sharedWith === null) {
        const { matches, error } = await findPhoneMatches(studioId, result.row, null);
        if (error) return setError(error);
        if (matches.length) return setSharedWith(matches);
      }

      const { data, error } = await supabase
        .from('students')
        .insert({ studio_id: studioId, ...result.row })
        .select('id')
        .single();
      if (error) return setError(error.message);
      router.replace({ pathname: '/enroll/[studentId]', params: { studentId: String(data.id) } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <StudentFields
        values={values}
        onChange={(patch) => {
          setValues((v) => ({ ...v, ...patch }));
          setSharedWith(null);
        }}
      />
      {sharedWith && <SharedPhoneNotice matches={sharedWith} />}
      {error && <ErrorText>{error}</ErrorText>}
      <Button label={sharedWith ? 'Save anyway' : 'Save and enrol'} onPress={save} busy={busy} />
    </ScrollView>
  );
}
````

### `src/app/(app)/student/[id].tsx`

````tsx
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  findPhoneMatches,
  SharedPhoneNotice,
  StudentFields,
  toValues,
  validateStudent,
  type PhoneMatch,
  type StudentRow,
  type StudentValues,
} from '@/components/student-form';
import { Badge, Button, Card, Choices, ErrorText, Field, Muted, Row, SectionHeader, Spinner, Title } from '@/components/ui';
import { isValidIsoDate, PAYMENT_METHODS, rupees, shortDate, statusInfo, studioToday, WHOLE_NUMBER } from '@/lib/format';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';

type Membership = {
  id: number;
  status: string;
  lifecycle: 'pending_activation' | 'activated' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  amount_due_rupees: number;
  outstanding_rupees: number;
  batches: string[];
};

async function fetchMemberships(studentId: number) {
  const m = await supabase
    .from('membership_overview')
    .select('id, status, lifecycle, start_date, end_date, amount_due_rupees, outstanding_rupees')
    .eq('student_id', studentId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });
  if (m.error) return { data: null, error: m.error };
  const rows = m.data as Omit<Membership, 'batches'>[];
  const mb = await supabase
    .from('membership_batches')
    .select('membership_id, batch_id')
    .in('membership_id', rows.map((r) => r.id));
  if (mb.error) return { data: null, error: mb.error };
  const links = mb.data as { membership_id: number; batch_id: number }[];
  const b = await supabase.from('batches').select('id, name').in('id', [...new Set(links.map((l) => l.batch_id))]);
  if (b.error) return { data: null, error: b.error };
  const names = new Map((b.data as { id: number; name: string }[]).map((x) => [x.id, x.name]));
  const data = rows.map((r) => ({
    ...r,
    batches: links.filter((l) => l.membership_id === r.id).map((l) => names.get(l.batch_id) ?? `Batch ${l.batch_id}`),
  }));
  return { data, error: null };
}

export default function EditStudent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = Number(id);
  const studioId = useStudioId();

  const [heading, setHeading] = useState('Edit student');
  const [values, setValues] = useState<StudentValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sharedWith, setSharedWith] = useState<PhoneMatch[] | null>(null);
  const memberships = useLoad(fetchMemberships, studentId);

  useEffect(() => {
    supabase
      .from('students')
      .select('student_number, full_name, date_of_birth, phone, guardian_name, guardian_phone, email')
      .eq('id', studentId)
      .single()
      .then(({ data, error }) => {
        if (error) return setLoadError(error.message);
        const row = data as StudentRow & { student_number: number };
        setHeading(`#${row.student_number} ${row.full_name}`);
        setValues(toValues(row));
      });
  }, [studentId]);

  async function saveDetails() {
    if (!values) return;
    setError(null);
    setSaved(false);
    const result = validateStudent(values);
    if ('error' in result) return setError(result.error);

    setBusy(true);
    try {
      if (sharedWith === null) {
        const { matches, error } = await findPhoneMatches(studioId, result.row, studentId);
        if (error) return setError(error);
        if (matches.length) return setSharedWith(matches);
      }
      const { error } = await supabase.from('students').update(result.row).eq('id', studentId);
      if (error) return setError(error.message);
      setSharedWith(null);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <ErrorText>{loadError}</ErrorText>;
  if (!values) return <Spinner />;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: heading }} />

      <StudentFields
        values={values}
        onChange={(patch) => {
          setValues((v) => (v ? { ...v, ...patch } : v));
          setSharedWith(null);
          setSaved(false);
        }}
      />
      {sharedWith && <SharedPhoneNotice matches={sharedWith} />}
      {error && <ErrorText>{error}</ErrorText>}
      {saved && <Muted>Details saved.</Muted>}
      <Button label={sharedWith ? 'Save anyway' : 'Save details'} onPress={saveDetails} busy={busy} />

      <SectionHeader>Memberships</SectionHeader>
      {memberships.error && <ErrorText>{memberships.error}</ErrorText>}
      {memberships.isLoading && !memberships.data && <Spinner />}
      {memberships.data?.length === 0 && <Muted>No memberships yet.</Muted>}
      <View style={{ marginHorizontal: -16 }}>
        {memberships.data?.map((m) => <MembershipCard key={m.id} membership={m} onChanged={memberships.reload} />)}
      </View>
      <Button
        label="Add to another batch"
        variant="plain"
        onPress={() => router.push({ pathname: '/enroll/[studentId]', params: { studentId: String(studentId) } })}
      />
    </ScrollView>
  );
}

function MembershipCard({ membership: m, onChanged }: { membership: Membership; onChanged: () => void }) {
  const [mode, setMode] = useState<'view' | 'start' | 'pay'>('view');
  const [startDate, setStartDate] = useState(m.start_date ?? studioToday());
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(String(m.outstanding_rupees));
  const [method, setMethod] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [startNow, setStartNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const status = statusInfo(m.status);
  const pending = m.lifecycle === 'pending_activation';

  const amountValue = WHOLE_NUMBER.test(amount.trim()) ? Number(amount.trim()) : null;
  const clearsBalance = amountValue === m.outstanding_rupees;
  // Paying off a waiting membership in full always starts it, so the owner sets the date now.
  const activateWithPayment = pending && (clearsBalance || startNow);

  function open(next: 'start' | 'pay') {
    setError(null);
    setStartDate(m.start_date ?? studioToday());
    setAmount(String(m.outstanding_rupees));
    setMode(next);
  }

  async function saveStartDate() {
    setError(null);
    if (!isValidIsoDate(startDate)) return setError('Enter the start date as YYYY-MM-DD.');
    if (!pending && !reason.trim()) return setError('Enter a reason for the change.');
    setBusy(true);
    const { error } = pending
      ? await supabase.rpc('activate_membership', { p_membership_id: m.id, p_start_date: startDate })
      : await supabase.rpc('correct_membership_start_date', {
          p_membership_id: m.id,
          p_start_date: startDate,
          p_reason: reason.trim(),
        });
    setBusy(false);
    if (error) return setError(error.message);
    setMode('view');
    setReason('');
    onChanged();
  }

  async function savePayment() {
    setError(null);
    if (amountValue === null || amountValue < 1) return setError('Enter an amount of at least ₹1.');
    if (amountValue > m.outstanding_rupees) return setError(`Amount cannot be more than the ${rupees(m.outstanding_rupees)} due.`);
    if (method === null) return setError('Choose how they paid.');
    if (activateWithPayment && !isValidIsoDate(startDate)) return setError('Enter the start date as YYYY-MM-DD.');
    setBusy(true);
    const { error } = await supabase.rpc('record_payment', {
      p_membership_id: m.id,
      p_amount_rupees: amountValue,
      p_method: method,
      p_reference: reference.trim() || null,
      p_activate_start_date: activateWithPayment ? startDate : null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setMode('view');
    setReference('');
    setMethod(null);
    setStartNow(false);
    onChanged();
  }

  return (
    <Card>
      <Row>
        <Title>{m.batches.join(' + ') || 'Batch'}</Title>
        <Badge label={status.label} tone={status.tone} />
      </Row>
      <Muted>{m.start_date ? `${shortDate(m.start_date)} – ${shortDate(m.end_date)}` : 'Start date not set'}</Muted>
      <Row>
        <Muted>Fee {rupees(m.amount_due_rupees)}</Muted>
        {m.outstanding_rupees > 0 && <Muted>Due {rupees(m.outstanding_rupees)}</Muted>}
      </Row>

      {mode === 'start' && (
        <View style={{ gap: 10, marginTop: 6 }}>
          <Field label={pending ? 'Start date' : 'New start date'} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          {!pending && <Field label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. entered wrong date" />}
          {error && <ErrorText>{error}</ErrorText>}
          <Button label={pending ? 'Activate' : 'Save start date'} onPress={saveStartDate} busy={busy} />
          <Button label="Cancel" variant="plain" onPress={() => setMode('view')} />
        </View>
      )}

      {mode === 'pay' && (
        <View style={{ gap: 10, marginTop: 6 }}>
          <Field label={`Amount (₹, up to ${rupees(m.outstanding_rupees)})`} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
          <Choices options={PAYMENT_METHODS} value={method} onChange={setMethod} />
          <Field label="Reference" value={reference} onChangeText={setReference} placeholder="Optional, e.g. UPI ref" />
          {pending &&
            (clearsBalance ? (
              <Muted>This clears the balance, so the membership starts. Set its start date.</Muted>
            ) : (
              <Choices
                options={[
                  { value: 'now', label: 'Start now' },
                  { value: 'later', label: 'Wait until fully paid' },
                ]}
                value={startNow ? 'now' : 'later'}
                onChange={(v) => setStartNow(v === 'now')}
              />
            ))}
          {activateWithPayment && <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />}
          {error && <ErrorText>{error}</ErrorText>}
          <Button label="Record payment" onPress={savePayment} busy={busy} />
          <Button label="Cancel" variant="plain" onPress={() => setMode('view')} />
        </View>
      )}

      {mode === 'view' && (
        <>
          {m.outstanding_rupees > 0 && <Button label="Record payment" variant="plain" onPress={() => open('pay')} />}
          <Button label={pending ? 'Set start date' : 'Change start date'} variant="plain" onPress={() => open('start')} />
        </>
      )}
    </Card>
  );
}
````

### `src/app/(app)/enroll/[studentId].tsx`

````tsx
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Button, Card, Choices, ErrorText, Field, Muted, Row, SectionHeader, Spinner, Title } from '@/components/ui';
import { isValidIsoDate, PAYMENT_METHODS, rupees, studioToday, WHOLE_NUMBER as WHOLE } from '@/lib/format';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';

type Student = { id: number; student_number: number; full_name: string };
type Batch = { id: number; name: string };
type Duration = { id: number; label: string; days: number };
type Price = { batch_id: number; duration_id: number; price_rupees: number };

export default function Enrol() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const studioId = useStudioId();

  const [student, setStudent] = useState<Student | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [durations, setDurations] = useState<Duration[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);

  const [batchId, setBatchId] = useState<number | null>(null);
  const [durationId, setDurationId] = useState<number | null>(null);
  const [discount, setDiscount] = useState('');
  // null means "pay the full amount due", so changing batch, duration or discount keeps it in sync.
  const [paid, setPaid] = useState<string | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [startNow, setStartNow] = useState(true);
  const [startDate, setStartDate] = useState(studioToday());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, b, d, p] = await Promise.all([
        supabase.from('students').select('id, student_number, full_name').eq('id', Number(studentId)).single(),
        supabase.from('batches').select('id, name').eq('studio_id', studioId).eq('is_active', true).order('name'),
        supabase.from('durations').select('id, label, days').eq('studio_id', studioId).eq('is_active', true).order('days'),
        supabase.from('batch_prices').select('batch_id, duration_id, price_rupees').eq('studio_id', studioId),
      ]);
      const failed = s.error ?? b.error ?? d.error ?? p.error;
      if (failed) return setError(failed.message);
      const priceRows = p.data as Price[];
      setStudent(s.data as Student);
      setBatches((b.data as Batch[]).filter((x) => priceRows.some((r) => r.batch_id === x.id)));
      setDurations(d.data as Duration[]);
      setPrices(priceRows);
    })().finally(() => setLoading(false));
  }, [studentId, studioId]);

  const offered = useMemo(
    () => durations.filter((d) => prices.some((p) => p.batch_id === batchId && p.duration_id === d.id)),
    [durations, prices, batchId],
  );
  const price = prices.find((p) => p.batch_id === batchId && p.duration_id === durationId)?.price_rupees ?? null;
  const discountValue = discount.trim() ? Number(discount) : 0;
  const due = price !== null && WHOLE.test(String(discountValue)) ? price - discountValue : null;
  const paidText = paid ?? (due !== null && due > 0 ? String(due) : '');
  const paidValue = WHOLE.test(paidText) ? Number(paidText) : null;
  const fullyPaid = due !== null && paidValue === due;
  const activate = fullyPaid || startNow;

  async function save() {
    setError(null);
    if (batchId === null) return setError('Choose a batch.');
    if (durationId === null || price === null) return setError('Choose a duration.');
    if (discount.trim() && !WHOLE.test(discount.trim())) return setError('Discount must be whole rupees.');
    if (due === null || due <= 0) return setError('Discount must be less than the price.');
    if (paidValue === null || paidValue < 1) return setError('Amount paid now must be at least ₹1.');
    if (paidValue > due) return setError(`Amount paid now cannot be more than ${rupees(due)}.`);
    if (method === null) return setError('Choose how they paid.');
    if (activate && !isValidIsoDate(startDate)) return setError('Enter the start date as YYYY-MM-DD.');

    setBusy(true);
    const { error } = await supabase.rpc('create_membership', {
      p_student_id: Number(studentId),
      p_duration_id: durationId,
      p_payment_rupees: paidValue,
      p_payment_method: method,
      p_batch_id: batchId,
      p_discount_rupees: discountValue,
      p_activate: activate,
      p_start_date: activate ? startDate : null,
      p_reference: reference.trim() || null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.back();
  }

  if (loading) return <Spinner />;

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: student ? `Enrol #${student.student_number} ${student.full_name}` : 'Enrol' }} />

      <SectionHeader>Batch</SectionHeader>
      {batches.length === 0 ? (
        <Muted>No active batch has a price yet. Add prices in the Batches tab first.</Muted>
      ) : (
        <Choices
          options={batches.map((b) => ({ value: b.id, label: b.name }))}
          value={batchId}
          onChange={(v) => {
            setBatchId(v);
            setDurationId(null);
            setPaid(null);
          }}
        />
      )}

      {batchId !== null && (
        <>
          <SectionHeader>Duration</SectionHeader>
          <Choices
            options={offered.map((d) => ({
              value: d.id,
              label: `${d.label} · ${rupees(prices.find((p) => p.batch_id === batchId && p.duration_id === d.id)!.price_rupees)}`,
            }))}
            value={durationId}
            onChange={(v) => {
              setDurationId(v);
              setPaid(null);
            }}
          />
        </>
      )}

      {price !== null && (
        <>
          <SectionHeader>Payment</SectionHeader>
          <Field
            label="Discount (₹)"
            value={discount}
            onChangeText={(v) => {
              setDiscount(v);
              setPaid(null);
            }}
            placeholder="0"
            keyboardType="number-pad"
          />
          <Card>
            <Row><Muted>Price</Muted><Title>{rupees(price)}</Title></Row>
            <Row><Muted>Amount due</Muted><Title>{due !== null && due > 0 ? rupees(due) : '—'}</Title></Row>
          </Card>
          <Field label="Paid now (₹)" value={paidText} onChangeText={setPaid} keyboardType="number-pad" />
          <Choices options={PAYMENT_METHODS} value={method} onChange={setMethod} />
          <Field label="Reference" value={reference} onChangeText={setReference} placeholder="Optional, e.g. UPI ref" />

          <SectionHeader>Start</SectionHeader>
          {!fullyPaid && (
            <Choices
              options={[
                { value: 'now', label: 'Start now' },
                { value: 'later', label: 'Start when fully paid' },
              ]}
              value={startNow ? 'now' : 'later'}
              onChange={(v) => setStartNow(v === 'now')}
            />
          )}
          {activate ? (
            <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          ) : (
            <Muted>The membership waits until the balance is paid; you set the start date then.</Muted>
          )}
        </>
      )}

      {error && <ErrorText>{error}</ErrorText>}
      <Button label="Create membership" onPress={save} busy={busy} disabled={price === null} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 14, paddingBottom: 40 },
});
````

### `src/components/ui.tsx`

````tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import type { Tone } from '@/lib/format';
import { makeStyles, useAppTheme } from '@/lib/theme';

export function Card({ children, onPress }: PropsWithChildren<{ onPress?: () => void }>) {
  const styles = useStyles();
  if (!onPress) return <View style={styles.card}>{children}</View>;
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      {children}
    </Pressable>
  );
}

type IconName = ComponentProps<typeof Ionicons>['name'];

export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={theme.accent} />
    </Pressable>
  );
}

// Lists that show a Fab need this much bottom padding so the last card isn't hidden behind it.
export const FAB_CLEARANCE = 100;

export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <View style={styles.fabWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
        <Ionicons name="add" size={32} color={theme.onPrimary} />
      </Pressable>
    </View>
  );
}

export function Row({ children }: PropsWithChildren) {
  return <View style={useStyles().row}>{children}</View>;
}

export function Title({ children }: PropsWithChildren) {
  return <Text style={useStyles().title}>{children}</Text>;
}

export function Muted({ children }: PropsWithChildren) {
  return <Text style={useStyles().muted}>{children}</Text>;
}

export function SectionHeader({ children }: PropsWithChildren) {
  return <Text style={useStyles().section}>{children}</Text>;
}

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const styles = useStyles();
  const c = useAppTheme().tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  busy,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'primary' | 'plain';
}) {
  const styles = useStyles();
  const theme = useAppTheme();
  const primary = variant === 'primary';
  const textColor = primary ? theme.onPrimary : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonPlain,
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {busy ? <ActivityIndicator color={textColor} /> : <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={theme.muted} style={styles.input} {...props} />
    </View>
  );
}

export function Spinner() {
  return <ActivityIndicator style={useStyles().center} color={useAppTheme().accent} />;
}

export function StateMessage({ isLoading, error, empty }: { isLoading: boolean; error: string | null; empty: ReactNode }) {
  const styles = useStyles();
  if (error) return <Text style={[styles.center, styles.error]}>{error}</Text>;
  if (isLoading) return <Spinner />;
  return <Text style={[styles.center, styles.muted]}>{empty}</Text>;
}

export function Choices<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.choices}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.choice, on && styles.choiceOn]}>
            <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ErrorText({ children }: PropsWithChildren) {
  return <Text style={useStyles().error}>{children}</Text>;
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    padding: 14,
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: t.text, flexShrink: 1 },
  muted: { fontSize: 14, color: t.muted },
  section: {
    fontSize: 13,
    fontWeight: '600',
    color: t.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  badge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  button: { borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: t.primary },
  buttonPlain: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: t.text },
  input: {
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: t.text,
  },
  center: { textAlign: 'center', marginTop: 40, marginHorizontal: 24 },
  error: { color: t.danger },
  iconButton: { padding: 4 },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: 20, alignItems: 'center', pointerEvents: 'box-none' },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: t.primary,
    borderWidth: 2,
    borderColor: t.dark ? t.accent : t.chromeAccent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.35)',
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  choiceOn: { backgroundColor: t.primary, borderColor: t.primary },
  choiceText: { color: t.text, fontSize: 14 },
  choiceTextOn: { color: t.onPrimary, fontWeight: '600' },
}));
````

### `src/components/student-form.tsx`

````tsx
import { Field, Muted, SectionHeader } from '@/components/ui';
import { isValidIsoDate, normalizePhone, PHONE, studioToday } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export type StudentValues = {
  name: string;
  dob: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  email: string;
};

export const EMPTY_STUDENT: StudentValues = { name: '', dob: '', phone: '', guardianName: '', guardianPhone: '', email: '' };

export type StudentRow = {
  full_name: string;
  date_of_birth: string;
  phone: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  email: string | null;
};

export function toValues(row: StudentRow): StudentValues {
  return {
    name: row.full_name,
    dob: row.date_of_birth,
    phone: row.phone ?? '',
    guardianName: row.guardian_name ?? '',
    guardianPhone: row.guardian_phone ?? '',
    email: row.email ?? '',
  };
}

export function validateStudent(v: StudentValues): { error: string } | { row: StudentRow } {
  const phone = normalizePhone(v.phone);
  const guardianPhone = normalizePhone(v.guardianPhone);
  const guardianName = v.guardianName.trim() || null;

  if (!v.name.trim()) return { error: 'Enter the student’s name.' };
  if (!isValidIsoDate(v.dob)) return { error: 'Enter date of birth as YYYY-MM-DD, e.g. 2015-06-21.' };
  if (v.dob > studioToday()) return { error: 'Date of birth cannot be in the future.' };
  if (!phone && !guardianPhone) return { error: 'Enter the student’s phone or a guardian’s phone.' };
  if (phone && !PHONE.test(phone)) return { error: 'Student phone: enter 10 digits, or +country code and number.' };
  if (guardianPhone && !PHONE.test(guardianPhone)) return { error: 'Guardian phone: enter 10 digits, or +country code and number.' };
  if (!!guardianName !== !!guardianPhone) return { error: 'Enter both guardian name and guardian phone, or neither.' };

  return {
    row: {
      full_name: v.name.trim(),
      date_of_birth: v.dob,
      phone,
      guardian_name: guardianName,
      guardian_phone: guardianPhone,
      email: v.email.trim() || null,
    },
  };
}

export type PhoneMatch = { id: number; student_number: number; full_name: string };

// Shared numbers are allowed (siblings), so callers only warn and ask for a second tap.
export async function findPhoneMatches(studioId: number, row: StudentRow, excludeId: number | null) {
  const phones = [row.phone, row.guardian_phone].filter((x): x is string => !!x);
  const [a, b] = await Promise.all([
    supabase.from('students').select('id, student_number, full_name').eq('studio_id', studioId).in('phone', phones),
    supabase.from('students').select('id, student_number, full_name').eq('studio_id', studioId).in('guardian_phone', phones),
  ]);
  const error = a.error ?? b.error;
  if (error) return { matches: [], error: error.message };
  const matches = [...(a.data as PhoneMatch[]), ...(b.data as PhoneMatch[])].filter(
    (m, i, all) => m.id !== excludeId && all.findIndex((x) => x.id === m.id) === i,
  );
  return { matches, error: null };
}

export function SharedPhoneNotice({ matches }: { matches: PhoneMatch[] }) {
  return (
    <Muted>
      This phone is already used by {matches.map((m) => `#${m.student_number} ${m.full_name}`).join(', ')}. If they are
      siblings, tap Save again to continue.
    </Muted>
  );
}

export function StudentFields({ values, onChange }: { values: StudentValues; onChange: (patch: Partial<StudentValues>) => void }) {
  return (
    <>
      <Field label="Full name" value={values.name} onChangeText={(name) => onChange({ name })} />
      <Field label="Date of birth" value={values.dob} onChangeText={(dob) => onChange({ dob })} placeholder="YYYY-MM-DD" />

      <SectionHeader>Contact</SectionHeader>
      <Muted>At least one phone is needed. Reminders go to the guardian if there is one.</Muted>
      <Field
        label="Student phone"
        value={values.phone}
        onChangeText={(phone) => onChange({ phone })}
        placeholder="10 digits"
        keyboardType="phone-pad"
      />
      <Field
        label="Guardian name"
        value={values.guardianName}
        onChangeText={(guardianName) => onChange({ guardianName })}
        placeholder="Optional"
      />
      <Field
        label="Guardian phone"
        value={values.guardianPhone}
        onChangeText={(guardianPhone) => onChange({ guardianPhone })}
        placeholder="10 digits"
        keyboardType="phone-pad"
      />
      <Field
        label="Email"
        value={values.email}
        onChangeText={(email) => onChange({ email })}
        placeholder="Optional"
        autoCapitalize="none"
        keyboardType="email-address"
      />
    </>
  );
}
````

### `src/lib/device-storage.ts`

````ts
// Web uses the browser's own storage; expo-sqlite's version is only needed on iOS/Android.
export const deviceStorage = window.localStorage;
````

### `src/lib/device-storage.native.ts`

````ts
import 'expo-sqlite/localStorage/install';

// Keeps the login and app preferences on the phone between launches.
export const deviceStorage = localStorage;
````

### `src/lib/format.ts`

````ts
export function rupees(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Must match the payments.method check constraint.
export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

export const WHOLE_NUMBER = /^\d+$/;

// Same rule as the database: E.164, e.g. +919876543210.
export const PHONE = /^\+[1-9][0-9]{7,14}$/;

// A bare 10-digit number is treated as Indian; anything else must already include its country code.
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s\-()]/g, '');
  if (!compact) return null;
  return /^\d{10}$/.test(compact) ? `+91${compact}` : compact;
}

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// V1 is India-only and IST has no daylight saving, so a fixed +05:30 offset matches the studio's "today".
export function studioToday() {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

export function clockTime(time: string) {
  return time.slice(0, 5);
}

export function shortDate(isoDate: string | null) {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';

const STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'good' },
  expiring_soon: { label: 'Expiring soon', tone: 'warn' },
  expires_today: { label: 'Expires today', tone: 'warn' },
  recently_expired: { label: 'Recently expired', tone: 'bad' },
  expired: { label: 'Expired', tone: 'bad' },
  inactive: { label: 'Inactive', tone: 'bad' },
  awaiting_activation: { label: 'Awaiting activation', tone: 'info' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'neutral' },
  new: { label: 'New', tone: 'neutral' },
};

export function statusInfo(status: string) {
  return STATUS[status] ?? { label: status, tone: 'neutral' as Tone };
}
````

### `src/lib/session.tsx`

````tsx
import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from './supabase';

type SessionState = { session: Session | null; isLoading: boolean };

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, isLoading: false }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ session, isLoading: false }));
    return () => data.subscription.unsubscribe();
  }, []);

  return <SessionContext value={state}>{children}</SessionContext>;
}

export function useSession() {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
````

### `src/lib/studio.tsx`

````tsx
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from './supabase';

export type Studio = { id: number; name: string };

type StudioState = { studio: Studio | null; error: string | null; isLoading: boolean };

const StudioContext = createContext<StudioState | null>(null);

// V1 is one studio per owner; row-level security only returns studios this login belongs to.
export function StudioProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<StudioState>({ studio: null, error: null, isLoading: true });

  useEffect(() => {
    supabase
      .from('studios')
      .select('id, name')
      .order('id')
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => setState({ studio: data as Studio | null, error: error?.message ?? null, isLoading: false }));
  }, []);

  return <StudioContext value={state}>{children}</StudioContext>;
}

export function useStudio() {
  const value = use(StudioContext);
  if (!value) throw new Error('useStudio must be used inside <StudioProvider>');
  return value;
}

export function useStudioId() {
  const { studio } = useStudio();
  if (!studio) throw new Error('No studio loaded');
  return studio.id;
}
````

### `src/lib/supabase.ts`

````ts
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { deviceStorage } from './device-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local');
}

export const supabase = createClient(url, key, {
  auth: {
    storage: deviceStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
````

### `src/lib/theme.tsx`

````tsx
import { DefaultTheme, ThemeProvider as NavigationThemeProvider, type Theme } from 'expo-router';
import { createContext, use, useMemo, useState, type PropsWithChildren } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { deviceStorage } from './device-storage';
import type { Tone } from './format';

const palette = {
  black: '#000000',
  silverLight: '#E6E6E8',
  silverMid: '#A8A9AD',
  steel: '#4A4B4F',
  gold: '#D4A62A',
  deepGold: '#A67C1A',
  paleGold: '#F2CE5C',
  white: '#FFFFFF',
};

export type AppTheme = {
  dark: boolean;
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  onPrimary: string;
  accent: string;
  danger: string;
  chrome: string;
  chromeText: string;
  chromeAccent: string;
  chromeMuted: string;
  tones: Record<Tone, { bg: string; fg: string; border: string }>;
};

// Headers and the tab bar stay black with gold in both themes; only the content area changes.
const chrome = {
  chrome: palette.black,
  chromeText: palette.paleGold,
  chromeAccent: palette.gold,
  chromeMuted: palette.silverMid,
};

const light: AppTheme = {
  dark: false,
  background: palette.silverLight,
  card: palette.white,
  text: palette.black,
  muted: palette.steel,
  border: palette.silverMid,
  primary: palette.black,
  onPrimary: palette.paleGold,
  accent: palette.deepGold,
  // Errors are the one colour outside the palette: they must read as errors.
  danger: '#B3261E',
  ...chrome,
  tones: {
    good: { bg: palette.paleGold, fg: palette.black, border: palette.paleGold },
    warn: { bg: palette.deepGold, fg: palette.black, border: palette.deepGold },
    bad: { bg: palette.steel, fg: palette.white, border: palette.steel },
    info: { bg: palette.silverLight, fg: palette.black, border: palette.silverMid },
    neutral: { bg: 'transparent', fg: palette.steel, border: palette.silverMid },
  },
};

const dark: AppTheme = {
  dark: true,
  background: palette.black,
  card: palette.black,
  text: palette.silverLight,
  muted: palette.silverMid,
  border: palette.steel,
  primary: palette.gold,
  onPrimary: palette.black,
  accent: palette.paleGold,
  danger: '#FF8A80',
  ...chrome,
  tones: {
    good: { bg: palette.gold, fg: palette.black, border: palette.gold },
    warn: { bg: palette.deepGold, fg: palette.black, border: palette.deepGold },
    bad: { bg: palette.steel, fg: palette.white, border: palette.steel },
    info: { bg: palette.silverMid, fg: palette.black, border: palette.silverMid },
    neutral: { bg: 'transparent', fg: palette.silverMid, border: palette.steel },
  },
};

export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'dlegacy.theme';

function readChoice(): ThemeChoice {
  const saved = deviceStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

type ThemeState = { theme: AppTheme; choice: ThemeChoice; setChoice: (choice: ThemeChoice) => void };

const ThemeContext = createContext<ThemeState | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  const theme = (choice === 'system' ? system === 'dark' : choice === 'dark') ? dark : light;

  const navigationTheme = useMemo<Theme>(
    () => ({
      ...DefaultTheme,
      dark: theme.dark,
      colors: {
        primary: theme.chromeAccent,
        background: theme.background,
        card: theme.chrome,
        text: theme.chromeText,
        border: theme.dark ? theme.border : theme.chrome,
        notification: theme.chromeAccent,
      },
    }),
    [theme],
  );

  function setChoice(next: ThemeChoice) {
    if (next === 'system') deviceStorage.removeItem(STORAGE_KEY);
    else deviceStorage.setItem(STORAGE_KEY, next);
    setChoiceState(next);
  }

  return (
    <ThemeContext value={{ theme, choice, setChoice }}>
      <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
    </ThemeContext>
  );
}

function useThemeState() {
  const value = use(ThemeContext);
  if (!value) throw new Error('useAppTheme must be used inside <AppThemeProvider>');
  return value;
}

export function useAppTheme() {
  return useThemeState().theme;
}

export function useThemeChoice() {
  const { choice, setChoice } = useThemeState();
  return [choice, setChoice] as const;
}

// Builds a component's styles once per theme instead of once per render.
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: AppTheme) => T & StyleSheet.NamedStyles<T>) {
  const cache = new Map<AppTheme, T>();
  return function useStyles(): T {
    const theme = useAppTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
````

### `src/lib/use-load.ts`

````ts
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

type Result<T> = { data: T | null; error: { message: string } | null };

// Pass a module-level fetch function so its identity is stable; data reloads whenever the screen gains focus.
export function useLoad<A, T>(fetcher: (arg: A) => PromiseLike<Result<T>>, arg: A) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await fetcher(arg);
    setError(result.error?.message ?? null);
    setData(result.data);
    setIsLoading(false);
  }, [fetcher, arg]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, error, isLoading, reload };
}
````
