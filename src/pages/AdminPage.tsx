import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface App {
  id: number; fullName: string; phone: string; email: string;
  amount: number; days: number; status: string; createdAt: string;
  passportSeries: string; passportNumber: string; passportDate: string;
  passportCode: string; passportBy: string; birthDate: string; birthPlace: string;
  telegramId: string; rejectReason: string;
  filePassport: string; fileRegistration: string; fileSelfie: string; filePreviousPassports: string;
}
interface User { id: number; phone: string; fullName: string; email: string; createdAt: string; loanCount: number; debt: number; }
interface Loan { id: number; amount: number; days: number; ratePercent: number; status: string; createdAt: string; }

const S = { background: "#0F0A1E", minHeight: "100vh" };
const GLASS = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 };
const PURPLE = { background: "linear-gradient(135deg,#7c3aed,#a855f7)" };
const STATUS: Record<string, { label: string; color: string }> = {
  active:  { label: "Активен",   color: "#4ade80" },
  paid:    { label: "Погашен",   color: "#a78bfa" },
  overdue: { label: "Просрочен", color: "#f87171" },
  review:  { label: "На рассм.", color: "#fbbf24" },
};

export default function AdminPage() {
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [pwd, setPwd]     = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const [tab, setTab]   = useState<"apps" | "clients">("apps");
  const [apps, setApps] = useState<App[]>([]);
  const [appFilter, setAppFilter] = useState<"pending"|"approved"|"rejected">("pending");
  const [appsLoading, setAppsLoading] = useState(false);

  const [users, setUsers]       = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch]     = useState("");
  const [selUser, setSelUser]   = useState<User | null>(null);
  const [loans, setLoans]       = useState<Loan[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);

  const [clientView, setClientView] = useState<"loans"|"offer"|"addloan"|"addclient">("loans");
  const [offer, setOffer] = useState({ amount: "", days: "", rate: "0.8" });
  const [newLoan, setNewLoan] = useState({ amount: "", days: "", rate: "0.8" });
  const [newClient, setNewClient] = useState({ phone: "", fullName: "", password: "" });
  const [actionMsg, setActionMsg] = useState("");
  const [actionErr, setActionErr] = useState("");

  const [selApp, setSelApp]     = useState<App | null>(null);
  const [appRate, setAppRate]   = useState("0.8");
  const [rejectReason, setRejectReason] = useState("");
  const [appAction, setAppAction] = useState<"approve"|"reject"|null>(null);
  const [appProcessing, setAppProcessing] = useState(false);
  const [appMsg, setAppMsg]     = useState("");
  const [appErr2, setAppErr2]   = useState("");

  const [lightbox, setLightbox] = useState("");

  const hdrs = (tok = token) => ({ "Content-Type": "application/json", "Authorization": `Bearer ${tok}` });

  // --- ЗАГРУЗКА ---
  function loadApps(filter = appFilter, tok = token) {
    if (!tok) return;
    setAppsLoading(true);
    fetch(`${URL}?sub=applications&status=${filter}`, { headers: hdrs(tok) })
      .then(r => r.json()).then(d => setApps(d.applications || []))
      .catch(() => {}).finally(() => setAppsLoading(false));
  }

  function loadUsers(tok = token) {
    if (!tok) return;
    setUsersLoading(true);
    fetch(URL, { headers: hdrs(tok) })
      .then(r => r.json()).then(d => setUsers(d.users || []))
      .catch(() => {}).finally(() => setUsersLoading(false));
  }

  function loadLoans(userId: number) {
    setLoansLoading(true);
    fetch(`${URL}?sub=loans&userId=${userId}`, { headers: hdrs() })
      .then(r => r.json()).then(d => setLoans(d.loans || []))
      .finally(() => setLoansLoading(false));
  }

  useEffect(() => { if (token) { loadApps(); loadUsers(); } }, []);

  useEffect(() => { if (token) loadApps(appFilter); }, [appFilter]);

  // --- ВХОД ---
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await fetch(URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", password: pwd }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Неверный пароль"); return; }
      localStorage.setItem("admin_token", d.token);
      setToken(d.token);
      loadApps("pending", d.token);
      loadUsers(d.token);
    } catch { setErr("Ошибка соединения"); }
    finally { setLoading(false); }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    setToken(""); setUsers([]); setApps([]);
  }

  // --- ДЕЙСТВИЯ С ЗАЯВКАМИ ---
  async function approveApp() {
    if (!selApp) return;
    setAppProcessing(true); setAppMsg(""); setAppErr2("");
    const r = await fetch(`${URL}?sub=approve&appId=${selApp.id}`, { method: "POST", headers: hdrs(), body: JSON.stringify({ rate: parseFloat(appRate) / 100 }) });
    const d = await r.json();
    if (!r.ok) { setAppErr2(d.error); setAppProcessing(false); return; }
    setAppMsg(`Займ #${d.loanId} создан!`);
    setApps(prev => prev.filter(a => a.id !== selApp.id));
    setSelApp(null); setAppAction(null); setAppProcessing(false);
    loadUsers();
  }

  async function rejectApp() {
    if (!selApp) return;
    setAppProcessing(true); setAppMsg(""); setAppErr2("");
    const r = await fetch(`${URL}?sub=reject&appId=${selApp.id}`, { method: "POST", headers: hdrs(), body: JSON.stringify({ reason: rejectReason }) });
    const d = await r.json();
    if (!r.ok) { setAppErr2(d.error); setAppProcessing(false); return; }
    setAppMsg("Заявка отклонена.");
    setApps(prev => prev.filter(a => a.id !== selApp.id));
    setSelApp(null); setAppAction(null); setAppProcessing(false);
  }

  // --- ДЕЙСТВИЯ С КЛИЕНТАМИ ---
  async function sendOffer(e: React.FormEvent) {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    if (!selUser) return;
    const r = await fetch(`${URL}?sub=offer&userId=${selUser.id}`, { method: "POST", headers: hdrs(), body: JSON.stringify({ offerAmount: +offer.amount, offerDays: +offer.days, offerRate: +offer.rate / 100 }) });
    const d = await r.json();
    if (!r.ok) { setActionErr(d.error); return; }
    setActionMsg("Оффер отправлен клиенту!"); setOffer({ amount: "", days: "", rate: "0.8" });
  }

  async function addLoan(e: React.FormEvent) {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    const r = await fetch(`${URL}?sub=loans`, { method: "POST", headers: hdrs(), body: JSON.stringify({ phone: selUser?.phone, amount: +newLoan.amount, days: +newLoan.days, rate: +newLoan.rate / 100 }) });
    const d = await r.json();
    if (!r.ok) { setActionErr(d.error); return; }
    setActionMsg("Займ добавлен!"); setNewLoan({ amount: "", days: "", rate: "0.8" });
    if (selUser) loadLoans(selUser.id);
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    const r = await fetch(`${URL}?sub=register`, { method: "POST", headers: hdrs(), body: JSON.stringify(newClient) });
    const d = await r.json();
    if (!r.ok) { setActionErr(d.error); return; }
    setActionMsg("Клиент зарегистрирован!"); setNewClient({ phone: "", fullName: "", password: "" });
    loadUsers();
  }

  async function changeStatus(loanId: number, status: string) {
    await fetch(`${URL}?sub=loan&loanId=${loanId}`, { method: "PUT", headers: hdrs(), body: JSON.stringify({ status }) });
    if (selUser) loadLoans(selUser.id);
  }

  // ===================== RENDER =====================

  // Форма входа
  if (!token) return (
    <div style={{ ...S, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 360, padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, ...PURPLE, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Icon name="ShieldCheck" size={28} className="text-white" />
          </div>
          <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, margin: 0 }}>Панель администратора</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 8 }}>Введите пароль для входа</p>
        </div>
        <form onSubmit={login} style={{ ...GLASS, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="password" required placeholder="Пароль" value={pwd} onChange={e => setPwd(e.target.value)}
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "14px 16px", color: "white", fontSize: 16, outline: "none", width: "100%", boxSizing: "border-box" }} />
          {err && <p style={{ color: "#f87171", margin: 0, fontSize: 14 }}>{err}</p>}
          <button type="submit" disabled={loading}
            style={{ ...PURPLE, color: "white", fontWeight: 700, fontSize: 16, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><Icon name="Loader2" size={18} className="animate-spin" />Вход...</> : <><Icon name="LogIn" size={18} />Войти</>}
          </button>
        </form>
      </div>
    </div>
  );

  const filtered = users.filter(u => u.phone.includes(search) || (u.fullName || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={S} className="font-golos">
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setLightbox("")}>
          <button style={{ position: "absolute", top: 16, right: 16, color: "white", background: "none", border: "none", cursor: "pointer" }}>
            <Icon name="X" size={28} />
          </button>
          <img src={lightbox} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 16 }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* NAVBAR */}
      <div style={{ background: "rgba(15,10,30,0.95)", borderBottom: "1px solid rgba(124,58,237,0.3)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ width: 36, height: 36, ...PURPLE, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="ShieldCheck" size={18} className="text-white" />
        </div>
        <span style={{ color: "white", fontWeight: 700, fontSize: 18, flex: 1 }}>PARAFINANS24 Admin</span>
        <button onClick={() => { setTab("apps"); }} style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
          background: tab === "apps" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.07)", color: tab === "apps" ? "white" : "rgba(255,255,255,0.5)" }}>
          Заявки {apps.length > 0 && tab !== "apps" ? `(${apps.length})` : ""}
        </button>
        <button onClick={() => { setTab("clients"); loadUsers(); }} style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
          background: tab === "clients" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.07)", color: tab === "clients" ? "white" : "rgba(255,255,255,0.5)" }}>
          Клиенты
        </button>
        <button onClick={() => { loadApps(); loadUsers(); }} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
          <Icon name="RefreshCw" size={16} />
        </button>
        <button onClick={logout} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
          <Icon name="LogOut" size={16} />
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>

        {/* ====== ЗАЯВКИ ====== */}
        {tab === "apps" && (
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
                            <button onClick={approveApp} disabled={appProcessing}
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
                            <button onClick={rejectApp} disabled={appProcessing}
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
        )}

        {/* ====== КЛИЕНТЫ ====== */}
        {tab === "clients" && (
          <div style={{ display: "flex", gap: 20 }}>
            {/* Левая колонка */}
            <div style={{ width: 300, flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ color: "white", fontWeight: 700, fontSize: 20, margin: 0 }}>Клиенты <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>{filtered.length}</span></h2>
                <button onClick={() => { setSelUser(null); setClientView("addclient"); setActionMsg(""); setActionErr(""); }}
                  style={{ ...PURPLE, color: "white", border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="UserPlus" size={14} />Добавить
                </button>
              </div>
              <input placeholder="Поиск по телефону или имени" value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", color: "white", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 12, outline: "none" }} />
              <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 220px)", display: "flex", flexDirection: "column", gap: 8 }}>
                {usersLoading && <div style={{ textAlign: "center", padding: 40 }}><Icon name="Loader2" size={28} className="animate-spin text-purple-400" /></div>}
                {!usersLoading && filtered.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40 }}>Нет клиентов</p>}
                {filtered.map(u => (
                  <button key={u.id} onClick={() => { setSelUser(u); setClientView("loans"); setActionMsg(""); setActionErr(""); loadLoans(u.id); }}
                    style={{ ...GLASS, padding: "12px 14px", cursor: "pointer", textAlign: "left", border: selUser?.id === u.id ? "1px solid rgba(124,58,237,0.6)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>{u.phone}</span>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{u.loanCount} займ.</span>
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{u.fullName || "—"}</div>
                    {u.debt > 0 && <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>Долг: {u.debt.toLocaleString("ru-RU")} ₽</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Правая колонка */}
            <div style={{ flex: 1 }}>
              {!selUser && clientView !== "addclient" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, color: "rgba(255,255,255,0.3)", gap: 16 }}>
                  <Icon name="Users" size={48} />
                  <p>Выберите клиента из списка</p>
                </div>
              ) : (
                <>
                  {selUser && (
                    <div style={{ ...GLASS, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ color: "white", fontWeight: 700, fontSize: 17 }}>{selUser.fullName || selUser.phone}</div>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{selUser.phone} · с {selUser.createdAt}</div>
                      </div>
                      <button onClick={() => setSelUser(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                        <Icon name="X" size={20} />
                      </button>
                    </div>
                  )}

                  {/* Вкладки */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                    {selUser && ([["loans","Займы","CreditCard"],["offer","Создать оффер","FileSignature"],["addloan","Добавить займ","Plus"]] as const).map(([v, label, icon]) => (
                      <button key={v} onClick={() => { setClientView(v); setActionMsg(""); setActionErr(""); }}
                        style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                          background: clientView === v ? (v === "offer" ? "linear-gradient(135deg,#0ea5e9,#38bdf8)" : "linear-gradient(135deg,#7c3aed,#a855f7)") : "rgba(255,255,255,0.07)",
                          color: clientView === v ? "white" : "rgba(255,255,255,0.5)" }}>
                        <Icon name={icon} size={13} />{label}
                      </button>
                    ))}
                    <button onClick={() => { setSelUser(null); setClientView("addclient"); setActionMsg(""); setActionErr(""); }}
                      style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                        background: clientView === "addclient" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.07)",
                        color: clientView === "addclient" ? "white" : "rgba(255,255,255,0.5)" }}>
                      <Icon name="UserPlus" size={13} />Новый клиент
                    </button>
                  </div>

                  {actionMsg && <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 12, padding: "12px 16px", color: "#4ade80", marginBottom: 16, fontSize: 14 }}>{actionMsg}</div>}
                  {actionErr && <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 12, padding: "12px 16px", color: "#f87171", marginBottom: 16, fontSize: 14 }}>{actionErr}</div>}

                  {/* Займы */}
                  {clientView === "loans" && selUser && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {loansLoading && <div style={{ textAlign: "center", padding: 40 }}><Icon name="Loader2" size={28} className="animate-spin text-purple-400" /></div>}
                      {!loansLoading && loans.length === 0 && <div style={{ ...GLASS, padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>У клиента нет займов</div>}
                      {loans.map(loan => {
                        const st = STATUS[loan.status] || STATUS.active;
                        return (
                          <div key={loan.id} style={{ ...GLASS, padding: 18 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                              <div>
                                <span style={{ color: "white", fontWeight: 700, fontSize: 18 }}>{loan.amount.toLocaleString("ru-RU")} ₽</span>
                                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginLeft: 12 }}>{loan.days} дн. · {loan.ratePercent}%/день</span>
                              </div>
                              <span style={{ background: `${st.color}25`, color: st.color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, alignSelf: "center" }}>Статус:</span>
                              {Object.entries(STATUS).map(([val, cfg]) => (
                                <button key={val} onClick={() => changeStatus(loan.id, val)}
                                  style={{ padding: "5px 12px", borderRadius: 8, border: loan.status === val ? `1px solid ${cfg.color}60` : "1px solid transparent",
                                    background: loan.status === val ? `${cfg.color}20` : "rgba(255,255,255,0.05)",
                                    color: loan.status === val ? cfg.color : "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                                  {cfg.label}
                                </button>
                              ))}
                            </div>
                            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 8 }}>Оформлен {loan.createdAt} · #{loan.id}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Оффер */}
                  {clientView === "offer" && selUser && (
                    <div style={{ ...GLASS, padding: 24, border: "1px solid rgba(14,165,233,0.3)" }}>
                      <h3 style={{ color: "white", fontWeight: 700, margin: "0 0 6px" }}>Создать оффер</h3>
                      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px" }}>Клиент увидит условия в личном кабинете и сможет подписать</p>
                      <form onSubmit={sendOffer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                          {[["Одобренная сумма (₽)","amount","50000"],["Срок (дней)","days","15"],["Ставка (%/день)","rate","0.8"]].map(([label, key, ph]) => (
                            <div key={key}>
                              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6 }}>{label}</div>
                              <input type="number" required placeholder={ph} value={offer[key as keyof typeof offer]}
                                onChange={e => setOffer({ ...offer, [key]: e.target.value })}
                                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 15, width: "100%", boxSizing: "border-box", outline: "none" }} />
                            </div>
                          ))}
                        </div>
                        {offer.amount && offer.days && offer.rate && (
                          <div style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)", borderRadius: 12, padding: "14px 18px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Сумма</span>
                              <span style={{ color: "white", fontWeight: 600 }}>{(+offer.amount).toLocaleString("ru-RU")} ₽</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Срок</span>
                              <span style={{ color: "white", fontWeight: 600 }}>{offer.days} дней</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>К возврату</span>
                              <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: 18 }}>{Math.round(+offer.amount * (1 + +offer.rate/100 * +offer.days)).toLocaleString("ru-RU")} ₽</span>
                            </div>
                          </div>
                        )}
                        <button type="submit"
                          style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", color: "white", border: "none", borderRadius: 12, padding: "14px", cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Icon name="Send" size={18} />Отправить оффер клиенту
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Добавить займ */}
                  {clientView === "addloan" && selUser && (
                    <div style={{ ...GLASS, padding: 24 }}>
                      <h3 style={{ color: "white", fontWeight: 700, margin: "0 0 20px" }}>Добавить займ для {selUser.phone}</h3>
                      <form onSubmit={addLoan} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                          {[["Сумма (₽)","amount","50000"],["Срок (дней)","days","15"],["Ставка (%/день)","rate","0.8"]].map(([label, key, ph]) => (
                            <div key={key}>
                              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6 }}>{label}</div>
                              <input type="number" required placeholder={ph} value={newLoan[key as keyof typeof newLoan]}
                                onChange={e => setNewLoan({ ...newLoan, [key]: e.target.value })}
                                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 15, width: "100%", boxSizing: "border-box", outline: "none" }} />
                            </div>
                          ))}
                        </div>
                        {newLoan.amount && newLoan.days && (
                          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                            К возврату: <strong style={{ color: "white" }}>{Math.round(+newLoan.amount * (1 + +newLoan.rate/100 * +newLoan.days)).toLocaleString("ru-RU")} ₽</strong>
                          </div>
                        )}
                        <button type="submit"
                          style={{ ...PURPLE, color: "white", border: "none", borderRadius: 12, padding: "14px", cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Icon name="Plus" size={18} />Добавить займ
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Новый клиент */}
                  {clientView === "addclient" && (
                    <div style={{ ...GLASS, padding: 24 }}>
                      <h3 style={{ color: "white", fontWeight: 700, margin: "0 0 20px" }}>Зарегистрировать клиента</h3>
                      <form onSubmit={addClient} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {[["Телефон","phone","tel","+7 (999) 000-00-00",true],["ФИО","fullName","text","Иванов Иван Иванович",false],["Пароль","password","text","Пароль для клиента",true]].map(([label, key, type, ph, req]) => (
                          <div key={key as string}>
                            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6 }}>{label as string}</div>
                            <input type={type as string} required={req as boolean} placeholder={ph as string}
                              value={newClient[key as keyof typeof newClient]}
                              onChange={e => setNewClient({ ...newClient, [key as string]: e.target.value })}
                              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 15, width: "100%", boxSizing: "border-box", outline: "none" }} />
                          </div>
                        ))}
                        <button type="submit"
                          style={{ ...PURPLE, color: "white", border: "none", borderRadius: 12, padding: "14px", cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Icon name="UserPlus" size={18} />Зарегистрировать
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
