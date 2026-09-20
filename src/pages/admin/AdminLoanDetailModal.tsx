import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface ScheduleItem { dueDate: string | null; amount: number; label?: string; month?: number; principal?: number; interest?: number; }
interface PaymentItem { amount: number; paidAt: string; note?: string; }

interface Profile {
  birthDate?: string; birthPlace?: string; address?: string;
  passportSeries?: string; passportNumber?: string; passportDate?: string; passportCode?: string; passportBy?: string;
  workplace?: string; position?: string; workPhone?: string; salary?: number | null; contactPerson?: string; snils?: string;
  cardNumber?: string; telegramId?: string;
  filePassport?: string; fileRegistration?: string; fileSelfie?: string; filePreviousPassports?: string; fileSnils?: string;
  carBrand?: string; carModel?: string; carYear?: number; carMileage?: number;
  shopName?: string; itemName?: string; itemPrice?: number | null;
}

interface Detail {
  type: string; id: number;
  fullName: string; phone: string; email: string;
  amount: number; days: number; rate: number | null;
  status: string; rejectReason?: string;
  approvedAmount?: number | null; approvedMonths?: number | null; approvedRate?: number | null; notes?: string;
  createdAt: string; signed: boolean; signedAt: string | null; disbursedAt: string | null;
  totalDue: number; paidTotal: number; remaining: number;
  schedule: ScheduleItem[]; payments: PaymentItem[]; profile: Profile;
}

const TYPE_LABELS: Record<string, string> = { loan: "Обычный займ", carloan: "Авто займ", shoploan: "Товарный займ" };

const G = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 };

interface Props {
  token: string;
  type: string;
  id: number;
  onClose: () => void;
}

export default function AdminLoanDetailModal({ token, type, id, onClose }: Props) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState("");

  useEffect(() => {
    setLoading(true); setError("");
    fetch(`${ADMIN_URL}?sub=loan_detail&type=${type}&id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setData(d))
      .catch(() => setError("Не удалось загрузить данные"))
      .finally(() => setLoading(false));
  }, [type, id, token]);

  const fmt = (n: number | null | undefined) => n ? `${n.toLocaleString("ru-RU")} ₽` : "—";

  const docs = data ? [
    { url: data.profile.filePassport, label: "Паспорт" },
    { url: data.profile.fileRegistration, label: "Прописка" },
    { url: data.profile.fileSelfie, label: "Селфи" },
    { url: data.profile.filePreviousPassports, label: "Доп. паспорт" },
    { url: data.profile.fileSnils, label: "СНИЛС" },
  ].filter(d => d.url) : [];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { e.stopPropagation(); setLightbox(""); }}>
          <img src={lightbox} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 16 }} />
        </div>
      )}
      <div style={{ background: "#301b10", border: "1px solid rgba(14,165,233,0.3)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.4)" }}>
            <Icon name="Loader2" size={28} className="animate-spin" style={{ display: "block", margin: "0 auto 12px" }} />
            Загрузка карточки...
          </div>
        ) : error || !data ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ color: "#f87171", marginBottom: 16 }}>{error || "Данные не найдены"}</div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, padding: "8px 18px", color: "white", cursor: "pointer" }}>Закрыть</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: "white", fontWeight: 700, fontSize: 18 }}>{data.fullName || data.phone}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(14,165,233,0.15)", color: "#38bdf8" }}>
                    {TYPE_LABELS[data.type] || data.type}
                  </span>
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>#{data.id} · {data.phone}</div>
              </div>
              <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Хронология */}
            <div style={{ ...G, padding: 16, marginBottom: 16 }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Хронология</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { label: "Заявка подана", date: data.createdAt, icon: "FileText", color: "#94a3b8", done: !!data.createdAt },
                  { label: "Договор подписан", date: data.signedAt, icon: "FileSignature", color: "#fdba74", done: !!data.signed },
                  { label: "Займ выдан", date: data.disbursedAt, icon: "Banknote", color: "#38bdf8", done: !!data.disbursedAt },
                ].map((s, i, arr) => (
                  <div key={s.label} style={{ display: "flex", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: s.done ? `${s.color}22` : "rgba(255,255,255,0.05)", border: `1px solid ${s.done ? s.color : "rgba(255,255,255,0.15)"}`, flexShrink: 0 }}>
                        <Icon name={s.icon} size={13} style={{ color: s.done ? s.color : "rgba(255,255,255,0.2)" }} />
                      </div>
                      {i < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 18, background: s.done ? `${s.color}55` : "rgba(255,255,255,0.1)" }} />}
                    </div>
                    <div style={{ paddingBottom: i < arr.length - 1 ? 14 : 0 }}>
                      <div style={{ color: s.done ? "white" : "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                      <div style={{ color: s.done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 1 }}>{s.date || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Условия займа */}
            <div style={{ ...G, padding: 16, marginBottom: 16 }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Условия займа</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 10 }}>
                {[
                  ["Сумма", fmt(data.approvedAmount ?? data.amount)],
                  ["Срок", data.type === "loan" ? `${data.days} дн.` : `${data.approvedMonths ?? data.days} мес.`],
                  ["Ставка", data.rate ? (data.type === "loan" ? `${(data.rate * 100).toFixed(1)}%/день` : `${data.rate}%/мес.`) : "—"],
                  ["К возврату", fmt(data.totalDue)],
                  ["Оплачено", fmt(data.paidTotal)],
                  ["Остаток", fmt(data.remaining)],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>{l}</div>
                    <div style={{ color: "white", fontSize: 14, fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
              {data.notes && <div style={{ marginTop: 10, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>📝 {data.notes}</div>}
              {(data.type === "carloan" && (data.profile.carBrand || data.profile.carModel)) && (
                <div style={{ marginTop: 10, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                  🚗 {data.profile.carBrand} {data.profile.carModel} {data.profile.carYear || ""} · {data.profile.carMileage ? `${data.profile.carMileage.toLocaleString("ru-RU")} км` : "—"}
                </div>
              )}
              {(data.type === "shoploan" && (data.profile.shopName || data.profile.itemName)) && (
                <div style={{ marginTop: 10, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                  🛒 {data.profile.itemName || "—"} · {data.profile.shopName || "—"} · {fmt(data.profile.itemPrice)}
                </div>
              )}
            </div>

            {/* Анкета клиента */}
            <div style={{ ...G, padding: 16, marginBottom: 16 }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Анкета клиента</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 10 }}>
                {[
                  ["Email", data.email],
                  ["Дата рождения", data.profile.birthDate],
                  ["Место рождения", data.profile.birthPlace],
                  ["Адрес", data.profile.address],
                  ["Паспорт", (data.profile.passportSeries || data.profile.passportNumber) ? `${data.profile.passportSeries || ""} ${data.profile.passportNumber || ""}`.trim() : ""],
                  ["Дата выдачи", data.profile.passportDate],
                  ["Код подразделения", data.profile.passportCode],
                  ["Кем выдан", data.profile.passportBy],
                  ["СНИЛС", data.profile.snils],
                  ["Место работы", data.profile.workplace],
                  ["Должность", data.profile.position],
                  ["Рабочий телефон", data.profile.workPhone],
                  ["Зарплата", data.profile.salary ? fmt(data.profile.salary) : ""],
                  ["Контактное лицо", data.profile.contactPerson],
                  ["Карта/СБП", data.profile.cardNumber],
                  ["Telegram", data.profile.telegramId ? `@${data.profile.telegramId}` : ""],
                ].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l}>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>{l}</div>
                    <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>{v}</div>
                  </div>
                ))}
              </div>
              {docs.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  {docs.map(d => (
                    <button key={d.label} onClick={() => setLightbox(d.url!)}
                      style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(56,189,248,0.3)", background: "rgba(56,189,248,0.1)", color: "#7dd3fc", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      <Icon name="Image" size={12} /> {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* График погашения */}
            {data.schedule.length > 0 && (
              <div style={{ ...G, padding: 16, marginBottom: 16 }}>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>График погашения</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                  {data.schedule.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                        {s.month ? `${s.month}-й платёж` : s.label || "Платёж"}{s.dueDate ? ` · ${s.dueDate}` : ""}
                      </span>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{fmt(s.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Платежи */}
            <div style={{ ...G, padding: 16 }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>История платежей</div>
              {data.payments.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, padding: "8px 0" }}>Платежей пока не было</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.payments.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}>
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{p.paidAt}</div>
                        {p.note && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{p.note}</div>}
                      </div>
                      <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 13 }}>+{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
