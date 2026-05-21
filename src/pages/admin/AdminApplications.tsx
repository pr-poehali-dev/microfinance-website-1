import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { App, GLASS } from "./adminTypes";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

const fmtAppId = (id: number) => String(id).padStart(12, "0");

interface SbFields { workplace: string; position: string; activeLoans: string; salary: string; contactPerson: string; sbScore: string; cardNumber: string; }

interface Props {
  apps: App[];
  appsLoading: boolean;
  appFilter: "pending" | "approved" | "rejected" | "postponed" | "partner_card";
  setAppFilter: (f: "pending" | "approved" | "rejected" | "postponed" | "partner_card") => void;
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
  onPartnerApprove: (appId: number) => void;
  setLightbox: (url: string) => void;
  token: string;
}

export default function AdminApplications({
  apps, appsLoading, appFilter, setAppFilter,
  appMsg, appErr2, appProcessing,
  selApp, setSelApp, appAction, setAppAction, setAppMsg, setAppErr2,
  appRate, setAppRate, appAmount, setAppAmount, rejectReason, setRejectReason,
  onApprove, onReject, onPostpone, onRestore, onPartnerApprove, setLightbox, token,
}: Props) {
  const [search, setSearch] = useState("");
  const [sbEdits, setSbEdits] = useState<Record<number, SbFields>>({});
  const [sbSaving, setSbSaving] = useState<Record<number, boolean>>({});
  const [sbSaved, setSbSaved] = useState<Record<number, boolean>>({});
  const [disbursing, setDisbursing] = useState<Record<number, boolean>>({});
  const [disbursed, setDisbursed] = useState<Record<number, boolean>>({});

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
    if (a.status !== appFilter) return false;
    const q = search.toLowerCase();
    return !q || a.phone.includes(q) || (a.fullName || "").toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Фильтр + Поиск */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {([["pending","Ожидают","Clock","#f59e0b"],["partner_card","Партнёр","CreditCard","#a855f7"],["postponed","Отложенные","PhoneMissed","#60a5fa"],["approved","Одобренные","CheckCircle","#22c55e"],["rejected","Отклонённые","XCircle","#ef4444"]] as const).map(([f, label, icon, color]) => (
          <button key={f} onClick={() => setAppFilter(f)}
            style={{ padding: "8px 18px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
              background: appFilter === f ? color : "rgba(255,255,255,0.07)", color: appFilter === f ? "white" : "rgba(255,255,255,0.5)" }}>
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

                  {/* Статус займа — выдан */}
                  {app.loanStatus === "active" && disbursed[app.id] || (app.loanStatus === "active" && app.loanDisbursedAt) ? (
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
                  ) : null}

                  {/* Кнопка "Выдать займ" — только если подписан и ещё не выдан */}
                  {app.loanId && app.loanSigned && app.loanStatus !== "active" && !disbursed[app.id] && (
                    <button
                      onClick={() => handleDisburse(app)}
                      disabled={disbursing[app.id]}
                      style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6, opacity: disbursing[app.id] ? 0.7 : 1 }}>
                      {disbursing[app.id]
                        ? <><Icon name="Loader2" size={15} className="animate-spin" />Выдаём...</>
                        : <><Icon name="Banknote" size={15} />Выдать займ</>
                      }
                    </button>
                  )}

                  {/* Если не подписан — подсказка */}
                  {app.loanId && !app.loanSigned && (
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, lineHeight: 1.4 }}>
                      Кнопка появится после подписания договора клиентом
                    </div>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
                  <div style={{ padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, textAlign: "center", background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>
                    Ожидает карту партнёра
                  </div>
                  <button onClick={() => onRestore(app.id)}
                    style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="RotateCcw" size={16} />Вернуть в ожидание
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
                      <button onClick={() => onPartnerApprove(app.id)}
                        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="CreditCard" size={16} />Партнёр
                      </button>
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