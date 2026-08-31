import { useState } from "react";
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
}

export default function PaymentHistory({ schedule, payments, paidTotal, totalDue }: Props) {
  const [open, setOpen] = useState(false);

  if (schedule.length === 0 && payments.length === 0) return null;

  const remaining = Math.max(0, totalDue - paidTotal);

  return (
    <div className="mb-4 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.15)" }}>
            <Icon name="Calendar" size={16} className="text-purple-400" />
          </div>
          <div className="text-left">
            <div className="text-white font-semibold text-sm">График погашения и платежи</div>
            <div className="text-white/40 text-xs">
              Оплачено {paidTotal.toLocaleString("ru-RU")} ₽ из {totalDue.toLocaleString("ru-RU")} ₽
            </div>
          </div>
        </div>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} className="text-white/40 shrink-0" />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5">
          {/* Остаток */}
          {paidTotal > 0 && (
            <div className="rounded-lg px-4 py-3 flex items-center justify-between" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
              <span className="text-white/50 text-xs">Остаток к погашению</span>
              <span className="text-green-400 font-bold text-sm">{remaining.toLocaleString("ru-RU")} ₽</span>
            </div>
          )}

          {/* График погашения */}
          {schedule.length > 0 && (
            <div>
              <div className="text-white/40 text-xs uppercase tracking-wider mb-2">Плановый график</div>
              <div className="space-y-2">
                {schedule.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-4 py-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="flex items-center gap-2">
                      <Icon name="Clock" size={13} className="text-white/30" />
                      <span className="text-white/70 text-xs">
                        {s.month ? `${s.month}-й платёж` : s.label || "Платёж"}
                        {s.dueDate ? ` · ${s.dueDate}` : ""}
                      </span>
                    </div>
                    <span className="text-white font-semibold text-sm">{s.amount.toLocaleString("ru-RU")} ₽</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* История платежей */}
          <div>
            <div className="text-white/40 text-xs uppercase tracking-wider mb-2">История платежей</div>
            {payments.length === 0 ? (
              <div className="text-white/30 text-xs px-4 py-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                Платежей пока не было
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-4 py-2.5" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}>
                    <div className="flex items-center gap-2">
                      <Icon name="CheckCircle2" size={13} className="text-green-400" />
                      <div>
                        <div className="text-white/80 text-xs">{p.paidAt}</div>
                        {p.note && <div className="text-white/30 text-xs">{p.note}</div>}
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
