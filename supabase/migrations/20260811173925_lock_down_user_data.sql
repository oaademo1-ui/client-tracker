-- Sprint 3: replace the public demo policies with per-user ownership.
-- The shared seed rows have no owner, so remove them before making ownership
-- mandatory. New accounts intentionally start with an empty workspace.
delete from public.activities where user_id is null;
delete from public.tasks where user_id is null;
delete from public.people where user_id is null;

alter table public.people
  alter column user_id set default auth.uid(),
  alter column user_id set not null;

alter table public.tasks
  alter column user_id set default auth.uid(),
  alter column user_id set not null;

alter table public.activities
  alter column user_id set default auth.uid(),
  alter column user_id set not null;

alter table public.people
  add constraint people_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade,
  add constraint people_id_user_id_key unique (id, user_id);

alter table public.tasks
  drop constraint tasks_assignee_id_fkey,
  add constraint tasks_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade,
  add constraint tasks_id_user_id_key unique (id, user_id),
  add constraint tasks_assignee_owner_fkey
  foreign key (assignee_id, user_id)
  references public.people(id, user_id) on delete set null (assignee_id);

alter table public.activities
  drop constraint activities_task_id_fkey,
  add constraint activities_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade,
  add constraint activities_task_owner_fkey
  foreign key (task_id, user_id)
  references public.tasks(id, user_id) on delete cascade;

drop policy if exists "people_v1_read" on public.people;
drop policy if exists "people_v1_write" on public.people;
drop policy if exists "tasks_v1_read" on public.tasks;
drop policy if exists "tasks_v1_write" on public.tasks;
drop policy if exists "activities_v1_read" on public.activities;
drop policy if exists "activities_v1_write" on public.activities;

create policy "people_select_own"
on public.people for select to authenticated
using ((select auth.uid()) = user_id);

create policy "people_insert_own"
on public.people for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "people_update_own"
on public.people for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "people_delete_own"
on public.people for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "tasks_select_own"
on public.tasks for select to authenticated
using ((select auth.uid()) = user_id);

create policy "tasks_insert_own"
on public.tasks for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "tasks_update_own"
on public.tasks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "tasks_delete_own"
on public.tasks for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "activities_select_own"
on public.activities for select to authenticated
using ((select auth.uid()) = user_id);

create policy "activities_insert_own"
on public.activities for insert to authenticated
with check ((select auth.uid()) = user_id);

revoke all on public.people, public.tasks, public.activities from anon;
grant select, insert, update, delete on public.people, public.tasks to authenticated;
grant select, insert on public.activities to authenticated;
