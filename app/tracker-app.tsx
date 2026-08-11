"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Activity, Person, Priority, Task, TaskStatus } from "@/lib/types";

const statuses: { id: TaskStatus; label: string; dot: string }[] = [
  { id: "todo", label: "To do", dot: "bg-[#8a8f98]" },
  { id: "in_progress", label: "In progress", dot: "bg-[#d9a441]" },
  { id: "completed", label: "Completed", dot: "bg-[#4f8f72]" },
];

const emptyTask = { title: "", notes: "", due_date: "", priority: "medium" as Priority, status: "todo" as TaskStatus, assignee_id: "" };

function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function Icon({ name, size = 16 }: { name: "plus" | "users" | "calendar" | "more" | "check" | "x" | "activity"; size?: number }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    activity: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

export default function TrackerApp() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabase = useMemo(() => configured ? createClient() : null, [configured]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(configured ? null : "Database connection is not configured.");
  const [notice, setNotice] = useState<string | null>(null);
  const [taskModal, setTaskModal] = useState(false);
  const [peopleModal, setPeopleModal] = useState(false);
  const [activityTask, setActivityTask] = useState<Task | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [personForm, setPersonForm] = useState({ name: "", email: "", role: "" });
  const [saving, setSaving] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("due");

  const loadData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true); setError(null);
    const [taskResult, peopleResult, activityResult] = await Promise.all([
      supabase.from("tasks").select("*, assignee:people(*)").order("created_at", { ascending: false }),
      supabase.from("people").select("*").order("name"),
      supabase.from("activities").select("*").order("created_at", { ascending: false }),
    ]);
    const failure = taskResult.error || peopleResult.error || activityResult.error;
    if (failure) setError(failure.message);
    else { setTasks((taskResult.data || []) as Task[]); setPeople((peopleResult.data || []) as Person[]); setActivities((activityResult.data || []) as Activity[]); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 2800); return () => clearTimeout(timer); }, [notice]);

  const overdueCount = tasks.filter(t => t.status !== "completed" && !!t.due_date && t.due_date < todayLocal()).length;
  const filteredTasks = useMemo(() => tasks.filter(t =>
    (assigneeFilter === "all" || t.assignee_id === assigneeFilter) &&
    (priorityFilter === "all" || t.priority === priorityFilter) &&
    (statusFilter === "all" || t.status === statusFilter)
  ).sort((a, b) => {
    if (sort === "priority") return ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]);
    return (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31");
  }), [tasks, assigneeFilter, priorityFilter, statusFilter, sort]);

  function openNewTask() { setEditing(null); setTaskForm(emptyTask); setTaskModal(true); }
  function openEdit(task: Task) { setEditing(task); setTaskForm({ title: task.title, notes: task.notes || "", due_date: task.due_date || "", priority: task.priority, status: task.status, assignee_id: task.assignee_id || "" }); setTaskModal(true); }

  async function saveTask(event: FormEvent) {
    event.preventDefault(); if (!supabase || !taskForm.title.trim()) return;
    setSaving(true); setError(null);
    const payload = { ...taskForm, title: taskForm.title.trim(), notes: taskForm.notes.trim() || null, due_date: taskForm.due_date || null, assignee_id: taskForm.assignee_id || null };
    if (editing) {
      const { error: updateError } = await supabase.from("tasks").update(payload).eq("id", editing.id);
      if (!updateError) await supabase.from("activities").insert({ task_id: editing.id, action: "updated", description: "Task details updated" });
      if (updateError) setError(updateError.message); else { setNotice("Task updated"); setTaskModal(false); await loadData(); }
    } else {
      const { data, error: insertError } = await supabase.from("tasks").insert(payload).select("id").single();
      if (!insertError && data) await supabase.from("activities").insert({ task_id: data.id, action: "created", description: "Task created" });
      if (insertError) setError(insertError.message); else { setNotice("Task created"); setTaskModal(false); await loadData(); }
    }
    setSaving(false);
  }

  async function changeStatus(task: Task, status: TaskStatus) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (!updateError) await supabase.from("activities").insert({ task_id: task.id, action: status === "completed" ? "completed" : "updated", description: status === "completed" ? "Task marked as completed" : `Status changed to ${status.replace("_", " ")}` });
    if (updateError) setError(updateError.message); else { setNotice(status === "completed" ? "Task completed" : "Status updated"); await loadData(); }
  }

  async function deleteTask(task: Task) {
    if (!supabase || !window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    const { error: deleteError } = await supabase.from("tasks").delete().eq("id", task.id);
    if (deleteError) setError(deleteError.message); else { setNotice("Task deleted"); await loadData(); }
  }

  async function savePerson(event: FormEvent) {
    event.preventDefault(); if (!supabase || !personForm.name.trim()) return;
    setSaving(true);
    const { error: insertError } = await supabase.from("people").insert({ name: personForm.name.trim(), email: personForm.email.trim() || null, role: personForm.role.trim() || null });
    if (insertError) setError(insertError.message); else { setPersonForm({ name: "", email: "", role: "" }); setNotice("Team member added"); await loadData(); }
    setSaving(false);
  }

  async function deletePerson(person: Person) {
    if (!supabase || !window.confirm(`Remove ${person.name} from the team? Assigned tasks will become unassigned.`)) return;
    const { error: deleteError } = await supabase.from("people").delete().eq("id", person.id);
    if (deleteError) setError(deleteError.message); else { setNotice("Team member removed"); await loadData(); }
  }

  return <main className="min-h-screen bg-[#f7f7f4] text-[#22231f]">
    <header className="border-b border-[#deded8] bg-[#fbfbf8]">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-5 md:px-10">
        <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-[#20211e] text-sm font-semibold text-white">CT</div><div><h1 className="text-[15px] font-semibold tracking-tight">Client Tracker</h1><p className="text-xs text-[#85867f]">Team task board</p></div></div>
        <div className="flex items-center gap-2"><button onClick={() => setPeopleModal(true)} className="button-secondary"><Icon name="users" /> <span className="hidden sm:inline">People</span></button><button onClick={openNewTask} className="button-primary"><Icon name="plus" /> New task</button></div>
      </div>
    </header>

    <section className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-11">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-3"><h2 className="text-3xl font-semibold tracking-[-0.04em]">Good morning</h2>{overdueCount > 0 && <span className="rounded-full bg-[#f6dddd] px-2.5 py-1 text-xs font-semibold text-[#9d3f3f]">{overdueCount} overdue</span>}</div><p className="text-sm text-[#777970]">Here’s what your team is working on.</p></div><div className="flex flex-wrap gap-2">
        <select className="filter-select" aria-label="Filter by assignee" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}><option value="all">All people</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select className="filter-select" aria-label="Filter by priority" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select>
        <select className="filter-select" aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{statuses.map(s => <option value={s.id} key={s.id}>{s.label}</option>)}</select>
        <select className="filter-select" aria-label="Sort tasks" value={sort} onChange={e => setSort(e.target.value)}><option value="due">Due date</option><option value="priority">Priority</option></select>
      </div></div>

      {error && <div role="alert" className="mb-6 flex items-center justify-between rounded-lg border border-[#e2b4b4] bg-[#fff4f2] px-4 py-3 text-sm text-[#8d3535]"><span>{error}</span><button onClick={() => void loadData()} className="font-semibold underline">Retry</button></div>}
      {loading ? <div className="grid gap-4 md:grid-cols-3">{statuses.map(s => <div key={s.id} className="h-64 animate-pulse rounded-xl bg-[#ecece7]" />)}</div> :
      <div className="grid gap-5 md:grid-cols-3">{statuses.map(column => {
        const columnTasks = filteredTasks.filter(t => t.status === column.id);
        return <section key={column.id} className="min-w-0"><div className="mb-3 flex items-center gap-2 px-1"><span className={`size-2 rounded-full ${column.dot}`} /><h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#62645d]">{column.label}</h3><span className="ml-auto text-xs tabular-nums text-[#96978f]">{columnTasks.length}</span></div><div className="space-y-3">{columnTasks.map(task => <TaskCard key={task.id} task={task} onEdit={() => openEdit(task)} onDelete={() => void deleteTask(task)} onStatus={status => void changeStatus(task, status)} onActivity={() => setActivityTask(task)} />)}{columnTasks.length === 0 && <button onClick={openNewTask} className="w-full rounded-xl border border-dashed border-[#d4d4cd] px-4 py-10 text-sm text-[#9a9b94] transition hover:border-[#aaa9a1] hover:text-[#65665f]">No tasks yet — create your first task</button>}</div></section>;
      })}</div>}
    </section>

    {taskModal && <Modal title={editing ? "Edit task" : "Create a new task"} subtitle={editing ? "Update the details and save your changes." : "Add a clear owner, priority, and due date."} onClose={() => setTaskModal(false)}><form onSubmit={saveTask} className="space-y-4"><Field label="Task title"><input autoFocus required value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Follow up with Acme" /></Field><Field label="Notes"><textarea rows={3} value={taskForm.notes} onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })} placeholder="Add helpful context…" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Due date"><input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} /></Field><Field label="Assignee"><select value={taskForm.assignee_id} onChange={e => setTaskForm({ ...taskForm, assignee_id: e.target.value })}><option value="">Unassigned</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Priority"><select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as Priority })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field><Field label="Status"><select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}>{statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field></div><div className="flex justify-end gap-2 border-t border-[#e5e5df] pt-4"><button type="button" className="button-secondary" onClick={() => setTaskModal(false)}>Cancel</button><button disabled={saving} className="button-primary">{saving ? "Saving…" : editing ? "Save changes" : "Create task"}</button></div></form></Modal>}

    {peopleModal && <Modal title="People" subtitle="Manage the team members who can own tasks." onClose={() => setPeopleModal(false)}><form onSubmit={savePerson} className="mb-6 grid gap-3 rounded-lg bg-[#f4f4ef] p-4 sm:grid-cols-3"><Field label="Name"><input required value={personForm.name} onChange={e => setPersonForm({ ...personForm, name: e.target.value })} placeholder="Full name" /></Field><Field label="Email"><input type="email" value={personForm.email} onChange={e => setPersonForm({ ...personForm, email: e.target.value })} placeholder="name@company.com" /></Field><Field label="Role"><input value={personForm.role} onChange={e => setPersonForm({ ...personForm, role: e.target.value })} placeholder="e.g. Operations" /></Field><button disabled={saving} className="button-primary sm:col-start-3"><Icon name="plus" /> Add person</button></form><div className="divide-y divide-[#e7e7e1]">{people.map(p => <div key={p.id} className="flex items-center gap-3 py-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e6e2d7] text-xs font-semibold">{p.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{p.name}</p><p className="truncate text-xs text-[#85867f]">{[p.role, p.email].filter(Boolean).join(" · ")}</p></div><button onClick={() => void deletePerson(p)} className="rounded-md p-2 text-[#999991] hover:bg-[#f4e7e5] hover:text-[#a33f3f]" aria-label={`Remove ${p.name}`}><Icon name="x" /></button></div>)}{people.length === 0 && <p className="py-8 text-center text-sm text-[#888981]">No people yet.</p>}</div></Modal>}

    {activityTask && <Modal title="Task history" subtitle={activityTask.title} onClose={() => setActivityTask(null)}><div className="space-y-1">{activities.filter(a => a.task_id === activityTask.id).map(a => <div key={a.id} className="flex gap-3 border-l border-[#dcdcd5] py-3 pl-4"><div className="mt-0.5 text-[#777970]"><Icon name="activity" /></div><div><p className="text-sm font-medium capitalize">{a.action.replace("_", " ")}</p><p className="text-xs text-[#797b73]">{a.description}</p><time className="mt-1 block text-[11px] text-[#a0a198]">{new Date(a.created_at).toLocaleString()}</time></div></div>)}{activities.filter(a => a.task_id === activityTask.id).length === 0 && <p className="py-8 text-center text-sm text-[#888981]">No activity recorded yet.</p>}</div></Modal>}
    {notice && <div className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg bg-[#242520] px-4 py-3 text-sm text-white shadow-xl"><Icon name="check" /> {notice}</div>}
  </main>;
}

function TaskCard({ task, onEdit, onDelete, onStatus, onActivity }: { task: Task; onEdit: () => void; onDelete: () => void; onStatus: (status: TaskStatus) => void; onActivity: () => void }) {
  const overdue = task.status !== "completed" && !!task.due_date && task.due_date < todayLocal();
  const [menu, setMenu] = useState(false);
  return <article className={`group relative rounded-xl border bg-[#fdfdfb] p-4 shadow-[0_1px_2px_rgba(35,35,30,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_5px_18px_rgba(35,35,30,.07)] ${overdue ? "border-[#dfb4af]" : "border-[#deded8]"}`}>
    <div className="mb-3 flex items-start gap-3"><button onClick={() => onStatus(task.status === "completed" ? "todo" : "completed")} aria-label={task.status === "completed" ? "Reopen task" : "Complete task"} className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition ${task.status === "completed" ? "border-[#4f8f72] bg-[#4f8f72] text-white" : "border-[#c5c5bd] hover:border-[#4f8f72]"}`}>{task.status === "completed" && <Icon name="check" size={13} />}</button><h4 className={`min-w-0 flex-1 text-[14px] font-semibold leading-5 ${task.status === "completed" ? "text-[#8d8e87] line-through" : ""}`}>{task.title}</h4><div className="relative"><button onClick={() => setMenu(!menu)} aria-label="Task actions" className="rounded p-1 text-[#94958e] hover:bg-[#f0f0eb] hover:text-[#44453f]"><Icon name="more" /></button>{menu && <div className="absolute right-0 top-7 z-10 w-36 rounded-lg border border-[#deded8] bg-white p-1 text-sm shadow-lg"><button onClick={() => { setMenu(false); onEdit(); }} className="menu-item">Edit task</button><button onClick={() => { setMenu(false); onActivity(); }} className="menu-item">View history</button><button onClick={() => { setMenu(false); onDelete(); }} className="menu-item text-[#a43d3d]">Delete task</button></div>}</div></div>
    {task.notes && <p className="mb-4 line-clamp-2 text-xs leading-5 text-[#777970]">{task.notes}</p>}
    <div className="flex flex-wrap items-center gap-2"><span className={`priority-${task.priority} rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.05em]`}>{task.priority}</span>{task.due_date && <span className={`flex items-center gap-1 text-[11px] font-medium ${overdue ? "text-[#ae4742]" : "text-[#777970]"}`}><Icon name="calendar" size={13} /> {overdue ? "Overdue · " : ""}{formatDate(task.due_date)}</span>}<span className="ml-auto flex items-center gap-1.5 text-[11px] text-[#6c6d66]"><span className="grid size-6 place-items-center rounded-full bg-[#ebe8df] text-[9px] font-semibold">{task.assignee?.name ? task.assignee.name.split(" ").map(n => n[0]).slice(0, 2).join("") : "—"}</span>{task.assignee?.name?.split(" ")[0] || "Unassigned"}</span></div>
    {task.status !== "completed" && <div className="mt-3 border-t border-[#eeeeea] pt-3"><select aria-label={`Change status for ${task.title}`} value={task.status} onChange={e => onStatus(e.target.value as TaskStatus)} className="!border-0 !bg-transparent !p-0 text-[11px] font-medium text-[#777970] shadow-none"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></div>}
  </article>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#1f201d]/35 p-4 backdrop-blur-[2px]" onMouseDown={e => { if (e.currentTarget === e.target) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/50 bg-[#fdfdfb] shadow-2xl"><header className="flex items-start justify-between border-b border-[#e5e5df] px-6 py-5"><div><h2 className="text-xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-xs text-[#7e7f77]">{subtitle}</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#85867f] hover:bg-[#f0f0eb]" aria-label="Close"><Icon name="x" /></button></header><div className="p-6">{children}</div></section></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-[#5b5d55]"><span className="mb-1.5 block">{label}</span>{children}</label>; }
