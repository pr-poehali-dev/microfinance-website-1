import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { GLASS } from "./adminTypes";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Pay { amount: number; paidAt: string; note: string }
interface Row {
  key: string; label: string; id: number; amount: number; status: string; createdAt: string;
  disbursedAt?: string | null; dueDate?: string | null; paidTotal: number; payments: Pay[]; closedAt?: string | null; overdue?: boolean;
}

const ST: Record<string, string> = {
  active: "Активен", paid: "Погашен", overdue: "Просрочен", review: "На рассмотрении",
  approved: "Одобрен", pending: "Заявка", rejected: "Отказ", disbursed: "Выдан",
};
const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export default function ClientLoanHistory({ userId, refreshKey }: { userId: number; refreshKey?: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [bound, setBound] = useState<{ last4: string; boundAt: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token") || "";
    fetch(`${ADMIN_URL}?sub=loans&userId=${userId}`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setBound(d.boundCard || null);
        setLoaded(true);
        const main: Row[] = (d.loans || []).map((l: any) => ({
          key: `l${l.id}`, label: "Займ", id: l.id, amount: l.amount, status: l.status, createdAt: l.createdAt,
          disbursedAt: l.disbursedAt, dueDate: l.dueDate, paidTotal: l.paidTotal || 0, payments: l.payments || [], closedAt: l.closedAt, overdue: l.isOverdue,
        }));
        const other: Row[] = (d.otherLoans || []).map((l: any) => ({
          key: `${l.kind}${l.id}`, label: l.label, id: l.id, amount: l.amount, status: l.status, createdAt: l.createdAt,
          disbursedAt: l.disbursedAt, dueDate: l.dueDate, paidTotal: l.paidTotal, payments: l.payments,
        }));
        setRows([...main, ...other]);
      })
      .catch(() => setRows([]));
  }, [userId, refreshKey]);

  const boundBlock = loaded && (
    <div style={{ ...GLASS, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, border: bound ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(245,158,11,0.5)" }}>
      <Icon name="CreditCard" size={18} style={{ color: bound ? "#047857" : "#b45309" }} />
      {bound ? (
        <span style={{ color: "#022c22", fontSize: 14 }}>Привязанная карта: <b>•••• {bound.last4}</b> · привязана {bound.boundAt}</span>
      ) : (
        <span style={{ color: "#b45309", fontSize: 14, fontWeight: 600 }}>Карта не привязана (59 ₽ не оплачены)</span>
      )}
    </div>
  );

  if (rows.length === 0) return boundBlock || null;
  const nearest = rows.filter((r) => r.dueDate && r.status !== "paid" && r.disbursedAt).map((r) => r.dueDate as string)[0];

  return (
    <>
    {boundBlock}
    <div style={{ ...GLASS, padding: 16 }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <span style={{ color: "#022c22", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="History" size={16} /> Полная история займов ({rows.length})
        </span>
        <span style={{ color: "#047857", fontSize: 13, fontWeight: 600 }}>
          {nearest ? `Ближайший срок: ${nearest} ` : ""}<Icon name={open ? "ChevronUp" : "ChevronDown"} size={14} />
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {rows.map((r) => (
            <div key={r.key} style={{ border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: 12, background: "rgba(16,185,129,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <b style={{ color: "#022c22" }}>{r.label} #{r.id} · {fmt(r.amount)}</b>
                <span style={{ fontSize: 12, fontWeight: 700, color: r.status === "paid" ? "#0f766e" : r.overdue ? "#dc2626" : "#047857" }}>{ST[r.status] || r.status}</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(2,44,34,0.7)", lineHeight: 1.7, marginTop: 4 }}>
                Взят: <b>{r.disbursedAt || r.createdAt}</b>
                {r.dueDate && <> · Срок до: <b>{r.dueDate}</b></>}
                {r.status === "paid" && r.closedAt && <> · Погашен: <b>{r.closedAt}</b></>}
                <br />Выплачено: <b>{fmt(r.paidTotal)}</b>
              </div>
              {r.payments.length > 0 ? (
                <div style={{ marginTop: 6, fontSize: 12, color: "rgba(2,44,34,0.6)" }}>
                  {r.payments.map((p, i) => <div key={i}>{p.paidAt} · {fmt(p.amount)}{p.note ? ` · ${p.note}` : ""}</div>)}
                </div>
              ) : (
                <div style={{ marginTop: 6, fontSize: 12, color: "rgba(2,44,34,0.4)" }}>Платежей пока нет</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
