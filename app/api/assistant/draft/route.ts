import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MODEL = "deepseek/deepseek-v4-flash";

function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Smart assistant is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const people = Array.isArray(body?.people) ? body.people.filter((p: unknown): p is { id: string; name: string } =>
    !!p && typeof p === "object" && typeof (p as { id?: unknown }).id === "string" && typeof (p as { name?: unknown }).name === "string"
  ) : [];
  if (!text) return NextResponse.json({ error: "Describe the task first." }, { status: 400 });

  const peopleList = people.length ? people.map((p: { id: string; name: string }) => `${p.id}: ${p.name}`).join("\n") : "(no team members yet)";

  const system = `You turn a short, messy task description into structured task data for a task tracker. Reply with ONLY a JSON object, no prose, matching this shape:
{"title": string, "notes": string, "due_date": "YYYY-MM-DD" or null, "priority": "low" | "medium" | "high", "assignee_id": string or null, "confidence": number between 0 and 1}

Rules:
- "title" is a short imperative summary (max ~8 words), not the raw input.
- "notes" keeps any useful detail from the input; empty string if none.
- Resolve relative dates ("tomorrow", "Friday", "next week") against today's date: ${todayLocal()}. Use null if no date is implied.
- Default priority is "medium"; use "high" for urgent/ASAP/overdue-sounding language, "low" for casual/no-rush language.
- Match "assignee_id" to one of these people by name if the input names someone, else null:
${peopleList}
- "confidence" reflects how sure you are about the extraction overall.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Client Tracker Smart Assistant",
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ error: `Assistant request failed (${response.status}).`, detail }, { status: 502 });
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return NextResponse.json({ error: "Assistant returned an empty response." }, { status: 502 });

    let draft: unknown;
    try { draft = JSON.parse(content); } catch { return NextResponse.json({ error: "Assistant returned invalid data." }, { status: 502 }); }

    const d = draft as Record<string, unknown>;
    const validPeopleIds = new Set(people.map((p: { id: string; name: string }) => p.id));
    const priority = d.priority === "high" || d.priority === "low" ? d.priority : "medium";
    const assigneeId = typeof d.assignee_id === "string" && validPeopleIds.has(d.assignee_id) ? d.assignee_id : "";
    const dueDate = typeof d.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.due_date) ? d.due_date : "";
    const title = typeof d.title === "string" && d.title.trim() ? d.title.trim().slice(0, 200) : text.slice(0, 80);
    const notes = typeof d.notes === "string" ? d.notes.trim().slice(0, 2000) : "";
    const confidence = typeof d.confidence === "number" && d.confidence >= 0 && d.confidence <= 1 ? d.confidence : 0.5;

    return NextResponse.json({ title, notes, due_date: dueDate, priority, assignee_id: assigneeId, confidence });
  } catch {
    return NextResponse.json({ error: "Could not reach the smart assistant." }, { status: 502 });
  }
}
