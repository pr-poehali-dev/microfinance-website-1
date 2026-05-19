import { useState } from "react";
import Icon from "@/components/ui/icon";

interface Application {
  id: number; fullName: string; phone: string; email: string;
  amount: number; days: number; birthDate: string; birthPlace: string;
  passportSeries: string; passportNumber: string; passportDate: string;
  passportCode: string; passportBy: string; telegramId: string;
  status: string; createdAt: string; rejectReason: string;
  filePassport: string; fileRegistration: string;
  fileSelfie: string; filePreviousPassports: string;
}

interface Props {
  applications: Application[];
  appsLoading: boolean;
  appsFilter: "pending" | "approved" | "rejected";
  setAppsFilter: (f: "pending" | "approved" | "rejected") => void;
  appMsg: string;
  appErr: string;
  appProcessing: boolean;
  selectedApp: Application | null;
  setSelectedApp: (a: Application | null) => void;
  appAction: "approve" | "reject" | null;
  setAppAction: (a: "approve" | "reject" | null) => void;
  setAppMsg: (s: string) => void;
  setAppErr: (s: string) => void;
  approveRate: string;
  setApproveRate: (v: string) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
}

const FILE_LABELS: { key: keyof Application; label: string }[] = [
  { key: "filePassport",          label: "Паспорт" },
  { key: "fileRegistration",      label: "Прописка" },
  { key: "fileSelfie",            label: "Селфи" },
  { key: "filePreviousPassports", label: "Ранее выданные" },
];

export default function AdminApplications({
  applications, appsLoading, appsFilter, setAppsFilter,
  appMsg, appErr, appProcessing,
  selectedApp, setSelectedApp, appAction, setAppAction, setAppMsg, setAppErr,
  approveRate, setApproveRate, rejectReason, setRejectReason,
  onApprove, onReject,
}: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [openDocs, setOpenDocs] = useState<Set<number>>(new Set());

  const toggleDocs = (id: number) =>
    setOpenDocs((prev) => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      return s;
    });

  return (
    <>
    {lightbox && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.9)" }}
        onClick={() => setLightbox(null)}>
        <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={() => setLightbox(null)}>
          <Icon name="X" size={28} />
        </button>
        <img src={lightbox} alt="doc" className="max-w-full max-h-[90vh] rounded-2xl object-contain"
          onClick={(e) => e.stopPropagation()} />
      </div>
    )}
    <div className="pt-4">
      <div className="flex items-center gap-2 mb-5">
        {(["pending", "approved", "rejected"] as const).map((s) => {
          const cfg = {
            pending:  { label: "Ожидают решения", icon: "Clock",       grad: "linear-gradient(135deg,#f59e0b,#d97706)" },
            approved: { label: "Одобренные",      icon: "CheckCircle", grad: "linear-gradient(135deg,#16a34a,#22c55e)" },
            rejected: { label: "Отклонённые",     icon: "XCircle",     grad: "linear-gradient(135deg,#dc2626,#ef4444)" },
          }[s];
          return (
            <button key={s} onClick={() => setAppsFilter(s)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={appsFilter === s ? { background: cfg.grad, color: "white" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
              <Icon name={cfg.icon as "Clock"} size={14} />{cfg.label}
            </button>
          );
        })}
      </div>

      {appMsg && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-2 text-green-400 text-sm"
          style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
          <Icon name="CheckCircle" size={16} />{appMsg}
        </div>
      )}

      {appsLoading && <div className="flex items-center justify-center py-20"><Icon name="Loader2" size={32} className="animate-spin text-purple-400" /></div>}

      {!appsLoading && applications.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Icon name="FileText" size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">
            {appsFilter === "pending" ? "Новых заявок нет" : appsFilter === "approved" ? "Нет одобренных заявок" : "Нет отклонённых заявок"}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {applications.map((app) => (
          <div key={app.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Заголовок */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="text-white font-bold text-lg">{app.fullName || app.phone}</span>
                  <span className="text-white/30 text-sm">#{app.id}</span>
                  <span className="text-white/30 text-xs">{app.createdAt}</span>
                  {app.telegramId && (
                    <span className="text-purple-400 text-xs">@{app.telegramId}</span>
                  )}
                </div>

                {/* Основные данные */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                  <div><div className="text-white/40 text-xs mb-0.5">Телефон</div><div className="text-white">{app.phone}</div></div>
                  <div><div className="text-white/40 text-xs mb-0.5">Email</div><div className="text-white text-xs">{app.email || "—"}</div></div>
                  <div><div className="text-white/40 text-xs mb-0.5">Сумма</div><div className="text-white font-bold">{app.amount.toLocaleString("ru-RU")} ₽</div></div>
                  <div><div className="text-white/40 text-xs mb-0.5">Срок</div><div className="text-white">{app.days} дн.</div></div>
                </div>

                {/* Паспортные данные */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div><div className="text-white/40 text-xs mb-0.5">Серия / Номер</div><div className="text-white">{app.passportSeries} {app.passportNumber}</div></div>
                  <div><div className="text-white/40 text-xs mb-0.5">Дата выдачи</div><div className="text-white">{app.passportDate || "—"}</div></div>
                  <div><div className="text-white/40 text-xs mb-0.5">Код подразделения</div><div className="text-white">{app.passportCode || "—"}</div></div>
                  <div className="col-span-2"><div className="text-white/40 text-xs mb-0.5">Кем выдан</div><div className="text-white text-xs">{app.passportBy || "—"}</div></div>
                  <div><div className="text-white/40 text-xs mb-0.5">Дата рождения</div><div className="text-white">{app.birthDate || "—"}</div></div>
                  {app.birthPlace && <div className="col-span-2 sm:col-span-3"><div className="text-white/40 text-xs mb-0.5">Место рождения</div><div className="text-white text-xs">{app.birthPlace}</div></div>}
                </div>

                {/* Документы */}
                {(() => {
                  const hasFiles = FILE_LABELS.some(({ key }) => !!(app[key] as string));
                  const isOpen = openDocs.has(app.id);
                  const fileCount = FILE_LABELS.filter(({ key }) => !!(app[key] as string)).length;
                  return (
                    <div className="mt-2">
                      <button onClick={() => toggleDocs(app.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={hasFiles
                          ? { background: "rgba(124,58,237,0.2)", color: "#c084fc", border: "1px solid rgba(124,58,237,0.3)" }
                          : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <Icon name="Paperclip" size={12} />
                        Документы {hasFiles ? `(${fileCount}/${FILE_LABELS.length})` : "(не загружены)"}
                        {hasFiles && <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={12} />}
                      </button>

                      {isOpen && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {FILE_LABELS.map(({ key, label }) => {
                            const url = app[key] as string;
                            return (
                              <div key={key} className="flex flex-col gap-1">
                                <span className="text-white/40 text-xs">{label}</span>
                                {url ? (
                                  <button onClick={() => setLightbox(url)}
                                    className="relative group rounded-xl overflow-hidden"
                                    style={{ aspectRatio: "4/3", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(124,58,237,0.3)" }}>
                                    <img src={url} alt={label}
                                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{ background: "rgba(0,0,0,0.5)" }}>
                                      <Icon name="ZoomIn" size={20} className="text-white" />
                                    </div>
                                  </button>
                                ) : (
                                  <div className="rounded-xl flex items-center justify-center"
                                    style={{ aspectRatio: "4/3", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <Icon name="FileX" size={20} className="text-white/20" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {app.rejectReason && <div className="text-red-400 text-xs mt-2">Причина отказа: {app.rejectReason}</div>}
              </div>

              {appsFilter === "pending" && (
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => { setSelectedApp(app); setAppAction("approve"); setAppMsg(""); setAppErr(""); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}>
                    <Icon name="CheckCircle" size={15} />Одобрить
                  </button>
                  <button onClick={() => { setSelectedApp(app); setAppAction("reject"); setAppMsg(""); setAppErr(""); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>
                    <Icon name="XCircle" size={15} />Отказать
                  </button>
                </div>
              )}
            </div>

            {/* Форма одобрения */}
            {selectedApp?.id === app.id && appAction === "approve" && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(74,222,128,0.2)" }}>
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <label className="text-white/50 text-xs mb-1 block">Ставка (%/день)</label>
                    <input type="number" min="0.1" max="5" step="0.1" value={approveRate}
                      onChange={(e) => setApproveRate(e.target.value)}
                      className="w-32 rounded-xl px-3 py-2 text-white text-sm outline-none border border-white/10 focus:border-green-500 transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)" }} />
                  </div>
                  {approveRate && app.days > 0 && (
                    <div className="text-sm text-white/50 pb-2">
                      К возврату: <span className="text-white font-bold">
                        {(app.amount + app.amount * (parseFloat(approveRate) / 100) * app.days).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
                      </span>
                    </div>
                  )}
                </div>
                {appErr && <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><Icon name="AlertCircle" size={12} />{appErr}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={onApprove} disabled={appProcessing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}>
                    {appProcessing ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="CheckCircle" size={14} />}
                    Подтвердить выдачу
                  </button>
                  <button onClick={() => { setAppAction(null); setSelectedApp(null); }}
                    className="px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}>
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {/* Форма отказа */}
            {selectedApp?.id === app.id && appAction === "reject" && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(239,68,68,0.2)" }}>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Причина отказа (необязательно)</label>
                  <input type="text" placeholder="Например: недостаточный доход"
                    value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-white text-sm outline-none border border-white/10 focus:border-red-500 transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }} />
                </div>
                {appErr && <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><Icon name="AlertCircle" size={12} />{appErr}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={onReject} disabled={appProcessing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>
                    {appProcessing ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="XCircle" size={14} />}
                    Подтвердить отказ
                  </button>
                  <button onClick={() => { setAppAction(null); setSelectedApp(null); }}
                    className="px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}>
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
    </>
  );
}