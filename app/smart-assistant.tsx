"use client";

import { FormEvent, useState } from "react";
import type { Person, Priority } from "@/lib/types";

export type AssistantDraft = {
  title: string;
  notes: string;
  due_date: string | null;
  priority: Priority;
  assignee_id: string | null;
  confidence: number;
  explanation: string;
};

export default function SmartAssistant({ people, onUseDraft, onClose }: { people: Person[]; onUseDraft: (draft: AssistantDraft) => void; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<AssistantDraft | null>(null);
  const [digest, setDigest] = useState("");
  const [loading, setLoading] = useState<"draft" | "digest" | null>(null);
  const [error, setError] = useState("");

  async function callAssistant(body: { mode: "draft"; input: string } | { mode: "digest" }) {
    const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Assistant request failed.");
    return result;
  }

  async function createDraft(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    setLoading("draft"); setError(""); setDraft(null);
    try { const result = await callAssistant({ mode: "draft", input: input.trim() }); setDraft(result.draft); }
    catch (err) { setError(err instanceof Error ? err.message : "Assistant request failed."); }
    finally { setLoading(null); }
  }

  async function createDigest() {
    setLoading("digest"); setError(""); setDigest("");
    try { const result = await callAssistant({ mode: "digest" }); setDigest(result.digest); }
    catch (err) { setError(err instanceof Error ? err.message : "Assistant request failed."); }
    finally { setLoading(null); }
  }

  const assignee = people.find(person => person.id === draft?.assignee_id);

  return <div className="fixed inset-0 z-50 grid place-items-end bg-[#1f201d]/35 backdrop-blur-[2px] sm:place-items-center sm:p-4" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label="Smart Assistant" className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/50 bg-[#fdfdfb] pb-[env(safe-area-inset-bottom)] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e5e5df] bg-[#fdfdfb] px-4 py-4 sm:px-6 sm:py-5"><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#76786f]">DeepSeek V4 Flash</p><h2 className="text-xl font-semibold tracking-tight">Smart Assistant</h2><p className="mt-1 text-xs text-[#7e7f77]">Draft tasks and focus your day. Nothing is saved without your approval.</p></div><button onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-lg text-xl text-[#85867f] hover:bg-[#f0f0eb]" aria-label="Close assistant">×</button></header>
      <div className="space-y-6 p-4 sm:p-6">
        {error && <p role="alert" className="rounded-lg border border-[#e2b4b4] bg-[#fff4f2] px-4 py-3 text-sm text-[#8d3535]">{error}</p>}
        <section><h3 className="text-sm font-semibold">Turn a message into a task</h3><p className="mt-1 text-xs text-[#777970]">Try: “Ask Marcus to call Acme about the overdue invoice tomorrow, urgent.”</p>
          <form onSubmit={createDraft} className="mt-3 space-y-3"><textarea aria-label="Describe a task" rows={4} maxLength={1200} value={input} onChange={event => setInput(event.target.value)} placeholder="Describe what needs to happen…" /><button disabled={loading !== null || input.trim().length < 3} className="button-primary w-full sm:w-auto">{loading === "draft" ? "Drafting…" : "Draft task"}</button></form>
        </section>
        {draft && <section className="rounded-xl border border-[#dadad3] bg-[#f6f6f1] p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{draft.title}</h3><span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#696b63]">{Math.round(draft.confidence * 100)}% confidence</span></div>{draft.notes && <p className="mt-2 text-sm leading-6 text-[#66685f]">{draft.notes}</p>}<dl className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-[#8a8b83]">Priority</dt><dd className="mt-1 font-semibold capitalize">{draft.priority}</dd></div><div><dt className="text-[#8a8b83]">Due</dt><dd className="mt-1 font-semibold">{draft.due_date || "Not set"}</dd></div><div><dt className="text-[#8a8b83]">Assignee</dt><dd className="mt-1 font-semibold">{assignee?.name || "Unassigned"}</dd></div></dl><p className="mt-4 text-xs text-[#777970]">{draft.explanation}</p><button onClick={() => onUseDraft(draft)} className="button-primary mt-4 w-full sm:w-auto">Review and create</button></section>}
        <section className="border-t border-[#e5e5df] pt-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="text-sm font-semibold">What needs attention?</h3><p className="mt-1 text-xs text-[#777970]">Summarize open, overdue, and high-priority work.</p></div><button onClick={() => void createDigest()} disabled={loading !== null} className="button-secondary shrink-0">{loading === "digest" ? "Summarizing…" : "Generate focus summary"}</button></div>{digest && <div className="mt-4 whitespace-pre-wrap rounded-xl border border-[#dadad3] bg-white p-4 text-sm leading-6 text-[#55574f]">{digest}</div>}</section>
      </div>
    </section>
  </div>;
}
