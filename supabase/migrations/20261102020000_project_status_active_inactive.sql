-- Project Status is now just Active or Inactive.
--
-- Paused / Done / Archived become Inactive (e.g. a Project that moved to a new repository).
-- Inactive Projects are hidden from the dashboard overview and the sidebar; the Projects page
-- shows them under its Inactive tab.
--
-- Run this after 20261102010000_single_repository.sql.

begin;

-- project_cards selects projects.status, so it has to be dropped while the column changes type.
drop view public.project_cards;

alter type public.project_status rename to project_status_old;
create type public.project_status as enum ('active', 'inactive');

alter table public.projects alter column status drop default;
alter table public.projects
  alter column status type public.project_status
  using (case when status::text = 'active' then 'active' else 'inactive' end)::public.project_status;
alter table public.projects alter column status set default 'active';

drop type public.project_status_old;

-- Recreated unchanged from 20261102000000_init.sql.
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

grant select on public.project_cards to authenticated;

commit;
