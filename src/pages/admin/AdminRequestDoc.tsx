import { useState } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";
const PRESETS = ["Фото паспорта (главная страница)", "Фото прописки", "Селфи с паспортом", "СНИЛС", "Справка о доходах"];

export default function AdminRequestDoc({ phone, token }: { phone: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!msg.trim()) { setError("Напишите, какой документ нужен"); return; }
    setBusy(true); setError("");
    const r = await fetch(`${ADMIN_URL}?sub=doc_request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone, message: msg.trim() }),
    });
    setBusy(false);
    if (!r.ok) { setError("Не удалось отправить запрос"); return; }
    setSent(true); setMsg(""); setOpen(false);
    setTimeout(() => setSent(false), 4000);
  }

  if (!open) {
    return (
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setOpen(true)}
          style={{ background: "rgba(245,158,11,0.15)", color: "#b45309", border: "1px solid rgba(245,158,11,0.5)", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="FileQuestion" size={15} />Запросить документ
        </button>
        {sent && <span style={{ marginLeft: 10, color: "#15803d", fontSize: 13, fontWeight: 600 }}>✓ Запрос отправлен клиенту</span>}
      </div>
    );
  }

  return (
    <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <div style={{ color: "#b45309", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Какой документ нужен от клиента?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {PRESETS.map((p) => (
          <button key={p} onClick={() => setMsg(p)}
            style={{ background: "rgba(16,185,129,0.08)", color: "#022c22", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
            {p}
          </button>
        ))}
      </div>
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder="Например: пришлите чёткое фото разворота паспорта"
        style={{ width: "100%", background: "rgba(255,255,255,0.8)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 13, boxSizing: "border-box" }} />
      {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={send} disabled={busy}
          style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {busy ? "Отправляем..." : "Отправить клиенту"}
        </button>
        <button onClick={() => setOpen(false)}
          style={{ background: "rgba(16,185,129,0.07)", color: "rgba(2,44,34,0.6)", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
          Отмена
        </button>
      </div>
    </div>
  );
}
