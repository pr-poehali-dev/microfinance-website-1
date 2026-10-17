import { useState } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Props {
  appId: number;
  token: string;
  status?: string;
  number?: string;
  photo?: string;
  sentAt?: string | null;
  rejectReason?: string;
  onDone: () => void;
  onZoom?: (url: string) => void;
}

export default function AdminPartnerIdentification({ appId, token, status = "none", number, photo, sentAt, rejectReason, onDone, onZoom }: Props) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  async function decide(decision: "approve" | "reject") {
    if (decision === "approve" && !window.confirm("Одобрить идентификацию? Клиент сможет подписать договор.")) return;
    setBusy(true); setErr("");
    const res = await fetch(`${ADMIN_URL}?sub=partner_card_decision&appId=${appId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ decision, reason }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(d.error || "Не удалось сохранить решение"); return; }
    setRejecting(false); setReason("");
    onDone();
  }

  const palette =
    status === "pending" ? { bg: "rgba(245,158,11,0.1)", bd: "2px solid #f59e0b", title: "#b45309" } :
    status === "approved" ? { bg: "rgba(34,197,94,0.08)", bd: "1px solid rgba(34,197,94,0.4)", title: "#15803d" } :
    status === "rejected" ? { bg: "rgba(239,68,68,0.07)", bd: "1px solid rgba(239,68,68,0.4)", title: "#b91c1c" } :
    { bg: "rgba(107,114,128,0.07)", bd: "1px solid rgba(107,114,128,0.3)", title: "#4b5563" };

  const label =
    status === "pending" ? "Клиент ждёт идентификации карты партнёра" :
    status === "approved" ? "Идентификация карты партнёра одобрена" :
    status === "rejected" ? "В идентификации отказано, клиент может отправить заново" :
    "Клиент ещё не прислал карту партнёра — подписать договор он не сможет";

  return (
    <div style={{ background: palette.bg, border: palette.bd, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ color: palette.title, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginBottom: status === "none" ? 0 : 10 }}>
        <Icon name="CreditCard" size={14} />
        {status === "pending" ? "🔴 " : ""}{label}
      </div>

      {status !== "none" && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          {photo && (
            <button type="button" onClick={() => onZoom?.(photo)} style={{ border: "none", padding: 0, background: "none", cursor: "zoom-in" }}>
              <img src={photo} alt="Карта партнёра" style={{ width: 160, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(16,185,129,0.3)", display: "block" }} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: "rgba(2,44,34,0.4)", fontSize: 11, marginBottom: 2 }}>Номер карты партнёра</div>
            <div style={{ color: "#022c22", fontSize: 20, fontWeight: 800, fontFamily: "monospace", letterSpacing: 1, userSelect: "all" }}>{number || "—"}</div>
            {sentAt && <div style={{ color: "rgba(2,44,34,0.4)", fontSize: 12, marginTop: 4 }}>Отправлено: {sentAt}</div>}
            {status === "rejected" && rejectReason && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>Причина отказа: {rejectReason}</div>}
          </div>
        </div>
      )}

      {status === "pending" && (
        <div style={{ marginTop: 12 }}>
          {!rejecting ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => decide("approve")} disabled={busy}
                style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "white", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                {busy ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Check" size={15} />}Одобрить идентификацию
              </button>
              <button onClick={() => setRejecting(true)} disabled={busy}
                style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="X" size={15} />Отказать
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина отказа (увидит клиент)"
                style={{ background: "#fff", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, padding: "9px 12px", color: "#022c22", fontSize: 14, outline: "none" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => decide("reject")} disabled={busy}
                  style={{ background: "#dc2626", color: "white", border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                  {busy ? "Сохраняем..." : "Подтвердить отказ"}
                </button>
                <button onClick={() => { setRejecting(false); setReason(""); }}
                  style={{ background: "rgba(107,114,128,0.12)", color: "#4b5563", border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {err && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 8 }}>{err}</div>}
    </div>
  );
}
