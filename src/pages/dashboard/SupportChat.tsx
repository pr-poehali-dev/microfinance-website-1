import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const SUPPORT_URL = "https://functions.poehali.dev/20eb9a44-796b-4332-85d3-f6bbaff4a373";

interface Msg { id: number; sender: string; text: string; createdAt: string }

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const token = () => localStorage.getItem("token") || "";
  const hdr = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  async function load(markRead: boolean) {
    const r = await fetch(`${SUPPORT_URL}?${markRead ? "markRead=1" : ""}`, { headers: hdr() });
    if (!r.ok) return;
    const d = await r.json();
    setMsgs(d.messages || []);
    if (markRead) setUnread(0);
  }

  async function loadUnread() {
    const r = await fetch(`${SUPPORT_URL}?sub=unread`, { headers: hdr() });
    if (r.ok) setUnread((await r.json()).unread || 0);
  }

  useEffect(() => {
    if (open) {
      load(true);
      const i = setInterval(() => { if (!document.hidden) load(true); }, 10000);
      return () => clearInterval(i);
    }
    loadUnread();
    const i = setInterval(() => { if (!document.hidden) loadUnread(); }, 90000);
    return () => clearInterval(i);
  }, [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true); setErr("");
    const r = await fetch(SUPPORT_URL, { method: "POST", headers: hdr(), body: JSON.stringify({ text: t }) });
    setSending(false);
    if (!r.ok) { setErr("Не удалось отправить, попробуйте ещё раз"); return; }
    setText("");
    load(true);
  }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Чат с поддержкой"
          style={{
            position: "fixed", left: 0, top: "50%", transform: "translateY(-50%)", zIndex: 60,
            background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "#fff", border: "none",
            borderRadius: "0 14px 14px 0", padding: "14px 10px", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(16,185,129,0.4)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
          <Icon name="MessageCircle" size={22} />
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>Чат с поддержкой</span>
          {unread > 0 && (
            <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{unread}</span>
          )}
        </button>
      )}

      {open && (
        <div style={{
          position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 70, width: "min(380px, 100vw)", background: "#ffffff",
          boxShadow: "4px 0 30px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column",
        }}>
          <div style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="MessageCircle" size={20} />
            <div style={{ flex: 1, fontWeight: 700, fontSize: 16 }}>Чат с поддержкой</div>
            <button onClick={() => setOpen(false)} aria-label="Закрыть" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
              <Icon name="X" size={22} />
            </button>
          </div>

          <div style={{ background: "#ecfdf5", color: "#065f46", fontSize: 12.5, padding: "8px 14px", borderBottom: "1px solid #a7f3d0" }}>
            Напишите свой вопрос. Ответ поступит в течение 24 часов.
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8, background: "#f8fafc" }}>
            {msgs.length === 0 && (
              <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", marginTop: 24 }}>
                Сообщений пока нет. Задайте свой вопрос, и мы ответим как только сможем.
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} style={{ alignSelf: m.sender === "client" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                <div style={{
                  background: m.sender === "client" ? "#10b981" : "#ffffff", color: m.sender === "client" ? "#ffffff" : "#022c22",
                  border: m.sender === "client" ? "none" : "1px solid #d1fae5", borderRadius: 14, padding: "8px 12px", fontSize: 14,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {m.sender !== "client" && <div style={{ fontSize: 11, fontWeight: 700, color: "#047857", marginBottom: 2 }}>Поддержка</div>}
                  {m.text}
                </div>
                <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2, textAlign: m.sender === "client" ? "right" : "left" }}>{fmt(m.createdAt)}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div style={{ padding: 10, borderTop: "1px solid #e2e8f0", background: "#fff" }}>
            {err && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 6 }}>{err}</div>}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="Ваш вопрос..."
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                style={{ flex: 1, resize: "none", border: "1px solid #a7f3d0", borderRadius: 10, padding: "8px 10px", fontSize: 14, color: "#022c22", background: "#fff" }} />
              <button onClick={send} disabled={sending || !text.trim()} aria-label="Отправить"
                style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "10px 12px", cursor: "pointer", opacity: sending || !text.trim() ? 0.5 : 1 }}>
                <Icon name="Send" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
