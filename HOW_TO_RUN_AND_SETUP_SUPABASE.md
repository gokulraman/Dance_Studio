# Run DLegacy and set up Supabase

## Prerequisites

- Node.js 24.x and npm.
- A Supabase project. The existing project is `d-legacy-dev`; its schema and studios are already set up.
- Expo Go on your phone for device testing (optional).

## Install and test

From the project root, install and run the local database tests:

```sh
cd supabase/tests
npm install
npm test
npm run test:mutation
```

The expected results include `PASSED: 172`, `ALL CHECKS PASSED`, `ALL SMOKE TESTS PASSED - nothing was saved`, and `MUTANTS CAUGHT: 11/11`.

Install the app dependencies:

```sh
cd ../..
npm install
```

## Configure Supabase

### Use the existing `d-legacy-dev` project

Do not apply the migration or run `supabase/dev/reset_schema.sql` against this project. Its schema and studios are already present. Configure the app's local environment file as below.

### Set up a new, empty Supabase project

Use the Supabase Dashboard; the Supabase CLI is not used for this setup.

1. In the project's SQL Editor, run the complete contents of [`supabase/migrations/20261001000000_initial_schema.sql`](./supabase/migrations/20261001000000_initial_schema.sql) once.
2. In **Authentication → Users**, add the studio owner's user and copy its User UID.
3. Run this SQL once, replacing the placeholder with that UID:

   ```sql
   select private.admin_create_studio('D''Legacy', '<owner-user-uid>')
   where not exists (select 1 from public.studios);
   ```

   Verify that the query returns one row with role `owner` and four durations:

   ```sql
   select s.id, s.name, s.timezone, u.email, m.role,
          (select count(*) from public.durations d where d.studio_id = s.id) as durations
   from public.studios s
   join public.studio_members m on m.studio_id = s.id
   join auth.users u on u.id = m.user_id;
   ```

4. For testing, add a second Auth user and create a separate test studio:

   ```sql
   select private.admin_create_studio('D''Legacy TEST', '<test-user-uid>');
   ```

   Perform tests using the test user's login. Payments and memberships cannot be deleted.
5. Optionally run [`supabase/tests/smoke_test.sql`](./supabase/tests/smoke_test.sql) in the SQL Editor after replacing `00000000-0000-0000-0000-000000000000` with a real User UID. It should return `ALL SMOKE TESTS PASSED - nothing was saved`.
6. In Authentication settings, turn off **Allow new users to sign up** and require a minimum password length of 12 with all character types.

### Set the app credentials

In the Supabase Dashboard, open **Connect → Mobile Frameworks → Expo React Native** (or **Project Settings → API Keys**) and copy the project URL and **publishable** key. Create `.env.local` in the repository root with those values:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use only the publishable key in the app. Never put a `service_role`/secret key or the database password in the app or repository. `.env.local` is ignored by Git; do not commit it.

## Run the app

Run Expo commands from the repository root:

```sh
npm run web
```

Open <http://localhost:8081>. The browser tab title should be **DLegacy**. For Expo Go on a phone, keep the phone and computer on the same network and run:

```sh
npm start
```

Scan the displayed QR code with Expo Go. If the phone times out, check that the computer's firewall allows Node on the Wi-Fi network.

The app uses email and password sign-in; there is no sign-up screen. A login must be linked to a studio. For a new project, create its Auth user and studio using the setup steps above before signing in.
