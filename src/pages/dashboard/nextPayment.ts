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
