# Tasks & Sprints

## Sprint 1 — Core Task Engine (v1 functional) ✅
**Goal:** Create, view, complete, edit, and delete tasks against the database with no login wall.

- [ ] Create `tasks`, `people`, `activities` tables + seed data (migration SQL)
- [ ] Build task board: three columns (To Do, In Progress, Completed) with seeded tasks
- [ ] New Task form: title, notes, due date, priority, assignee dropdown from people
- [ ] Insert task → appears in To Do column
- [ ] Complete button → moves task to Completed + logs activity
- [ ] Edit task form → updates fields in DB
- [ ] Delete task → removes from DB + list
- [ ] Overdue highlight: tasks with due_date < today and status != completed render red
- [ ] People management: add/list people (minimal)
- [ ] Empty state: "No tasks yet — create your first task"
- [ ] Loading + error states on all fetches

**Definition of Done:** Owner creates a task assigned to a person with a due date, sees it in the list, it turns red when overdue, marks it completed, and it moves to Completed — all without logging in.

## Sprint 2 — Polish & Filter
**Goal:** Make the board usable for daily work.

- [x] Filter by assignee, priority, status
- [x] Sort by due date / priority
- [x] Overdue badge count in header
- [x] Responsive mobile layout
- [x] Confirm-before-delete dialog
- [x] Activity log visible per task (history)

**Definition of Done:** User filters tasks by assignee, sees only Sarah's tasks, sorts by due date, and sees activity history on a task.

## Sprint 3 — Lock It Down (Auth & RLS)
**Goal:** Secure the app for real multi-user use.

- [ ] Add Supabase Auth (email/password + magic link)
- [ ] Sign up / log in / log out screens
- [ ] Replace open RLS with `auth.uid() = user_id` on all tables
- [ ] Seed data scoped to first user or removed
- [ ] Redirect unauthenticated users to login (app no longer public)
- [ ] User can only see their own tasks/people/activities

**Definition of Done:** Two different users log in and each sees only their own tasks. No cross-user data leakage.

## Text Gantt
```
Sprint 1:  [===== Core Task Engine =====]
Sprint 2:         [== Polish & Filter ==]
Sprint 3:                [== Lock Down ==]
```
