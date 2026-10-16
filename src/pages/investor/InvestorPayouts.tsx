import { Investment, fmt } from "./investorTypes";

export default function InvestorPayouts({ items }: { items: Investment[] }) {
  const all = items
    .flatMap((i) => i.payouts.map((p) => ({ ...p, invAmount: i.amount })))
    .sort((a, b) => b.id - a.id);
  const total = all.reduce((s, p) => s + p.amount, 0);
  const upcoming = items.filter((i) => i.status === "active" && i.nextDate);

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <div className="text-emerald-950/50 text-xs">Выплачено всего</div>
        <div className="font-oswald text-3xl font-bold text-emerald-950">{fmt(total)}</div>
      </div>

      {upcoming.length > 0 && (
        <div className="glass rounded-3xl p-6">
          <div className="font-semibold text-emerald-950 mb-3">Ближайшие выплаты</div>
          <div className="space-y-2">
            {upcoming.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <div className="text-emerald-950">Вложение {fmt(i.amount)}</div>
                <div className="text-emerald-950 font-semibold">
                  {i.nextDate} · {i.payout === "monthly" ? fmt(i.monthlyIncome) : `${fmt(i.totalIncome)} + возврат вложения`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-3xl p-6">
        <div className="font-semibold text-emerald-950 mb-3">История выплат</div>
        {all.length === 0 ? (
          <div className="text-emerald-950/40 text-sm">Выплат пока не было</div>
        ) : (
          <div className="space-y-2">
            {all.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                <div>
                  <div className="text-emerald-950 font-medium">{p.kind === "principal" ? "Возврат вложения" : "Выплата процентов"}</div>
                  <div className="text-emerald-950/45 text-xs">{p.paidAt} · вложение {fmt(p.invAmount)}{p.note ? ` · ${p.note}` : ""}</div>
                </div>
                <div className="font-bold" style={{ color: "#059669" }}>+ {fmt(p.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
