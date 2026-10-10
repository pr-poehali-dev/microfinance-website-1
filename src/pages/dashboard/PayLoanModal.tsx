import Icon from "@/components/ui/icon";
import YooKassaPayButton from "./YooKassaPayButton";

interface Props {
  amount: number;
  contractNumber: string;
  fullName?: string;
  loanType?: "loan" | "carloan" | "shoploan";
  loanId?: number;
  alreadyReported?: boolean;
  onReported?: () => void;
  onClose: () => void;
}

export default function PayLoanModal({ amount, contractNumber, loanType, loanId, onClose }: Props) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div className="glass" style={{ borderRadius: 20, padding: 0, width: "100%", maxWidth: 440, overflow: "hidden", border: "1px solid rgba(16,185,129,0.4)", background: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.3),rgba(20,184,166,0.1))" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.3)" }}>
              <Icon name="Banknote" size={20} className="text-white" />
            </div>
            <div>
              <div className="text-emerald-950 font-bold text-lg leading-tight">Погашение займа</div>
              <div className="text-emerald-950/50 text-xs">Договор № {contractNumber}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-950/40 hover:text-emerald-950/70 transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <span className="text-emerald-950/50 text-sm">Сумма к оплате</span>
            <span className="font-bold text-2xl gradient-text">{amount.toLocaleString("ru-RU")} ₽</span>
          </div>

          {loanType && loanId ? <YooKassaPayButton loanType={loanType} loanId={loanId} amount={amount} /> : null}

          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <Icon name="Clock" size={18} className="text-emerald-600 shrink-0" />
            <p className="text-emerald-950/70 text-sm">После оплаты платёж засчитается автоматически.</p>
          </div>

          <p className="text-center text-emerald-950/40 text-sm">Спасибо за своевременное погашение займа!</p>

          <button onClick={onClose} className="w-full text-emerald-950/60 font-semibold py-2.5 rounded-xl" style={{ background: "rgba(16,185,129,0.07)" }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
