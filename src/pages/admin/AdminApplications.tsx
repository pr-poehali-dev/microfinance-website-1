import Icon from "@/components/ui/icon";
import { App, GLASS } from "./adminTypes";

interface Props {
  apps: App[];
  appsLoading: boolean;
  appFilter: "pending" | "approved" | "rejected";
  setAppFilter: (f: "pending" | "approved" | "rejected") => void;
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
  rejectReason: string;
  setRejectReason: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  setLightbox: (url: string) => void;
}

export default function AdminApplications({
  apps, appsLoading, appFilter, setAppFilter,
  appMsg, appErr2, appProcessing,
  selApp, setSelApp, appAction, setAppAction, setAppMsg, setAppErr2,
  appRate, setAppRate, rejectReason, setRejectReason,
  onApprove, onReject, setLightbox,
}: Props) {
  return (
    <div>
      {/* Фильтр */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {([["pending","Ожидают","Clock","#f59e0b"],["approved","Одобренные","CheckCircle","#22c55e"],["rejected","Отклонённые","XCircle","#ef4444"]] as const).map(([f, label, icon, color]) => (
          <button key={f} onClick={() => setAppFilter(f)}
            style={{ padding: "8px 18px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
              background: appFilter === f ? color : "rgba(255,255,255,0.07)", color: appFilter === f ? "white" : "rgba(255,255,255,0.5)" }}>
            <Icon name={icon} size={14} />{label}
          </button>
        ))}
      </div>

      {appMsg && <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 12, padding: "12px 16px", color: "#4ade80", marginBottom: 16, fontSize: 14 }}>{appMsg}</div>}

      {appsLoading && <div style={{ textAlign: "center", padding: 60 }}><Icon name="Loader2" size={36} className="animate-spin text-purple-400" /></div>}

      {!appsLoading && apps.length === 0 && (
        <div style={{ ...GLASS, padding: 60, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Заявок нет</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {apps.map(app => (
          <div key={app.id} style={{ ...GLASS, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "white", fontWeight: 700, fontSize: 18 }}>{app.fullName || app.phone}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>#{app.id} · {app.createdAt}</span>
                  {app.telegramId && <span style={{ color: "#a78bfa", fontSize: 13 }}>@{app.telegramId}</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12, marginBottom: 12 }}>
                  {[["Телефон", app.phone], ["Email", app.email||"—"], ["Сумма", `${app.amount.toLocaleString("ru-RU")} ₽`], ["Срок", `${app.days} дн.`]].map(([l, v]) => (
                    <div key={l}><div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>{l}</div><div style={{ color: "white", fontWeight: 600 }}>{v}</div></div>
                  ))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 10, marginBottom: 12 }}>
                  {[["Серия/Номер", `${app.passportSeries} ${app.passportNumber}`], ["Дата выдачи", app.passportDate||"—"], ["Код", app.passportCode||"—"], ["Дата рождения", app.birthDate||"—"]].map(([l, v]) => (
                    <div key={l}><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>{l}</div><div style={{ color: "white", fontSize: 13 }}>{v}</div></div>
                  ))}
                  {app.passportBy && <div style={{ gridColumn: "1/-1" }}><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>Кем выдан</div><div style={{ color: "white", fontSize: 13 }}>{app.passportBy}</div></div>}
                  {app.birthPlace && <div style={{ gridColumn: "1/-1" }}><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>Место рождения</div><div style={{ color: "white", fontSize: 13 }}>{app.birthPlace}</div></div>}
                </div>

                {/* Документы */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
              </div>

              {/* Кнопки действий */}
              {app.status === "pending" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
                  {selApp?.id === app.id && appAction === "approve" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Ставка %/день</label>
                      <input type="number" value={appRate} onChange={e => setAppRate(e.target.value)} step="0.1" min="0.1"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 15, width: 130, boxSizing: "border-box" }} />
                      {appRate && <div style={{ color: "#4ade80", fontSize: 13 }}>К возврату: {Math.round(app.amount * (1 + +appRate/100 * app.days)).toLocaleString("ru-RU")} ₽</div>}
                      {appErr2 && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{appErr2}</p>}
                      <button onClick={onApprove} disabled={appProcessing}
                        style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "white", border: "none", borderRadius: 10, padding: "10px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                        {appProcessing ? "..." : "Подтвердить"}
                      </button>
                      <button onClick={() => { setSelApp(null); setAppAction(null); }}
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
