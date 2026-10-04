import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";
const DISCOUNTS = [10, 20, 30, 40, 50];

interface PromoItem {
  id: number;
  code: string;
  discount: number;
  createdAt: string;
  usedAt: string | null;
  usedPhone: string;
  usedFor: string;
}

const USED_FOR: Record<string, string> = {
  loan: "Займ",
  carloan: "Автозайм",
  shoploan: "Товарный займ",
  cabinet: "Личный кабинет",
};

export default function AdminPromoCodes({ token }: { token: string }) {
  const [items, setItems] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"free" | "used" | "all">("free");
  const [generating, setGenerating] = useState<number | null>(null);
  const [copied, setCopied] = useState("");

  const hdrs = useCallback(() => ({ "Content-Type": "application/json", "Authorization": `Bearer ${token}` }), [token]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${ADMIN_URL}?sub=promo_codes`, { headers: hdrs() })
      .then(r => r.json())
      .then(d => setItems(d.codes || []))
      .finally(() => setLoading(false));
  }, [hdrs]);

  useEffect(() => { load(); }, [load]);

  const generate = async (discount: number) => {
    setGenerating(discount);
    await fetch(`${ADMIN_URL}?sub=promo_generate`, {
      method: "POST", headers: hdrs(), body: JSON.stringify({ discount, count: 1 }),
    });
    setGenerating(null);
    load();
  };

  const remove = async (id: number) => {
    await fetch(`${ADMIN_URL}?sub=promo_delete&id=${id}`, { method: "POST", headers: hdrs(), body: "{}" });
    load();
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 1500);
  };

  const shown = items.filter(i => filter === "all" ? true : filter === "used" ? !!i.usedAt : !i.usedAt);

  return (
    <div>
      <div style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: "#022c22", marginBottom: 4 }}>Создать промокод</div>
        <div style={{ fontSize: 13, color: "rgba(2,44,34,0.5)", marginBottom: 12 }}>
          Каждый промокод одноразовый. Скидка действует на проценты по займу.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DISCOUNTS.map(d => (
            <button key={d} onClick={() => generate(d)} disabled={generating === d}
              style={{ padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, color: "white",
                background: "linear-gradient(135deg,#10b981,#14b8a6)", opacity: generating === d ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="Plus" size={14} /> −{d}%
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {([["free", "Свободные"], ["used", "Использованные"], ["all", "Все"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: filter === k ? "linear-gradient(135deg,#10b981,#14b8a6)" : "rgba(16,185,129,0.07)", color: filter === k ? "white" : "rgba(2,44,34,0.5)" }}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: "rgba(2,44,34,0.5)", padding: 16 }}>Загрузка...</div>}
      {!loading && shown.length === 0 && <div style={{ color: "rgba(2,44,34,0.5)", padding: 16 }}>Промокодов нет</div>}

      <div style={{ display: "grid", gap: 8 }}>
        {shown.map(i => (
          <div key={i.id} style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 12, padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: i.usedAt ? 0.7 : 1 }}>
            <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 18, letterSpacing: 2, color: "#022c22" }}>{i.code}</div>
            <div style={{ background: "#10b981", color: "white", borderRadius: 8, padding: "2px 10px", fontWeight: 700, fontSize: 13 }}>−{i.discount}%</div>
            <div style={{ flex: 1, fontSize: 13, color: "rgba(2,44,34,0.55)", minWidth: 160 }}>
              {i.usedAt
                ? `Использован ${i.usedAt} · ${i.usedPhone || "—"} · ${USED_FOR[i.usedFor] || i.usedFor}`
                : `Создан ${i.createdAt}`}
            </div>
            {!i.usedAt && (
              <>
                <button onClick={() => copy(i.code)}
                  style={{ background: "rgba(16,185,129,0.1)", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#047857" }}>
                  {copied === i.code ? "Скопировано" : "Копировать"}
                </button>
                <button onClick={() => remove(i.id)} title="Удалить"
                  style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 8, padding: 7, cursor: "pointer", color: "#dc2626" }}>
                  <Icon name="Trash2" size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
