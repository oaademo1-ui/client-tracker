# Intelligence Layer

## v1: None
No AI features in v1. The app is pure rule-based CRUD with date math.

## Later: Messy Inputs → Structured Tasks
Free-text entry like "remind Sarah to call Acme about the invoice by Friday, it's urgent" auto-parsed into:

```json
{
  "title": "Call Acme about the invoice",
  "assignee": "Sarah",
  "due_date": "2025-01-10",
  "priority": "high",
  "notes": "remind Sarah to call Acme about the invoice",
  "source": "natural-language-input",
  "confidence": 0.82,
  "review_status": "unreviewed"
}
```

## Events to Track
- `task.created` — new task added
- `task.completed` — status changed to completed
- `task.overdue` — due_date passed while status != completed
- `task.updated` — any field changed

## Scoring Rules (rule-based, later)
- **Overdue score** = days_past_due × priority_weight (high=3, med=2, low=1)
- **Urgency rank** = sort by (overdue_score DESC, due_date ASC, priority DESC)
- Tasks ranked 1–5 = "Needs attention today"

## What Gets Ranked
The task list, sorted by urgency so the most pressing items surface first.

## v1 vs Later
- **v1:** manual entry, manual status, simple overdue flag (red highlight)
- **Later:** natural-language parsing, auto-priority, urgency ranking, overdue summaries
