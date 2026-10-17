import Icon from "@/components/ui/icon";
import type { PaymentItem } from "./PaymentHistory";

interface Props {
  title: string;
  icon: string;
  number: string;
  amount: number;
  months: number;
  total: number;
  payments: PaymentItem[];
  contractUrl?: string | null;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export default function TermLoanHistoryCard({ title, icon, number, amount, months, total, payments, contractUrl }: Props) {
  return (
    <div className="glass rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid rgba(45,212,191,0.4)", background: "rgba(45,212,191,0.04)" }}>
      <div className="px-4 sm:px-6 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.25),rgba(45,212,191,0.08))" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(45,212,191,0.2)" }}>
          <Icon name={icon} size={20} className="text-teal-600" />
        </div>
        <div className="flex-1">
          <div className="text-emerald-950 font-bold">{title} № {number}</div>
          <div className="text-teal-700 text-xs mt-0.5">{fmt(amount)} на {months} мес. · выплачено {fmt(total)}</div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: "rgba(45,212,191,0.2)", color: "#0d9488" }}>Погашен ✔️</span>
      </div>
      <div className="px-4 sm:px-6 py-4 space-y-2">
        {payments.length === 0 ? (
          <div className="text-emerald-950/40 text-xs">Платежей в истории нет</div>
        ) : payments.map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.05)" }}>
            <div>
              <div className="text-emerald-950/80 text-xs">{p.paidAt}</div>
              {p.note && <div className="text-emerald-950/40 text-xs">{p.note}</div>}
            </div>
            <span className="text-emerald-700 font-semibold text-sm">+{fmt(p.amount)}</span>
          </div>
        ))}
        {contractUrl && (
          <a href={contractUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-emerald-950"
            style={{ background: "rgba(45,212,191,0.15)", border: "1px solid rgba(45,212,191,0.35)" }}>
            <Icon name="FileDown" size={15} />Договор
          </a>
        )}
      </div>
    </div>
  );
}
