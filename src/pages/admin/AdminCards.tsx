import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { GLASS, PURPLE } from "./adminTypes";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Tx {
  id: number; amount: number; weeks: number; rate: number; status: string; createdAt: string; total: number;
  disbursedAmount: number; disbursedAt: string | null; targetCard: string;
  schedule: { week: number; dueDate: string; amount: number }[];
}
interface Card {
  appId: number; fullName: string; phone: string; clientCard: string; cardNumber: string; status: string;
  limit: number; rate: number; days: number | null; issuedAt: string | null; signedAt: string | null;
  used: number; available: number; debt: number; repaid: number;
  minPaymentPercent: number; minPayment: number;
  paymentSchedule: { week: number; dueDate: string; amount: number; isNext: boolean }[];
  transactions: Tx[];
  notices: { id: number; amount: number; dueDate: string; createdAt: string }[];
  repayments: { id: number; amount: number; note: string; createdAt: string }[];
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const INPUT = { background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 14, width: 150, outline: "none" };
const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Договор не подписан", color: "#b45309" },
  active: { label: "Активна", color: "#047857" },
  blocked: { label: "Заблокирована", color: "#dc2626" },
};

interface Props { token: string; onChanged?: () => void }

export default function AdminCards({ token, onChanged }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [disburse, setDisburse] = useState<Record<number, string>>({});
  const [repay, setRepay] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const hdrs = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    const r = await fetch(`${ADMIN_URL}?sub=cards`, { headers: hdrs() });
    if (r.ok) setCards((await r.json()).cards || []);
    setLoading(false);
  }, [hdrs]);

  useEffect(() => { load(); }, [load]);

  async function post(url: string, body: object, key: string, okText: string) {
    setBusy(key); setMsg(null);
    const r = await fetch(`${ADMIN_URL}?${url}`, { method: "POST", headers: hdrs(), body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy("");
    if (!r.ok) { setMsg({ ok: false, text: d.error || "Ошибка" }); return false; }
    setMsg({ ok: true, text: okText });
    await load();
    onChanged?.();
    return true;
  }

  const q = search.trim().toLowerCase();
  const list = cards.filter(c => !q || c.fullName.toLowerCase().includes(q) || c.phone.includes(q));
  const noticesTotal = cards.reduce((n, c) => n + c.notices.length, 0);
  const waiting = cards.reduce((n, c) => n + c.transactions.filter(t => t.status !== "cancelled" && t.disbursedAmount < t.amount).length, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по ФИО или телефону"
          style={{ ...INPUT, width: 280 }} />
        <div style={{ color: "rgba(2,44,34,0.6)", fontSize: 13 }}>
          Карт: <b>{cards.length}</b> · Ждут перечисления: <b style={{ color: waiting ? "#b45309" : undefined }}>{waiting}</b> · Сообщили об оплате: <b style={{ color: noticesTotal ? "#dc2626" : undefined }}>{noticesTotal}</b>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, fontSize: 13,
          background: msg.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: msg.ok ? "#047857" : "#dc2626" }}>
          {msg.text}
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: 40 }}><Icon name="Loader2" size={28} className="animate-spin text-emerald-600" /></div>}
      {!loading && list.length === 0 && <div style={{ ...GLASS, padding: 40, textAlign: "center", color: "rgba(2,44,34,0.4)" }}>Выданных карт пока нет</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map(c => {
          const st = STATUS[c.status] || { label: c.status, color: "#64748b" };
          const open = openId === c.appId;
          const pendingTx = c.transactions.filter(t => t.status !== "cancelled" && t.disbursedAmount < t.amount).length;
          return (
            <div key={c.appId} style={{ ...GLASS, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", cursor: "pointer" }}
                onClick={() => setOpenId(open ? null : c.appId)}>
                <div>
                  <div style={{ color: "#022c22", fontWeight: 700, fontSize: 16 }}>{c.fullName || c.phone}</div>
                  <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12 }}>{c.phone} · карта •••• {c.cardNumber.slice(-4)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {c.notices.length > 0 && <span style={{ background: "rgba(239,68,68,0.15)", color: "#dc2626", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Клиент оплатил: {c.notices.length}</span>}
                  {pendingTx > 0 && <span style={{ background: "rgba(245,158,11,0.15)", color: "#b45309", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Ждёт перевода: {pendingTx}</span>}
                  <span style={{ background: `${st.color}20`, color: st.color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                  <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} className="text-emerald-600" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 14 }}>
                {[
                  ["Лимит", fmt(c.limit)], ["Использовано", fmt(c.used)], ["Доступно", fmt(c.available)],
                  ["Ставка", `${c.rate}%/нед.`], ["Срок", c.days ? `${c.days} дн.` : "—"], ["Долг", fmt(c.debt)],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: "rgba(16,185,129,0.06)", borderRadius: 10, padding: "8px 12px" }}>
                    <div style={{ color: "rgba(2,44,34,0.45)", fontSize: 11 }}>{l}</div>
                    <div style={{ color: "#022c22", fontWeight: 700, fontSize: 14 }}>{v}</div>
                  </div>
                ))}
              </div>

              {open && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ color: "rgba(2,44,34,0.55)", fontSize: 12 }}>
                    Выдана: {c.issuedAt || "—"} · Договор: {c.signedAt ? `подписан ${c.signedAt} (МСК)` : "не подписан"}
                    {c.clientCard && <> · Карта клиента: {c.clientCard}</>}
                  </div>

                  {c.notices.length > 0 && (
                    <div style={{ border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)", borderRadius: 12, padding: 12 }}>
                      <div style={{ color: "#dc2626", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Клиент сообщил об оплате — проверьте поступление</div>
                      {c.notices.map(n => (
                        <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "6px 0" }}>
                          <div style={{ color: "#022c22", fontSize: 13 }}>
                            <b>{fmt(n.amount)}</b> за платёж {n.dueDate} <span style={{ color: "rgba(2,44,34,0.5)", fontSize: 12 }}>· сообщено {n.createdAt}</span>
                          </div>
                          <button disabled={busy === `n${n.id}`}
                            onClick={() => post(`sub=card_notice_done&noticeId=${n.id}`, {}, `n${n.id}`, "Отмечено как проверенное")}
                            style={{ background: "rgba(16,185,129,0.12)", color: "#047857", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            Проверено
                          </button>
                        </div>
                      ))}
                      <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12, marginTop: 4 }}>После проверки внесите сумму кнопкой «Погасить сумму» ниже.</div>
                    </div>
                  )}

                  <div>
                    <div style={{ color: "#059669", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Переводы клиента из лимита</div>
                    {c.transactions.length === 0 && <div style={{ color: "rgba(2,44,34,0.4)", fontSize: 13 }}>Клиент ещё не запрашивал перевод</div>}
                    {c.transactions.map(t => {
                      const left = t.amount - t.disbursedAmount;
                      const cancelled = t.status === "cancelled";
                      return (
                        <div key={t.id} style={{ border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 12, marginBottom: 10, opacity: cancelled ? 0.5 : 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                            <div style={{ color: "#022c22", fontWeight: 700 }}>Запрошено {fmt(t.amount)} на {t.weeks} нед. <span style={{ fontWeight: 400, color: "rgba(2,44,34,0.5)", fontSize: 12 }}>· {t.createdAt}</span></div>
                            <div style={{ color: "rgba(2,44,34,0.7)", fontSize: 13 }}>К возврату: <b>{fmt(t.total)}</b></div>
                          </div>
                          <div style={{ color: "rgba(2,44,34,0.6)", fontSize: 13, margin: "6px 0" }}>
                            Карта клиента для перевода: <b style={{ color: "#022c22" }}>{t.targetCard || "не указана"}</b>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                            {t.schedule.map(s => (
                              <span key={s.week} style={{ background: "rgba(16,185,129,0.08)", borderRadius: 8, padding: "4px 8px", fontSize: 12, color: "#022c22" }}>
                                {s.dueDate} · {fmt(s.amount)}
                              </span>
                            ))}
                          </div>
                          {cancelled ? (
                            <div style={{ color: "#dc2626", fontSize: 13 }}>Перевод отменён</div>
                          ) : (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <div style={{ fontSize: 13, color: left <= 0 ? "#047857" : "#b45309", fontWeight: 600 }}>
                                {left <= 0 ? `Перечислено полностью (${t.disbursedAt || ""})` : `Перечислено ${fmt(t.disbursedAmount)} · осталось ${fmt(left)}`}
                              </div>
                              {left > 0 && (<>
                                <input type="number" placeholder={`до ${Math.round(left)} ₽`} style={INPUT}
                                  value={disburse[t.id] ?? ""} onChange={e => setDisburse({ ...disburse, [t.id]: e.target.value })} />
                                <button disabled={busy === `d${t.id}`}
                                  onClick={async () => { const ok = await post(`sub=card_disburse&txId=${t.id}`, { amount: parseFloat(disburse[t.id] || "0") }, `d${t.id}`, "Деньги перечислены, клиент увидит отметку"); if (ok) setDisburse({ ...disburse, [t.id]: "" }); }}
                                  style={{ ...PURPLE, color: "white", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: busy === `d${t.id}` ? 0.6 : 1 }}>
                                  Перечислить деньги
                                </button>
                                <button onClick={() => setDisburse({ ...disburse, [t.id]: String(Math.round(left)) })}
                                  style={{ background: "rgba(16,185,129,0.1)", color: "#047857", border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>
                                  Вся сумма
                                </button>
                              </>)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <div style={{ color: "#059669", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
                      График платежей · раз в неделю · мин. {c.minPaymentPercent}% = {fmt(c.minPayment)}
                    </div>
                    {c.paymentSchedule.length === 0 ? (
                      <div style={{ color: "rgba(2,44,34,0.4)", fontSize: 13 }}>Долга нет — платежей нет</div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {c.paymentSchedule.map(s => (
                          <span key={s.week} style={{ background: s.isNext ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.07)", border: s.isNext ? "1px solid rgba(16,185,129,0.5)" : "1px solid transparent", borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "#022c22" }}>
                            {s.dueDate} · от {fmt(s.amount)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(16,185,129,0.15)", paddingTop: 12 }}>
                    <div style={{ color: "#059669", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
                      Погашение долга по карте · погашено {fmt(c.repaid)}
                    </div>
                    {c.debt <= 0 ? (
                      <div style={{ color: "#047857", fontSize: 13 }}>Долга по карте нет</div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input type="number" placeholder={`до ${Math.round(c.debt)} ₽`} style={INPUT}
                          value={repay[c.appId] ?? ""} onChange={e => setRepay({ ...repay, [c.appId]: e.target.value })} />
                        <button disabled={busy === `r${c.appId}`}
                          onClick={async () => { if (!window.confirm(`Погасить ${repay[c.appId] || 0} ₽ долга по карте?`)) return; const ok = await post(`sub=card_repay&appId=${c.appId}`, { amount: parseFloat(repay[c.appId] || "0") }, `r${c.appId}`, "Погашение внесено"); if (ok) setRepay({ ...repay, [c.appId]: "" }); }}
                          style={{ background: "linear-gradient(135deg,#047857,#10b981)", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: busy === `r${c.appId}` ? 0.6 : 1 }}>
                          Погасить сумму
                        </button>
                        <button onClick={() => setRepay({ ...repay, [c.appId]: String(Math.round(c.debt)) })}
                          style={{ background: "rgba(16,185,129,0.1)", color: "#047857", border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>
                          Весь долг ({fmt(c.debt)})
                        </button>
                      </div>
                    )}
                    {c.repayments.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                        {c.repayments.map(rp => (
                          <div key={rp.id} style={{ fontSize: 12, color: "rgba(2,44,34,0.6)" }}>
                            {rp.createdAt} — погашено <b style={{ color: "#047857" }}>{fmt(rp.amount)}</b>{rp.note ? ` · ${rp.note}` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
