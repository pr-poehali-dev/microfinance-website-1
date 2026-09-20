import { useState } from "react";
import Icon from "@/components/ui/icon";

interface TxSchedule {
  week: number;
  dueDate: string;
  amount: number;
}

export interface CardTransaction {
  id: number;
  amount: number;
  weeks: number;
  rate: number;
  status: string;
  createdAt: string;
  total: number;
  schedule: TxSchedule[];
}

interface Props {
  transactions: CardTransaction[];
}

export default function CardTransactionsList({ transactions }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (transactions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-white/40 text-xs uppercase tracking-wider">Переводы с карты</div>
      {transactions.map((tx) => (
        <div key={tx.id} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => setOpenId(openId === tx.id ? null : tx.id)}
            className="w-full px-4 py-3 flex items-center justify-between gap-3 transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(74,222,128,0.15)" }}>
                <Icon name="ArrowUpRight" size={14} className="text-green-400" />
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-sm">{tx.amount.toLocaleString("ru-RU")} ₽ · {tx.weeks} нед.</div>
                <div className="text-white/40 text-xs">{tx.createdAt} · к возврату {tx.total.toLocaleString("ru-RU")} ₽</div>
              </div>
            </div>
            <Icon name={openId === tx.id ? "ChevronUp" : "ChevronDown"} size={16} className="text-white/40 shrink-0" />
          </button>
          {openId === tx.id && (
            <div className="px-4 pb-4 space-y-1.5">
              {tx.schedule.map((s) => (
                <div key={s.week} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="text-white/60 text-xs">{s.week}-я неделя · {s.dueDate}</span>
                  <span className="text-white font-semibold text-sm">{s.amount.toLocaleString("ru-RU")} ₽</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
