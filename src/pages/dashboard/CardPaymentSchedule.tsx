import { useState } from "react";
import { isPastDue } from "./nextPayment";
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
  earlyDebt?: number | null;
  minPaymentPercent: number;
  minPayment: number;
  schedule: CardPaymentRow[];
  cardLast4?: string;
  fullName?: string;
  pendingNotices?: string[];
  paidNotices?: string[];
  highlightPaid?: boolean;
  closed?: boolean;
  onReported?: () => void;
  holiday?: Record<number, string>;
}

const FULL_KEY = "Полное погашение";
const fmt = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

export default function CardPaymentSchedule({ debt, earlyDebt, minPaymentPercent, minPayment, schedule, cardLast4, fullName, pendingNotices = [], paidNotices = [], highlightPaid = false, closed = false, onReported, holiday = {} }: Props) {
  const [payRow, setPayRow] = useState<CardPaymentRow | null>(null);
  const [payFull, setPayFull] = useState(false);
  const [payEarly, setPayEarly] = useState(false);
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
      <div className="flex items-center gap-2">
        <Icon name="CalendarClock" size={16} className="text-emerald-600" />
        <div className="text-emerald-950 font-semibold text-sm">График платежей по карте · 1 раз в неделю</div>
      </div>

      {debt <= 0 ? (
        closed ? (
          <div className="flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl" style={{ background: "rgba(16,185,129,0.15)", color: "#047857" }}>
            <Icon name="CheckCircle" size={16} />Оплачено · лимит закрыт
          </div>
        ) : (
          <div className="text-emerald-950/50 text-xs">Задолженности по карте нет — платежей нет.</div>
        )
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

          {cardLast4 && (
            paidNotices.includes(`0|${FULL_KEY}`) ? (
              <div className="flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl" style={{ background: "rgba(16,185,129,0.15)", color: "#047857" }}>
                <Icon name="CheckCircle" size={16} />Полное погашение отмечено оплаченным
              </div>
            ) : pendingNotices.includes(`0|${FULL_KEY}`) ? (
              <button onClick={() => setPayFull(true)} className="w-full text-sm font-semibold py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.15)", color: "#b91c1c" }}>
                Оплата полного долга проверяется
              </button>
            ) : (
              <button onClick={() => setPayFull(true)} className="w-full btn-neon text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                <Icon name="BadgeCheck" size={18} />Оплатить полностью · {fmt(debt)}
              </button>
            )
          )}

          {cardLast4 && !!earlyDebt && earlyDebt > 0 && !pendingNotices.includes(`0|${FULL_KEY}`) && !paidNotices.includes(`0|${FULL_KEY}`) && (
            <button onClick={() => setPayEarly(true)} className="w-full text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2" style={{ background: "rgba(16,185,129,0.15)", color: "#047857", border: "1px solid rgba(16,185,129,0.4)" }}>
              <Icon name="Zap" size={16} />Досрочное погашение · {fmt(earlyDebt)}
              <span className="text-xs font-normal">(экономия {fmt(Math.max(0, debt - earlyDebt))})</span>
            </button>
          )}

          <div className="space-y-1.5">
            {schedule.map((s) => {
              const paidRow = highlightPaid && paidNotices.includes(`0|${s.dueDate}`);
              const holUntil = !paidNotices.includes(`0|${s.dueDate}`) ? holiday[s.week - 1] : undefined;
              return (
              <div
                key={s.week}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{
                  background: paidRow ? "rgba(14,165,233,0.16)" : holUntil ? "rgba(250,204,21,0.22)" : s.isNext ? "rgba(16,185,129,0.14)" : "rgba(16,185,129,0.03)",
                  border: paidRow ? "1px solid rgba(14,165,233,0.55)" : holUntil ? "1px solid rgba(234,179,8,0.6)" : s.isNext ? "1px solid rgba(16,185,129,0.4)" : "1px solid transparent",
                }}
              >
                <span className="text-emerald-950/70 text-xs">
                  {s.week}-я неделя · {s.dueDate}
                  {holUntil && <span className="block font-semibold text-yellow-800">Кредитные каникулы до {holUntil}</span>}
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
                        style={{ background: "rgba(239,68,68,0.15)", color: "#b91c1c" }}
                      >
                        Оплата проверяется
                      </button>
                    ) : (
                      <>
                        {isPastDue(s.dueDate) && <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: "rgba(239,68,68,0.15)", color: "#b91c1c" }}>Платёж просрочен</span>}
                        <button
                          onClick={() => setPayRow(s)}
                          className="btn-neon text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                        >
                          Оплатить
                        </button>
                      </>
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
      {payEarly && cardLast4 && !!earlyDebt && (
        <CardPayModal
          early
          amount={earlyDebt}
          dueDate="Досрочное погашение"
          cardLast4={cardLast4}
          onClose={() => setPayEarly(false)}
        />
      )}
      {payFull && cardLast4 && (
        <CardPayModal
          full
          amount={debt}
          dueDate={FULL_KEY}
          cardLast4={cardLast4}
          alreadyReported={pendingNotices.includes(`0|${FULL_KEY}`)}
          onReported={onReported}
          onClose={() => setPayFull(false)}
        />
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
