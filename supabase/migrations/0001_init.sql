create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  email text,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  notes text,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'completed')),
  assignee_id uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  task_id uuid references public.tasks(id) on delete cascade,
  action text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;

drop policy if exists "people_v1_read" on public.people;
create policy "people_v1_read" on public.people for select to anon, authenticated using (true);
drop policy if exists "people_v1_write" on public.people;
create policy "people_v1_write" on public.people for all to anon, authenticated using (true) with check (true);
drop policy if exists "tasks_v1_read" on public.tasks;
create policy "tasks_v1_read" on public.tasks for select to anon, authenticated using (true);
drop policy if exists "tasks_v1_write" on public.tasks;
create policy "tasks_v1_write" on public.tasks for all to anon, authenticated using (true) with check (true);
drop policy if exists "activities_v1_read" on public.activities;
create policy "activities_v1_read" on public.activities for select to anon, authenticated using (true);
drop policy if exists "activities_v1_write" on public.activities;
create policy "activities_v1_write" on public.activities for all to anon, authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.people, public.tasks, public.activities to anon, authenticated;

insert into public.people (id, name, email, role) values
  ('a1111111-1111-1111-1111-111111111111', 'Sarah Chen', 'sarah@brightco.com', 'Owner'),
  ('a2222222-2222-2222-2222-222222222222', 'Marcus Lee', 'marcus@brightco.com', 'Designer'),
  ('a3333333-3333-3333-3333-333333333333', 'Priya Patel', 'priya@brightco.com', 'Operations')
on conflict (id) do nothing;

insert into public.tasks (id, title, notes, due_date, priority, status, assignee_id) values
  ('b1111111-1111-1111-1111-111111111111', 'Follow up with Acme re: invoice #204', 'Email Sarah at Acme about the overdue invoice. Attach the statement.', current_date + 1, 'high', 'todo', 'a1111111-1111-1111-1111-111111111111'),
  ('b2222222-2222-2222-2222-222222222222', 'Review website mockups', 'Check Marcus''s latest designs for the landing page and leave feedback.', current_date - 2, 'medium', 'todo', 'a2222222-2222-2222-2222-222222222222'),
  ('b3333333-3333-3333-3333-333333333333', 'Order office supplies', 'Need printer paper, pens, and coffee for the team.', current_date + 5, 'low', 'todo', 'a3333333-3333-3333-3333-333333333333'),
  ('b4444444-4444-4444-4444-444444444444', 'Send welcome email to new client', 'Onboard Globex Corp with a welcome packet and next steps.', current_date - 5, 'high', 'completed', 'a1111111-1111-1111-1111-111111111111'),
  ('b5555555-5555-5555-5555-555555555555', 'Schedule team check-in', 'Book a 30-min sync for next week to review Q1 priorities.', current_date + 3, 'medium', 'in_progress', 'a3333333-3333-3333-3333-333333333333')
on conflict (id) do nothing;

insert into public.activities (id, task_id, action, description) values
  ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'created', 'Task created and assigned to Sarah Chen'),
  ('c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'created', 'Task created and assigned to Marcus Lee'),
  ('c3333333-3333-3333-3333-333333333333', 'b4444444-4444-4444-4444-444444444444', 'created', 'Task created and assigned to Sarah Chen'),
  ('c4444444-4444-4444-4444-444444444444', 'b4444444-4444-4444-4444-444444444444', 'completed', 'Task marked as completed'),
  ('c5555555-5555-5555-5555-555555555555', 'b5555555-5555-5555-5555-555555555555', 'created', 'Task created and assigned to Priya Patel'),
  ('c6666666-6666-6666-6666-666666666666', 'b5555555-5555-5555-5555-555555555555', 'updated', 'Status changed from todo to in progress')
on conflict (id) do nothing;
