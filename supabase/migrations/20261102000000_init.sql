-- =============================================================================
-- Prologue (Project Log Gue) — initial schema
-- Vocabulary: see GLOSSARY.md. Decisions: see docs/adr/.
-- =============================================================================

-- Helpers live in a schema that PostgREST does not expose.
create schema if not exists private;
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.project_role       as enum ('owner', 'editor', 'viewer');
create type public.project_status     as enum ('active', 'paused', 'done', 'archived');
create type public.invitation_status  as enum ('pending', 'accepted', 'declined');
create type public.environment_kind   as enum ('production', 'staging', 'development', 'preview', 'other');
create type public.repo_provider      as enum ('github', 'gitlab', 'bitbucket', 'other');
create type public.task_priority      as enum ('low', 'medium', 'high', 'urgent');

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- One row per auth user. Created by trigger on signup.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(btrim(display_name)) between 1 and 80),
  email         text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

create table public.projects (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name              text not null check (char_length(btrim(name)) between 1 and 120),
  description       text not null default '',            -- markdown
  status            public.project_status not null default 'active',
  tech_tags         text[] not null default '{}' check (cardinality(tech_tags) <= 20),
  created_at        timestamptz not null default now(),
  last_activity_at  timestamptz not null default now()   -- bumped by any change inside the project
);

-- The Owner also has a row here with role 'owner' (inserted by trigger).
create table public.project_members (
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.project_role not null,
  joined_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);
create unique index project_members_one_owner on public.project_members (project_id) where role = 'owner';
create index project_members_user_idx on public.project_members (user_id);

-- Pins are personal: one Member pinning does not affect other Members.
create table public.project_pins (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  pinned_at   timestamptz not null default now(),
  primary key (user_id, project_id)
);

create table public.invitations (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  email         text not null check (email = lower(btrim(email)) and email like '%_@_%'),
  role          public.project_role not null default 'editor' check (role <> 'owner'),
  status        public.invitation_status not null default 'pending',
  invited_by    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz
);
create unique index invitations_one_pending on public.invitations (project_id, email) where status = 'pending';
create index invitations_email_idx on public.invitations (email) where status = 'pending';

create table public.quick_links (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  label       text not null check (char_length(btrim(label)) between 1 and 80),
  url         text not null check (url ~* '^https?://'),
  position    double precision not null default 0,
  created_at  timestamptz not null default now()
);
create index quick_links_project_idx on public.quick_links (project_id, position);

create table public.repositories (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  url         text not null check (url ~* '^https?://'),
  provider    public.repo_provider generated always as (
                case
                  when url ~* '^https?://(www\.)?github\.com/'    then 'github'::public.repo_provider
                  when url ~* '^https?://(www\.)?gitlab\.com/'    then 'gitlab'::public.repo_provider
                  when url ~* '^https?://(www\.)?bitbucket\.org/' then 'bitbucket'::public.repo_provider
                  else 'other'::public.repo_provider
                end
              ) stored,
  position    double precision not null default 0,  -- lowest position = primary Repository
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, project_id)                            -- target for composite FKs below
);
create index repositories_project_idx on public.repositories (project_id, position);

-- project_id is denormalised onto every child so RLS stays a single cheap check;
-- composite FKs guarantee it always matches the parent's project.
create table public.environments (
  id             uuid primary key default gen_random_uuid(),
  repository_id  uuid not null,
  project_id     uuid not null,
  name           text not null check (char_length(btrim(name)) between 1 and 60),
  kind           public.environment_kind not null default 'other',
  branch         text not null check (char_length(btrim(branch)) between 1 and 255),
  position       double precision not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, project_id),
  foreign key (repository_id, project_id) references public.repositories (id, project_id) on delete cascade
);
create index environments_repository_idx on public.environments (repository_id, position);
create index environments_project_idx on public.environments (project_id);

create table public.environment_urls (
  id              uuid primary key default gen_random_uuid(),
  environment_id  uuid not null,
  project_id      uuid not null,
  label           text check (label is null or char_length(btrim(label)) between 1 and 60),
  url             text not null check (url ~* '^https?://'),
  position        double precision not null default 0,
  created_at      timestamptz not null default now(),
  foreign key (environment_id, project_id) references public.environments (id, project_id) on delete cascade
);
create index environment_urls_environment_idx on public.environment_urls (environment_id, position);
create index environment_urls_project_idx on public.environment_urls (project_id);

-- An Environment's Version = its latest Release (ADR 0002).
create table public.releases (
  id              uuid primary key default gen_random_uuid(),
  environment_id  uuid not null,
  project_id      uuid not null,
  version         text not null check (char_length(btrim(version)) between 1 and 60),
  notes           text not null default '',               -- markdown
  released_at     timestamptz not null default now(),
  created_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  foreign key (environment_id, project_id) references public.environments (id, project_id) on delete cascade
);
create index releases_environment_idx on public.releases (environment_id, released_at desc, created_at desc);
create index releases_project_idx on public.releases (project_id);

-- Board = implicit, one per Project. Columns hang directly off the Project.
create table public.board_columns (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  is_done     boolean not null default false,
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  unique (id, project_id)
);
create index board_columns_project_idx on public.board_columns (project_id, position);

create table public.labels (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  color       text not null default 'gray'
              check (color in ('gray','red','orange','amber','green','teal','blue','violet','pink')),
  created_at  timestamptz not null default now(),
  unique (id, project_id)
);
create unique index labels_unique_name on public.labels (project_id, lower(name));

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null,
  column_id    uuid not null,
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  description  text not null default '',                  -- markdown
  priority     public.task_priority not null default 'medium',
  due_date     date,
  assignee_id  uuid references public.profiles (id) on delete set null,
  position     double precision not null default 0,       -- fractional ordering within a Column
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, project_id),
  -- NO ACTION (checked at end of statement): a Column that still has Tasks can't be
  -- deleted on its own, but deleting the whole Project cascades cleanly.
  foreign key (column_id, project_id) references public.board_columns (id, project_id) on delete no action,
  foreign key (project_id) references public.projects (id) on delete cascade
);
create index tasks_column_idx   on public.tasks (column_id, position);
create index tasks_project_idx  on public.tasks (project_id);
create index tasks_assignee_idx on public.tasks (assignee_id) where assignee_id is not null;

create table public.task_labels (
  task_id     uuid not null,
  label_id    uuid not null,
  project_id  uuid not null,
  primary key (task_id, label_id),
  foreign key (task_id, project_id)  references public.tasks (id, project_id)  on delete cascade,
  foreign key (label_id, project_id) references public.labels (id, project_id) on delete cascade
);
create index task_labels_label_idx on public.task_labels (label_id);
create index task_labels_project_idx on public.task_labels (project_id);

-- -----------------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER to avoid RLS recursion on project_members)
-- -----------------------------------------------------------------------------
create or replace function private.project_role_of(p_project_id uuid)
returns public.project_role
language sql stable security definer set search_path = ''
as $$
  select role from public.project_members
  where project_id = p_project_id and user_id = (select auth.uid());
$$;

create or replace function private.is_member(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.can_edit(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.project_role_of(p_project_id) in ('owner', 'editor'), false);
$$;

create or replace function private.is_owner(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.project_role_of(p_project_id) = 'owner', false);
$$;

create or replace function private.shares_project_with(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members me
    join public.project_members them on them.project_id = me.project_id
    where me.user_id = (select auth.uid()) and them.user_id = p_user_id
  );
$$;

grant execute on all functions in schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- updated_at
create or replace function private.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at     before update on public.profiles     for each row execute function private.set_updated_at();
create trigger repositories_updated_at before update on public.repositories for each row execute function private.set_updated_at();
create trigger environments_updated_at before update on public.environments for each row execute function private.set_updated_at();
create trigger tasks_updated_at        before update on public.tasks        for each row execute function private.set_updated_at();

-- Profile on signup. Frontend passes display_name via supabase.auth.signUp({ options: { data: { display_name } } }).
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    lower(new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- New Project: owner membership + default Columns.
create or replace function private.handle_new_project()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');

  insert into public.board_columns (project_id, name, is_done, position) values
    (new.id, 'Backlog',     false, 1000),
    (new.id, 'Todo',        false, 2000),
    (new.id, 'In Progress', false, 3000),
    (new.id, 'Review',      false, 4000),
    (new.id, 'Done',        true,  5000);
  return new;
end;
$$;

create trigger on_project_created
  after insert on public.projects
  for each row execute function private.handle_new_project();

-- New Repository: Production (main) + Development (develop).
create or replace function private.handle_new_repository()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.environments (repository_id, project_id, name, kind, branch, position) values
    (new.id, new.project_id, 'Production',  'production',  'main',    1000),
    (new.id, new.project_id, 'Development', 'development', 'develop', 2000);
  return new;
end;
$$;

create trigger on_repository_created
  after insert on public.repositories
  for each row execute function private.handle_new_repository();

-- Assignee must be a Member of the Task's Project.
create or replace function private.check_task_assignee()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from public.project_members
    where project_id = new.project_id and user_id = new.assignee_id
  ) then
    raise exception 'Assignee must be a member of the project' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger tasks_check_assignee
  before insert or update of assignee_id, project_id on public.tasks
  for each row execute function private.check_task_assignee();

-- Member leaves / is removed: unassign their Tasks, drop their Pin.
create or replace function private.handle_member_removed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.tasks set assignee_id = null
  where project_id = old.project_id and assignee_id = old.user_id;

  delete from public.project_pins
  where project_id = old.project_id and user_id = old.user_id;
  return old;
end;
$$;

create trigger on_member_removed
  after delete on public.project_members
  for each row execute function private.handle_member_removed();

-- Can't invite someone who is already a Member.
create or replace function private.check_invitation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1
    from public.project_members m
    join public.profiles p on p.id = m.user_id
    where m.project_id = new.project_id and p.email = new.email
  ) then
    raise exception 'This person is already a member of the project' using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger invitations_check
  before insert on public.invitations
  for each row execute function private.check_invitation();

-- last_activity_at: bump on any change inside a Project.
create or replace function private.touch_project()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'projects' then
    new.last_activity_at := now();
    return new;
  end if;

  update public.projects set last_activity_at = now()
  where id = coalesce(new.project_id, old.project_id);
  return null;
end;
$$;

create trigger projects_touch before update on public.projects
  for each row when (old.last_activity_at is not distinct from new.last_activity_at)
  execute function private.touch_project();

create trigger repositories_touch     after insert or update or delete on public.repositories     for each row execute function private.touch_project();
create trigger environments_touch     after insert or update or delete on public.environments     for each row execute function private.touch_project();
create trigger environment_urls_touch after insert or update or delete on public.environment_urls for each row execute function private.touch_project();
create trigger releases_touch         after insert or update or delete on public.releases         for each row execute function private.touch_project();
create trigger quick_links_touch      after insert or update or delete on public.quick_links      for each row execute function private.touch_project();
create trigger board_columns_touch    after insert or update or delete on public.board_columns    for each row execute function private.touch_project();
create trigger tasks_touch            after insert or update or delete on public.tasks            for each row execute function private.touch_project();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.projects          enable row level security;
alter table public.project_members   enable row level security;
alter table public.project_pins      enable row level security;
alter table public.invitations       enable row level security;
alter table public.quick_links       enable row level security;
alter table public.repositories      enable row level security;
alter table public.environments      enable row level security;
alter table public.environment_urls  enable row level security;
alter table public.releases          enable row level security;
alter table public.board_columns     enable row level security;
alter table public.labels            enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_labels       enable row level security;

-- Nothing for anonymous visitors.
revoke all on all tables in schema public from anon;

-- profiles: see yourself and anyone you share a Project with; edit only your name.
create policy "profiles: read self or co-members" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_project_with(id));

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- projects
-- owner_id check in SELECT lets `insert(...).select()` return the row before the
-- owner's membership trigger has run.
create policy "projects: members read" on public.projects
  for select to authenticated
  using (owner_id = (select auth.uid()) or private.is_member(id));

create policy "projects: anyone creates own" on public.projects
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

revoke update on public.projects from authenticated;
grant update (name, description, status, tech_tags) on public.projects to authenticated;
create policy "projects: editors update" on public.projects
  for update to authenticated
  using (private.can_edit(id)) with check (private.can_edit(id));

create policy "projects: owner deletes" on public.projects
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- project_members: inserted only by trigger / accept_invitation().
create policy "members: members read" on public.project_members
  for select to authenticated
  using (private.is_member(project_id));

revoke update on public.project_members from authenticated;
grant update (role) on public.project_members to authenticated;
create policy "members: owner changes non-owner roles" on public.project_members
  for update to authenticated
  using (private.is_owner(project_id) and role <> 'owner')
  with check (private.is_owner(project_id) and role <> 'owner');

create policy "members: owner removes others, members leave" on public.project_members
  for delete to authenticated
  using (
    role <> 'owner'
    and (user_id = (select auth.uid()) or private.is_owner(project_id))
  );

-- project_pins: strictly personal.
create policy "pins: own" on public.project_pins
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.is_member(project_id));

-- invitations: Owner manages; invitee reads their own pending ones (accept/decline via RPC).
create policy "invitations: owner or invitee reads" on public.invitations
  for select to authenticated
  using (
    private.is_owner(project_id)
    or (status = 'pending' and email = lower((select auth.jwt()) ->> 'email'))
  );

create policy "invitations: owner creates" on public.invitations
  for insert to authenticated
  with check (private.is_owner(project_id) and invited_by = (select auth.uid()) and status = 'pending');

create policy "invitations: owner revokes" on public.invitations
  for delete to authenticated
  using (private.is_owner(project_id));

-- Project content: Members read, Owner/Editor write.
do $$
declare t text;
begin
  foreach t in array array[
    'quick_links', 'repositories', 'environments', 'environment_urls',
    'releases', 'board_columns', 'labels', 'tasks', 'task_labels'
  ] loop
    execute format(
      'create policy "%1$s: members read" on public.%1$I for select to authenticated using (private.is_member(project_id))', t);
    execute format(
      'create policy "%1$s: editors insert" on public.%1$I for insert to authenticated with check (private.can_edit(project_id))', t);
    execute format(
      'create policy "%1$s: editors update" on public.%1$I for update to authenticated using (private.can_edit(project_id)) with check (private.can_edit(project_id))', t);
    execute format(
      'create policy "%1$s: editors delete" on public.%1$I for delete to authenticated using (private.can_edit(project_id))', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------

-- Pending Invitations for the current user, with names they can't otherwise read.
create or replace function public.my_pending_invitations()
returns table (
  id               uuid,
  project_id       uuid,
  project_name     text,
  role             public.project_role,
  invited_by_name  text,
  created_at       timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.project_id, p.name, i.role, pr.display_name, i.created_at
  from public.invitations i
  join public.projects p  on p.id = i.project_id
  join public.profiles pr on pr.id = i.invited_by
  where i.status = 'pending'
    and i.email = (select lower(email) from auth.users where id = (select auth.uid()))
  order by i.created_at desc;
$$;

create or replace function public.accept_invitation(p_invitation_id uuid)
returns uuid  -- project_id
language plpgsql security definer set search_path = ''
as $$
declare
  v_inv   public.invitations;
  v_user  auth.users;
begin
  select * into v_user from auth.users where id = (select auth.uid());
  if v_user.id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_inv from public.invitations
  where id = p_invitation_id and status = 'pending'
  for update;

  if v_inv.id is null or v_inv.email <> lower(v_user.email) then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (v_inv.project_id, v_user.id, v_inv.role)
  on conflict (project_id, user_id) do nothing;  -- already a Member: keep existing role

  update public.invitations
  set status = 'accepted', responded_at = now()
  where id = v_inv.id;

  return v_inv.project_id;
end;
$$;

create or replace function public.decline_invitation(p_invitation_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.invitations
  set status = 'declined', responded_at = now()
  where id = p_invitation_id
    and status = 'pending'
    and email = (select lower(email) from auth.users where id = (select auth.uid()));

  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Owner types an email in the invite dialog: is this person registered, and as whom?
-- Showing display_name lets the Owner sanity-check who they're inviting (ADR 0001).
create or replace function public.check_invitee(p_project_id uuid, p_email text)
returns table (
  is_registered           boolean,
  display_name            text,
  is_member               boolean,
  has_pending_invitation  boolean
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
begin
  if not private.is_owner(p_project_id) then
    raise exception 'Only the project owner can invite' using errcode = '42501';
  end if;

  return query
  select
    pr.id is not null,
    pr.display_name,
    exists (
      select 1 from public.project_members m
      where m.project_id = p_project_id and m.user_id = pr.id
    ),
    exists (
      select 1 from public.invitations i
      where i.project_id = p_project_id and i.email = v_email and i.status = 'pending'
    )
  from (select 1) as one
  left join public.profiles pr on pr.email = v_email;
end;
$$;

-- Owner's list of pending Invitations, flagging who hasn't registered yet
-- (those need the "copy registration message" button).
create or replace function public.project_pending_invitations(p_project_id uuid)
returns table (
  id             uuid,
  email          text,
  role           public.project_role,
  created_at     timestamptz,
  is_registered  boolean,
  invitee_name   text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_owner(p_project_id) then
    raise exception 'Only the project owner can see invitations' using errcode = '42501';
  end if;

  return query
  select i.id, i.email, i.role, i.created_at, pr.id is not null, pr.display_name
  from public.invitations i
  left join public.profiles pr on pr.email = i.email
  where i.project_id = p_project_id and i.status = 'pending'
  order by i.created_at desc;
end;
$$;

revoke execute on function public.check_invitee(uuid, text)              from public, anon;
revoke execute on function public.project_pending_invitations(uuid)      from public, anon;
grant  execute on function public.check_invitee(uuid, text)              to authenticated;
grant  execute on function public.project_pending_invitations(uuid)      to authenticated;

revoke execute on function public.my_pending_invitations() from public, anon;
revoke execute on function public.accept_invitation(uuid)  from public, anon;
revoke execute on function public.decline_invitation(uuid) from public, anon;
grant  execute on function public.my_pending_invitations() to authenticated;
grant  execute on function public.accept_invitation(uuid)  to authenticated;
grant  execute on function public.decline_invitation(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Read views (security_invoker: RLS of the caller applies)
-- -----------------------------------------------------------------------------

-- Current Version of every Environment = its latest Release (ADR 0002).
create view public.environment_versions
with (security_invoker = true) as
select distinct on (r.environment_id)
  r.environment_id,
  r.project_id,
  r.id as release_id,
  r.version,
  r.released_at
from public.releases r
order by r.environment_id, r.released_at desc, r.created_at desc;

-- Everything the dashboard card needs, for the current user's Projects.
create view public.project_cards
with (security_invoker = true) as
select
  p.id,
  p.name,
  p.description,
  p.status,
  p.tech_tags,
  p.last_activity_at,
  m.role                               as my_role,
  pin.pinned_at,
  ev.version                           as production_version,
  coalesce(open_tasks.count, 0)::int   as open_task_count
from public.projects p
join public.project_members m
  on m.project_id = p.id and m.user_id = (select auth.uid())
left join public.project_pins pin
  on pin.project_id = p.id and pin.user_id = m.user_id
left join lateral (
  select r.id from public.repositories r
  where r.project_id = p.id
  order by r.position, r.created_at
  limit 1
) primary_repo on true
left join lateral (
  select e.id from public.environments e
  where e.repository_id = primary_repo.id and e.kind = 'production'
  order by e.position, e.created_at
  limit 1
) prod_env on true
left join public.environment_versions ev
  on ev.environment_id = prod_env.id
left join lateral (
  select count(*) from public.tasks t
  join public.board_columns c on c.id = t.column_id
  where t.project_id = p.id and not c.is_done
) open_tasks on true;

grant select on public.environment_versions, public.project_cards to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime: the Board, plus Invitations for the notification bell.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.tasks, public.board_columns, public.task_labels, public.invitations;
