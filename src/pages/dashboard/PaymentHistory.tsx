import { useState } from "react";
import { isPastDue } from "./nextPayment";
import Icon from "@/components/ui/icon";

export interface ScheduleItem {
  dueDate: string | null;
  amount: number;
  label?: string;
  month?: number;
  principal?: number;
  interest?: number;
}

export interface PaymentItem {
  amount: number;
  paidAt: string;
  note?: string;
}

interface Props {
  schedule: ScheduleItem[];
  payments: PaymentItem[];
  paidTotal: number;
  totalDue: number;
  closed?: boolean;
  onPay?: (amount: number) => void;
  holiday?: Record<number, string>;
}

export default function PaymentHistory({ schedule, payments, paidTotal, totalDue, closed = false, onPay, holiday = {} }: Props) {
  const [open, setOpen] = useState(false);

  if (schedule.length === 0 && payments.length === 0) return null;

  const remaining = Math.max(0, totalDue - paidTotal);

  let acc = 0;
  const targets = schedule.map((r, i) => {
    acc += r.amount;
    return i === schedule.length - 1 ? Math.max(acc, totalDue) : acc;
  });
  const nextIdx = closed || remaining <= 0 ? -1 : targets.findIndex((t) => paidTotal < t - 0.5);
  const nextDue = nextIdx >= 0 ? Math.max(1, Math.round(Math.min(targets[nextIdx] - paidTotal, remaining))) : 0;
  const nextRow = nextIdx >= 0 ? schedule[nextIdx] : null;

  return (
    <div className="mb-4 rounded-xl overflow-hidden" style={{ background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.08)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 transition-colors hover:bg-emerald-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.15)" }}>
            <Icon name="Calendar" size={16} className="text-emerald-600" />
          </div>
          <div className="text-left">
            <div className="text-emerald-950 font-semibold text-sm">График погашения и платежи</div>
            <div className="text-xs" style={{ color: closed ? "#047857" : "rgba(2,44,34,0.4)", fontWeight: closed ? 600 : 400 }}>
              {closed
                ? "Все платежи оплачены · займ закрыт"
                : `Оплачено ${paidTotal.toLocaleString("ru-RU")} ₽ из ${totalDue.toLocaleString("ru-RU")} ₽`}
            </div>
          </div>
        </div>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} className="text-emerald-950/40 shrink-0" />
      </button>

      {nextIdx >= 0 && holiday[nextIdx] && (
        <div className="mx-5 mb-3 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm font-semibold" style={{ background: "rgba(250,204,21,0.25)", border: "1px solid rgba(234,179,8,0.6)", color: "#854d0e" }}>
          <Icon name="Umbrella" size={16} />Кредитные каникулы до {holiday[nextIdx]}. Просрочки нет, оплатить можно в любой момент
        </div>
      )}
      {onPay && nextRow && nextDue > 0 && (
        <div className="px-5 pb-4">
          {isPastDue(nextRow.dueDate) && !holiday[nextIdx] && (
            <div className="mb-2 rounded-lg px-4 py-2 text-sm font-bold flex items-center gap-2" style={{ background: "rgba(239,68,68,0.12)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.35)" }}>
              <Icon name="AlertTriangle" size={16} />Платёж просрочен (срок был {nextRow.dueDate})
            </div>
          )}
          <button
            onClick={() => onPay(nextDue)}
            className="w-full btn-neon text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Icon name="CreditCard" size={16} />
            Оплатить {nextRow.month ? `${nextRow.month}-й платёж` : "платёж"} · {nextDue.toLocaleString("ru-RU")} ₽
          </button>
          {nextRow.dueDate && <div className="text-emerald-950/40 text-xs text-center mt-1.5">Срок оплаты: {nextRow.dueDate}</div>}
        </div>
      )}

      {open && (
        <div className="px-5 pb-5 space-y-5">
          {closed && (
            <div className="rounded-lg px-4 py-3 flex items-center gap-2 font-semibold text-sm" style={{ background: "rgba(16,185,129,0.15)", color: "#047857" }}>
              <Icon name="CheckCircle" size={16} />Займ закрыт — все платежи оплачены
            </div>
          )}

          {/* Остаток */}
          {paidTotal > 0 && !closed && (
            <div className="rounded-lg px-4 py-3 flex items-center justify-between" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
              <span className="text-emerald-950/50 text-xs">Остаток к погашению</span>
              <span className="text-green-400 font-bold text-sm">{remaining.toLocaleString("ru-RU")} ₽</span>
            </div>
          )}

          {/* График погашения */}
          {schedule.length > 0 && (
            <div>
              <div className="text-emerald-950/40 text-xs uppercase tracking-wider mb-2">Плановый график</div>
              <div className="space-y-2">
                {schedule.map((s, i) => {
                  const holUntil = !(closed || paidTotal >= targets[i] - 0.5) ? holiday[i] : undefined;
                  return (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-4 py-2.5"
                    style={holUntil ? { background: "rgba(250,204,21,0.22)", border: "1px solid rgba(234,179,8,0.6)" } : { background: "rgba(16,185,129,0.03)" }}>
                    <div className="flex items-center gap-2">
                      <Icon name={holUntil ? "Umbrella" : "Clock"} size={13} className={holUntil ? "text-yellow-700" : "text-emerald-950/30"} />
                      <span className="text-emerald-950/70 text-xs">
                        {s.month ? `${s.month}-й платёж` : s.label || "Платёж"}
                        {s.dueDate ? ` · ${s.dueDate}` : ""}
                        {holUntil && <span className="block font-semibold text-yellow-800">Кредитные каникулы до {holUntil}</span>}
                      </span>
                    </div>
                    <span className="flex items-center gap-2">
                      <span className="text-emerald-950 font-semibold text-sm">{s.amount.toLocaleString("ru-RU")} ₽</span>
                      {(closed || paidTotal >= targets[i] - 0.5) ? (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "rgba(16,185,129,0.15)", color: "#047857" }}>
                          <Icon name="CheckCircle" size={12} />Оплачено
                        </span>
                      ) : onPay && (i === nextIdx || holUntil) ? (
                        <button onClick={() => onPay(i === nextIdx ? nextDue : Math.max(1, Math.round(Math.min(targets[i] - paidTotal, remaining))))} className="btn-neon text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                          Оплатить {(i === nextIdx ? nextDue : Math.max(1, Math.round(Math.min(targets[i] - paidTotal, remaining)))).toLocaleString("ru-RU")} ₽
                        </button>
                      ) : null}
                    </span>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* История платежей */}
          <div>
            <div className="text-emerald-950/40 text-xs uppercase tracking-wider mb-2">История платежей</div>
            {payments.length === 0 ? (
              <div className="text-emerald-950/30 text-xs px-4 py-3 rounded-lg" style={{ background: "rgba(16,185,129,0.03)" }}>
                Платежей пока не было
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-4 py-2.5" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}>
                    <div className="flex items-center gap-2">
                      <Icon name="CheckCircle2" size={13} className="text-green-400" />
                      <div>
                        <div className="text-emerald-950/80 text-xs">{p.paidAt}</div>
                        {p.note && <div className="text-emerald-950/30 text-xs">{p.note}</div>}
                      </div>
                    </div>
                    <span className="text-green-400 font-semibold text-sm">+{p.amount.toLocaleString("ru-RU")} ₽</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}