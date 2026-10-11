import Icon from "@/components/ui/icon";
import YooKassaHistory from "./YooKassaHistory";

interface PaymentItem { amount: number; paidAt: string; note?: string }
interface LoanLike { id: number; payments?: PaymentItem[] }

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export default function PaymentsList({ loans }: { loans: LoanLike[] }) {
  const rows = loans.flatMap((l) => (l.payments || []).map((p) => ({ ...p, loanId: l.id })));

  return (
    <div className="space-y-4">
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

      <YooKassaHistory showEmpty={rows.length === 0} />
    </div>
  );
}
