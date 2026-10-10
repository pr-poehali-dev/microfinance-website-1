import Icon from "@/components/ui/icon";
import YooKassaPayButton from "./YooKassaPayButton";

interface Props {
  amount: number;
  dueDate: string;
  txId?: number;
  cardLast4: string;
  fullName?: string;
  alreadyReported?: boolean;
  full?: boolean;
  onClose: () => void;
  onReported?: () => void;
}

export default function CardPayModal({ amount, dueDate, txId, full, onClose }: Props) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        className="glass"
        style={{ borderRadius: 20, width: "100%", maxWidth: 440, overflow: "hidden", border: "1px solid rgba(16,185,129,0.4)", background: "#ffffff", maxHeight: "92vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.3),rgba(20,184,166,0.1))" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.3)" }}>
              <Icon name="CreditCard" size={20} className="text-emerald-700" />
            </div>
            <div>
              <div className="text-emerald-950 font-bold text-lg leading-tight">{full ? "Полное погашение" : "Оплата по карте"}</div>
              <div className="text-emerald-950/50 text-xs">{full ? "Закрытие всей задолженности по карте" : `Платёж до ${dueDate}`}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-950/40 hover:text-emerald-950/70 transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <span className="text-emerald-950/50 text-sm">{full ? "Сумма полного погашения" : "Сумма к оплате"}</span>
            <span className="font-bold text-2xl gradient-text">{amount.toLocaleString("ru-RU")} ₽</span>
          </div>

          <YooKassaPayButton loanType="card" amount={amount} txId={txId} dueDate={dueDate} full={full} />

          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <Icon name="Clock" size={18} className="text-emerald-600 shrink-0" />
            <p className="text-emerald-950/70 text-sm">После оплаты платёж засчитается автоматически.</p>
          </div>

          <button onClick={onClose} className="w-full text-emerald-950/60 font-semibold py-2.5 rounded-xl" style={{ background: "rgba(16,185,129,0.07)" }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
