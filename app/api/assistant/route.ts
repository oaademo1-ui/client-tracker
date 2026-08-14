import { APICallError, generateText, Output } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const MODEL = "deepseek/deepseek-v4-flash";

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

function errorResponse(error: unknown) {
  const statusCode = APICallError.isInstance(error)
    ? error.statusCode
    : typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : undefined;
  if (statusCode === 401 || statusCode === 402 || statusCode === 403) {
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
      const { output, usage } = await generateText({
        model: MODEL,
        output: Output.object({ schema: draftSchema }),
        system: "You turn messy work requests into a single task draft. Never invent a person. Return null for an unknown assignee or missing due date. Interpret relative dates from the supplied current date. Keep the title concise and preserve useful context in notes.",
        prompt: `Current date: ${today}\nTeam members: ${JSON.stringify(people ?? [])}\nRequest: ${parsed.data.input}`,
        providerOptions: { gateway: { user: user.id, tags: ["feature:smart-assistant", "action:draft-task"] } },
      });
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

    const { text, usage } = await generateText({
      model: MODEL,
      system: "Write a concise daily work digest from the supplied tasks. Lead with overdue and high-priority work, name owners when available, and end with the single best next action. Do not invent facts. Use short bullets and no heading.",
      prompt: `Current date: ${new Date().toISOString().slice(0, 10)}\nOpen tasks: ${JSON.stringify(tasks ?? [])}`,
      providerOptions: { gateway: { user: user.id, tags: ["feature:smart-assistant", "action:overdue-digest"] } },
    });
    return Response.json({ mode: "digest", digest: text, usage });
  } catch (error) {
    return errorResponse(error);
  }
}
