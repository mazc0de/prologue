-- One Repository per Project, and branches entered by hand.
--
-- 1. A Project has at most one Repository (unique index on project_id).
-- 2. A new Repository no longer gets hard-coded `main` / `develop` Environments from a trigger.
--    The client calls `create_repository(...)` with the branch names the user typed; it inserts
--    the Repository and its Production (and optional Development) Environment in one transaction.
--
-- Run this after 20261102000000_init.sql (SQL Editor, or `supabase db push`).

-- Refuse to run while a Project still has several Repositories, instead of deleting any.
do $$
declare
  v_project uuid;
begin
  select project_id into v_project
  from public.repositories
  group by project_id
  having count(*) > 1
  limit 1;

  if v_project is not null then
    raise exception 'Project % has more than one Repository. Delete the extra ones, then run this migration again.', v_project;
  end if;
end;
$$;

create unique index repositories_one_per_project on public.repositories (project_id);

drop trigger if exists on_repository_created on public.repositories;
drop function if exists private.handle_new_repository();

-- SECURITY INVOKER: the caller's RLS applies, so only Owners and Editors can create one.
create or replace function public.create_repository(
  p_project_id          uuid,
  p_name                text,
  p_url                 text,
  p_production_branch   text,
  p_development_branch  text default null
)
returns uuid  -- repository id
language plpgsql security invoker set search_path = ''
as $$
declare
  v_repo_id uuid;
begin
  if nullif(btrim(p_production_branch), '') is null then
    raise exception 'Production branch is required' using errcode = '23514';
  end if;

  insert into public.repositories (project_id, name, url)
  values (p_project_id, btrim(p_name), btrim(p_url))
  returning id into v_repo_id;

  insert into public.environments (repository_id, project_id, name, kind, branch, position)
  values (v_repo_id, p_project_id, 'Production', 'production', btrim(p_production_branch), 1000);

  if nullif(btrim(p_development_branch), '') is not null then
    insert into public.environments (repository_id, project_id, name, kind, branch, position)
    values (v_repo_id, p_project_id, 'Development', 'development', btrim(p_development_branch), 2000);
  end if;

  return v_repo_id;
exception
  when unique_violation then
    if sqlerrm like '%repositories_one_per_project%' then
      raise exception 'This Project already has a Repository' using errcode = '23505';
    end if;
    raise;
end;
$$;

revoke execute on function public.create_repository(uuid, text, text, text, text) from public, anon;
grant execute on function public.create_repository(uuid, text, text, text, text) to authenticated;
