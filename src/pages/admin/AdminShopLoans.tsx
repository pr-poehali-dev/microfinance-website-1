import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const SHOP_URL = "https://functions.poehali.dev/f0312370-20d7-488e-b072-dc4c0b2af2aa";

interface ShopApp {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  birth_date: string;
  address: string;
  passport_series: string;
  passport_number: string;
  passport_date: string;
  passport_by: string;
  snils: string;
  shop_name: string;
  item_name: string;
  item_price: number;
  loan_amount: number;
  loan_months: number;
  contact_person: string;
  card_number: string;
  file_passport: string;
  file_registration: string;
  file_selfie: string;
  file_snils: string;
  status: string;
  reject_reason: string | null;
  approved_amount: number | null;
  approved_months: number | null;
  approved_rate: number | null;
  notes: string | null;
  contract_signed: boolean;
  created_at: string;
}

const ST: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: "На рассмотрении", color: "#a78bfa", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)" },
  signing:  { label: "На подписании",   color: "#60a5fa", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.3)" },
  approved: { label: "Одобрено",        color: "#4ade80", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)" },
  rejected: { label: "Отказ",           color: "#f87171", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)" },
};

const G   = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 };
const INP = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 12px", color: "white", fontSize: 13, width: "100%", outline: "none" };
const LBL = { color: "rgba(255,255,255,0.45)", fontSize: 11, display: "block" as const, marginBottom: 4 };

interface Props { token: string; }

export default function AdminShopLoans({ token }: Props) {
  const [items, setItems]         = useState<ShopApp[]>([]);
  const [loading, setLoading]     = useState(false);
  const [filter, setFilter]       = useState<"pending"|"signing"|"approved"|"rejected">("pending");
  const [selected, setSelected]   = useState<ShopApp | null>(null);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState("");
  const [lightbox, setLightbox]   = useState("");

  const [ef, setEf] = useState({
    status: "pending", approved_amount: "", approved_months: "",
    approved_rate: "", reject_reason: "", notes: "",
  });

  const hdrs = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${SHOP_URL}?sub=list&status=${filter}`, { headers: hdrs })
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter, token]);

  useEffect(() => { load(); }, [load]);

  function openEdit(app: ShopApp) {
    setSelected(app); setMsg("");
    setEf({
      status: app.status,
      approved_amount:  app.approved_amount  ? String(app.approved_amount)  : "",
      approved_months:  app.approved_months  ? String(app.approved_months)  : "",
      approved_rate:    app.approved_rate    ? String(app.approved_rate)    : "",
      reject_reason:    app.reject_reason    || "",
      notes:            app.notes            || "",
    });
  }

  async function save() {
    if (!selected) return;
    setSaving(true); setMsg("");
    const body: Record<string, unknown> = { status: ef.status, notes: ef.notes };
    if (ef.reject_reason)   body.reject_reason   = ef.reject_reason;
    if (ef.approved_amount) body.approved_amount = parseInt(ef.approved_amount);
    if (ef.approved_months) body.approved_months = parseInt(ef.approved_months);
    if (ef.approved_rate)   body.approved_rate   = parseFloat(ef.approved_rate);

    const r = await fetch(`${SHOP_URL}?sub=update&id=${selected.id}`, {
      method: "PUT", headers: hdrs, body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) { setMsg("Сохранено!"); setSelected(null); load(); }
    else      { setMsg("Ошибка сохранения"); }
  }

  const fmt = (n: number | null) => n ? `${n.toLocaleString("ru-RU")} ₽` : "—";

  return (
    <div>
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setLightbox("")}>
          <button style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "white" }}>
            <Icon name="X" size={28} />
          </button>
          <img src={lightbox} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 16 }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Фильтры */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {(["pending","signing","approved","rejected"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "8px 18px", borderRadius: 10, border: `1px solid ${filter === s ? ST[s].border : "transparent"}`, cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: filter === s ? ST[s].bg : "rgba(255,255,255,0.07)", color: filter === s ? ST[s].color : "rgba(255,255,255,0.5)" }}>
            {ST[s].label}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
          <Icon name="RefreshCw" size={15} />
        </button>
      </div>

      {msg && !selected && (
        <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: "#4ade80", fontSize: 13 }}>{msg}</div>
      )}

      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.35)", textAlign: "center", padding: 48 }}>Загрузка...</div>
      ) : items.length === 0 ? (
        <div style={{ ...G, padding: 48, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
          <Icon name="ShoppingBag" size={42} style={{ opacity: 0.25 }} />
          <div style={{ marginTop: 12 }}>Нет заявок со статусом «{ST[filter].label}»</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map(app => {
            const st = ST[app.status] || ST.pending;
            return (
              <div key={app.id} style={{ ...G, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Шапка */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{app.full_name}</span>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                        {st.label}
                      </span>
                      {app.contract_signed && (
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
                          ✍️ Подписан
                        </span>
                      )}
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>#{app.id} · {new Date(app.created_at).toLocaleDateString("ru-RU")}</span>
                    </div>

                    {/* Поля */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "6px 16px", marginBottom: 10 }}>
                      {[
                        { l: "Телефон",    v: app.phone },
                        { l: "Товар",      v: app.item_name || "—" },
                        { l: "Магазин",    v: app.shop_name || "—" },
                        { l: "Цена товара", v: fmt(app.item_price) },
                        { l: "Запрошено", v: fmt(app.loan_amount) },
                        { l: "Срок",       v: `${app.loan_months} мес.` },
                        { l: "СНИЛС",      v: app.snils || "—" },
                        { l: "Паспорт",    v: `${app.passport_series} ${app.passport_number}` },
                        { l: "Карта/СБП",  v: app.card_number || "—" },
                      ].map(({ l, v }) => (
                        <div key={l}><div style={LBL}>{l}</div><div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>{v}</div></div>
                      ))}
                    </div>

                    {/* Условия займа при одобрении или подписании */}
                    {(app.status === "approved" || app.status === "signing") && (app.approved_amount || app.approved_months || app.approved_rate) && (
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: 10, background: ST[app.status].bg, border: `1px solid ${ST[app.status].border}`, marginBottom: 8 }}>
                        {app.approved_amount && <div><span style={LBL}>Одобрено</span><b style={{ color: ST[app.status].color }}>{fmt(app.approved_amount)}</b></div>}
                        {app.approved_months && <div><span style={LBL}>Срок</span><b style={{ color: ST[app.status].color }}>{app.approved_months} мес.</b></div>}
                        {app.approved_rate && <div><span style={LBL}>Ставка</span><b style={{ color: ST[app.status].color }}>{app.approved_rate}%/мес.</b></div>}
                      </div>
                    )}
                    {app.status === "rejected" && app.reject_reason && (
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: ST.rejected.bg, border: `1px solid ${ST.rejected.border}`, color: "#f87171", fontSize: 13 }}>
                        Причина: {app.reject_reason}
                      </div>
                    )}
                    {app.notes && <div style={{ marginTop: 6, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>📝 {app.notes}</div>}

                    {/* Документы */}
                    {(app.file_passport || app.file_registration || app.file_selfie || app.file_snils) && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        {[
                          { url: app.file_passport,     label: "Паспорт" },
                          { url: app.file_registration, label: "Прописка" },
                          { url: app.file_selfie,       label: "Селфи" },
                          { url: app.file_snils,        label: "СНИЛС" },
                        ].filter(d => d.url).map(d => (
                          <button key={d.label} onClick={() => setLightbox(d.url)}
                            style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.1)", color: "#d8b4fe", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                            <Icon name="Image" size={12} /> {d.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={() => openEdit(app)}
                    style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: "linear-gradient(135deg,#a855f7,#06b6d4)", color: "white", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="Pencil" size={14} /> Редактировать
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setSelected(null)}>
          <div style={{ background: "#1a1030", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 530, maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>Заявка #{selected.id}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{selected.full_name} · {selected.phone}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Товар (только чтение) */}
            <div style={{ ...G, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 4 }}>ТОВАР</div>
              <div style={{ color: "white", fontWeight: 600, fontSize: 15 }}>{selected.item_name || "—"}</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
                {selected.shop_name || "—"} · Цена: {fmt(selected.item_price)} · Запрошено: {fmt(selected.loan_amount)} на {selected.loan_months} мес.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Статус */}
              <div>
                <label style={LBL}>СТАТУС ЗАЯВКИ</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["pending","signing","approved","rejected"] as const).map(s => (
                    <button key={s} onClick={() => setEf(p => ({ ...p, status: s }))}
                      style={{ flex: 1, padding: "9px 4px", borderRadius: 9, border: `1px solid ${ef.status === s ? ST[s].border : "transparent"}`, cursor: "pointer", fontWeight: 600, fontSize: 11,
                        background: ef.status === s ? ST[s].bg : "rgba(255,255,255,0.06)",
                        color: ef.status === s ? ST[s].color : "rgba(255,255,255,0.4)" }}>
                      {ST[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {(ef.status === "approved" || ef.status === "signing") && (
                <>
                  <div>
                    <label style={LBL}>ОДОБРЕННАЯ СУММА (₽)</label>
                    <input style={INP} type="number" placeholder={String(selected.loan_amount)} value={ef.approved_amount}
                      onChange={e => setEf(p => ({ ...p, approved_amount: e.target.value }))} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={LBL}>СРОК (МЕС.)</label>
                      <input style={INP} type="number" placeholder={String(selected.loan_months)} value={ef.approved_months}
                        onChange={e => setEf(p => ({ ...p, approved_months: e.target.value }))} />
                    </div>
                    <div>
                      <label style={LBL}>СТАВКА (%/МЕС.)</label>
                      <input style={INP} type="number" placeholder="9" value={ef.approved_rate}
                        onChange={e => setEf(p => ({ ...p, approved_rate: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}

              {ef.status === "rejected" && (
                <div>
                  <label style={LBL}>ПРИЧИНА ОТКАЗА</label>
                  <textarea style={{ ...INP, minHeight: 70, resize: "vertical" as const }} placeholder="Укажите причину..."
                    value={ef.reject_reason} onChange={e => setEf(p => ({ ...p, reject_reason: e.target.value }))} />
                </div>
              )}

              <div>
                <label style={LBL}>ЗАМЕТКИ (ВНУТРЕННИЕ)</label>
                <textarea style={{ ...INP, minHeight: 60, resize: "vertical" as const }} placeholder="Внутренние заметки..."
                  value={ef.notes} onChange={e => setEf(p => ({ ...p, notes: e.target.value }))} />
              </div>

              {msg && (
                <div style={{ padding: "8px 12px", borderRadius: 8, background: msg === "Сохранено!" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: msg === "Сохранено!" ? "#4ade80" : "#f87171", fontSize: 13 }}>{msg}</div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setSelected(null)}
                  style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                  Отмена
                </button>
                <button onClick={save} disabled={saving}
                  style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#a855f7,#06b6d4)", color: "white", fontWeight: 700, opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {saving ? <><Icon name="Loader" size={14} className="animate-spin" />Сохранение...</> : <><Icon name="Check" size={14} />Сохранить</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}