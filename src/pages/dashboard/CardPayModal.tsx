import { useState } from "react";
import Icon from "@/components/ui/icon";

const PAY_CARD_NUMBER = "2204390115539020";
const PAY_CARD_FORMATTED = "2204 3901 1553 9020";

interface Props {
  amount: number;
  dueDate: string;
  cardLast4: string;
  fullName?: string;
  onClose: () => void;
}

export default function CardPayModal({ amount, dueDate, cardLast4, fullName, onClose }: Props) {
  const [copied, setCopied] = useState<"card" | "last4" | null>(null);

  const copy = (text: string, type: "card" | "last4") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 1500);
    });
  };

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
              <div className="text-emerald-950 font-bold text-lg leading-tight">Оплата по карте</div>
              <div className="text-emerald-950/50 text-xs">Платёж до {dueDate}</div>
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

          <div>
            <div className="text-emerald-950/40 text-xs uppercase tracking-wider mb-2">Номер карты для оплаты лимита</div>
            <button
              onClick={() => copy(PAY_CARD_NUMBER, "card")}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3.5 transition-all hover:opacity-90"
              style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <span className="text-emerald-950 font-bold text-lg tracking-wider">{PAY_CARD_FORMATTED}</span>
              <Icon name={copied === "card" ? "Check" : "Copy"} size={18} className={copied === "card" ? "text-emerald-600" : "text-emerald-950/40"} />
            </button>
          </div>

          <div>
            <div className="text-emerald-950/40 text-xs uppercase tracking-wider mb-2">Последние 4 цифры карты РУСФИНАНС 24</div>
            <button
              onClick={() => copy(cardLast4, "last4")}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3.5 transition-all hover:opacity-90"
              style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <span className="text-emerald-950 font-bold text-lg tracking-wider">•••• {cardLast4}</span>
              <Icon name={copied === "last4" ? "Check" : "Copy"} size={18} className={copied === "last4" ? "text-emerald-600" : "text-emerald-950/40"} />
            </button>
          </div>

          <div className="rounded-xl px-4 py-4" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
            <div className="flex items-start gap-2">
              <Icon name="Info" size={16} className="text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-emerald-950/70 text-sm leading-relaxed">
                Для погашения займа просим вас оплатить по указанному номеру карты <b className="text-emerald-950">{PAY_CARD_NUMBER}</b>. В комментарии к переводу укажите <b className="text-emerald-950">последние четыре цифры карты РУСФИНАНС 24 ({cardLast4})</b>{fullName ? <> и ФИО — <span className="text-yellow-700">{fullName}</span></> : ""}.
              </p>
            </div>
          </div>

          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <Icon name="Clock" size={18} className="text-emerald-600 shrink-0" />
            <p className="text-emerald-950/70 text-sm">Зачисление денег происходит в течение 15 минут.</p>
          </div>

          <button onClick={onClose} className="w-full btn-neon text-white font-semibold py-3.5 rounded-xl">
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
