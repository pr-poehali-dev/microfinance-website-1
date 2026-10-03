import Icon from "@/components/ui/icon";

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
}

const fmt = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

export default function CardPaymentSchedule({ debt, minPaymentPercent, minPayment, schedule }: Props) {
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
            {schedule.map((s) => (
              <div
                key={s.week}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{
                  background: s.isNext ? "rgba(16,185,129,0.14)" : "rgba(16,185,129,0.03)",
                  border: s.isNext ? "1px solid rgba(16,185,129,0.4)" : "1px solid transparent",
                }}
              >
                <span className="text-emerald-950/70 text-xs">
                  {s.week}-я неделя · {s.dueDate}
                  {s.isNext && <span className="ml-2 text-emerald-600 font-semibold">ближайший</span>}
                </span>
                <span className="text-emerald-950 font-semibold text-sm">от {fmt(s.amount)}</span>
              </div>
            ))}
          </div>
          <div className="text-emerald-950/40 text-xs">
            Платёж вносится раз в неделю, не меньше {minPaymentPercent}% от общего долга по карте.
          </div>
        </>
      )}
    </div>
  );
}
