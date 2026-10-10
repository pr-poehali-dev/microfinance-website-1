import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const YK_URL = "https://functions.poehali.dev/64ba6f22-6243-4b3f-ab24-f5bb294d5bfe";

interface Item { id: string; loanType: string; loanId: number; amount: number; status: string; date: string; }

const TYPE_LABEL: Record<string, string> = { loan: "Займ", carloan: "Автозайм", shoploan: "Займ на покупки", card: "Карта РУСФИНАНС 24" };
const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  succeeded: { label: "Оплачено", bg: "rgba(16,185,129,0.15)", color: "#047857" },
  canceled: { label: "Отменено", bg: "rgba(239,68,68,0.12)", color: "#b91c1c" },
  pending: { label: "Не завершён", bg: "rgba(245,158,11,0.15)", color: "#b45309" },
};

export default function YooKassaHistory() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${YK_URL}?sub=history`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
      body: "{}",
    })
      .then((r) => r.json())
      .then((d) => setItems(d.payments || []))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: "#ffffff", border: "1px solid rgba(16,185,129,0.25)" }}>
      <div className="flex items-center gap-2">
        <Icon name="Receipt" size={18} className="text-emerald-600" />
        <div className="text-emerald-950 font-bold">История оплат</div>
      </div>
      <div className="space-y-1.5">
        {items.map((p) => {
          const st = STATUS[p.status] || STATUS.pending;
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.05)" }}>
              <div>
                <div className="text-emerald-950 text-sm font-semibold">{TYPE_LABEL[p.loanType] || "Платёж"}{p.loanType !== "card" ? ` №${p.loanId}` : ""}</div>
                <div className="text-emerald-950/50 text-xs">{p.date}</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-950 font-bold text-sm">{fmt(p.amount)}</div>
                <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
