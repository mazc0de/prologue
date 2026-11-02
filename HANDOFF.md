# Prologue: Handoff

You are picking up **Prologue (Project Log Gue)**, a dashboard for developers to keep track of their projects. Design is finished and the database schema is written and tested. **No frontend code exists yet.** Your job is to build the app.

## Status

| Area | State |
|---|---|
| Product and design decisions | ✅ Settled (below). Don't re-open them unless the user asks. |
| Domain vocabulary | ✅ `GLOSSARY.md` |
| Architecture decisions | ✅ `docs/adr/0001-per-project-membership.md`, `docs/adr/0002-version-derived-from-release.md` |
| Database (tables, RLS, triggers, RPCs, views, realtime) | ✅ `supabase/migrations/20261102000000_init.sql`, tested on Postgres 17 |
| Frontend | ✅ Build steps 1–6 done (2026-11-02). Verified end-to-end against a local Supabase stack (since removed; Supabase is now set up manually in the dashboard). See `README.md`. |
| Supabase project, Vercel, git repo | ❌ Not created yet. Step-by-step guide: `docs/SETUP.md` |

## Working with the user

- Reply in **Indonesian**. Write all code, file names, function names, identifiers, and UI copy in **English**.
- Don't start coding until the user says so. Ask before anything outward-facing, such as pushing, deploying, or running SQL against their real Supabase project.
- Use the terms in `GLOSSARY.md` exactly, in code and conversation. For example, it's a **Task**, not a card or ticket, and a **Label**, not a tag. "Tag" is reserved for **Tech Tag**.

## Read first

1. `GLOSSARY.md`: the vocabulary.
2. `docs/adr/*`: why per-project membership, why there's no editable version field, and the accepted no-email-confirmation risk.
3. `supabase/migrations/20261102000000_init.sql`: the source of truth for data and permissions.

## Blocking inputs (ask the user)

1. **Supabase project URL and anon key** for `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. **taste-skill** (https://www.tasteskill.dev/): how to install it, or the skill name if it's already installed. It's the design skill for the UI. The user stopped an attempt to fetch the website, so don't fetch it without asking.

Can come later (before deploy):

3. App domain. Used in the invite "copy registration message". Until there is one, use `window.location.origin`.
4. Whether to `git init` and create a GitHub repo now.

## Supabase dashboard settings (the user configures these)

- Authentication → Providers → Email: **"Confirm email" OFF**.
- Custom SMTP: **Resend**. It's only needed for password-reset emails, but the built-in SMTP is rate-limited to a few per hour.
- Site URL and Redirect URLs: the Vercel domain and `http://localhost:9900`, including `/reset-password`.
- Apply the migration with `supabase db push`, or paste it into the SQL Editor.

## Settled decisions

### Stack
- **Vite + React + TypeScript** SPA, not Next.js. Everything is behind login, so there's no SSR or SEO need. Deploy to **Vercel** with an SPA rewrite to `index.html`.
- **React Router**, **TanStack Query** (cache and optimistic updates), **@dnd-kit** (kanban), **Tailwind v4** + **shadcn/ui** (Radix), styled by `DESIGN.md` (e-ink paper, monochrome, red only for failures), **@supabase/supabase-js**.
- DB types from `supabase gen types typescript`. Don't hand-maintain them once a project exists.

### Auth
- **Register**: display name, email, password, confirm password. "Passwords match" is checked client-side. Pass the name as `supabase.auth.signUp({ email, password, options: { data: { display_name } } })`; a trigger creates the `profiles` row. There's no email confirmation, so signUp returns a session.
- **Login**: email + password.
- **Forgot password**: `resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`, then on `/reset-password` call `updateUser({ password })`.
- No OAuth and no magic link.

### Access model (ADR 0001)
- Access is per Project. Roles are **owner / editor / viewer**, with exactly one Owner per Project.
- Owner: everything, including managing Members and deleting the Project.
- Editor: edits everything in the Project except Members and deletion.
- Viewer: read-only.
- Editors and Viewers can **leave**. The Owner can't leave.
- When someone leaves, their Tasks become unassigned and their Pin is dropped (handled by a trigger).

### Invitation flow
1. In the Members section, the Owner types an email, and the client calls RPC `check_invitee(project_id, email)`. It returns `is_registered`, `display_name`, `is_member`, and `has_pending_invitation`.
   - **Registered:** show their display name so the Owner can confirm it's the right person (this mitigates the no-email-confirmation risk). Then insert into `invitations`.
   - **Not registered:** still insert the Invitation (status `pending`), then show a **copyable message**, e.g. `You've been invited to "<Project>" on Prologue. Register at <origin>/register?email=<email>`. Prefill the email on `/register` from the query string.
   - Already a Member or already pending: block it with a message. The DB also rejects inviting existing Members.
2. The Owner sees pending Invitations via RPC `project_pending_invitations(project_id)`, which flags `is_registered = false` rows for the "copy message" button. The Owner revokes an Invitation by deleting its row.
3. The invitee gets a **notification bell** in the header, fed by RPC `my_pending_invitations()`. Subscribe to realtime on `invitations` and refetch on change. Accept with RPC `accept_invitation(id)` and decline with `decline_invitation(id)`.
4. Accepted Projects appear in the dashboard's **"Shared with me"** section.

### Dashboard (`/`) and Projects (`/projects`)
- `/` is the overview (KPIs, charts, This Week, Collaborators, the 3 most recent Projects). `/projects` holds only the Project cards, with status tabs and the top-bar search (`?q=`).
- Two sections: **My Projects** (`my_role = 'owner'`) and **Shared with me** (`editor` / `viewer`). Pinned Projects come first, then sort by `last_activity_at` desc.
- Project Status is **Active** or **Inactive** (migration `20261102020000_project_status_active_inactive.sql`; Paused / Done / Archived were folded into Inactive). Only Active Projects feed the dashboard overview and the sidebar; `/projects` has Active (default) / Inactive / All tabs.
- All card data comes from the **`project_cards`** view: name, truncated description, Project Status, Tech Tags, `production_version`, `open_task_count`, `last_activity_at`, `pinned_at`, `my_role`. Don't compute these on the client.
- Pinning is per user: insert or delete `project_pins` rows (`user_id` defaults to `auth.uid()`).

### Project detail (`/projects/:projectId`)
Top: project info. Below it: the Board.
- **Header**: name, Project Status, Tech Tags (free text, max 20), description (**markdown**).
- **Repository**: **one per Project** (unique index, migration `20261102010000_single_repository.sql`). Fields: name and URL. `provider` (github/gitlab/bitbucket/other) is a generated column, used for the icon. `position` is left over from when a Project could have several.
  - Create it with RPC **`create_repository(project_id, name, url, production_branch, development_branch?)`**: the user types the branches; it inserts the Repository plus a Production Environment (and a Development one when that branch is given) in one transaction. There's no longer a trigger with hard-coded `main` / `develop`.
- **Environments** per Repository: name (free text), **kind** (production/staging/development/preview/other, used for logic and badge color), branch, and **many labelled URLs** (`environment_urls`).
- **Version** = the latest Release of the Environment (ADR 0002). Read it from the **`environment_versions`** view. There's no editable version field. "Bump version" means creating a **Release** (version as free text, notes in markdown, `released_at` that can be backdated). Show the release history per Environment.
- **Quick Links**: label + URL.
- **Members**: list with role; the Owner can change roles, remove Members, and invite.
- Delete Project: Owner only, and the user must type the project name to confirm. Deletion is a hard delete. Setting the Project to Inactive is the soft alternative.

### Board
- One Board per Project. Columns are customisable. New Projects are seeded with **Backlog, Todo, In Progress, Review, Done** (Done has `is_done = true`).
- **Done Column** (`is_done`) defines Open Tasks for the card count.
- Task fields: title, description (markdown), Priority (low/medium/high/urgent, default medium), Labels (many, per-project, 9 preset colors), due date, **one optional Assignee** (must be a Member; the DB enforces this).
- Ordering uses **fractional `position`** (double). On drop, set `position` to the midpoint of the neighbours, so only one row is written. Rebalance a column if gaps get tiny.
- **Realtime** on `tasks`, `board_columns`, and `task_labels`. Apply optimistic updates with TanStack Query and reconcile on realtime events.
- A Column that still has Tasks can't be deleted. The UI must ask the user to move or delete its Tasks first.

### UI
- English UI copy.
- Avatars are initials with a color derived deterministically from the user id (nothing stored).

## Database contract and gotchas

- **Let triggers do their job; don't duplicate them on the client.** Triggers handle: profile on signup; owner membership and default Columns on Project insert; `last_activity_at` bumping; unassign and unpin on Member removal.
- **RLS-blocked UPDATE/DELETE fail silently** (0 rows, no error). Use `.select()` after mutations and treat an empty result as "not allowed".
- `supabase.from('projects').insert(...).select()` works for the creator, because the select policy also allows `owner_id = auth.uid()` before the membership trigger runs.
- Column-level grants: clients may only update `projects(name, description, status, tech_tags)`, `project_members(role)`, and `profiles(display_name)`. Sending other columns in an update errors.
- Child tables carry a denormalised `project_id`, guarded by composite FKs. **Always send `project_id`** when inserting environments, environment_urls, releases, tasks, and task_labels.
- `invitations.email` must be lowercase and trimmed (CHECK constraint). Normalise on the client.
- Access helpers live in schema `private` (not exposed). Public RPCs: `check_invitee`, `project_pending_invitations`, `my_pending_invitations`, `accept_invitation`, `decline_invitation`, `create_repository` (security invoker, so RLS applies).

### Re-testing the migration locally
It was tested on `postgres:17` in Docker with a minimal Supabase stub applied first:

```sql
create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', current_setting('request.jwt.claim.email', true)) $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
create publication supabase_realtime;
```

Impersonate a user with `set role authenticated; select set_config('request.jwt.claim.sub', '<uuid>', false), set_config('request.jwt.claim.email', '<email>', false);`.

Scenarios verified:
- Project seeding, default Environments, and provider detection.
- Card view values.
- The invite flow for registered and unregistered emails.
- Non-owners can't check emails or invite, and existing Members can't be invited.
- Viewers can't edit or self-promote, and Owners can't self-demote or leave.
- Non-member Assignees are rejected.
- Leaving unassigns Tasks.
- A Column with Tasks is protected.
- Project deletion cascades cleanly.

## Suggested build order

Each step should end with a working, type-checked app (`npm run build`).

1. **Scaffold**: Vite react-ts, Tailwind, taste-skill, Supabase client, TanStack Query, Router, generated DB types, env vars, Vercel SPA rewrite (`vercel.json`).
2. **Auth**: `/register`, `/login`, `/forgot-password`, `/reset-password`, auth guard, sign-out, session provider.
3. **Dashboard**: `project_cards`, My Projects / Shared with me, pin toggle, status filter, "New Project" dialog.
4. **Invitations**: header bell with realtime, accept and decline.
5. **Project detail**: header editing, Repositories → Environments → URLs, Releases plus history, Quick Links, Members and the invite dialog (`check_invitee`, copy message), leave and delete. Respect `my_role` in the UI (hide edit controls for Viewers).
6. **Board**: Columns CRUD with the Done flag, Tasks CRUD, drag and drop with fractional positions, Labels, Assignee, Priority, due date, realtime.
7. **Deploy**: Vercel env vars, Supabase redirect URLs, smoke test with two accounts (owner and invitee).

## Out of scope for v1 (backlog)

Project notes (markdown), activity log, ⌘K command palette, GitHub integration (auto-fetch branches and tags), Vercel deploy status per Environment, ownership transfer, avatar upload, multiple assignees, workspaces/teams, email delivery of Invitations, email confirmation (see ADR 0001 for when to turn it on).

**Never** store env variables or credentials in Prologue. Link to where they live instead.
