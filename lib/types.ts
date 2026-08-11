export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "completed";

export type Person = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  role: string | null;
  created_at: string;
};

export type Activity = {
  id: string;
  user_id: string;
  task_id: string | null;
  action: string;
  description: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  assignee_id: string | null;
  created_at: string;
  assignee?: Person | null;
};
