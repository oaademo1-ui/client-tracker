# Data Model

## tasks
| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | nullable (owner-scoping added at lock-down) |
| title | text | not null |
| notes | text | nullable |
| due_date | date | nullable |
| priority | text | `low` / `medium` / `high`, default `medium` |
| status | text | `todo` / `in_progress` / `completed`, default `todo` |
| assignee_id | uuid | FK → people(id), nullable |
| created_at | timestamptz | default now() |

**Relationships:** many-to-one with `people` (assignee).
**RLS:** authenticated users can only read and mutate rows where `auth.uid() = user_id`.

## people
| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| user_id | uuid | nullable |
| name | text | not null |
| email | text | nullable |
| role | text | nullable (e.g. "Owner", "Designer") |
| created_at | timestamptz | default now() |

**Relationships:** one-to-many with `tasks`.
**RLS:** authenticated users can only read and mutate rows where `auth.uid() = user_id`.

## activities
| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| user_id | uuid | nullable |
| task_id | uuid | FK → tasks(id), nullable |
| action | text | e.g. `created`, `completed`, `updated` |
| description | text | nullable, human-readable detail |
| created_at | timestamptz | default now() |

**Relationships:** many-to-one with `tasks`.
**RLS:** authenticated users can read and append only their own activity rows.

## AI Fields (later phases)
If auto-priority or auto-summary are added, each AI field stores: `value` + `source text` + `confidence numeric` + `review_status text default 'unreviewed'`. Not present in v1.
