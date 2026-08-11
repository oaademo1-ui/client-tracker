# Security

## Secret Handling
- Supabase service key stays server-side only (server actions / route handlers)
- Anon key is safe for frontend; used with RLS
- No secrets in client bundles or environment variables exposed to browser

## Permission Model
- **Current:** email/password and magic-link authentication are required. Every table uses `auth.uid() = user_id` RLS policies; users only see and mutate their own tasks, people, and activities.
- **Relational ownership:** composite foreign keys prevent a task from referencing another user's person and prevent an activity from referencing another user's task.
- **Legacy demo:** the original anonymous seed rows and permissive policies were removed in the Sprint 3 lockdown migration.
- Agent (when added) inherits the logged-in user's permissions — can only act on rows the user owns

## Approved-Tools Rule
- Agent may only call explicitly named tools (`draft_task_from_text`, `suggest_priority`, `generate_overdue_digest`)
- No raw SQL execution, no arbitrary API calls, no `run_any`/`send_any` patterns
- Every agentic action is logged to audit trail

## Audit Principle
Every meaningful state change (create, update status, delete, agent action) writes a row to `activities` or `audit_logs` with actor, action, entity, and timestamp. Survives refresh. Server-derived truth.
