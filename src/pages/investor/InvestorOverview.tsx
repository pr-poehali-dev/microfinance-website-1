import { Investment, fmt, termText } from "./investorTypes";

export default function InvestorOverview({ items }: { items: Investment[] }) {
  if (items.length === 0) {
    return <div className="glass rounded-2xl p-8 text-center text-emerald-950/60">Инвестиций пока нет. Оставьте заявку в разделе «Заявка на инвестицию».</div>;
  }
  return (
    <div className="space-y-6">
      {items.map((i) => (
        <div key={i.id} className="glass rounded-3xl p-6" style={{ opacity: i.status === "closed" ? 0.75 : 1 }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="font-oswald text-2xl font-bold text-emerald-950">{fmt(i.amount)}</div>
              <div className="text-emerald-950/55 text-xs">{i.funded ? "Вложено" : "Будет вложено после внесения средств"}</div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold"
              style={!i.funded && i.status === "active" ? { background: "rgba(245,158,11,0.18)", color: "#b45309" } : i.status === "active" ? { background: "rgba(16,185,129,0.15)", color: "#047857" } : { background: "rgba(100,116,139,0.15)", color: "#475569" }}>
              {!i.funded && i.status === "active" ? "Ожидает внесения" : i.status === "active" ? "Действует" : "Завершена"}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              ["Ставка", `${i.rate}% в месяц`],
              ["Срок", termText(i.termMonths)],
              ["Выплата процентов", i.payout === "monthly" ? "каждый месяц" : "в конце срока"],
              ["Доход в месяц", fmt(i.monthlyIncome)],
              ["Начало", i.startDate],
              ["Окончание", i.endDate],
              ["Начислено", fmt(i.accrued)],
              ["Выплачено процентов", fmt(i.paidInterest)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(16,185,129,0.07)" }}>
                <div className="text-emerald-950/50 text-xs">{l}</div>
                <div className="text-emerald-950 font-semibold text-sm">{v}</div>
              </div>
            ))}
          </div>
          {!i.funded && i.status === "active" && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", color: "#78350f" }}>
              Будет вложено <b>{fmt(i.amount)}</b>. Чтобы вложение начало работать, внесите сумму в разделе «Пополнить баланс».
            </div>
          )}
          {i.funded && i.status === "active" && (
            <div className="rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <div className="text-emerald-950 text-sm">К выплате по начисленным процентам: <b>{fmt(i.toPay)}</b></div>
              {i.nextDate && <div className="text-emerald-950/60 text-sm">Ближайшая дата: <b>{i.nextDate}</b></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
