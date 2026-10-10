import Icon from "@/components/ui/icon";

export interface CardRepayment {
  amount: number;
  note: string;
  createdAt: string;
  principal?: number;
  interest?: number;
}

interface Props {
  repaid: number;
  debt: number;
  repayments: CardRepayment[];
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export default function CardRepaymentHistory({ repaid, debt, repayments }: Props) {
  if (repayments.length === 0) return null;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
      <div className="flex items-center gap-2">
        <Icon name="BadgeCheck" size={16} className="text-emerald-600" />
        <div className="text-emerald-950 font-semibold text-sm">История погашений по карте</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.06)" }}>
          <div className="text-emerald-950/40 text-xs">Уже погашено</div>
          <div className="text-emerald-600 font-bold text-sm">{fmt(repaid)}</div>
        </div>
        <div className="rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.06)" }}>
          <div className="text-emerald-950/40 text-xs">Осталось вернуть</div>
          <div className="text-emerald-950 font-bold text-sm">{fmt(debt)}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        {repayments.map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.03)" }}>
            <div>
              <div className="text-emerald-950/70 text-xs">{r.createdAt}</div>
              {r.note && <div className="text-emerald-950/40 text-xs">{r.note}</div>}
              {r.principal !== undefined && r.interest !== undefined && (
                <div className="text-emerald-950/50 text-xs">Основной долг {fmt(r.principal)} · проценты {fmt(r.interest)}</div>
              )}
            </div>
            <span className="text-emerald-600 font-semibold text-sm">+{fmt(r.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
