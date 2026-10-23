import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { HolidayItem, HolidayRequest } from "./creditHolidays";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

export interface HolidaySource {
  kind: "loan" | "carloan" | "shoploan" | "card";
  id: number;
  label: string;
  payments: { idx: number; label: string; dueDate: string; amount: number }[];
}

interface Props {
  sources: HolidaySource[];
  holidays: HolidayRequest[];
  onSent: () => void;
}

const STATUS = {
  pending: { label: "На рассмотрении", color: "#92400e", bg: "rgba(251,191,36,0.2)" },
  approved: { label: "Одобрено", color: "#047857", bg: "rgba(16,185,129,0.15)" },
  rejected: { label: "Отказано", color: "#b91c1c", bg: "rgba(248,113,113,0.15)" },
};

const keyOf = (kind: string, id: number, idx: number) => `${kind}:${id}:${idx}`;

export default function CreditHolidaysSection({ sources, holidays, onSent }: Props) {
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const hasPending = holidays.some((h) => h.status === "pending");
  const selectedCount = useMemo(() => Object.values(sel).filter(Boolean).length, [sel]);

  const toggleLoan = (src: HolidaySource) => {
    const allOn = src.payments.every((p) => sel[keyOf(src.kind, src.id, p.idx)]);
    setSel((prev) => {
      const next = { ...prev };
      src.payments.forEach((p) => { next[keyOf(src.kind, src.id, p.idx)] = !allOn; });
      return next;
    });
  };

  const send = async () => {
    setErr(""); setMsg("");
    const items: HolidayItem[] = sources
      .map((src) => ({ kind: src.kind, id: src.id, label: src.label, payments: src.payments.filter((p) => sel[keyOf(src.kind, src.id, p.idx)]) }))
      .filter((it) => it.payments.length > 0);
    if (items.length === 0) { setErr("Выберите займ и платежи, которые хотите отсрочить"); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    setSending(true);
    const res = await fetch(`${LOANS_URL}?sub=holiday_request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
      body: JSON.stringify({ items, comment }),
    });
    const d = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) { setErr(d.error || "Не удалось отправить заявку"); return; }
    setMsg("Заявка отправлена на рассмотрение");
    setSel({}); setComment("");
    onSent();
  };

  return (
    <div className="space-y-5">
      <h2 className="font-oswald text-2xl font-bold text-emerald-950">Кредитные каникулы</h2>

      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(250,204,21,0.18)", border: "1px solid rgba(234,179,8,0.5)" }}>
        <Icon name="Umbrella" size={20} className="text-yellow-700 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-950/70 leading-relaxed">
          Кредитные каникулы — отсрочка платежа на выбранный срок. Просрочки в это время нет, проценты продолжают начисляться. Оплатить можно в любой момент, в том числе досрочно.
        </p>
      </div>

      {hasPending ? (
        <div className="glass rounded-2xl p-5 text-emerald-950/70 text-sm flex items-center gap-3">
          <Icon name="Clock" size={18} className="text-yellow-700" />
          Ваша заявка на рассмотрении. Новую можно подать после решения.
        </div>
      ) : sources.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-emerald-950/50 text-sm">
          Сейчас нет действующих займов, для которых можно оформить каникулы.
        </div>
      ) : (
        <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="font-semibold text-emerald-950">Выберите займ и платежи</div>
          {sources.map((src) => {
            const allOn = src.payments.every((p) => sel[keyOf(src.kind, src.id, p.idx)]);
            return (
              <div key={`${src.kind}${src.id}`} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
                <button type="button" onClick={() => toggleLoan(src)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left" style={{ background: "rgba(16,185,129,0.08)" }}>
                  <span className="font-semibold text-emerald-950 text-sm">{src.label}</span>
                  <span className="text-xs font-semibold text-emerald-700">{allOn ? "Снять всё" : "Выбрать все платежи"}</span>
                </button>
                <div className="p-2 space-y-1.5">
                  {src.payments.map((p) => {
                    const k = keyOf(src.kind, src.id, p.idx);
                    const on = !!sel[k];
                    return (
                      <label key={k} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
                        style={{ background: on ? "rgba(250,204,21,0.22)" : "rgba(16,185,129,0.03)", border: on ? "1px solid rgba(234,179,8,0.6)" : "1px solid transparent" }}>
                        <span className="flex items-center gap-3">
                          <input type="checkbox" checked={on} onChange={() => setSel((s) => ({ ...s, [k]: !s[k] }))} className="w-4 h-4 accent-emerald-600" />
                          <span className="text-sm text-emerald-950/80">{p.label}{p.dueDate ? ` · до ${p.dueDate}` : ""}</span>
                        </span>
                        <span className="text-sm font-semibold text-emerald-950 whitespace-nowrap">{Math.round(p.amount).toLocaleString("ru-RU")} ₽</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000}
            placeholder="Причина или пожелания по сроку (необязательно)"
            className="w-full rounded-xl px-4 py-3 text-sm text-emerald-950 outline-none" style={{ background: "#fff", border: "1px solid rgba(16,185,129,0.3)" }} />

          {err && <div className="text-red-600 text-sm">{err}</div>}
          {msg && <div className="text-emerald-700 text-sm font-semibold">{msg}</div>}

          <button onClick={send} disabled={sending || selectedCount === 0}
            className="w-full btn-neon text-white font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {sending ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Send" size={16} />}
            Отправить на рассмотрение{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
        </div>
      )}

      {holidays.length > 0 && (
        <div className="space-y-3">
          <div className="font-semibold text-emerald-950">Мои заявки</div>
          {holidays.map((h) => {
            const st = STATUS[h.status];
            const shown = h.status === "approved" ? h.approvedItems : h.items;
            return (
              <div key={h.id} className="glass rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-emerald-950/50">{h.createdAt}</span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                {shown.map((it) => (
                  <div key={`${it.kind}${it.id}`} className="text-sm text-emerald-950/80">
                    <b>{it.label}</b>: {it.payments.map((p) => p.label).join(", ")}
                  </div>
                ))}
                {h.status === "approved" && h.untilDate && (
                  <div className="text-sm font-semibold" style={{ color: "#854d0e" }}>Каникулы до {h.untilDate}</div>
                )}
                {h.adminComment && (
                  <div className="text-sm text-emerald-950/70">
                    {h.status === "rejected" ? "Причина отказа: " : "Комментарий: "}{h.adminComment}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
