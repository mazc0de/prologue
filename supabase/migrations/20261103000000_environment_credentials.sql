-- Credentials: test accounts for logging in to an Environment (e.g. Merchant Code, CID,
-- Username, Password). An Environment can have many; each is a label plus an ordered list of
-- named fields, stored as jsonb: [{"name": "Username", "value": "demo"}, ...].
--
-- Like .env files, only Owners and Editors can read them: Viewers can't, not even through the API.
-- Stored as plain text, protected by RLS only.
--
-- Run this after 20261102030000_environment_env_files.sql.

begin;

create table public.environment_credentials (
  id              uuid primary key default gen_random_uuid(),
  environment_id  uuid not null,
  project_id      uuid not null,
  label           text not null check (char_length(btrim(label)) between 1 and 60),
  fields          jsonb not null default '[]'::jsonb check (
                    jsonb_typeof(fields) = 'array'
                    and jsonb_array_length(fields) <= 30
                    and octet_length(fields::text) <= 16384
                  ),
  position        double precision not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (environment_id, project_id) references public.environments (id, project_id) on delete cascade
);
create index environment_credentials_environment_idx on public.environment_credentials (environment_id, position);
create index environment_credentials_project_idx on public.environment_credentials (project_id);

create trigger environment_credentials_updated_at before update on public.environment_credentials
  for each row execute function private.set_updated_at();
create trigger environment_credentials_touch after insert or update or delete on public.environment_credentials
  for each row execute function private.touch_project();

alter table public.environment_credentials enable row level security;

create policy "environment_credentials: editors read" on public.environment_credentials
  for select to authenticated using (private.can_edit(project_id));
create policy "environment_credentials: editors insert" on public.environment_credentials
  for insert to authenticated with check (private.can_edit(project_id));
create policy "environment_credentials: editors update" on public.environment_credentials
  for update to authenticated using (private.can_edit(project_id)) with check (private.can_edit(project_id));
create policy "environment_credentials: editors delete" on public.environment_credentials
  for delete to authenticated using (private.can_edit(project_id));

commit;
