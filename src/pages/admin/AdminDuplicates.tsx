import { useEffect, useState } from "react";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Item { kind: string; id: number; name: string; phone: string; status: string; createdAt: string }
interface Group { what: string; items: Item[] }

export default function AdminDuplicates({ token }: { token: string }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    const r = await fetch(`${ADMIN_URL}?sub=duplicates`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { setErr("Не удалось загрузить отчёт"); return; }
    setGroups((await r.json()).groups || []);
  }

  useEffect(() => { load(); }, []);

  const card = { background: "rgba(255,255,255,0.95)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 14, padding: 14, marginBottom: 12 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#022c22" }}>Дубли клиентов</div>
          <div style={{ fontSize: 13, color: "rgba(2,44,34,0.6)" }}>Одинаковые паспорт или СНИЛС при разных номерах телефона</div>
        </div>
        <button onClick={load} style={{ border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#fff", background: "linear-gradient(135deg,#10b981,#14b8a6)" }}>
          Обновить
        </button>
      </div>

      {err && <div style={{ color: "#dc2626", fontSize: 14 }}>{err}</div>}
      {groups === null && !err && <div style={{ color: "rgba(2,44,34,0.5)" }}>Загрузка...</div>}
      {groups?.length === 0 && <div style={{ ...card, color: "#047857", fontWeight: 600 }}>Дублей не найдено</div>}

      {groups?.map((g, i) => (
        <div key={i} style={card}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#b45309", marginBottom: 8 }}>
            Совпадает: {g.what}
          </div>
          {g.items.map((it) => (
            <div key={`${it.kind}-${it.id}`} style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid rgba(16,185,129,0.15)", fontSize: 14, color: "#022c22" }}>
              <span style={{ fontWeight: 700, minWidth: 80 }}>{it.kind} №{it.id}</span>
              <span style={{ flex: 1, minWidth: 140 }}>{it.name}</span>
              <span>{it.phone}</span>
              <span style={{ color: "rgba(2,44,34,0.55)" }}>{it.status} · {it.createdAt}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
