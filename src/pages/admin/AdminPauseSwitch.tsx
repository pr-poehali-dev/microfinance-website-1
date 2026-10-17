import { useEffect, useState } from "react";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

export default function AdminPauseSwitch({ token }: { token: string }) {
  const [paused, setPaused] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState("");
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    fetch(`${ADMIN_URL}?sub=pause_status`)
      .then((r) => r.json())
      .then((d) => { setPaused(!!d.paused); setMessage(d.message || ""); setSaved(d.message || ""); })
      .catch(() => {});
  }, []);

  async function toggle() {
    if (paused === null) return;
    const next = !paused;
    const q = next
      ? "Остановить приём новых заявок? На главной появится красный баннер."
      : "Открыть приём новых заявок? Баннер исчезнет, вернётся колесо фортуны.";
    if (!window.confirm(q)) return;
    setBusy(true);
    const r = await fetch(`${ADMIN_URL}?sub=pause_set`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paused: next, message }),
    });
    setBusy(false);
    if (r.ok) { setPaused(next); setSaved(message); }
  }

  async function saveMessage() {
    if (paused === null) return;
    setBusy(true);
    const r = await fetch(`${ADMIN_URL}?sub=pause_set`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paused, message }),
    });
    setBusy(false);
    if (r.ok) { setSaved(message); setSavedOk(true); setTimeout(() => setSavedOk(false), 3000); }
  }

  if (paused === null) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", marginBottom: 14, borderRadius: 12,
      background: paused ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.08)",
      border: `2px solid ${paused ? "rgba(239,68,68,0.5)" : "rgba(16,185,129,0.4)"}`,
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: paused ? "#b91c1c" : "#047857" }}>
          {paused ? "⛔ Приём новых заявок ОСТАНОВЛЕН" : "✅ Приём новых заявок открыт"}
        </div>
        <div style={{ fontSize: 12, color: "rgba(2,44,34,0.6)" }}>
          {paused ? "На сайте красный баннер, клиенты не могут подать заявку" : "Клиенты могут подавать заявки, на главной работает колесо фортуны"}
        </div>
      </div>
      <button onClick={toggle} disabled={busy}
        style={{ border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#fff",
          background: paused ? "linear-gradient(135deg,#10b981,#14b8a6)" : "linear-gradient(135deg,#dc2626,#f97316)" }}>
        {busy ? "..." : paused ? "Открыть приём заявок" : "Остановить приём заявок"}
      </button>
      <div style={{ width: "100%" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(2,44,34,0.7)", marginBottom: 4 }}>Текст под заголовком баннера (видят клиенты)</div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
          placeholder="Обрабатываются уже поданные заявки. В течение 1 дня все заявки будут рассмотрены. Приносим свои извинения."
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 13 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
          <button onClick={saveMessage} disabled={busy || message === saved}
            style={{ border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", color: "#fff", background: "#0f766e", opacity: message === saved ? 0.5 : 1 }}>
            Сохранить текст
          </button>
          {savedOk && <span style={{ color: "#15803d", fontSize: 12, fontWeight: 600 }}>✓ Сохранено</span>}
          <span style={{ color: "rgba(2,44,34,0.45)", fontSize: 11 }}>Пусто — будет текст по умолчанию</span>
        </div>
      </div>
    </div>
  );
}
