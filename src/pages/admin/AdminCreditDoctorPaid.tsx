import { useState } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Props {
  appId: number;
  token: string;
  paid: boolean;
  paidAt?: string | null;
  rejected: boolean;
  refundDone: boolean;
  onDone: () => void;
}

export default function AdminCreditDoctorPaid({ appId, token, paid, paidAt, rejected, refundDone, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const needRefund = paid && rejected && !refundDone;

  async function markRefunded() {
    if (!window.confirm("Отметить, что 1 799 ₽ клиенту возвращены?")) return;
    setBusy(true);
    await fetch(`${ADMIN_URL}?sub=cd_refund_done&appId=${appId}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
    setBusy(false);
    onDone();
  }

  if (!paid) return null;

  return (
    <div style={{
      background: needRefund ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
      border: needRefund ? "2px solid #ef4444" : "1px solid rgba(34,197,94,0.45)",
      borderRadius: 12, padding: "12px 16px", marginBottom: 12,
    }}>
      <div style={{ color: needRefund ? "#b91c1c" : "#15803d", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Icon name={needRefund ? "AlertTriangle" : "BadgeCheck"} size={16} />
        {needRefund
          ? "Нужен возврат: клиент оплатил Кредитный Доктор 1 799 ₽, а в займе отказано"
          : refundDone && rejected
            ? "Возврат 1 799 ₽ отмечен выполненным"
            : "Клиент оплатил услугу «Кредитный Доктор» — 1 799 ₽"}
      </div>
      {paidAt && <div style={{ color: "rgba(2,44,34,0.45)", fontSize: 12, marginTop: 4 }}>Оплачено: {paidAt}</div>}
      {needRefund && (
        <button onClick={markRefunded} disabled={busy}
          style={{ marginTop: 10, background: "#dc2626", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
          {busy ? "Сохраняем..." : "Возврат сделан"}
        </button>
      )}
    </div>
  );
}
