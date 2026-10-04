import { useState } from "react";
import Icon from "@/components/ui/icon";

const CHECK_URL = "https://functions.poehali.dev/29f70c88-f1f7-4926-9c65-c642fd11fdfb";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function PromoCodeField({ value, onChange }: Props) {
  const [checking, setChecking] = useState(false);
  const [discount, setDiscount] = useState<number | null>(null);
  const [error, setError] = useState("");

  const check = async () => {
    if (!value.trim()) return;
    setChecking(true);
    setError("");
    setDiscount(null);
    try {
      const res = await fetch(CHECK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_promo", code: value }),
      });
      const data = await res.json();
      if (data.valid) setDiscount(data.discount);
      else setError(data.error || "Промокод недействителен");
    } catch {
      setError("Не удалось проверить промокод");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
      <label className="text-emerald-950 text-sm font-semibold flex items-center gap-2 mb-2">
        <Icon name="Ticket" size={16} className="text-emerald-600" />
        Промокод (если есть)
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value.toUpperCase()); setDiscount(null); setError(""); }}
          placeholder="Введите промокод"
          className="flex-1 rounded-xl px-4 py-3 text-sm uppercase tracking-wider text-emerald-950 outline-none"
          style={{ background: "#fff", border: "1px solid rgba(16,185,129,0.3)" }}
        />
        <button
          type="button"
          onClick={check}
          disabled={checking || !value.trim()}
          className="px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)" }}
        >
          {checking ? "..." : "Применить"}
        </button>
      </div>
      {discount !== null && (
        <div className="text-emerald-700 text-xs mt-2 font-medium">
          Промокод принят: скидка {discount}% на проценты по займу
        </div>
      )}
      {error && <div className="text-red-600 text-xs mt-2">{error}</div>}
    </div>
  );
}
