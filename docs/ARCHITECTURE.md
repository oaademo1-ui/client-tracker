# Architecture

## Stack
- **Frontend:** Next.js (App Router) + Tailwind CSS
- **Backend:** Supabase (Postgres + RLS)
- **Hosting:** Vercel

## Build Now vs Later
**Now (v1):** Task CRUD, person management, status board, overdue highlighting, seed demo data, open reads/writes.

**Next:** Login/signup, per-user data isolation, task search/filter, sort by due date/priority.

**Later:** Activity timeline view, recurring tasks, email reminders, export to CSV.

## Key User Action Flow (Create + Complete a Task)
1. User opens app — sees task board with seeded demo tasks (no login)
2. User clicks "New Task" — fills title, notes, due date, priority, picks assignee from people list
3. Form submits → INSERT into `tasks` table → list re-fetches → new task appears in "To Do"
4. Next day: task with past due date and non-completed status renders red ("Overdue")
5. User clicks "Complete" → UPDATE status to `completed` → task moves to "Completed" section → row in `activities` logged

## Layer Plan
1. **Data layer:** `tasks`, `people`, `activities` tables + RLS (open for demo)
2. **App logic:** CRUD server actions, overdue calculation, status grouping
3. **Smart features (later):** auto-priority suggestions, overdue summaries, natural-language task entry

## Why the Core Runs Without AI
Every v1 action is direct SQL CRUD + simple date comparison for overdue. No AI dependency. The app is fully functional as a plain task tracker. Intelligence is additive, not foundational.
