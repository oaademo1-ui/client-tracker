# Agentic Layer

## v1: None
No agentic actions in v1. All task operations are direct user actions.

## Later: Draftable Actions (low risk — auto)
- **Draft task from text input:** parse free text → pre-fill task form → user reviews and submits
- **Auto-tag priority:** suggest priority based on keywords ("urgent", "ASAP" → high)
- **Draft overdue summary:** generate a daily "what's overdue" digest text

Each draft stores `source` + `confidence` + `review_status`. Drafts never persist directly.

## Executable After Approval (medium risk — light approval)
- **Create task** from parsed input (user clicks "Accept")
- **Update task status** (agent marks completed after confirmation)
- **Reassign task** (agent suggests, user confirms)

## Human-Only (high risk — always manual)
- **Delete task** — never automated
- **Bulk delete / archive** — never automated

## Named Tools
- `draft_task_from_text(text) → task_draft`
- `suggest_priority(title, notes) → priority_label`
- `generate_overdue_digest() → summary_text`

No raw `run_any` / `send_any` tools. Agent only calls named, scoped tools.

## Audit Log Fields
`action`, `entity_type`, `entity_id`, `actor` (user or agent), `metadata jsonb`, `created_at`.

## v1 vs Later
- **v1:** zero agentic features
- **Later:** text-to-task drafts, auto-priority, overdue digests, agent-assisted reassignment
