import { useState } from "react";
import Icon from "@/components/ui/icon";
import CardPayModal from "./CardPayModal";

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
  disbursedAmount?: number;
  disbursedAt?: string | null;
  targetCard?: string;
}

interface Props {
  transactions: CardTransaction[];
  cardLast4?: string;
  fullName?: string;
  pendingNotices?: string[];
  paidNotices?: string[];
  onReported?: () => void;
}

export default function CardTransactionsList({ transactions, cardLast4, fullName, pendingNotices = [], paidNotices = [], onReported }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [pay, setPay] = useState<{ txId: number; amount: number; dueDate: string } | null>(null);

  if (transactions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-emerald-950/40 text-xs uppercase tracking-wider">Переводы с карты</div>
      {transactions.map((tx) => (
        <div key={tx.id} className="rounded-xl overflow-hidden" style={{ background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.08)" }}>
          <button
            onClick={() => setOpenId(openId === tx.id ? null : tx.id)}
            className="w-full px-4 py-3 flex items-center justify-between gap-3 transition-colors hover:bg-emerald-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(74,222,128,0.15)" }}>
                <Icon name="ArrowUpRight" size={14} className="text-green-400" />
              </div>
              <div className="text-left">
                <div className="text-emerald-950 font-semibold text-sm">{tx.amount.toLocaleString("ru-RU")} ₽ · {tx.weeks} нед.</div>
                <div className="text-emerald-950/40 text-xs">{tx.createdAt} · к возврату {tx.total.toLocaleString("ru-RU")} ₽</div>
                <div className="text-xs font-medium" style={{ color: (tx.disbursedAmount ?? 0) >= tx.amount ? "#15803d" : "#b91c1c" }}>
                  {(tx.disbursedAmount ?? 0) >= tx.amount
                    ? `Перечислено на карту: ${(tx.disbursedAmount ?? 0).toLocaleString("ru-RU")} ₽`
                    : (tx.disbursedAmount ?? 0) > 0
                      ? `Перечислено ${(tx.disbursedAmount ?? 0).toLocaleString("ru-RU")} из ${tx.amount.toLocaleString("ru-RU")} ₽`
                      : "Ожидает перечисления"}
                </div>
              </div>
            </div>
            <Icon name={openId === tx.id ? "ChevronUp" : "ChevronDown"} size={16} className="text-emerald-950/40 shrink-0" />
          </button>
          {openId === tx.id && (
            <div className="px-4 pb-4 space-y-1.5">
              {tx.schedule.map((s) => (
                <div key={s.week} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.03)" }}>
                  <span className="text-emerald-950/60 text-xs">{s.week}-я неделя · {s.dueDate}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-emerald-950 font-semibold text-sm">{s.amount.toLocaleString("ru-RU")} ₽</span>
                    {cardLast4 && tx.status !== "cancelled" && (
                      paidNotices.includes(`${tx.id}|${s.dueDate}`) ? (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "rgba(16,185,129,0.15)", color: "#047857" }}>
                          <Icon name="CheckCircle" size={12} />Оплачено
                        </span>
                      ) : pendingNotices.includes(`${tx.id}|${s.dueDate}`) ? (
                        <button onClick={() => setPay({ txId: tx.id, amount: s.amount, dueDate: s.dueDate })}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.15)", color: "#b91c1c" }}>
                          Оплата проверяется
                        </button>
                      ) : (
                        <button onClick={() => setPay({ txId: tx.id, amount: s.amount, dueDate: s.dueDate })}
                          className="btn-neon text-white text-xs font-semibold px-2.5 py-1 rounded-lg">
                          Оплатить
                        </button>
                      )
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {pay && cardLast4 && (
        <CardPayModal
          amount={pay.amount}
          dueDate={pay.dueDate}
          txId={pay.txId}
          cardLast4={cardLast4}
          fullName={fullName}
          alreadyReported={pendingNotices.includes(`${pay.txId}|${pay.dueDate}`)}
          onReported={onReported}
          onClose={() => setPay(null)}
        />
      )}
    </div>
  );
}