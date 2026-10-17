import { useEffect, useState } from "react";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

export default function AdminPauseSwitch({ token }: { token: string }) {
  const [paused, setPaused] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${ADMIN_URL}?sub=pause_status`)
      .then((r) => r.json())
      .then((d) => setPaused(!!d.paused))
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
      body: JSON.stringify({ paused: next }),
    });
    setBusy(false);
    if (r.ok) setPaused(next);
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
    </div>
  );
}
