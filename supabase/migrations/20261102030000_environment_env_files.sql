-- Replace an Environment's labelled URLs with its .env file.
--
-- 1. Drop environment_urls and everything in it (its trigger and policies go with the table).
-- 2. Add environment_env_files: at most one .env per Environment, stored as plain text.
--    Unlike other Project content, only Owners and Editors can read it: Viewers can't, not even
--    through the API. An Environment with no .env has no row (the client deletes it when emptied).
--
-- Run this after 20261102020000_project_status_active_inactive.sql.

begin;

drop table public.environment_urls;

create table public.environment_env_files (
  environment_id  uuid primary key,
  project_id      uuid not null,
  content         text not null check (char_length(content) between 1 and 65536),
  updated_at      timestamptz not null default now(),
  foreign key (environment_id, project_id) references public.environments (id, project_id) on delete cascade
);
create index environment_env_files_project_idx on public.environment_env_files (project_id);

create trigger environment_env_files_updated_at before update on public.environment_env_files
  for each row execute function private.set_updated_at();
create trigger environment_env_files_touch after insert or update or delete on public.environment_env_files
  for each row execute function private.touch_project();

alter table public.environment_env_files enable row level security;

create policy "environment_env_files: editors read" on public.environment_env_files
  for select to authenticated using (private.can_edit(project_id));
create policy "environment_env_files: editors insert" on public.environment_env_files
  for insert to authenticated with check (private.can_edit(project_id));
create policy "environment_env_files: editors update" on public.environment_env_files
  for update to authenticated using (private.can_edit(project_id)) with check (private.can_edit(project_id));
create policy "environment_env_files: editors delete" on public.environment_env_files
  for delete to authenticated using (private.can_edit(project_id));

commit;
