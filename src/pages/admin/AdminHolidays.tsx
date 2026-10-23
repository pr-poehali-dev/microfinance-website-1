import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Pay { idx: number; label: string; dueDate: string; amount: number }
interface Item { kind: string; id: number; label: string; payments: Pay[] }
interface Holiday {
  id: number; phone: string; fullName: string; items: Item[]; approvedItems: Item[];
  clientComment: string; status: string; adminComment: string; untilDate: string | null;
  createdAt: string; decidedAt: string | null;
}

const G = { background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 14 };
const ST: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "На рассмотрении", color: "#92400e", bg: "rgba(251,191,36,0.25)" },
  approved: { label: "Одобрено", color: "#047857", bg: "rgba(16,185,129,0.15)" },
  rejected: { label: "Отказано", color: "#b91c1c", bg: "rgba(248,113,113,0.15)" },
};
const fmtDate = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "");
const inp = { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.3)", background: "#fff", color: "#022c22", fontSize: 14, width: "100%" } as const;

function HolidayCard({ h, token, onDone }: { h: Holiday; token: string; onDone: () => void }) {
  const [picked, setPicked] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    h.items.forEach((it) => it.payments.forEach((p) => { m[`${it.kind}:${it.id}:${p.idx}`] = true; }));
    return m;
  });
  const [until, setUntil] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pending = h.status === "pending";
  const st = ST[h.status] || ST.pending;

  const decide = async (decision: "approve" | "reject") => {
    setErr("");
    const items = h.items
      .map((it) => ({ ...it, payments: it.payments.filter((p) => picked[`${it.kind}:${it.id}:${p.idx}`]) }))
      .filter((it) => it.payments.length > 0);
    setBusy(true);
    const r = await fetch(`${ADMIN_URL}?sub=holiday_decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: h.id, decision, untilDate: until, comment, items }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(d.error || "Ошибка"); return; }
    onDone();
  };

  const shown = h.status === "approved" ? h.approvedItems : h.items;

  return (
    <div style={{ ...G, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, color: "#022c22" }}>{h.fullName || "Без имени"}</div>
          <div style={{ fontSize: 13, color: "rgba(2,44,34,0.6)" }}>{h.phone} · {h.createdAt}</div>
        </div>
        <span style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
      </div>

      {h.clientComment && <div style={{ fontSize: 13, marginBottom: 8, color: "rgba(2,44,34,0.8)" }}>Комментарий клиента: {h.clientComment}</div>}

      {shown.map((it) => (
        <div key={`${it.kind}${it.id}`} style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#022c22", marginBottom: 4 }}>{it.label}</div>
          {it.payments.map((p) => {
            const k = `${it.kind}:${it.id}:${p.idx}`;
            return (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, marginBottom: 3, background: "rgba(250,204,21,0.18)", cursor: pending ? "pointer" : "default", fontSize: 13, color: "#022c22" }}>
                {pending && <input type="checkbox" checked={!!picked[k]} onChange={() => setPicked((s) => ({ ...s, [k]: !s[k] }))} />}
                <span style={{ flex: 1 }}>{p.label}{p.dueDate ? ` · до ${p.dueDate}` : ""}</span>
                <b>{Math.round(p.amount).toLocaleString("ru-RU")} ₽</b>
              </label>
            );
          })}
        </div>
      ))}

      {pending ? (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(2,44,34,0.6)", marginBottom: 4 }}>Каникулы до (дата окончания)</div>
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={inp} />
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
            placeholder="Комментарий клиенту (при отказе — причина, обязательно)" style={inp} />
          {err && <div style={{ color: "#dc2626", fontSize: 13 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button disabled={busy} onClick={() => decide("approve")}
              style={{ flex: 1, minWidth: 140, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#10b981,#14b8a6)", opacity: busy ? 0.6 : 1 }}>
              Одобрить
            </button>
            <button disabled={busy} onClick={() => decide("reject")}
              style={{ flex: 1, minWidth: 140, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, color: "#fff", background: "#dc2626", opacity: busy ? 0.6 : 1 }}>
              Отказать
            </button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "rgba(2,44,34,0.7)", marginTop: 6 }}>
          {h.status === "approved" && h.untilDate && <div><b>Каникулы до {fmtDate(h.untilDate)}</b></div>}
          {h.adminComment && <div>{h.status === "rejected" ? "Причина отказа" : "Комментарий"}: {h.adminComment}</div>}
          {h.decidedAt && <div style={{ color: "rgba(2,44,34,0.45)" }}>Решение: {h.decidedAt}</div>}
        </div>
      )}
    </div>
  );
}

export default function AdminHolidays({ token, onChanged }: { token: string; onChanged?: () => void }) {
  const [items, setItems] = useState<Holiday[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${ADMIN_URL}?sub=holidays&status=${filter}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json().catch(() => ({}));
    setItems(d.holidays || []);
    setLoading(false);
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#022c22", flex: 1 }}>🏖 Кредитные каникулы</h2>
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "7px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: filter === f ? "linear-gradient(135deg,#10b981,#14b8a6)" : "rgba(16,185,129,0.07)", color: filter === f ? "#fff" : "rgba(2,44,34,0.6)" }}>
            {{ pending: "Новые", approved: "Одобренные", rejected: "Отказы", all: "Все" }[f]}
          </button>
        ))}
        <button onClick={load} style={{ padding: 8, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(16,185,129,0.07)" }}>
          <Icon name="RefreshCw" size={16} className="text-emerald-700" />
        </button>
      </div>

      {loading ? (
        <div style={{ color: "rgba(2,44,34,0.5)" }}>Загрузка...</div>
      ) : items.length === 0 ? (
        <div style={{ ...G, padding: 24, textAlign: "center", color: "rgba(2,44,34,0.5)" }}>Заявок нет</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((h) => <HolidayCard key={h.id} h={h} token={token} onDone={() => { load(); onChanged?.(); }} />)}
        </div>
      )}
    </div>
  );
}
