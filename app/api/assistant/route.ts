import { APICallError, generateText, Output } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const MODEL = "deepseek/deepseek-v4-flash";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const requestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("draft"), input: z.string().trim().min(3).max(1200) }),
  z.object({ mode: z.literal("digest") }),
]);

const draftSchema = z.object({
  title: z.string().min(1).max(160),
  notes: z.string().max(1200),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  priority: z.enum(["low", "medium", "high"]),
  assignee_id: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  explanation: z.string().max(240),
});

type TeamMember = { id: string; name: string; role: string | null };
type OpenTask = { title: string; notes: string | null; due_date: string | null; priority: string; status: string; assignee: { name: string } | { name: string }[] | null };

function localDraft(input: string, people: TeamMember[]) {
  const normalized = input.trim().replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();
  const person = people.find(member => lower.includes(member.name.toLowerCase()) || lower.includes(member.name.split(" ")[0].toLowerCase()));
  const today = new Date();
  const due = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let dueDate: string | null = null;
  if (/\btomorrow\b/.test(lower)) { due.setDate(due.getDate() + 1); dueDate = due.toISOString().slice(0, 10); }
  else if (/\btoday\b/.test(lower)) dueDate = due.toISOString().slice(0, 10);
  const isoDate = normalized.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (isoDate) dueDate = isoDate;
  const priority = /\b(urgent|asap|critical|high priority)\b/.test(lower) ? "high" : /\b(low priority|when possible|no rush)\b/.test(lower) ? "low" : "medium";
  const title = normalized.replace(/^(please\s+)?(ask|tell|remind)\s+/i, "").replace(/[.!]+$/, "").slice(0, 160);
  return draftSchema.parse({
    title: title.charAt(0).toUpperCase() + title.slice(1),
    notes: normalized,
    due_date: dueDate,
    priority,
    assignee_id: person?.id ?? null,
    confidence: 0.62,
    explanation: "Created with the built-in fallback because the hosted AI provider is unavailable.",
  });
}

function localDigest(tasks: OpenTask[]) {
  if (tasks.length === 0) return "• No open tasks right now.\n• Best next action: add the next concrete task for your team.";
  const today = new Date().toISOString().slice(0, 10);
  const ranked = [...tasks].sort((a, b) => Number(b.due_date !== null && b.due_date < today) - Number(a.due_date !== null && a.due_date < today) || Number(b.priority === "high") - Number(a.priority === "high"));
  const bullets = ranked.slice(0, 5).map(task => {
    const owner = Array.isArray(task.assignee) ? task.assignee[0]?.name : task.assignee?.name;
    const timing = task.due_date && task.due_date < today ? "overdue" : task.due_date ? `due ${task.due_date}` : "no due date";
    return `• ${task.title} — ${timing}${owner ? `, owner: ${owner}` : ""}`;
  });
  return `${bullets.join("\n")}\n• Best next action: start with ${ranked[0].title}.`;
}

async function openRouterText(messages: { role: "system" | "user"; content: string }[], json = false) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://client-tracker-oaademo.vercel.app", "X-Title": "Client Tracker" },
    body: JSON.stringify({ model: MODEL, messages, ...(json ? { response_format: { type: "json_object" } } : {}) }),
  });
  if (!response.ok) throw Object.assign(new Error(`OpenRouter request failed (${response.status})`), { statusCode: response.status });
  const result = await response.json() as { choices?: { message?: { content?: string } }[] };
  const text = result.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter returned an empty response");
  return text;
}

function errorResponse(error: unknown) {
  const statusCode = APICallError.isInstance(error)
    ? error.statusCode
    : typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : undefined;
  if (statusCode === 401) {
    console.error("Smart assistant authentication error", error);
    return Response.json({ error: "The assistant provider credentials are invalid." }, { status: 503 });
  }
  if (statusCode === 402 || statusCode === 403) {
    console.error("Smart assistant configuration error", error);
    return Response.json({ error: "The assistant needs an active AI Gateway billing account." }, { status: 503 });
  }
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) return Response.json({ error: "The assistant is busy. Please try again shortly." }, { status: 429 });
  }
  console.error("Smart assistant error", error);
  return Response.json({ error: "The assistant could not complete that request." }, { status: 500 });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid assistant request." }, { status: 400 });

  try {
    if (parsed.data.mode === "draft") {
      const { data: people, error } = await supabase.from("people").select("id, name, role").order("name");
      if (error) throw error;
      const today = new Date().toISOString().slice(0, 10);
      const system = "You turn messy work requests into a single task draft. Return only JSON with title, notes, due_date, priority, assignee_id, confidence, and explanation. Never invent a person. Return null for an unknown assignee or missing due date.";
      const prompt = `Current date: ${today}\nTeam members: ${JSON.stringify(people ?? [])}\nRequest: ${parsed.data.input}`;
      let output;
      let usage = null;
      try {
        const result = await generateText({ model: MODEL, output: Output.object({ schema: draftSchema }), system, prompt, providerOptions: { gateway: { user: user.id, tags: ["feature:smart-assistant", "action:draft-task"] } } });
        output = result.output; usage = result.usage;
      } catch (gatewayError) {
        console.warn("AI Gateway unavailable; trying OpenRouter", gatewayError);
        try { output = draftSchema.parse(JSON.parse(await openRouterText([{ role: "system", content: system }, { role: "user", content: prompt }], true))); }
        catch (providerError) { console.warn("OpenRouter unavailable; using local draft fallback", providerError); output = localDraft(parsed.data.input, (people ?? []) as TeamMember[]); }
      }
      const validAssigneeIds = new Set((people ?? []).map(person => person.id));
      const draft = {
        ...output,
        assignee_id: output.assignee_id && validAssigneeIds.has(output.assignee_id) ? output.assignee_id : null,
      };
      return Response.json({ mode: "draft", draft, usage });
    }

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("title, notes, due_date, priority, status, assignee:people(name)")
      .neq("status", "completed")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(100);
    if (error) throw error;

    const system = "Write a concise daily work digest from the supplied tasks. Lead with overdue and high-priority work, name owners when available, and end with the single best next action. Do not invent facts. Use short bullets and no heading.";
    const prompt = `Current date: ${new Date().toISOString().slice(0, 10)}\nOpen tasks: ${JSON.stringify(tasks ?? [])}`;
    let text: string;
    let usage = null;
    try {
      const result = await generateText({ model: MODEL, system, prompt, providerOptions: { gateway: { user: user.id, tags: ["feature:smart-assistant", "action:overdue-digest"] } } });
      text = result.text; usage = result.usage;
    } catch (gatewayError) {
      console.warn("AI Gateway unavailable; trying OpenRouter", gatewayError);
      try { text = await openRouterText([{ role: "system", content: system }, { role: "user", content: prompt }]); }
      catch (providerError) { console.warn("OpenRouter unavailable; using local digest fallback", providerError); text = localDigest((tasks ?? []) as OpenTask[]); }
    }
    return Response.json({ mode: "digest", digest: text, usage });
  } catch (error) {
    return errorResponse(error);
  }
}
