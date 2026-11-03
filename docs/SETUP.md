# Setup & deploy

Step by step from a fresh machine to Prologue running on Vercel against a hosted Supabase project.
Everything on the Supabase side is done in the dashboard; no Supabase CLI is needed.

## 0. Prerequisites

- Node 22+ and npm.
- A Supabase account (https://supabase.com) and a Vercel account (https://vercel.com).
- A Resend account (https://resend.com) with a verified sending domain, for password-reset emails.

## 1. Create the Supabase project

1. Supabase dashboard → **New project**. Pick a region close to your users and save the database password.
2. **Security** options: keep the **Data API** enabled, with new tables in the `public` schema exposed
   automatically. Automatic RLS may be on or off (the migration enables RLS on every table itself).

## 2. Apply the database schema

1. Open **SQL Editor → New query**.
2. Paste the whole of `supabase/migrations/20261102000000_init.sql` and click **Run**.
3. In a new query, paste `supabase/migrations/20261102010000_single_repository.sql` and click **Run**
   (one Repository per Project; branches are typed in when the Repository is added). It refuses to run while
   any Project still has more than one Repository: delete the extras first.
4. In a new query, paste `supabase/migrations/20261102020000_project_status_active_inactive.sql` and click
   **Run**. Project Status becomes Active / Inactive; existing Paused, Done and Archived Projects turn Inactive.
5. In a new query, paste `supabase/migrations/20261102030000_environment_env_files.sql` and click **Run**.
   It **drops `environment_urls` and every Environment URL in it** and adds `environment_env_files`
   (one .env per Environment, readable by Owners and Editors only).
6. Check:
   - **Table Editor** lists `profiles`, `projects`, `project_members`, `project_pins`, `invitations`,
     `quick_links`, `repositories`, `environments`, `environment_env_files`, `releases`, `board_columns`,
     `labels`, `tasks` and `task_labels`.
   - **Database → Publications → supabase_realtime** includes `tasks`, `board_columns`, `task_labels`
     and `invitations`.

Run each migration once only, in order. If you set up the database earlier, run only the ones you haven't run yet. Running the init migration again on the same database fails because the types and tables already exist.

## 3. Configure Auth

**Authentication → Sign In / Providers → Email**

- Enable Email provider: **on**.
- **Confirm email: off** (ADR 0001; signup returns a session straight away).
- Minimum password length: 8 (the app also enforces 8).

**Authentication → URL Configuration**

- **Site URL**: `http://localhost:9900` for now. Change it to the Vercel domain after deploying (step 6).
- **Redirect URLs** (add each):
  - `http://localhost:9900/reset-password`
  - `https://<your-vercel-domain>/reset-password` (after step 6)
  - `https://<your-vercel-domain>/**` (covers preview deployments under that domain)

**Authentication → Emails → SMTP Settings** (custom SMTP via Resend)

| Field | Value |
|---|---|
| Enable custom SMTP | on |
| Sender email | e.g. `no-reply@yourdomain.com` (domain verified in Resend) |
| Sender name | `Prologue` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a Resend API key with sending access |

The built-in SMTP is limited to a few emails per hour; Resend lifts that. Only password-reset emails are sent.

## 4. Connect the app

**Project Settings → API Keys**: copy the **Project URL** and the **anon / publishable key**. Never put
the `service_role` / secret key in the frontend.

Fill in `.env.local`:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

```bash
npm install
npm run dev                 # http://localhost:9900
```

Restart `npm run dev` after changing `.env.local`.

## 5. Database types

`src/lib/database.types.ts` was generated from this same migration, so it already matches. When a new
migration changes the schema, regenerate it from the dashboard (**API Docs → generate and download
types**, TypeScript) and replace the file. Don't edit it by hand.

## 6. Deploy to Vercel

1. Put the code in a Git repository and push it (GitHub, GitLab or Bitbucket).
2. Vercel → **Add New → Project** → import the repository. Vercel detects **Vite**:
   - Build command: `npm run build`
   - Output directory: `dist`
3. **Environment Variables** (Production and Preview):
   - `VITE_SUPABASE_URL` = Project URL from step 4
   - `VITE_SUPABASE_ANON_KEY` = anon key from step 4
4. Deploy. `vercel.json` rewrites every path to `index.html`, so deep links like `/projects/<id>` and
   `/reset-password` work.
5. Back in Supabase **URL Configuration**: set **Site URL** to the Vercel domain and add its Redirect URLs.

Vite inlines `VITE_*` variables at build time: after changing them in Vercel, redeploy.

## 7. Smoke test with two accounts

Use two browsers (or a normal and a private window).

1. **Owner**: register → create a Project → add a Repository, typing its Production and Development branches
   (both Environments appear with those branches) → record a Release on Production → the dashboard card shows that Version.
2. Add Tasks, drag one to another Column, reload: it stays where you dropped it.
3. **Invite** an email that isn't registered → copy the registration message.
4. **Invitee**: open the `/register?email=…` link from the message → the email is prefilled → register →
   the bell shows 1 → **Accept** → the Project opens and appears under **Shared with me**.
5. With both windows on the Project, add a Task as the invitee: it appears for the Owner without reloading.
6. Owner changes the invitee to **Viewer**: edit controls disappear for them after reload.
7. **Forgot password** → the email arrives (via Resend) → the link opens `/reset-password` → set a new
   password → sign in with it.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Supabase is not configured" screen | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` empty at build time; set them and restart or redeploy. |
| "permission denied for table …" | The Data API isn't exposing `public` tables to authenticated users (step 1). |
| Register says no session was returned | "Confirm email" is still on in Supabase Auth. |
| Reset link opens "Link expired" | The domain isn't in Redirect URLs, or the link was opened in another browser / already used. |
| Board or bell doesn't update live | Tables missing from the `supabase_realtime` publication; run the last statement of the migration. |
| An edit silently does nothing / "You don't have permission" | Row Level Security: the user is a Viewer or no longer a Member. |
