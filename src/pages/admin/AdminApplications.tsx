import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { App, GLASS } from "./adminTypes";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

const fmtAppId = (id: number) => String(id).padStart(12, "0");

interface SbFields { workplace: string; position: string; activeLoans: string; salary: string; contactPerson: string; sbScore: string; cardNumber: string; }

interface Props {
  apps: App[];
  appsLoading: boolean;
  appFilter: "pending" | "approved" | "rejected" | "postponed" | "partner_card" | "creditdoctor";
  setAppFilter: (f: "pending" | "approved" | "rejected" | "postponed" | "partner_card" | "creditdoctor") => void;
  appMsg: string;
  appErr2: string;
  appProcessing: boolean;
  selApp: App | null;
  setSelApp: (a: App | null) => void;
  appAction: "approve" | "reject" | null;
  setAppAction: (a: "approve" | "reject" | null) => void;
  setAppMsg: (s: string) => void;
  setAppErr2: (s: string) => void;
  appRate: string;
  setAppRate: (v: string) => void;
  appAmount: string;
  setAppAmount: (v: string) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onPostpone: (appId: number) => void;
  onRestore: (appId: number) => void;
  onPartnerApprove: (appId: number, conditions: { amount: number; days: number; rate: number }) => void;
  onPartnerRemind: (appId: number) => void;
  onCreditDoctorApprove: (appId: number, conditions: { amount: number; days: number; rate: number }) => void;
  setLightbox: (url: string) => void;
  token: string;
}

export default function AdminApplications({
  apps, appsLoading, appFilter, setAppFilter,
  appMsg, appErr2, appProcessing,
  selApp, setSelApp, appAction, setAppAction, setAppMsg, setAppErr2,
  appRate, setAppRate, appAmount, setAppAmount, rejectReason, setRejectReason,
  onApprove, onReject, onPostpone, onRestore, onPartnerApprove, onPartnerRemind, onCreditDoctorApprove, setLightbox, token,
}: Props) {
  const [search, setSearch] = useState("");
  const [sbEdits, setSbEdits] = useState<Record<number, SbFields>>({});
  const [sbSaving, setSbSaving] = useState<Record<number, boolean>>({});
  const [sbSaved, setSbSaved] = useState<Record<number, boolean>>({});
  const [disbursing, setDisbursing] = useState<Record<number, boolean>>({});
  const [disbursed, setDisbursed] = useState<Record<number, boolean>>({});
  const [partnerForm, setPartnerForm] = useState<Record<number, { amount: string; days: string; rate: string }>>({});
  const [partnerOpen, setPartnerOpen] = useState<number | null>(null);
  const [cdForm, setCdForm] = useState<Record<number, { amount: string; days: string; rate: string }>>({});
  const [cdOpen, setCdOpen] = useState<number | null>(null);
  const [cardForm, setCardForm] = useState<Record<number, { limit: string; rate: string }>>({});
  const [cardOpen, setCardOpen] = useState<number | null>(null);
  const [cardIssuing, setCardIssuing] = useState<Record<number, boolean>>({});
  const [cardIssued, setCardIssued] = useState<Record<number, boolean>>({});
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");


  async function handleIssueCard(app: App) {
    const f = cardForm[app.id] || {};
    const limit = parseFloat(f.limit || "0");
    const rate = parseFloat(f.rate || "0");
    if (!limit || !rate) return;
    setCardIssuing(p => ({ ...p, [app.id]: true }));
    await fetch(`${ADMIN_URL}?sub=issue_card&appId=${app.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ limit, rate }),
    });
    setCardIssuing(p => ({ ...p, [app.id]: false }));
    setCardIssued(p => ({ ...p, [app.id]: true }));
    setCardOpen(null);
  }

  async function handleDisburse(app: App) {
    if (!app.loanId) return;
    if (!window.confirm(`Выдать займ клиенту ${app.fullName || app.phone} на сумму ${(app.approvedAmount ?? app.amount).toLocaleString("ru-RU")} ₽?`)) return;
    setDisbursing(p => ({ ...p, [app.id]: true }));
    await fetch(`${ADMIN_URL}?sub=disburse&loanId=${app.loanId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });
    setDisbursing(p => ({ ...p, [app.id]: false }));
    setDisbursed(p => ({ ...p, [app.id]: true }));
  }

  const getSb = useCallback((app: App): SbFields => sbEdits[app.id] ?? {
    workplace: app.workplace || "", position: app.position || "",
    activeLoans: app.activeLoans || "", salary: app.salary ? String(app.salary) : "",
    contactPerson: app.contactPerson || "", sbScore: app.sbScore || "", cardNumber: app.cardNumber || "",
  }, [sbEdits]);

  async function saveSb(app: App) {
    const fields = getSb(app);
    setSbSaving(p => ({ ...p, [app.id]: true }));
    await fetch(`${ADMIN_URL}?sub=app_update&appId=${app.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ ...fields, salary: fields.salary ? parseFloat(fields.salary) : null }),
    });
    setSbSaving(p => ({ ...p, [app.id]: false }));
    setSbSaved(p => ({ ...p, [app.id]: true }));
    setTimeout(() => setSbSaved(p => ({ ...p, [app.id]: false })), 2000);
  }

  const filtered = apps.filter(a => {
    if (appFilter === "creditdoctor") {
      if (!a.isCreditDoctor) return false;
    } else if (appFilter === "partner_card") {
      if (a.status !== "partner_card" || a.isCreditDoctor) return false;
    } else {
      if (a.status !== appFilter) return false;
      if (a.isCreditDoctor) return false;
    }
    const q = search.toLowerCase();
    if (q && !a.phone.includes(q) && !(a.fullName || "").toLowerCase().includes(q) && !(a.email || "").toLowerCase().includes(q)) return false;
    if (dateFilter !== "all") {
      const [d, m, y] = a.createdAt.split(".");
      const appDate = new Date(+y, +m - 1, +d);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      if (dateFilter === "today") {
        if (appDate < now) return false;
      } else if (dateFilter === "week") {
        const from = new Date(now); from.setDate(now.getDate() - 7);
        if (appDate < from) return false;
      } else if (dateFilter === "month") {
        const from = new Date(now); from.setMonth(now.getMonth() - 1);
        if (appDate < from) return false;
      } else if (dateFilter === "custom") {
        if (dateFrom) { const f = new Date(dateFrom); if (appDate < f) return false; }
        if (dateTo) { const t = new Date(dateTo); t.setHours(23,59,59); if (appDate > t) return false; }
      }
    }
    return true;
  });

  return (
    <div>
      {/* Фильтр + Поиск */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {([
          ["pending","Ожидают","Clock","#f59e0b"],
          ["partner_card","Партнёр","CreditCard","#a855f7"],
          ["creditdoctor","💊 Кред. Доктор","HeartPulse","linear-gradient(135deg,#a855f7,#ec4899)"],
          ["postponed","Отложенные","PhoneMissed","#60a5fa"],
          ["approved","Одобренные","CheckCircle","#22c55e"],
          ["rejected","Отклонённые","XCircle","#ef4444"],
        ] as const).map(([f, label, icon, color]) => (
          <button key={f} onClick={() => setAppFilter(f)}
            style={{ padding: "8px 18px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
              background: appFilter === f ? color : "rgba(255,255,255,0.07)", color: appFilter === f ? "white" : "rgba(255,255,255,0.5)",
              boxShadow: appFilter === f && f === "creditdoctor" ? "0 0 14px rgba(168,85,247,0.4)" : "none" }}>
            <Icon name={icon} size={14} />{label}
          </button>
        ))}
        <input
          placeholder="Поиск по имени, телефону, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 14px", color: "white", fontSize: 14, outline: "none", minWidth: 220, flex: 1 }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 4 }}>
            <Icon name="X" size={16} />
          </button>
        )}
      </div>

      {/* Фильтр по дате */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Icon name="CalendarDays" size={15} style={{ color: "rgba(255,255,255,0.35)" }} />
        {([["all","Все время"],["today","Сегодня"],["week","7 дней"],["month","Месяц"],["custom","Период"]] as const).map(([f, label]) => (
          <button key={f} onClick={() => setDateFilter(f)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: dateFilter === f ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.05)",
              color: dateFilter === f ? "#e9d5ff" : "rgba(255,255,255,0.4)",
              border: dateFilter === f ? "1px solid rgba(124,58,237,0.5)" : "1px solid transparent" }}>
            {label}
          </button>
        ))}
        {dateFilter === "custom" && (
          <>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: "white", fontSize: 13, outline: "none", colorScheme: "dark" }} />
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: "white", fontSize: 13, outline: "none", colorScheme: "dark" }} />
          </>
        )}
        {dateFilter !== "all" && (
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>· {filtered.length} заявок</span>
        )}
      </div>

      {appMsg && <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 12, padding: "12px 16px", color: "#4ade80", marginBottom: 16, fontSize: 14 }}>{appMsg}</div>}

      {appsLoading && <div style={{ textAlign: "center", padding: 60 }}><Icon name="Loader2" size={36} className="animate-spin text-purple-400" /></div>}

      {!appsLoading && apps.length === 0 && (
        <div style={{ ...GLASS, padding: 60, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Заявок нет</div>
      )}
      {!appsLoading && apps.length > 0 && filtered.length === 0 && (
        <div style={{ ...GLASS, padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Ничего не найдено по запросу «{search}»</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map(app => (
          <div key={app.id} style={{ ...GLASS, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "white", fontWeight: 700, fontSize: 18 }}>{app.fullName || app.phone}</span>
                  {app.isCreditDoctor && (
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,rgba(168,85,247,0.3),rgba(236,72,153,0.25))", color: "#e879f9", border: "1px solid rgba(168,85,247,0.5)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      💊 Кредитный Доктор
                    </span>
                  )}
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>№{fmtAppId(app.id)} · {app.createdAt}</span>
                  {app.telegramId && <span style={{ color: "#a78bfa", fontSize: 13 }}>@{app.telegramId}</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12, marginBottom: 12 }}>
                  <div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>Телефон</div><div style={{ color: "white", fontWeight: 600 }}>{app.phone}</div></div>
                  <div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>Email</div><div style={{ color: "white", fontWeight: 600 }}>{app.email||"—"}</div></div>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>Запрошено</div>
                    <div style={{ color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      {app.amount.toLocaleString("ru-RU")} ₽
                      {app.approvedAmount !== null && app.approvedAmount !== app.amount && (
                        <span style={{ color: "#fbbf24", fontSize: 11, fontWeight: 500 }}>→ одобрено</span>
                      )}
                    </div>
                  </div>
                  {app.approvedAmount !== null && app.approvedAmount !== app.amount && (
                    <div>
                      <div style={{ color: "#fbbf24", fontSize: 11, marginBottom: 2 }}>Одобренная сумма</div>
                      <div style={{ color: "#fbbf24", fontWeight: 700 }}>{app.approvedAmount!.toLocaleString("ru-RU")} ₽</div>
                    </div>
                  )}
                  <div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>Срок</div><div style={{ color: "white", fontWeight: 600 }}>{app.days} дн.</div></div>
                </div>

                {/* Блок условий партнёра */}
                {app.status === "partner_card" && (app.approvedAmount || app.approvedDays || app.approvedRate) && (
                  <div style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                    <div style={{ color: "#c084fc", fontWeight: 700, fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="CreditCard" size={14} />Условия займа (партнёр)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 8 }}>
                      {[
                        ["Сумма", app.approvedAmount ? `${app.approvedAmount.toLocaleString("ru-RU")} ₽` : "—"],
                        ["Срок", app.approvedDays ? `${app.approvedDays} дн.` : "—"],
                        ["Ставка", app.approvedRate ? `${(app.approvedRate * 100).toFixed(1)}% / день` : "—"],
                        ["К возврату", (() => {
                          const amt = app.approvedAmount;
                          const rate = app.approvedRate;
                          const days = app.approvedDays;
                          if (!amt || !rate || !days) return "—";
                          return `${Math.round(amt + amt * rate * days).toLocaleString("ru-RU")} ₽`;
                        })()],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>{label}</div>
                          <div style={{ color: "#e9d5ff", fontSize: 13, fontWeight: 600 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Блок активного займа — выдан */}
                {app.status === "approved" && app.loanId && (app.loanStatus === "active" || disbursed[app.id]) && (
                  <div style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                    <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="Banknote" size={14} />Займ выдан
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 8 }}>
                      {[
                        ["Сумма", `${(app.approvedAmount ?? app.amount).toLocaleString("ru-RU")} ₽`],
                        ["Срок", `${app.approvedDays ?? app.days} дн.`],
                        ["Ставка", `${app.approvedRate ? (app.approvedRate * 100).toFixed(1) : "0.8"}% / день`],
                        ["К возврату", (() => {
                          const amt = app.approvedAmount ?? app.amount;
                          const rate = app.approvedRate ?? 0.008;
                          const days = app.approvedDays ?? app.days;
                          return `${Math.round(amt + amt * rate * days).toLocaleString("ru-RU")} ₽`;
                        })()],
                        ...(app.loanDisbursedAt ? [["Выдан", app.loanDisbursedAt]] : []),
                        ...(app.cardNumber ? [["Карта/СБП", app.cardNumber]] : []),
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>{label}</div>
                          <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Данные для входа клиента */}
                {app.clientPassword && (
                  <div style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.35)", borderRadius: 12, padding: "14px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <Icon name="KeyRound" size={18} style={{ color: "#a78bfa", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 4 }}>Данные для входа в личный кабинет</div>
                      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                        <span style={{ color: "white", fontSize: 14 }}>📞 <b>{app.phone}</b></span>
                        <span style={{ color: "white", fontSize: 14 }}>🔑 Пароль: <b style={{ color: "#a78bfa", letterSpacing: 1 }}>{app.clientPassword}</b></span>
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 10, marginBottom: 12 }}>
                  {[["Серия/Номер", `${app.passportSeries} ${app.passportNumber}`], ["Дата выдачи", app.passportDate||"—"], ["Код", app.passportCode||"—"], ["Дата рождения", app.birthDate||"—"]].map(([l, v]) => (
                    <div key={l}><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>{l}</div><div style={{ color: "white", fontSize: 13 }}>{v}</div></div>
                  ))}
                  {app.passportBy && <div style={{ gridColumn: "1/-1" }}><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>Кем выдан</div><div style={{ color: "white", fontSize: 13 }}>{app.passportBy}</div></div>}
                  {app.birthPlace && <div style={{ gridColumn: "1/-1" }}><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>Место рождения</div><div style={{ color: "white", fontSize: 13 }}>{app.birthPlace}</div></div>}
                  {app.snils && <div><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>СНИЛС</div><div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>{app.snils}</div></div>}
                </div>

                {/* Документы */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                  {[["filePassport","Паспорт"],["fileRegistration","Прописка"],["fileSelfie","Селфи"],["filePreviousPassports","Доп.паспорт"]].map(([key, label]) => {
                    const url = app[key as keyof App] as string;
                    return url ? (
                      <button key={key} onClick={() => setLightbox(url)}
                        style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 8, padding: "6px 12px", color: "#c084fc", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="Image" size={12} />{label}
                      </button>
                    ) : null;
                  })}
                </div>

                {/* Данные из анкеты: работа и контакты */}
                {(app.workPhone || app.cardNumberTransfer) && (
                  <div style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.25)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                    <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                      <Icon name="ClipboardList" size={13} />Данные из анкеты клиента
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 8 }}>
                      {app.workPhone && (
                        <div>
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>Рабочий телефон</div>
                          <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{app.workPhone}</div>
                        </div>
                      )}
                      {app.cardNumberTransfer && (
                        <div style={{ gridColumn: app.workPhone ? "auto" : "1/-1" }}>
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>Карта / СБП для перевода</div>
                          <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>{app.cardNumberTransfer}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Блок СБ */}
                {(() => {
                  const sb = getSb(app);
                  const set = (k: keyof SbFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
                    setSbEdits(p => ({ ...p, [app.id]: { ...getSb(app), [k]: e.target.value } }));
                  const inp = (style?: React.CSSProperties) => ({
                    style: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 10px", color: "white", fontSize: 13, width: "100%", boxSizing: "border-box" as const, outline: "none", ...style },
                  });
                  return (
                    <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 12, padding: 14 }}>
                      <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="ShieldCheck" size={14} />Данные СБ
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 10, marginBottom: 10 }}>
                        {([["workplace","Место работы"],["position","Должность"],["activeLoans","Действующие займы"],["salary","Зарплата (₽)"],["contactPerson","Контактное лицо"],["cardNumber","Карта / СБП"]] as [keyof SbFields, string][]).map(([k, label]) => (
                          <div key={k}>
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 4 }}>{label}</div>
                            <input value={sb[k]} onChange={set(k)} placeholder={label} {...inp()} />
                          </div>
                        ))}
                        <div>
                          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 4 }}>Оценка СБ</div>
                          <select value={sb.sbScore} onChange={set("sbScore")}
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 10px", color: "white", fontSize: 13, width: "100%", outline: "none" }}>
                            <option value="">— Не выбрано —</option>
                            <option value="✅ Одобрен">✅ Одобрен</option>
                            <option value="⚠️ Под вопросом">⚠️ Под вопросом</option>
                            <option value="❌ Отказ">❌ Отказ</option>
                          </select>
                        </div>
                      </div>
                      <button onClick={() => saveSb(app)} disabled={sbSaving[app.id]}
                        style={{ background: sbSaved[app.id] ? "linear-gradient(135deg,#16a34a,#22c55e)" : "linear-gradient(135deg,#d97706,#fbbf24)", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name={sbSaved[app.id] ? "Check" : "Save"} size={13} />
                        {sbSaving[app.id] ? "Сохранение..." : sbSaved[app.id] ? "Сохранено!" : "Сохранить данные СБ"}
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Кнопки действий — Отклонённые */}
              {app.status === "rejected" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
                  <button onClick={() => onRestore(app.id)}
                    style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="RotateCcw" size={16} />Вернуть в ожидание
                  </button>
                </div>
              )}

              {/* Кнопки действий — Одобренные */}
              {app.status === "approved" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>

                  {/* Статус подписания договора */}
                  {app.loanId && (
                    <div style={{
                      borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 8,
                      background: app.loanSigned ? "rgba(74,222,128,0.12)" : "rgba(251,191,36,0.12)",
                      border: `1px solid ${app.loanSigned ? "rgba(74,222,128,0.35)" : "rgba(251,191,36,0.35)"}`,
                      color: app.loanSigned ? "#4ade80" : "#fbbf24",
                    }}>
                      <Icon name={app.loanSigned ? "FileCheck" : "FileClock"} size={15} />
                      <div>
                        <div>{app.loanSigned ? "Договор подписан" : "Ожидает подписи"}</div>
                        {app.loanSignedAt && <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>{app.loanSignedAt}</div>}
                      </div>
                    </div>
                  )}

                  {/* Статус займа — уже выдан */}
                  {app.loanId && (disbursed[app.id] || app.loanDisbursedAt) && (
                    <div style={{
                      borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 8,
                      background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.35)", color: "#38bdf8",
                    }}>
                      <Icon name="BadgeCheck" size={15} />
                      <div>
                        <div>Займ выдан</div>
                        {app.loanDisbursedAt && <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>{app.loanDisbursedAt}</div>}
                      </div>
                    </div>
                  )}

                  {/* Кнопка "Займ выдан" — для всех у кого есть займ и ещё не отмечен как выданный */}
                  {app.loanId && !disbursed[app.id] && !app.loanDisbursedAt && (
                    <button
                      onClick={() => handleDisburse(app)}
                      disabled={disbursing[app.id]}
                      style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6, opacity: disbursing[app.id] ? 0.7 : 1 }}>
                      {disbursing[app.id]
                        ? <><Icon name="Loader2" size={15} className="animate-spin" />Выдаём...</>
                        : <><Icon name="Banknote" size={15} />Займ выдан</>
                      }
                    </button>
                  )}

                  <button onClick={() => onRestore(app.id)}
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="RotateCcw" size={14} />Вернуть в ожидание
                  </button>
                </div>
              )}

              {/* Кнопки действий — Отложенные */}
              {app.status === "postponed" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
                  <button onClick={() => onRestore(app.id)}
                    style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="RotateCcw" size={16} />Вернуть в ожидание
                  </button>
                </div>
              )}

              {/* Кнопки действий — Партнёр */}
              {app.status === "partner_card" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                  <div style={{
                    borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 8,
                    background: app.loanSigned ? "rgba(74,222,128,0.12)" : "rgba(251,191,36,0.12)",
                    border: `1px solid ${app.loanSigned ? "rgba(74,222,128,0.35)" : "rgba(251,191,36,0.35)"}`,
                    color: app.loanSigned ? "#4ade80" : "#fbbf24",
                  }}>
                    <Icon name={app.loanSigned ? "FileCheck" : "FileClock"} size={15} />
                    <div>
                      <div>{app.loanSigned ? "Договор подписан" : "Ожидает подписи"}</div>
                      {app.loanSignedAt && <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>{app.loanSignedAt}</div>}
                    </div>
                  </div>
                  {cardIssued[app.id] ? (
                    <div style={{ padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: "center", background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
                      <Icon name="CheckCircle" size={14} style={{ marginRight: 6 }} />Карта выдана!
                    </div>
                  ) : cardOpen === app.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ color: "#c084fc", fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Карта FINANS 24</div>
                      <input
                        type="number" placeholder="Лимит, ₽"
                        value={cardForm[app.id]?.limit ?? ""}
                        onChange={e => setCardForm(p => ({ ...p, [app.id]: { ...p[app.id], limit: e.target.value } }))}
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 8, padding: "8px 10px", color: "white", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                      />
                      <input
                        type="number" placeholder="Ставка %/день" step="0.1"
                        value={cardForm[app.id]?.rate ?? ""}
                        onChange={e => setCardForm(p => ({ ...p, [app.id]: { ...p[app.id], rate: e.target.value } }))}
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 8, padding: "8px 10px", color: "white", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                      />
                      <button
                        onClick={() => handleIssueCard(app)}
                        disabled={cardIssuing[app.id]}
                        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", border: "none", borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        {cardIssuing[app.id] ? <><Icon name="Loader2" size={14} className="animate-spin" />Выдаём...</> : <><Icon name="CreditCard" size={14} />Выдать карту</>}
                      </button>
                      <button onClick={() => setCardOpen(null)}
                        style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "none", borderRadius: 8, padding: "7px", cursor: "pointer", fontSize: 12 }}>
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setCardOpen(app.id); setCardForm(p => ({ ...p, [app.id]: { limit: String(app.approvedAmount ?? app.amount ?? ""), rate: "" } })); }}
                      style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="CreditCard" size={16} />Выдать карту FINANS 24
                    </button>
                  )}
                  {app.telegramId && (
                    <button onClick={() => onPartnerRemind(app.id)}
                      style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="Send" size={16} />Напомнить в TG
                    </button>
                  )}
                  <button onClick={() => onRestore(app.id)}
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="RotateCcw" size={14} />Вернуть в ожидание
                  </button>
                </div>
              )}

              {/* Кнопки действий */}
              {app.status === "pending" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
                  {selApp?.id === app.id && appAction === "approve" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Сумма займа (₽)</label>
                      <input type="number" value={appAmount} onChange={e => setAppAmount(e.target.value)} min="1"
                        placeholder={String(app.amount)}
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 15, width: 130, boxSizing: "border-box" }} />
                      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Ставка %/день</label>
                      <input type="number" value={appRate} onChange={e => setAppRate(e.target.value)} step="0.1" min="0.1"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 15, width: 130, boxSizing: "border-box" }} />
                      {appRate && <div style={{ color: "#4ade80", fontSize: 13 }}>К возврату: {Math.round((appAmount ? +appAmount : app.amount) * (1 + +appRate/100 * app.days)).toLocaleString("ru-RU")} ₽</div>}
                      {appErr2 && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{appErr2}</p>}
                      <button onClick={onApprove} disabled={appProcessing}
                        style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "white", border: "none", borderRadius: 10, padding: "10px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                        {appProcessing ? "..." : "Подтвердить"}
                      </button>
                      <button onClick={() => { setSelApp(null); setAppAction(null); setAppAmount(""); }}
                        style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "none", borderRadius: 10, padding: "8px", cursor: "pointer", fontSize: 13 }}>
                        Отмена
                      </button>
                    </div>
                  ) : selApp?.id === app.id && appAction === "reject" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <textarea placeholder="Причина отказа" value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 13, resize: "none", width: 130, boxSizing: "border-box" }} />
                      {appErr2 && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{appErr2}</p>}
                      <button onClick={onReject} disabled={appProcessing}
                        style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "white", border: "none", borderRadius: 10, padding: "10px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                        {appProcessing ? "..." : "Отклонить"}
                      </button>
                      <button onClick={() => { setSelApp(null); setAppAction(null); }}
                        style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "none", borderRadius: 10, padding: "8px", cursor: "pointer", fontSize: 13 }}>
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setSelApp(app); setAppAction("approve"); setAppMsg(""); setAppErr2(""); }}
                        style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="CheckCircle" size={16} />Одобрить
                      </button>
                      {partnerOpen === app.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
                          <input
                            type="number" placeholder="Сумма, ₽"
                            value={partnerForm[app.id]?.amount ?? ""}
                            onChange={e => setPartnerForm(prev => ({ ...prev, [app.id]: { ...prev[app.id], amount: e.target.value } }))}
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "8px 10px", color: "white", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                          />
                          <input
                            type="number" placeholder="Срок, дней"
                            value={partnerForm[app.id]?.days ?? ""}
                            onChange={e => setPartnerForm(prev => ({ ...prev, [app.id]: { ...prev[app.id], days: e.target.value } }))}
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "8px 10px", color: "white", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                          />
                          <input
                            type="number" placeholder="Ставка %/день" step="0.1"
                            value={partnerForm[app.id]?.rate ?? ""}
                            onChange={e => setPartnerForm(prev => ({ ...prev, [app.id]: { ...prev[app.id], rate: e.target.value } }))}
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "8px 10px", color: "white", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                          />
                          <button
                            onClick={() => {
                              const f = partnerForm[app.id] || {};
                              const amount = parseFloat(f.amount || "0");
                              const days = parseInt(f.days || "0");
                              const rate = parseFloat(f.rate || "0") / 100;
                              if (!amount || !days || !rate) return;
                              onPartnerApprove(app.id, { amount, days, rate });
                              setPartnerOpen(null);
                            }}
                            disabled={appProcessing}
                            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", border: "none", borderRadius: 8, padding: "9px 10px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                            <Icon name="Send" size={14} />{appProcessing ? "..." : "Отправить"}
                          </button>
                          <button onClick={() => setPartnerOpen(null)}
                            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "none", borderRadius: 8, padding: "7px", cursor: "pointer", fontSize: 12 }}>
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => {
                          setPartnerOpen(app.id);
                          setPartnerForm(prev => ({ ...prev, [app.id]: { amount: String(app.approvedAmount ?? app.amount ?? ""), days: String(app.approvedDays ?? app.days ?? ""), rate: String(app.approvedRate ? app.approvedRate * 100 : "") } }));
                        }}
                          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon name="CreditCard" size={16} />Партнёр
                        </button>
                      )}
                      {cdOpen === app.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
                          <div style={{ color: "#e879f9", fontSize: 12, fontWeight: 700, marginBottom: 2 }}>💊 Кредитный Доктор</div>
                          <input
                            type="number" placeholder="Сумма, ₽"
                            value={cdForm[app.id]?.amount ?? ""}
                            onChange={e => setCdForm(prev => ({ ...prev, [app.id]: { ...prev[app.id], amount: e.target.value } }))}
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 8, padding: "8px 10px", color: "white", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                          />
                          <input
                            type="number" placeholder="Срок, дней"
                            value={cdForm[app.id]?.days ?? ""}
                            onChange={e => setCdForm(prev => ({ ...prev, [app.id]: { ...prev[app.id], days: e.target.value } }))}
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 8, padding: "8px 10px", color: "white", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                          />
                          <input
                            type="number" placeholder="Ставка %/день" step="0.1"
                            value={cdForm[app.id]?.rate ?? ""}
                            onChange={e => setCdForm(prev => ({ ...prev, [app.id]: { ...prev[app.id], rate: e.target.value } }))}
                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 8, padding: "8px 10px", color: "white", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                          />
                          <button
                            onClick={() => {
                              const f = cdForm[app.id] || {};
                              const amount = parseFloat(f.amount || "0");
                              const days = parseInt(f.days || "0");
                              const rate = parseFloat(f.rate || "0") / 100;
                              if (!amount || !days || !rate) return;
                              onCreditDoctorApprove(app.id, { amount, days, rate });
                              setCdOpen(null);
                            }}
                            disabled={appProcessing}
                            style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", color: "white", border: "none", borderRadius: 8, padding: "9px 10px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                            <Icon name="Send" size={14} />{appProcessing ? "..." : "Одобрить"}
                          </button>
                          <button onClick={() => setCdOpen(null)}
                            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "none", borderRadius: 8, padding: "7px", cursor: "pointer", fontSize: 12 }}>
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => {
                          setCdOpen(app.id);
                          setCdForm(prev => ({ ...prev, [app.id]: { amount: String(app.approvedAmount ?? app.amount ?? ""), days: String(app.approvedDays ?? app.days ?? ""), rate: String(app.approvedRate ? app.approvedRate * 100 : "1") } }));
                        }}
                          style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 0 12px rgba(168,85,247,0.3)" }}>
                          💊 Кред. Доктор
                        </button>
                      )}
                      <button onClick={() => onPostpone(app.id)}
                        style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="PhoneMissed" size={16} />Отложить
                      </button>
                      <button onClick={() => { setSelApp(app); setAppAction("reject"); setAppMsg(""); setAppErr2(""); }}
                        style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="XCircle" size={16} />Отказать
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}