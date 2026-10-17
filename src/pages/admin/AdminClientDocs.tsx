import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Doc { id: number; phone: string; fullName: string; title: string; comment: string; url: string; status: string; date: string; }

const G = { background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.08)", borderRadius: 14 };
const isPdf = (u: string) => u.toLowerCase().endsWith(".pdf");

export default function AdminClientDocs({ token, onChange }: { token: string; onChange?: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyNew, setOnlyNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${ADMIN_URL}?sub=client_docs`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json().catch(() => ({}));
    setDocs(d.docs || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function markSeen(id: number) {
    setDocs((p) => p.map((d) => (d.id === id ? { ...d, status: "seen" } : d)));
    await fetch(`${ADMIN_URL}?sub=client_doc_seen&docId=${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    onChange?.();
  }

  const shown = docs.filter((d) => !onlyNew || d.status === "new");
  const newCount = docs.filter((d) => d.status === "new").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setOnlyNew(false)}
          style={{ padding: "7px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
            background: !onlyNew ? "linear-gradient(135deg,#10b981,#14b8a6)" : "rgba(16,185,129,0.07)", color: !onlyNew ? "#fff" : "rgba(2,44,34,0.6)" }}>
          Все ({docs.length})
        </button>
        <button onClick={() => setOnlyNew(true)}
          style={{ padding: "7px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
            background: onlyNew ? "linear-gradient(135deg,#10b981,#14b8a6)" : "rgba(16,185,129,0.07)", color: onlyNew ? "#fff" : "rgba(2,44,34,0.6)" }}>
          Новые ({newCount})
        </button>
        <button onClick={load} style={{ marginLeft: "auto", background: "rgba(16,185,129,0.07)", border: "none", borderRadius: 10, padding: "7px 12px", cursor: "pointer", color: "#022c22" }}>
          <Icon name="RefreshCw" size={14} />
        </button>
      </div>

      {loading && <div style={{ color: "rgba(2,44,34,0.5)" }}>Загрузка...</div>}
      {!loading && shown.length === 0 && <div style={{ color: "rgba(2,44,34,0.5)" }}>Документов от клиентов пока нет</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.map((d) => (
          <div key={d.id} style={{ ...G, padding: "12px 16px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
            border: d.status === "new" ? "2px solid #ef4444" : G.border }}>
            <a href={d.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
              {isPdf(d.url)
                ? <div style={{ width: 72, height: 72, borderRadius: 10, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="FileText" size={28} className="text-red-500" /></div>
                : <img src={d.url} alt={d.title} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10 }} />}
            </a>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ color: "#022c22", fontWeight: 700, fontSize: 14 }}>{d.fullName || d.phone}</div>
              <div style={{ color: "rgba(2,44,34,0.55)", fontSize: 12 }}>{d.phone} · {d.date}</div>
              <div style={{ color: "#022c22", fontSize: 13, marginTop: 4, fontWeight: 600 }}>{d.title}</div>
              {d.comment && <div style={{ color: "rgba(2,44,34,0.7)", fontSize: 12, marginTop: 2 }}>💬 {d.comment}</div>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <a href={d.url} target="_blank" rel="noreferrer" onClick={() => d.status === "new" && markSeen(d.id)}
                style={{ background: "rgba(16,185,129,0.12)", color: "#047857", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Открыть
              </a>
              {d.status === "new" ? (
                <button onClick={() => markSeen(d.id)}
                  style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Просмотрено
                </button>
              ) : (
                <span style={{ color: "#15803d", fontSize: 12, fontWeight: 600 }}>✓ Просмотрено</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
