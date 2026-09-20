import { useState } from "react";
import Icon from "@/components/ui/icon";

const CARD_NUMBER = "2204 3901 1553 9020";

interface Props {
  loanId: number;
  amount: number;
  fullName: string;
  fmtAppId: (id: number) => string;
  onClose: () => void;
}

export default function PayLoanModal({ loanId, amount, fullName, fmtAppId, onClose }: Props) {
  const [copied, setCopied] = useState<"card" | "contract" | null>(null);

  const contractNumber = fmtAppId(loanId);

  const copy = (text: string, type: "card" | "contract") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div className="glass" style={{ borderRadius: 20, padding: 0, width: "100%", maxWidth: 440, overflow: "hidden", border: "1px solid rgba(124,58,237,0.4)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.1))" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.3)" }}>
              <Icon name="Banknote" size={20} className="text-white" />
            </div>
            <div className="text-white font-bold text-lg">Погашение займа</div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <span className="text-white/50 text-sm">Сумма к оплате</span>
            <span className="font-bold text-2xl gradient-text">{amount.toLocaleString("ru-RU")} ₽</span>
          </div>

          <div>
            <div className="text-white/40 text-xs uppercase tracking-wider mb-2">Номер карты для оплаты</div>
            <button
              onClick={() => copy(CARD_NUMBER.replace(/\s/g, ""), "card")}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3.5 transition-all hover:opacity-90"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <span className="text-white font-bold text-lg tracking-wider">{CARD_NUMBER}</span>
              <Icon name={copied === "card" ? "Check" : "Copy"} size={18} className={copied === "card" ? "text-green-400" : "text-white/40"} />
            </button>
          </div>

          <div>
            <div className="text-white/40 text-xs uppercase tracking-wider mb-2">Номер договора (для комментария)</div>
            <button
              onClick={() => copy(contractNumber, "contract")}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3.5 transition-all hover:opacity-90"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <span className="text-white font-bold text-lg tracking-wider">№ {contractNumber}</span>
              <Icon name={copied === "contract" ? "Check" : "Copy"} size={18} className={copied === "contract" ? "text-green-400" : "text-white/40"} />
            </button>
          </div>

          <div className="rounded-xl px-4 py-4 space-y-2" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
            <div className="flex items-start gap-2">
              <Icon name="Info" size={16} className="text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-white/70 text-sm leading-relaxed">
                Для погашения займа просим вас оплатить по указанному номеру карты. В комментарии к переводу просим указать <b className="text-white">номер вашего договора</b> и <b className="text-white">Фамилию Имя Отчество</b>{fullName ? <> — <span className="text-yellow-300">{fullName}</span></> : ""}.
              </p>
            </div>
          </div>

          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
            <Icon name="Clock" size={18} className="text-green-400 shrink-0" />
            <p className="text-white/70 text-sm">Зачисление денег происходит в течение 15 минут.</p>
          </div>

          <p className="text-center text-white/40 text-sm pt-1">Спасибо за своевременное погашение займа!</p>

          <button
            onClick={onClose}
            className="w-full btn-neon text-white font-semibold py-3.5 rounded-xl mt-2"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
