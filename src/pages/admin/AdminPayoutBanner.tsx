import Icon from "@/components/ui/icon";
import { splitPayout, isCardValue } from "@/data/banks";

interface Props {
  value?: string | null;
}

export default function AdminPayoutBanner({ value }: Props) {
  const raw = (value || "").trim();
  if (!raw) {
    return (
      <div style={{ background: "rgba(239,68,68,0.08)", border: "2px solid rgba(239,68,68,0.5)", borderRadius: 12, padding: "12px 16px", marginBottom: 12, color: "#b91c1c", fontWeight: 700, fontSize: 14 }}>
        Реквизиты для выплаты не указаны
      </div>
    );
  }
  const { main, bank } = splitPayout(raw);
  const card = isCardValue(main);
  return (
    <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.08))", border: "2px solid #10b981", borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}>
      <div style={{ color: "#047857", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Icon name={card ? "CreditCard" : "Smartphone"} size={14} />
        {card ? "Карта для выплаты" : "СБП для выплаты"}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span style={{ color: "#022c22", fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: "monospace", userSelect: "all" }}>{main}</span>
        {!card && (
          <span style={{ color: "#fff", background: "#059669", borderRadius: 8, padding: "3px 10px", fontSize: 14, fontWeight: 700 }}>
            {bank || "банк не выбран"}
          </span>
        )}
      </div>
    </div>
  );
}
