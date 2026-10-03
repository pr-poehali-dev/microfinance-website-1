import { useState } from "react";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";
const CARD_NUMBER = "2204 3901 1553 9020";

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

export default function PayLoanModal({ amount, contractNumber, loanType, loanId, alreadyReported, onReported, onClose }: Props) {
  const [copied, setCopied] = useState<"card" | "contract" | null>(null);
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState(!!alreadyReported);
  const [error, setError] = useState("");

  const reportPaid = async () => {
    const token = localStorage.getItem("token");
    if (!token || !loanType || !loanId) return;
    setSending(true); setError("");
    try {
      const res = await fetch(`${LOANS_URL}?sub=loan_paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
        body: JSON.stringify({ loanType, loanId, amount }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Не удалось отправить. Попробуйте ещё раз."); return; }
      setReported(true);
      onReported?.();
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  };

  const copy = (text: string, type: "card" | "contract") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 1500);
    });
  };

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
            <div className="text-emerald-950 font-bold text-lg">Погашение займа</div>
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
            <div className="text-emerald-950/40 text-xs uppercase tracking-wider mb-2">Номер карты для оплаты</div>
            <button
              onClick={() => copy(CARD_NUMBER.replace(/\s/g, ""), "card")}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3.5 transition-all hover:opacity-90"
              style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <span className="text-emerald-950 font-bold text-lg tracking-wider">{CARD_NUMBER}</span>
              <Icon name={copied === "card" ? "Check" : "Copy"} size={18} className={copied === "card" ? "text-green-400" : "text-emerald-950/40"} />
            </button>
          </div>

          <div>
            <div className="text-emerald-950/40 text-xs uppercase tracking-wider mb-2">Номер договора</div>
            <button
              onClick={() => copy(contractNumber, "contract")}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3.5 transition-all hover:opacity-90"
              style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <span className="text-emerald-950 font-bold text-lg tracking-wider">№ {contractNumber}</span>
              <Icon name={copied === "contract" ? "Check" : "Copy"} size={18} className={copied === "contract" ? "text-green-400" : "text-emerald-950/40"} />
            </button>
          </div>

          <div className="rounded-xl px-4 py-4 space-y-2" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
            <div className="flex items-start gap-2">
              <Icon name="Info" size={16} className="text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-emerald-950/70 text-sm leading-relaxed">
                Для погашения займа просим вас оплатить по указанному номеру карты.
              </p>
            </div>
          </div>

          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
            <Icon name="Clock" size={18} className="text-green-400 shrink-0" />
            <p className="text-emerald-950/70 text-sm">Зачисление денег происходит в течение 15 минут.</p>
          </div>

          <p className="text-center text-emerald-950/40 text-sm pt-1">Спасибо за своевременное погашение займа!</p>

          {error && (
            <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626" }}>
              {error}
            </div>
          )}

          {loanType && loanId ? (
            reported ? (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)" }}>
                <Icon name="CheckCircle" size={20} className="text-emerald-600 shrink-0" />
                <p className="text-emerald-950 text-sm font-medium">Спасибо! Мы получили ваше сообщение об оплате и проверим поступление.</p>
              </div>
            ) : (
              <button onClick={reportPaid} disabled={sending}
                className="w-full btn-neon text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                {sending ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="CheckCircle" size={18} />}
                {sending ? "Отправляем..." : "Я оплатил"}
              </button>
            )
          ) : null}

          <button onClick={onClose} className="w-full text-emerald-950/60 font-semibold py-2.5 rounded-xl" style={{ background: "rgba(16,185,129,0.07)" }}>
            {loanType && loanId ? "Закрыть" : "Понятно"}
          </button>
        </div>
      </div>
    </div>
  );
}