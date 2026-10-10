import { useState } from "react";
import Icon from "@/components/ui/icon";

const YK_URL = "https://functions.poehali.dev/64ba6f22-6243-4b3f-ab24-f5bb294d5bfe";

interface Props {
  loanType: "loan" | "carloan" | "shoploan" | "card";
  loanId?: number;
  amount: number;
  txId?: number;
  dueDate?: string;
  full?: boolean;
}

export default function YooKassaPayButton({ loanType, loanId, amount, txId, dueDate, full }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pay = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${YK_URL}?sub=create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
        body: JSON.stringify({ loanType, loanId, amount, txId, dueDate, full, returnUrl: `${window.location.origin}/dashboard` }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.confirmationUrl) { setError(d.error || "Не удалось открыть оплату. Попробуйте ещё раз."); return; }
      localStorage.setItem("yk_payment_id", d.paymentId);
      window.location.href = d.confirmationUrl;
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626" }}>
          {error}
        </div>
      )}
      <button onClick={pay} disabled={loading}
        className="w-full btn-neon text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
        {loading ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="CreditCard" size={18} />}
        {loading ? "Открываем оплату..." : `Оплатить ${amount.toLocaleString("ru-RU")} ₽`}
      </button>
      <p className="text-center text-emerald-950/40 text-xs">Безопасная оплата картой через ЮKassa. Платёж зачтётся автоматически.</p>
    </div>
  );
}
