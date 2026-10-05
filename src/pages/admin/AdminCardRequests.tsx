import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { waitingStyle, WAITING_BADGE_STYLE } from "./waiting";
import { CardRequestItem, GLASS } from "./adminTypes";
import AdminCardRequestProfile from "./AdminCardRequestProfile";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

const G = { background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.08)", borderRadius: 14 };

interface Props { token: string; }

export default function AdminCardRequests({ token }: Props) {
  const [items, setItems] = useState<CardRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [issueOpen, setIssueOpen] = useState<number | null>(null);
  const [form, setForm] = useState<Record<number, { limit: string; rate: string; days: string }>>({});
  const [rejectOpen, setRejectOpen] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [profileOpen, setProfileOpen] = useState<number | null>(null);
  const [processing, setProcessing] = useState<Record<number, boolean>>({});

  const hdrs = useCallback(() => ({ "Content-Type": "application/json", "Authorization": `Bearer ${token}` }), [token]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${ADMIN_URL}?sub=card_requests&status=${filter}`, { headers: hdrs() })
      .then(r => r.json())
      .then(d => setItems(d.requests || []))
      .finally(() => setLoading(false));
  }, [filter, hdrs]);

  useEffect(() => { load(); }, [load]);

  async function issueCard(req: CardRequestItem) {
    const f = form[req.id] || {};
    const limit = parseFloat(f.limit || "0");
    const rate = parseFloat(f.rate || "0");
    const days = parseInt(f.days || "0");
    if (!limit || !rate) return;
    setProcessing(p => ({ ...p, [req.id]: true }));
    await fetch(`${ADMIN_URL}?sub=issue_card&phone=${encodeURIComponent(req.phone)}`, {
      method: "POST", headers: hdrs(),
      body: JSON.stringify({ limit, rate, days }),
    });
    await fetch(`${ADMIN_URL}?sub=card_request_approve&id=${req.id}`, { method: "POST", headers: hdrs() });
    setProcessing(p => ({ ...p, [req.id]: false }));
    setIssueOpen(null);
    load();
  }

  async function rejectRequest(req: CardRequestItem) {
    setProcessing(p => ({ ...p, [req.id]: true }));
    await fetch(`${ADMIN_URL}?sub=card_request_reject&id=${req.id}`, {
      method: "POST", headers: hdrs(),
      body: JSON.stringify({ reason: rejectReason }),
    });
    setProcessing(p => ({ ...p, [req.id]: false }));
    setRejectOpen(null);
    setRejectReason("");
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {([
          ["pending", "Ожидают", "#fbbf24"],
          ["approved", "Одобренные", "#4ade80"],
          ["rejected", "Отклонённые", "#ef4444"],
          ["all", "Все", "#94a3b8"],
        ] as const).map(([f, label, color]) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "8px 18px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
              background: filter === f ? color : "rgba(2,44,34,0.07)", color: filter === f ? "#0f0a1e" : "rgba(2,44,34,0.5)" }}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 60 }}><Icon name="Loader2" size={36} className="animate-spin text-emerald-600" /></div>}
      {!loading && items.length === 0 && (
        <div style={{ ...GLASS, padding: 60, textAlign: "center", color: "rgba(2,44,34,0.3)" }}>Заявок нет</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map(req => (
          <div key={req.id} style={{ ...G, padding: 18, ...waitingStyle(req.status === "pending") }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#022c22", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{req.fullName || req.phone}{req.status === "pending" && <span style={{ ...WAITING_BADGE_STYLE, marginLeft: 10 }}>🔴 Клиент ждёт решения</span>}</div>
                <div style={{ color: "rgba(2,44,34,0.4)", fontSize: 13 }}>{req.phone} · подана {req.createdAt}</div>
                {!!req.requestedLimit && (
                  <div style={{ marginTop: 4, fontSize: 13, color: "#047857", fontWeight: 600 }}>
                    Желаемый лимит: {req.requestedLimit.toLocaleString("ru-RU")} ₽
                  </div>
                )}
                {!!req.userId && (
                  <button onClick={() => setProfileOpen(profileOpen === req.id ? null : req.id)}
                    style={{ marginTop: 8, background: "rgba(16,185,129,0.1)", color: "#047857", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Icon name="UserCircle" size={14} />{profileOpen === req.id ? "Скрыть анкету" : "Анкета клиента"}
                  </button>
                )}
                {req.cardStatus !== "none" && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#14b8a6" }}>
                    Уже есть карта: {req.cardStatus}{req.cardLimit ? ` · лимит ${req.cardLimit.toLocaleString("ru-RU")} ₽` : ""}
                  </div>
                )}
                {req.status === "rejected" && req.rejectReason && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#f87171" }}>Причина отказа: {req.rejectReason}</div>
                )}
              </div>

              {req.status === "pending" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                  {issueOpen === req.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input type="number" placeholder="Лимит, ₽"
                        value={form[req.id]?.limit ?? ""}
                        onChange={e => setForm(p => ({ ...p, [req.id]: { ...p[req.id], limit: e.target.value } }))}
                        style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 13, width: "100%", boxSizing: "border-box" }} />
                      <input type="number" placeholder="Ставка %/нед." step="0.1"
                        value={form[req.id]?.rate ?? ""}
                        onChange={e => setForm(p => ({ ...p, [req.id]: { ...p[req.id], rate: e.target.value } }))}
                        style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 13, width: "100%", boxSizing: "border-box" }} />
                      <input type="number" placeholder="Срок, дней"
                        value={form[req.id]?.days ?? ""}
                        onChange={e => setForm(p => ({ ...p, [req.id]: { ...p[req.id], days: e.target.value } }))}
                        style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 13, width: "100%", boxSizing: "border-box" }} />
                      <button onClick={() => issueCard(req)} disabled={processing[req.id]}
                        style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "white", border: "none", borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                        {processing[req.id] ? "Выдаём..." : "Выдать карту"}
                      </button>
                      <button onClick={() => setIssueOpen(null)}
                        style={{ background: "rgba(16,185,129,0.07)", color: "rgba(2,44,34,0.5)", border: "none", borderRadius: 8, padding: "7px", cursor: "pointer", fontSize: 12 }}>
                        Отмена
                      </button>
                    </div>
                  ) : rejectOpen === req.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input placeholder="Причина отказа" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 13, width: "100%", boxSizing: "border-box" }} />
                      <button onClick={() => rejectRequest(req)} disabled={processing[req.id]}
                        style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "white", border: "none", borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                        {processing[req.id] ? "..." : "Отклонить"}
                      </button>
                      <button onClick={() => setRejectOpen(null)}
                        style={{ background: "rgba(16,185,129,0.07)", color: "rgba(2,44,34,0.5)", border: "none", borderRadius: 8, padding: "7px", cursor: "pointer", fontSize: 12 }}>
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setIssueOpen(req.id); setForm(p => ({ ...p, [req.id]: { limit: "", rate: "24", days: "" } })); }}
                        style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="CreditCard" size={16} />Одобрить и выдать карту
                      </button>
                      <button onClick={() => setRejectOpen(req.id)}
                        style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="XCircle" size={16} />Отказать
                      </button>
                    </>
                  )}
                </div>
              )}

              {req.status === "approved" && (
                <span style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "rgba(74,222,128,0.15)", color: "#4ade80", height: "fit-content" }}>
                  Одобрено
                </span>
              )}
              {req.status === "rejected" && (
                <span style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "rgba(239,68,68,0.15)", color: "#f87171", height: "fit-content" }}>
                  Отклонено
                </span>
              )}
            </div>
            {profileOpen === req.id && !!req.userId && (
              <AdminCardRequestProfile token={token} userId={req.userId} onClose={() => setProfileOpen(null)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
