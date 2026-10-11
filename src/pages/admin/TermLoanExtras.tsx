import { useState } from "react";
import Icon from "@/components/ui/icon";
import AdminAppTimeline from "./AdminAppTimeline";

export interface TermLoanLike {
  id: number;
  phone: string;
  status: string;
  created_at: string;
  reviewed_at?: string | null;
  contract_signed?: boolean;
  contract_signed_at?: string | null;
  disbursed_at?: string | null;
  contract_url?: string | null;
  client_password?: string | null;
  workplace?: string | null;
  position?: string | null;
  active_loans?: string | null;
  salary?: number | string | null;
  contact_person?: string | null;
  sb_score?: string | null;
  card_number?: string | null;
}

interface Props {
  app: TermLoanLike;
  baseUrl: string;
  token: string;
  onSaved: () => void;
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  if (isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });
  const time = d.toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" });
  return `${date} в ${time}`;
};

const SB_FIELDS: [keyof TermLoanLike, string][] = [
  ["workplace", "Место работы"],
  ["position", "Должность"],
  ["active_loans", "Действующие займы"],
  ["salary", "Зарплата (₽)"],
  ["contact_person", "Контактное лицо"],
  ["card_number", "Карта/СБП"],
];

const inpStyle: React.CSSProperties = {
  background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 8,
  padding: "7px 10px", color: "#022c22", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none",
};

export default function TermLoanExtras({ app, baseUrl, token, onSaved }: Props) {
  const initial = () => ({
    workplace: app.workplace || "", position: app.position || "", activeLoans: app.active_loans || "",
    salary: app.salary ? String(app.salary).replace(/\.0$/, "") : "", contactPerson: app.contact_person || "",
    cardNumber: app.card_number || "", sbScore: app.sb_score || "",
  });
  const [sb, setSb] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPw, setNewPw] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const keyMap: Record<string, keyof ReturnType<typeof initial>> = {
    workplace: "workplace", position: "position", active_loans: "activeLoans",
    salary: "salary", contact_person: "contactPerson", card_number: "cardNumber",
  };

  const save = async () => {
    setSaving(true);
    await fetch(`${baseUrl}?sub=sb_update&id=${app.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(sb),
    }).catch(() => null);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  };

  const resetPassword = async () => {
    if (!window.confirm("Сбросить пароль клиента? Старый пароль перестанет работать.")) return;
    setResetting(true);
    const r = await fetch(`${baseUrl}?sub=reset_password&id=${app.id}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    const d = r && r.ok ? await r.json().catch(() => null) : null;
    setResetting(false);
    if (d?.password) { setNewPw(d.password); onSaved(); }
    else window.alert("Не удалось сбросить пароль");
  };

  const shownPw = newPw || app.client_password;
  const decided = ["approved", "signing", "rejected"].includes(app.status);
  const showContract = ["approved", "signing"].includes(app.status) || !!app.disbursed_at;

  return (
    <div style={{ marginTop: 12 }}>
      {shownPw && (
        <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 12, padding: "14px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="KeyRound" size={18} style={{ color: "#14b8a6", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: "rgba(2,44,34,0.4)", fontSize: 11, marginBottom: 4 }}>Данные для входа в личный кабинет</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <span style={{ color: "#022c22", fontSize: 14 }}>📞 <b>{app.phone}</b></span>
              <span style={{ color: "#022c22", fontSize: 14 }}>🔑 Пароль: <b style={{ color: "#14b8a6", letterSpacing: 1 }}>{shownPw}</b></span>
            </div>
          </div>
          <button type="button" onClick={resetPassword} disabled={resetting}
            style={{ background: "rgba(239,68,68,0.08)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <Icon name="RotateCcw" size={13} />{resetting ? "Сбрасываем..." : "Сбросить пароль"}
          </button>
        </div>
      )}

      {showContract && (
        app.contract_url ? (
          <a href={app.contract_url} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, background: "rgba(16,185,129,0.1)", color: "#047857", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            <Icon name="FileCheck" size={14} />Договор создан и виден клиенту
          </a>
        ) : (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, background: "rgba(245,158,11,0.1)", color: "#b45309", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600 }}>
            <Icon name="Clock" size={14} />Договор формируется
          </div>
        )
      )}

      <AdminAppTimeline app={{
        status: app.status,
        createdAt: fmtDate(app.created_at),
        reviewedAt: decided ? fmtDate(app.reviewed_at) : null,
        loanSignedAt: app.contract_signed ? fmtDate(app.contract_signed_at) || "—" : null,
        loanDisbursedAt: fmtDate(app.disbursed_at),
      }} />

      <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 12, padding: 14 }}>
        <div style={{ color: "#b45309", fontWeight: 700, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="ShieldCheck" size={14} />Данные СБ
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 10, marginBottom: 10 }}>
          {SB_FIELDS.map(([k, label]) => {
            const key = keyMap[k as string];
            return (
              <div key={k as string}>
                <div style={{ color: "rgba(2,44,34,0.4)", fontSize: 11, marginBottom: 4 }}>{label}</div>
                <input value={sb[key]} onChange={e => setSb(p => ({ ...p, [key]: e.target.value }))} placeholder={label} style={inpStyle} />
              </div>
            );
          })}
          <div>
            <div style={{ color: "rgba(2,44,34,0.4)", fontSize: 11, marginBottom: 4 }}>Оценка СБ</div>
            <select value={sb.sbScore} onChange={e => setSb(p => ({ ...p, sbScore: e.target.value }))} style={inpStyle}>
              <option value="">— Не выбрано —</option>
              <option value="✅ Одобрен">✅ Одобрен</option>
              <option value="⚠️ Под вопросом">⚠️ Под вопросом</option>
              <option value="❌ Отказ">❌ Отказ</option>
            </select>
          </div>
        </div>
        <button type="button" onClick={save} disabled={saving}
          style={{ background: saved ? "linear-gradient(135deg,#16a34a,#22c55e)" : "linear-gradient(135deg,#d97706,#fbbf24)", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name={saved ? "Check" : "Save"} size={13} />
          {saving ? "Сохранение..." : saved ? "Сохранено!" : "Сохранить данные СБ"}
        </button>
      </div>
    </div>
  );
}
