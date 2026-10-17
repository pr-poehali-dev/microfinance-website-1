import { useEffect, useState } from "react";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Item { to: string; subject: string; kind: string; status: string; error: string; at: string }

export default function AdminEmailLog({ token }: { token: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(0);
  const [err, setErr] = useState("");
  const [left, setLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [info, setInfo] = useState("");
  const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  async function loadLeft() {
    const r = await fetch(`${ADMIN_URL}?sub=bulk_reject_status`, { headers: H });
    if (r.ok) setLeft((await r.json()).left);
  }

  async function sendTest() {
    setInfo("Отправляю пробное письмо...");
    const r = await fetch(`${ADMIN_URL}?sub=bulk_reject_test`, { method: "POST", headers: H, body: "{}" });
    const d = await r.json().catch(() => ({}));
    setInfo(r.ok ? `Пробное письмо отправлено на ${d.to}. Проверьте ящик и журнал ниже.` : "Не удалось отправить пробное письмо");
    load();
  }

  async function sendAll() {
    if (!window.confirm(`Отправить письмо об отказе ${left} клиентам? Отменить отправку будет нельзя.`)) return;
    setRunning(true); setInfo("");
    let total = 0;
    for (let i = 0; i < 80; i++) {
      const r = await fetch(`${ADMIN_URL}?sub=bulk_reject_send`, { method: "POST", headers: H, body: "{}" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setInfo(`Остановлено: ${d.error || "ошибка сервера"}`); break; }
      total += d.sent || 0;
      setInfo(`Отправлено: ${total}`);
      if (!d.processed) { setInfo(`Готово. Отправлено писем: ${total}`); break; }
      if (!d.sent) { setInfo(`Остановлено: письма не уходят. ${d.error || ""}`); break; }
      await loadLeft();
    }
    setRunning(false); loadLeft(); load();
  }

  async function load() {
    setErr("");
    const r = await fetch(`${ADMIN_URL}?sub=email_log`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { setErr("Не удалось загрузить журнал"); return; }
    const d = await r.json();
    setItems(d.items || []); setFailed(d.failedToday || 0);
  }

  useEffect(() => { load(); loadLeft(); }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#022c22" }}>Журнал писем клиентам</div>
          <div style={{ fontSize: 13, color: "rgba(2,44,34,0.6)" }}>Последние 200 писем. Если письмо не ушло, здесь видна причина.</div>
        </div>
        <button onClick={load} style={{ border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#fff", background: "linear-gradient(135deg,#10b981,#14b8a6)" }}>Обновить</button>
      </div>

      {left !== null && left > 0 && (
        <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.45)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: "#78350f", fontSize: 14 }}>Рассылка об отказе: осталось отправить {left} {left === 1 ? "письмо" : "писем"}</div>
          <div style={{ fontSize: 12, color: "rgba(2,44,34,0.65)", margin: "4px 0 10px" }}>Клиентам, которым отказали при массовом закрытии заявок. На один адрес уходит одно письмо. Сначала отправьте пробное себе.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={sendTest} disabled={running} style={{ border: "1px solid rgba(16,185,129,0.5)", background: "#fff", color: "#047857", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Отправить пробное себе</button>
            <button onClick={sendAll} disabled={running} style={{ border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#fff", background: "linear-gradient(135deg,#dc2626,#f97316)", opacity: running ? 0.6 : 1 }}>{running ? "Отправляю..." : `Отправить ${left} клиентам`}</button>
          </div>
          {info && <div style={{ fontSize: 13, color: "#064e3b", marginTop: 8, fontWeight: 600 }}>{info}</div>}
        </div>
      )}
      {left === 0 && info && <div style={{ color: "#047857", fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{info}</div>}

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
