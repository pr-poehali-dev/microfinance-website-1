import Icon from "@/components/ui/icon";
import { App } from "./adminTypes";

interface Step {
  label: string;
  date: string | null;
  icon: string;
  color: string;
  done: boolean;
}

export default function AdminAppTimeline({ app }: { app: App }) {
  const steps: Step[] = [
    { label: "Заявка подана", date: app.createdAt, icon: "FileText", color: "#94a3b8", done: !!app.createdAt },
    {
      label: app.status === "rejected" ? "Заявка отклонена" : "Заявка одобрена",
      date: app.reviewedAt,
      icon: app.status === "rejected" ? "XCircle" : "CheckCircle",
      color: app.status === "rejected" ? "#f87171" : "#4ade80",
      done: !!app.reviewedAt,
    },
    { label: "Договор подписан", date: app.loanSignedAt, icon: "FileSignature", color: "#fdba74", done: !!app.loanSignedAt },
    { label: "Займ выдан", date: app.loanDisbursedAt, icon: "Banknote", color: "#38bdf8", done: !!app.loanDisbursedAt },
  ].filter(s => s.done || s.label !== "Заявка отклонена");

  if (steps.every(s => !s.done)) return null;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        <Icon name="History" size={13} />Хронология
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{ display: "flex", gap: 10, position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: s.done ? `${s.color}22` : "rgba(255,255,255,0.05)",
                border: `1px solid ${s.done ? s.color : "rgba(255,255,255,0.15)"}`, flexShrink: 0,
              }}>
                <Icon name={s.icon} size={13} style={{ color: s.done ? s.color : "rgba(255,255,255,0.2)" }} />
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 1, flex: 1, minHeight: 18, background: s.done ? `${s.color}55` : "rgba(255,255,255,0.1)" }} />
              )}
            </div>
            <div style={{ paddingBottom: i < steps.length - 1 ? 14 : 0 }}>
              <div style={{ color: s.done ? "white" : "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 600 }}>{s.label}</div>
              <div style={{ color: s.done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 1 }}>{s.date || "—"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
