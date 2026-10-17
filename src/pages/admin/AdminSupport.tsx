import { useEffect, useRef, useState } from "react";

const SUPPORT_URL = "https://functions.poehali.dev/20eb9a44-796b-4332-85d3-f6bbaff4a373";

interface Thread { userId: number; name: string; phone: string; lastText: string; lastAt: string; lastSender: string; unread: number }
interface Msg { id: number; sender: string; text: string; createdAt: string }

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminSupport({ token, onChanged }: { token: string; onChanged?: () => void }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [sel, setSel] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const hdr = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  async function loadThreads() {
    const r = await fetch(`${SUPPORT_URL}?role=admin&sub=threads`, { headers: hdr });
    if (r.ok) setThreads((await r.json()).threads || []);
  }

  async function loadThread(uid: number) {
    const r = await fetch(`${SUPPORT_URL}?role=admin&sub=thread&userId=${uid}`, { headers: hdr });
    if (r.ok) { setMsgs((await r.json()).messages || []); onChanged?.(); }
  }

  useEffect(() => {
    loadThreads();
    const i = setInterval(() => { if (document.hidden) return; loadThreads(); if (sel) loadThread(sel.userId); }, 15000);
    return () => clearInterval(i);
  }, [sel?.userId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function open(t: Thread) {
    setSel(t); setMsgs([]);
    await loadThread(t.userId);
    loadThreads();
  }

  async function reply() {
    const t = text.trim();
    if (!t || !sel || busy) return;
    setBusy(true);
    const r = await fetch(`${SUPPORT_URL}?role=admin&sub=reply`, { method: "POST", headers: hdr, body: JSON.stringify({ userId: sel.userId, text: t }) });
    setBusy(false);
    if (r.ok) { setText(""); loadThread(sel.userId); loadThreads(); }
  }

  const card = { background: "rgba(255,255,255,0.95)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 14 };

  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "stretch" }}>
      <div style={{ ...card, flex: "1 1 280px", maxWidth: 380, maxHeight: 560, overflowY: "auto" }}>
        {threads.length === 0 && <div style={{ padding: 20, color: "rgba(2,44,34,0.5)", fontSize: 14 }}>Обращений пока нет</div>}
        {threads.map((t) => (
          <div key={t.userId} onClick={() => open(t)}
            style={{ padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid rgba(16,185,129,0.15)", background: sel?.userId === t.userId ? "rgba(16,185,129,0.12)" : "transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: "#022c22" }}>{t.name || t.phone}</div>
              {t.unread > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 12, fontWeight: 700 }}>{t.unread}</span>}
            </div>
            <div style={{ fontSize: 12, color: "rgba(2,44,34,0.5)" }}>{t.phone} · {fmt(t.lastAt)}</div>
            <div style={{ fontSize: 13, color: "rgba(2,44,34,0.75)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.lastSender === "admin" ? "Вы: " : ""}{t.lastText}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, flex: "2 1 340px", display: "flex", flexDirection: "column", minHeight: 400, maxHeight: 560 }}>
        {!sel ? (
          <div style={{ padding: 30, color: "rgba(2,44,34,0.5)", fontSize: 14 }}>Выберите обращение слева</div>
        ) : (
          <>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(16,185,129,0.2)", fontWeight: 700, color: "#022c22" }}>
              {sel.name || "Клиент"} <span style={{ fontWeight: 400, color: "rgba(2,44,34,0.5)", fontSize: 13 }}>{sel.phone}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {msgs.map((m) => (
                <div key={m.id} style={{ alignSelf: m.sender === "admin" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                  <div style={{
                    background: m.sender === "admin" ? "#10b981" : "#f1f5f9", color: m.sender === "admin" ? "#fff" : "#022c22",
                    borderRadius: 12, padding: "8px 12px", fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>{m.text}</div>
                  <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2, textAlign: m.sender === "admin" ? "right" : "left" }}>{fmt(m.createdAt)}</div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div style={{ padding: 10, borderTop: "1px solid rgba(16,185,129,0.2)", display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Ваш ответ клиенту..."
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(); } }}
                style={{ flex: 1, resize: "none", border: "1px solid #a7f3d0", borderRadius: 10, padding: "8px 10px", fontSize: 14, color: "#022c22", background: "#fff" }} />
              <button onClick={reply} disabled={busy || !text.trim()}
                style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer", opacity: busy || !text.trim() ? 0.5 : 1 }}>
                Ответить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
