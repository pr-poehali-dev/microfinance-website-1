import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const INVEST_URL = "https://functions.poehali.dev/1244293e-9832-493e-bbb5-de820fbe56c6";
const CONTRACT_URL = "https://functions.poehali.dev/9cdc3bea-1348-49df-a7a3-4aeef6088ff3";

interface Payout { id: number; amount: number; kind: string; note: string; paidAt: string }
interface Investment {
  id: number; amount: number; termMonths: number; payout: string; rate: number; startDate: string; endDate: string;
  status: string; monthlyIncome: number; accrued: number; paidInterest: number; toPay: number; nextDate: string | null; payouts: Payout[]; contractUrl: string; funded: boolean;
}
interface AdminCard { id: number; number: string; holder: string; isDefault: boolean }
interface Investor { id: number; fullName: string; phone: string; email: string; createdAt: string; investments: Investment[]; cards: AdminCard[] }

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const INPUT: React.CSSProperties = { background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 13, outline: "none" };
const BTN: React.CSSProperties = { background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const BTN2: React.CSSProperties = { background: "rgba(16,185,129,0.1)", color: "#047857", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer" };

export default function AdminInvestors({ token }: { token: string }) {
  const [items, setItems] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [payForm, setPayForm] = useState<{ invId: number; amount: string; kind: string; note: string } | null>(null);
  const [addForm, setAddForm] = useState<{ investorId: number; amount: string; termMonths: string; payout: string; rate: string } | null>(null);
  const [paid, setPaid] = useState<{ invId: number; amount: number; number: string; holder: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pwForm, setPwForm] = useState<{ investorId: number; password: string } | null>(null);

  const hdrs = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${INVEST_URL}?sub=investors`, { headers: hdrs() })
      .then(r => r.json()).then(d => setItems(d.items || [])).finally(() => setLoading(false));
  }, [hdrs]);

  useEffect(() => { load(); }, [load]);

  async function payToCard(inv: Investor, i: Investment) {
    setMsg(""); setPaid(null);
    const card = inv.cards.find(c => c.isDefault) || inv.cards[0];
    if (!card) { setMsg("Инвестор ещё не добавил карту для выплат"); return; }
    const amount = Math.round(i.toPay);
    if (amount < 1) { setMsg("Сейчас нет начисленных процентов к выплате"); return; }
    if (!window.confirm(`Записать выплату ${fmt(amount)} на карту •••• ${card.number.slice(-4)}?`)) return;
    const ok = await post("payout_add", { investmentId: i.id, amount, kind: "interest", note: `На карту •••• ${card.number.slice(-4)}` }, "Выплата записана");
    if (ok) setPaid({ invId: i.id, amount, number: card.number, holder: card.holder });
  }

  function copyCard(number: string) {
    navigator.clipboard.writeText(number.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function makeContract(investmentId: number) {
    setMsg("");
    const r = await fetch(CONTRACT_URL, { method: "POST", headers: hdrs(), body: JSON.stringify({ investmentId }) }).catch(() => null);
    if (r && r.ok) { setMsg("Договор сформирован"); load(); } else setMsg("Не удалось сформировать договор");
  }

  async function post(sub: string, body: object, okText: string) {
    setMsg("");
    const r = await fetch(`${INVEST_URL}?sub=${sub}`, { method: "POST", headers: hdrs(), body: JSON.stringify(body) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r && r.ok) { setMsg(okText); load(); return true; }
    setMsg(d.error || "Не удалось сохранить");
    return false;
  }

  return (
    <div>
      {msg && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#064e3b", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{msg}</div>}
      {loading && <div style={{ color: "rgba(2,44,34,0.5)", padding: 16 }}>Загрузка...</div>}
      {!loading && items.length === 0 && <div style={{ color: "rgba(2,44,34,0.5)", padding: 16 }}>Инвесторов пока нет. Создайте кабинет из заявки на вкладке «Заявки».</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map(inv => {
          const open = openId === inv.id;
          const total = inv.investments.filter(i => i.status === "active" && i.funded).reduce((s, i) => s + i.amount, 0);
          return (
            <div key={inv.id} style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: 16 }}>
              <div onClick={() => setOpenId(open ? null : inv.id)} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", cursor: "pointer", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#022c22", fontSize: 16 }}>{inv.fullName}</div>
                  <div style={{ fontSize: 13, color: "rgba(2,44,34,0.55)" }}>{inv.phone}{inv.email ? ` · ${inv.email}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontWeight: 800, color: "#047857" }}>{fmt(total)}</span>
                  <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} className="text-emerald-600" />
                </div>
              </div>

              {open && (
                <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button style={BTN2} onClick={() => setAddForm({ investorId: inv.id, amount: "", termMonths: "12", payout: "monthly", rate: "8" })}>+ Новая инвестиция</button>
                    <button style={BTN2} onClick={() => setPwForm({ investorId: inv.id, password: "" })}>Сменить пароль</button>
                  </div>

                  {pwForm?.investorId === inv.id && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input style={INPUT} placeholder="Новый пароль (от 6 символов)" value={pwForm.password} onChange={e => setPwForm({ ...pwForm, password: e.target.value })} />
                      <button style={BTN} onClick={async () => { if (await post("investor_password", pwForm, "Пароль изменён")) setPwForm(null); }}>Сохранить</button>
                    </div>
                  )}

                  {addForm?.investorId === inv.id && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <input style={{ ...INPUT, width: 130 }} type="number" placeholder="Сумма, ₽" value={addForm.amount} onChange={e => setAddForm({ ...addForm, amount: e.target.value })} />
                      <select style={INPUT} value={addForm.termMonths} onChange={e => setAddForm({ ...addForm, termMonths: e.target.value })}>
                        <option value="6">6 мес.</option><option value="12">1 год</option><option value="36">3 года</option><option value="60">5 лет</option>
                      </select>
                      <select style={INPUT} value={addForm.payout} onChange={e => setAddForm({ ...addForm, payout: e.target.value })}>
                        <option value="monthly">Проценты каждый месяц</option><option value="end">Проценты в конце срока</option>
                      </select>
                      <input style={{ ...INPUT, width: 80 }} type="number" step="0.1" value={addForm.rate} onChange={e => setAddForm({ ...addForm, rate: e.target.value })} />
                      <span style={{ fontSize: 12, color: "rgba(2,44,34,0.5)" }}>% в мес.</span>
                      <button style={BTN} onClick={async () => { if (await post("investment_add", addForm, "Инвестиция добавлена")) setAddForm(null); }}>Добавить</button>
                    </div>
                  )}

                  <div style={{ background: "#ffffff", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#022c22", fontSize: 13, marginBottom: 6 }}>Карты для выплат</div>
                    {inv.cards.length === 0 ? (
                      <div style={{ fontSize: 13, color: "rgba(2,44,34,0.5)" }}>Инвестор ещё не добавил карту</div>
                    ) : inv.cards.map(c => (
                      <div key={c.id} style={{ fontSize: 14, color: "#022c22", fontFamily: "monospace" }}>
                        {c.number}{c.holder ? ` · ${c.holder}` : ""}{c.isDefault ? " · для выплат" : ""}
                      </div>
                    ))}
                  </div>

                  {inv.investments.map(i => (
                    <div key={i.id} style={{ background: "#ffffff", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 12, opacity: i.status === "closed" ? 0.65 : 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <b style={{ color: "#022c22" }}>{fmt(i.amount)} · {i.termMonths} мес. · {i.rate}% в мес.</b>
                        <span style={{ fontSize: 12, color: i.status === "active" ? "#047857" : "#64748b", fontWeight: 700 }}>{i.status !== "active" ? "Завершена" : i.funded ? "Действует" : "Ожидает внесения"}</span>
                      </div>
                      {i.status === "active" && !i.funded && (
                        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, color: "#b45309", fontWeight: 600 }}>Клиент ещё не внёс сумму через PayAnyWay</span>
                          <button style={BTN2} onClick={async () => { if (window.confirm("Отметить, что деньги получены (например, переводом)? Вложение начнёт действовать с сегодняшнего дня.")) await post("investment_fund", { investmentId: i.id }, "Вложение отмечено как внесённое"); }}>Отметить как внесённое</button>
                        </div>
                      )}
                      <div style={{ fontSize: 13, color: "rgba(2,44,34,0.6)", marginTop: 4 }}>
                        {i.startDate} — {i.endDate} · проценты {i.payout === "monthly" ? "каждый месяц" : "в конце срока"} · доход {fmt(i.monthlyIncome)}/мес.
                      </div>
                      <div style={{ fontSize: 13, color: "#064e3b", marginTop: 4, fontWeight: 600 }}>
                        Начислено {fmt(i.accrued)} · выплачено процентов {fmt(i.paidInterest)} · к выплате {fmt(i.toPay)}{i.nextDate ? ` · ближайшая дата ${i.nextDate}` : ""}
                      </div>

                      <div style={{ marginTop: 6 }}>
                        {i.contractUrl ? (
                          <a href={i.contractUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#047857", fontWeight: 700, fontSize: 13 }}>Договор инвестирования</a>
                        ) : (
                          <button style={BTN2} onClick={() => makeContract(i.id)}>Сформировать договор</button>
                        )}
                      </div>

                      {i.payouts.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, color: "rgba(2,44,34,0.6)" }}>
                          {i.payouts.map(p => <div key={p.id}>{p.paidAt} · {p.kind === "principal" ? "возврат вложения" : "проценты"} · {fmt(p.amount)}{p.note ? ` · ${p.note}` : ""}</div>)}
                        </div>
                      )}

                      {paid?.invId === i.id && (
                        <div style={{ marginTop: 10, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.45)", borderRadius: 12, padding: 12 }}>
                          <div style={{ fontSize: 13, color: "#064e3b", fontWeight: 700 }}>Выплата записана. Переведите {fmt(paid.amount)} на карту:</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                            <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, color: "#022c22", letterSpacing: 1 }}>{paid.number}</span>
                            <button style={BTN2} onClick={() => copyCard(paid.number)}>{copied ? "Скопировано" : "Копировать"}</button>
                          </div>
                          {paid.holder && <div style={{ fontSize: 12, color: "rgba(2,44,34,0.6)", marginTop: 4 }}>Владелец: {paid.holder}</div>}
                        </div>
                      )}

                      {i.status === "active" && (
                        payForm?.invId === i.id ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                            <input style={{ ...INPUT, width: 120 }} type="number" placeholder="Сумма, ₽" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
                            <select style={INPUT} value={payForm.kind} onChange={e => setPayForm({ ...payForm, kind: e.target.value })}>
                              <option value="interest">Проценты</option><option value="principal">Возврат вложения (закрыть)</option>
                            </select>
                            <input style={{ ...INPUT, width: 150 }} placeholder="Комментарий" value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} />
                            <button style={BTN} onClick={async () => { if (await post("payout_add", { investmentId: i.id, amount: payForm.amount, kind: payForm.kind, note: payForm.note }, "Выплата записана")) setPayForm(null); }}>Записать</button>
                            <button style={BTN2} onClick={() => setPayForm(null)}>Отмена</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                            <button style={BTN} onClick={() => payToCard(inv, i)}>Выплатить на карту</button>
                            <button style={BTN2} onClick={() => setPayForm({ invId: i.id, amount: String(i.toPay || ""), kind: "interest", note: "" })}>Записать выплату</button>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
