import { useEffect, useState } from "react";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Item { to: string; subject: string; kind: string; status: string; error: string; at: string }

export default function AdminEmailLog({ token }: { token: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(0);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    const r = await fetch(`${ADMIN_URL}?sub=email_log`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { setErr("Не удалось загрузить журнал"); return; }
    const d = await r.json();
    setItems(d.items || []); setFailed(d.failedToday || 0);
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#022c22" }}>Журнал писем клиентам</div>
          <div style={{ fontSize: 13, color: "rgba(2,44,34,0.6)" }}>Последние 200 писем. Если письмо не ушло, здесь видна причина.</div>
        </div>
        <button onClick={load} style={{ border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#fff", background: "linear-gradient(135deg,#10b981,#14b8a6)" }}>Обновить</button>
      </div>

      {failed > 0 && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", color: "#b91c1c", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
          За последние сутки не удалось отправить писем: {failed}. Проверьте пароль приложения Яндекс.Почты в секретах.
        </div>
      )}
      {err && <div style={{ color: "#dc2626", fontSize: 14 }}>{err}</div>}
      {items === null && !err && <div style={{ color: "rgba(2,44,34,0.5)" }}>Загрузка...</div>}
      {items?.length === 0 && <div style={{ color: "rgba(2,44,34,0.6)", padding: 12 }}>Писем пока не отправлялось</div>}

      {items?.map((it, i) => (
        <div key={i} style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${it.status === "sent" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.4)"}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: it.status === "sent" ? "#047857" : "#b91c1c" }}>{it.status === "sent" ? "✓ Отправлено" : "✕ Не отправлено"}</span>
            <span style={{ flex: 1, minWidth: 160, fontSize: 14, color: "#022c22", fontWeight: 600 }}>{it.subject}</span>
            <span style={{ fontSize: 13, color: "rgba(2,44,34,0.65)" }}>{it.to}</span>
            <span style={{ fontSize: 12, color: "rgba(2,44,34,0.45)" }}>{it.at}</span>
          </div>
          {it.error && <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>{it.error}</div>}
        </div>
      ))}
    </div>
  );
}
