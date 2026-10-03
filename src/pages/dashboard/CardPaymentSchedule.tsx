import { useState } from "react";
import Icon from "@/components/ui/icon";
import CardPayModal from "./CardPayModal";

export interface CardPaymentRow {
  week: number;
  dueDate: string;
  amount: number;
  isNext?: boolean;
}

interface Props {
  debt: number;
  minPaymentPercent: number;
  minPayment: number;
  schedule: CardPaymentRow[];
  cardLast4?: string;
  fullName?: string;
  pendingNotices?: string[];
  paidNotices?: string[];
  highlightPaid?: boolean;
  onReported?: () => void;
}

const fmt = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

export default function CardPaymentSchedule({ debt, minPaymentPercent, minPayment, schedule, cardLast4, fullName, pendingNotices = [], paidNotices = [], highlightPaid = false, onReported }: Props) {
  const [payRow, setPayRow] = useState<CardPaymentRow | null>(null);
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
      <div className="flex items-center gap-2">
        <Icon name="CalendarClock" size={16} className="text-emerald-600" />
        <div className="text-emerald-950 font-semibold text-sm">График платежей по карте · 1 раз в неделю</div>
      </div>

      {debt <= 0 ? (
        <div className="text-emerald-950/50 text-xs">Задолженности по карте нет — платежей нет.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.06)" }}>
              <div className="text-emerald-950/40 text-xs">Общий долг</div>
              <div className="text-emerald-950 font-bold text-sm">{fmt(debt)}</div>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.06)" }}>
              <div className="text-emerald-950/40 text-xs">Мин. платёж ({minPaymentPercent}%)</div>
              <div className="text-emerald-600 font-bold text-sm">{fmt(minPayment)}</div>
            </div>
          </div>

          <div className="space-y-1.5">
            {schedule.map((s) => {
              const paidRow = highlightPaid && paidNotices.includes(`0|${s.dueDate}`);
              return (
              <div
                key={s.week}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{
                  background: paidRow ? "rgba(14,165,233,0.16)" : s.isNext ? "rgba(16,185,129,0.14)" : "rgba(16,185,129,0.03)",
                  border: paidRow ? "1px solid rgba(14,165,233,0.55)" : s.isNext ? "1px solid rgba(16,185,129,0.4)" : "1px solid transparent",
                }}
              >
                <span className="text-emerald-950/70 text-xs">
                  {s.week}-я неделя · {s.dueDate}
                  {s.isNext && !paidRow && <span className="ml-2 text-emerald-600 font-semibold">ближайший</span>}
                  {paidRow && <span className="ml-2 font-bold" style={{ color: "#0369a1" }}>✓ Оплачен</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-emerald-950 font-semibold text-sm">от {fmt(s.amount)}</span>
                  {cardLast4 && (
                    paidNotices.includes(`0|${s.dueDate}`) ? (
                      <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(16,185,129,0.15)", color: "#047857" }}>
                        <Icon name="CheckCircle" size={13} />Оплачено
                      </span>
                    ) : pendingNotices.includes(`0|${s.dueDate}`) ? (
                      <button
                        onClick={() => setPayRow(s)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: "rgba(245,158,11,0.15)", color: "#b45309" }}
                      >
                        Оплата проверяется
                      </button>
                    ) : (
                      <button
                        onClick={() => setPayRow(s)}
                        className="btn-neon text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                      >
                        Оплатить
                      </button>
                    )
                  )}
                </span>
              </div>
              );
            })}
          </div>
          <div className="text-emerald-950/40 text-xs">
            Платёж вносится раз в неделю, не меньше {minPaymentPercent}% от общего долга по карте.
          </div>
        </>
      )}
      {payRow && cardLast4 && (
        <CardPayModal
          amount={payRow.amount}
          dueDate={payRow.dueDate}
          cardLast4={cardLast4}
          fullName={fullName}
          alreadyReported={pendingNotices.includes(`0|${payRow.dueDate}`)}
          onReported={onReported}
          onClose={() => setPayRow(null)}
        />
      )}
    </div>
  );
}
