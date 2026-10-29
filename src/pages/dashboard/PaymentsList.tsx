import Icon from "@/components/ui/icon";

interface PaymentItem { amount: number; paidAt: string; note?: string }
interface LoanLike { id: number; payments?: PaymentItem[] }
interface CardRepayment { amount: number; note?: string; createdAt: string }

export interface DueItem { key: string; title: string; subtitle: string; amount: number; onPay: () => void; overdue?: boolean }

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export default function PaymentsList({ loans, cardRepayments = [], dues = [] }: { loans: LoanLike[]; cardRepayments?: CardRepayment[]; dues?: DueItem[] }) {
  const rows = loans.flatMap((l) => (l.payments || []).map((p) => ({ ...p, loanId: l.id })));

  return (
    <div className="space-y-4">
      {dues.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-2" style={{ border: "1px solid rgba(16,185,129,0.4)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="CalendarClock" size={18} className="text-emerald-600" />
            <div className="text-emerald-950 font-bold">К оплате</div>
          </div>
          {dues.map((d) => (
            <div key={d.key} className="flex items-center justify-between gap-3 rounded-lg px-3 py-3" style={{ background: "rgba(16,185,129,0.08)" }}>
              <div>
                <div className="text-emerald-950 text-sm font-semibold">{d.title}</div>
                <div className="text-emerald-950/50 text-xs">{d.subtitle}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {d.overdue && <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: "rgba(239,68,68,0.15)", color: "#b91c1c" }}>Платёж просрочен</span>}
                <button onClick={d.onPay} className="btn-neon text-white text-sm font-semibold px-4 py-2 rounded-lg">
                  Оплатить {fmt(d.amount)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-oswald text-2xl font-bold text-emerald-950">История выплат</h2>

      {rows.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Wallet" size={18} className="text-emerald-600" />
            <div className="text-emerald-950 font-bold">Внесённые платежи</div>
          </div>
          {rows.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.05)" }}>
              <div>
                <div className="text-emerald-950 text-sm font-semibold">Платёж по займу №{p.loanId}</div>
                <div className="text-emerald-950/50 text-xs">{p.paidAt}{p.note ? ` · ${p.note}` : ""}</div>
              </div>
              <div className="text-emerald-700 font-bold text-sm">+{fmt(p.amount)}</div>
            </div>
          ))}
        </div>
      )}

      {cardRepayments.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="CreditCard" size={18} className="text-emerald-600" />
            <div className="text-emerald-950 font-bold">Платежи по карте РУСФИНАНС 24</div>
          </div>
          {cardRepayments.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.05)" }}>
              <div>
                <div className="text-emerald-950 text-sm font-semibold">Погашение по карте</div>
                <div className="text-emerald-950/50 text-xs">{p.createdAt}{p.note ? ` · ${p.note}` : ""}</div>
              </div>
              <div className="text-emerald-700 font-bold text-sm">+{fmt(p.amount)}</div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
