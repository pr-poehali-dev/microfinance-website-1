export interface HolidayPayment {
  idx: number;
  label: string;
  dueDate: string;
  amount: number;
}

export interface HolidayItem {
  kind: "loan" | "carloan" | "shoploan";
  id: number;
  label: string;
  payments: HolidayPayment[];
}

export interface HolidayRequest {
  id: number;
  items: HolidayItem[];
  approvedItems: HolidayItem[];
  status: "pending" | "approved" | "rejected";
  adminComment: string;
  untilDate: string | null;
  untilIso: string | null;
  createdAt: string;
  clientComment: string;
  seen?: boolean;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export function holidayRowsFor(holidays: HolidayRequest[], kind: string, id: number): Record<number, string> {
  const res: Record<number, string> = {};
  const today = todayIso();
  for (const h of holidays) {
    if (h.status !== "approved" || !h.untilIso || h.untilIso < today) continue;
    for (const it of h.approvedItems) {
      if (it.kind !== kind || it.id !== id) continue;
      for (const p of it.payments) {
        res[p.idx] = h.untilDate || "";
      }
    }
  }
  return res;
}

export function activeHoliday(holidays: HolidayRequest[], kind: string, id: number): string | null {
  const rows = holidayRowsFor(holidays, kind, id);
  const vals = Object.values(rows);
  return vals.length ? vals[0] : null;
}
