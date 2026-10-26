export interface SchedRow { amount: number; dueDate: string | null; month?: number }

export function nextPayment(schedule: SchedRow[], paidTotal: number, totalDue: number) {
  const remaining = Math.max(0, totalDue - paidTotal);
  if (!schedule.length || remaining <= 0) return null;
  let acc = 0;
  const targets = schedule.map((r, i) => {
    acc += r.amount;
    return i === schedule.length - 1 ? Math.max(acc, totalDue) : acc;
  });
  const idx = targets.findIndex((t) => paidTotal < t - 0.5);
  if (idx < 0) return null;
  const amount = Math.max(1, Math.round(Math.min(targets[idx] - paidTotal, remaining)));
  return { amount, month: schedule[idx].month, dueDate: schedule[idx].dueDate };
}

export function isPastDue(dueDate?: string | null): boolean {
  const m = (dueDate || "").match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return false;
  const due = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due < today;
}
