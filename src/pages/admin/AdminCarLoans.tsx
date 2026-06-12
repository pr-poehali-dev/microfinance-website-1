import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const CAR_URL = "https://functions.poehali.dev/651adde1-4432-4e5a-8086-3cda9898b7ac";

interface CarApp {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  birth_date: string;
  address: string;
  passport_serial: string;
  passport_num: string;
  passport_issued: string;
  car_brand: string;
  car_model: string;
  car_year: number;
  car_mileage: number;
  contact_person: string;
  card_number: string;
  loan_amount: number;
  loan_months: number;
  status: string;
  reject_reason: string | null;
  approved_amount: number | null;
  approved_months: number | null;
  approved_rate: number | null;
  notes: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "На рассмотрении", color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
  approved: { label: "Одобрено",        color: "#4ade80", bg: "rgba(34,197,94,0.15)" },
  rejected: { label: "Отказ",           color: "#f87171", bg: "rgba(239,68,68,0.15)" },
};

const G = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 };
const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 12px", color: "white", fontSize: 13, width: "100%", outline: "none" };

interface Props { token: string; }

export default function AdminCarLoans({ token }: Props) {
  const [items, setItems] = useState<CarApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"pending"|"approved"|"rejected">("pending");
  const [selected, setSelected] = useState<CarApp | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [editForm, setEditForm] = useState({
    status: "pending",
    approved_amount: "",
    approved_months: "",
    approved_rate: "",
    reject_reason: "",
    notes: "",
  });

  const hdrs = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${CAR_URL}?sub=list&status=${statusFilter}`, { headers: hdrs })
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter, token]);

  useEffect(() => { load(); }, [load]);

  function openEdit(app: CarApp) {
    setSelected(app);
    setEditing(true);
    setMsg("");
    setEditForm({
      status: app.status,
      approved_amount: app.approved_amount ? String(app.approved_amount) : "",
      approved_months: app.approved_months ? String(app.approved_months) : "",
      approved_rate: app.approved_rate ? String(app.approved_rate) : "",
      reject_reason: app.reject_reason || "",
      notes: app.notes || "",
    });
  }

  async function save() {
    if (!selected) return;
    setSaving(true); setMsg("");
    const body: Record<string, unknown> = {
      status: editForm.status,
      notes: editForm.notes,
    };
    if (editForm.reject_reason) body.reject_reason = editForm.reject_reason;
    if (editForm.approved_amount) body.approved_amount = parseFloat(editForm.approved_amount);
    if (editForm.approved_months) body.approved_months = parseInt(editForm.approved_months);
    if (editForm.approved_rate) body.approved_rate = parseFloat(editForm.approved_rate);

    const r = await fetch(`${CAR_URL}?sub=update&id=${selected.id}`, {
      method: "PUT", headers: hdrs, body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) {
      setMsg("Сохранено!");
      setEditing(false);
      setSelected(null);
      load();
    } else {
      setMsg("Ошибка сохранения");
    }
  }

  const fmt = (n: number) => n ? `${n.toLocaleString("ru-RU")} ₽` : "—";

  return (
    <div>
      {/* Фильтры */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["pending","approved","rejected"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{
              padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: statusFilter === s ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "rgba(255,255,255,0.07)",
              color: statusFilter === s ? "white" : "rgba(255,255,255,0.5)",
            }}>
            {STATUS_LABELS[s].label}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
          <Icon name="RefreshCw" size={15} />
        </button>
      </div>

      {msg && <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 10, background: "rgba(34,197,94,0.15)", color: "#4ade80", fontSize: 13 }}>{msg}</div>}

      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 40 }}>Загрузка...</div>
      ) : items.length === 0 ? (
        <div style={{ ...G, padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
          <Icon name="Car" size={40} style={{ opacity: 0.3 }} />
          <div style={{ marginTop: 12 }}>Нет заявок со статусом «{STATUS_LABELS[statusFilter].label}»</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map(app => {
            const st = STATUS_LABELS[app.status] || STATUS_LABELS.pending;
            return (
              <div key={app.id} style={{ ...G, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{app.full_name}</span>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>#{app.id} · {new Date(app.created_at).toLocaleDateString("ru-RU")}</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "6px 16px", marginBottom: 10 }}>
                      {[
                        { l: "Телефон", v: app.phone },
                        { l: "Авто", v: `${app.car_brand} ${app.car_model} ${app.car_year || ""}` },
                        { l: "Пробег", v: app.car_mileage ? `${app.car_mileage.toLocaleString("ru-RU")} км` : "—" },
                        { l: "Запрошено", v: fmt(app.loan_amount) },
                        { l: "Срок", v: `${app.loan_months} мес.` },
                        { l: "Паспорт", v: `${app.passport_serial} ${app.passport_num}` },
                        { l: "Карта/СБП", v: app.card_number || "—" },
                        { l: "Контакт", v: app.contact_person || "—" },
                      ].map(({ l, v }) => (
                        <div key={l}>
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>{l}</div>
                          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {app.status === "approved" && (
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 8 }}>
                        <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Одобрено</span><br /><b style={{ color: "#4ade80" }}>{fmt(app.approved_amount || 0)}</b></div>
                        <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Срок</span><br /><b style={{ color: "#4ade80" }}>{app.approved_months || "—"} мес.</b></div>
                        <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Ставка</span><br /><b style={{ color: "#4ade80" }}>{app.approved_rate || "—"}%/мес.</b></div>
                      </div>
                    )}
                    {app.status === "rejected" && app.reject_reason && (
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 13 }}>
                        Причина отказа: {app.reject_reason}
                      </div>
                    )}
                    {app.notes && (
                      <div style={{ marginTop: 6, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>📝 {app.notes}</div>
                    )}
                  </div>

                  <button onClick={() => openEdit(app)}
                    style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="Pencil" size={14} /> Редактировать
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ */}
      {editing && selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setEditing(false)}>
          <div style={{ background: "#1a1030", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>Редактирование заявки #{selected.id}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{selected.full_name} · {selected.phone}</div>
              </div>
              <button onClick={() => setEditing(false)} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Данные авто (только чтение) */}
            <div style={{ ...G, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 6 }}>АВТОМОБИЛЬ</div>
              <div style={{ color: "white", fontWeight: 600 }}>{selected.car_brand} {selected.car_model} {selected.car_year}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Пробег: {selected.car_mileage ? `${selected.car_mileage.toLocaleString("ru-RU")} км` : "—"} · Запрошено: {fmt(selected.loan_amount)} на {selected.loan_months} мес.</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Статус */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>Статус заявки</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["pending","approved","rejected"] as const).map(s => (
                    <button key={s} onClick={() => setEditForm(p => ({ ...p, status: s }))}
                      style={{ flex: 1, padding: "9px 4px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12,
                        background: editForm.status === s ? (s === "approved" ? "rgba(34,197,94,0.3)" : s === "rejected" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)") : "rgba(255,255,255,0.06)",
                        color: editForm.status === s ? (s === "approved" ? "#4ade80" : s === "rejected" ? "#f87171" : "#fbbf24") : "rgba(255,255,255,0.4)",
                        border: editForm.status === s ? `1px solid ${s === "approved" ? "rgba(34,197,94,0.4)" : s === "rejected" ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)"}` : "1px solid transparent",
                      }}>
                      {STATUS_LABELS[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Одобренные условия */}
              {editForm.status === "approved" && (
                <>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>Одобренная сумма (₽)</label>
                    <input style={inp} type="number" placeholder={String(selected.loan_amount)} value={editForm.approved_amount}
                      onChange={e => setEditForm(p => ({ ...p, approved_amount: e.target.value }))} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>Срок (мес.)</label>
                      <input style={inp} type="number" placeholder={String(selected.loan_months)} value={editForm.approved_months}
                        onChange={e => setEditForm(p => ({ ...p, approved_months: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>Ставка (%/мес.)</label>
                      <input style={inp} type="number" placeholder="12" value={editForm.approved_rate}
                        onChange={e => setEditForm(p => ({ ...p, approved_rate: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}

              {/* Причина отказа */}
              {editForm.status === "rejected" && (
                <div>
                  <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>Причина отказа</label>
                  <textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} placeholder="Укажите причину..."
                    value={editForm.reject_reason} onChange={e => setEditForm(p => ({ ...p, reject_reason: e.target.value }))} />
                </div>
              )}

              {/* Заметки */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>Заметки (внутренние)</label>
                <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} placeholder="Заметки для администратора..."
                  value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
              </div>

              {msg && <div style={{ padding: "8px 12px", borderRadius: 8, background: msg === "Сохранено!" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: msg === "Сохранено!" ? "#4ade80" : "#f87171", fontSize: 13 }}>{msg}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEditing(false)}
                  style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                  Отмена
                </button>
                <button onClick={save} disabled={saving}
                  style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", fontWeight: 700, opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {saving ? <><Icon name="Loader" size={15} className="animate-spin" /> Сохранение...</> : <><Icon name="Check" size={15} /> Сохранить</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
