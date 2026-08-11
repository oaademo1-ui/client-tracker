# Client Tracker — Product Requirements

## Problem
Small business owners and teams track daily tasks, follow-ups, and to-dos across spreadsheets, sticky notes, and WhatsApp. Things get lost, overdue items are missed, and no one knows who owns what.

## Target User
Small business owners (1–10 person teams) and their team members who need a shared, simple task list.

## Core Objects
- **Task** — title, notes, due date, priority, status, assignee
- **Person** — name, email, role (team member who can be assigned tasks)
- **Activity** — timestamped log of task status changes

## MVP (v1) — Must-haves
- [ ] Create a task with title, notes, due date, priority, assignee
- [ ] View all tasks in a list grouped/filterable by status (To Do / In Progress / Completed)
- [ ] Mark a task as completed (toggle status)
- [ ] Edit a task's fields
- [ ] Delete a task
- [ ] See overdue tasks highlighted (due date < today and status != completed)
- [ ] Add/manage people (team members) to assign tasks to
- [ ] All screens viewable without login (demo with seed data)

## Non-goals (v1)
- Chat / messaging
- Complex reports or analytics dashboards
- Payment / billing system
- AI features
- Calendar integration
- File attachments
- Subtasks

## Success Criteria
A owner opens the app, creates a task "Follow up with Acme re: invoice" assigned to Sarah, due tomorrow, high priority. The task appears in the list. Tomorrow it shows as overdue (red). The owner marks it completed; it moves to the Completed section. This round-trip works without logging in.
