import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

const LOAN_STATUSES = [
  { value: "active",  label: "Активен",            color: "#4ade80" },
  { value: "paid",    label: "Погашен",             color: "#a78bfa" },
  { value: "overdue", label: "Просрочен",           color: "#f87171" },
  { value: "review",  label: "На рассмотрении",     color: "#fbbf24" },
];

interface User { id: number; phone: string; fullName: string; email: string; createdAt: string; loanCount: number; debt: number; }
interface Loan  { id: number; amount: number; days: number; rate: number; ratePercent: number; status: string; createdAt: string; }
interface Application {
  id: number; fullName: string; phone: string; email: string;
  amount: number; days: number; birthDate: string;
  passportSeries: string; passportNumber: string;
  status: string; createdAt: string; rejectReason: string;
}

type MainTab = "applications" | "clients";

export default function AdminPage() {
  const navigate = useNavigate();
  const [token, setToken]       = useState(() => sessionStorage.getItem("admin_token") || "");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoad, setLoginLoad] = useState(false);

  const [mainTab, setMainTab] = useState<MainTab>("applications");

  // --- Заявки ---
  const [applications, setApplications]   = useState<Application[]>([]);
  const [appsLoading, setAppsLoading]     = useState(false);
  const [appsFilter, setAppsFilter]       = useState<"pending" | "approved" | "rejected">("pending");
  const [selectedApp, setSelectedApp]     = useState<Application | null>(null);
  const [approveRate, setApproveRate]     = useState("0.8");
  const [rejectReason, setRejectReason]   = useState("");
  const [appAction, setAppAction]         = useState<"approve" | "reject" | null>(null);
  const [appMsg, setAppMsg]               = useState("");
  const [appErr, setAppErr]               = useState("");
  const [appProcessing, setAppProcessing] = useState(false);

  // --- Клиенты ---
  const [users, setUsers]           = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch]         = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loans, setLoans]           = useState<Loan[]>([]);
  const [loansLoad, setLoansLoad]   = useState(false);
  const [clientTab, setClientTab]   = useState<"loans" | "add" | "register">("loans");
  const [newLoan, setNewLoan]       = useState({ amount: "", days: "", rate: "0.8" });
  const [newClient, setNewClient]   = useState({ phone: "", fullName: "", password: "" });
  const [actionMsg, setActionMsg]   = useState("");
  const [actionErr, setActionErr]   = useState("");

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  }), [token]);

  const loadApplications = useCallback((status = appsFilter) => {
    if (!token) return;
    setAppsLoading(true);
    fetch(`${ADMIN_URL}?sub=applications&status=${status}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setApplications(d.applications || []))
      .finally(() => setAppsLoading(false));
  }, [token, appsFilter, authHeaders]);

  const loadUsers = useCallback(() => {
    if (!token) return;
    setUsersLoading(true);
    fetch(ADMIN_URL, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setUsersLoading(false));
  }, [token, authHeaders]);

  useEffect(() => { if (token) { loadApplications(); loadUsers(); } }, [token]);
  useEffect(() => { if (token) loadApplications(appsFilter); }, [appsFilter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr(""); setLoginLoad(true);
    try {
      const res = await fetch(ADMIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", password }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginErr(data.error || "Неверный пароль"); return; }
      sessionStorage.setItem("admin_token", data.token);
      setToken(data.token);
    } catch { setLoginErr("Ошибка соединения"); }
    finally { setLoginLoad(false); }
  };

  const approveApp = async () => {
    if (!selectedApp) return;
    setAppProcessing(true); setAppMsg(""); setAppErr("");
    const res = await fetch(`${ADMIN_URL}?sub=approve&appId=${selectedApp.id}`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ rate: parseFloat(approveRate) / 100 }),
    });
    const data = await res.json();
    if (!res.ok) { setAppErr(data.error); setAppProcessing(false); return; }
    setAppMsg(`Займ #${data.loanId} создан! Клиент добавлен в систему.`);
    setAppAction(null); setSelectedApp(null);
    setApplications((prev) => prev.filter((a) => a.id !== selectedApp.id));
    loadUsers();
    setAppProcessing(false);
  };

  const rejectApp = async () => {
    if (!selectedApp) return;
    setAppProcessing(true); setAppMsg(""); setAppErr("");
    const res = await fetch(`${ADMIN_URL}?sub=reject&appId=${selectedApp.id}`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ reason: rejectReason }),
    });
    const data = await res.json();
    if (!res.ok) { setAppErr(data.error); setAppProcessing(false); return; }
    setAppMsg("Заявка отклонена.");
    setAppAction(null); setSelectedApp(null);
    setApplications((prev) => prev.filter((a) => a.id !== selectedApp.id));
    setAppProcessing(false);
  };

  const openUser = (user: User) => {
    setSelectedUser(user); setLoansLoad(true); setClientTab("loans");
    setActionMsg(""); setActionErr("");
    fetch(`${ADMIN_URL}?sub=loans&userId=${user.id}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setLoans(d.loans || []))
      .finally(() => setLoansLoad(false));
  };

  const changeStatus = async (loanId: number, status: string) => {
    await fetch(`${ADMIN_URL}?sub=loan&loanId=${loanId}`, {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    setLoans((prev) => prev.map((l) => l.id === loanId ? { ...l, status } : l));
  };

  const addLoan = async (e: React.FormEvent) => {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    const res = await fetch(`${ADMIN_URL}?sub=loans`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ phone: selectedUser?.phone, amount: parseFloat(newLoan.amount), days: parseInt(newLoan.days), rate: parseFloat(newLoan.rate) / 100 }),
    });
    const data = await res.json();
    if (!res.ok) { setActionErr(data.error); return; }
    setActionMsg("Займ успешно добавлен!"); setNewLoan({ amount: "", days: "", rate: "0.8" });
    openUser(selectedUser!);
  };

  const registerClient = async (e: React.FormEvent) => {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    const res = await fetch(`${ADMIN_URL}?sub=register`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify(newClient),
    });
    const data = await res.json();
    if (!res.ok) { setActionErr(data.error); return; }
    setActionMsg("Клиент зарегистрирован!"); setNewClient({ phone: "", fullName: "", password: "" });
    loadUsers();
  };

  const logout = () => {
    sessionStorage.removeItem("admin_token");
    setToken(""); setUsers([]); setApplications([]); setSelectedUser(null);
  };

  const filtered = users.filter((u) => u.phone.includes(search) || u.fullName.toLowerCase().includes(search.toLowerCase()));

  // ========= ВХОД =========
  if (!token) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0F0A1E" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 btn-neon rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="ShieldCheck" size={28} className="text-white" />
          </div>
          <h1 className="font-oswald text-3xl font-bold text-white">Панель администратора</h1>
          <p className="text-white/40 text-sm mt-1">Введите пароль для входа</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Пароль</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>
            {loginErr && <p className="text-red-400 text-sm flex items-center gap-2"><Icon name="AlertCircle" size={14} />{loginErr}</p>}
            <button type="submit" disabled={loginLoad} className="btn-neon w-full text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
              {loginLoad ? <><Icon name="Loader2" size={16} className="animate-spin" />Вход...</> : <><Icon name="LogIn" size={16} />Войти</>}
            </button>
          </form>
        </div>
        <button onClick={() => navigate("/")} className="mt-4 w-full text-white/40 hover:text-white/70 text-sm flex items-center justify-center gap-2 transition-colors">
          <Icon name="ArrowLeft" size={14} />На главную
        </button>
      </div>
    </div>
  );

  // ========= ПАНЕЛЬ =========
  return (
    <div className="min-h-screen font-golos" style={{ background: "#0F0A1E" }}>
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ borderBottom: "1px solid rgba(168,85,247,0.2)" }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 btn-neon rounded-lg flex items-center justify-center">
              <Icon name="ShieldCheck" size={16} className="text-white" />
            </div>
            <span className="font-oswald text-lg font-bold text-white hidden sm:block">Администратор</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setMainTab("applications")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all relative"
                style={mainTab === "applications"
                  ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                <Icon name="FileText" size={14} />Заявки
                {appsFilter === "pending" && applications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                    {applications.length}
                  </span>
                )}
              </button>
              <button onClick={() => setMainTab("clients")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={mainTab === "clients"
                  ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                <Icon name="Users" size={14} />Клиенты
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { loadApplications(); loadUsers(); }} className="text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Icon name="RefreshCw" size={16} />
            </button>
            <button onClick={logout} className="flex items-center gap-2 text-white/60 hover:text-white text-sm px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-all">
              <Icon name="LogOut" size={14} />Выйти
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 pt-20 pb-10">

        {/* ===== ЗАЯВКИ ===== */}
        {mainTab === "applications" && (
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
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="text-white font-bold text-lg">{app.fullName || app.phone}</span>
                        <span className="text-white/30 text-sm">#{app.id}</span>
                        <span className="text-white/30 text-xs">{app.createdAt}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><div className="text-white/40 text-xs mb-0.5">Телефон</div><div className="text-white">{app.phone}</div></div>
                        <div><div className="text-white/40 text-xs mb-0.5">Сумма</div><div className="text-white font-bold">{app.amount.toLocaleString("ru-RU")} ₽</div></div>
                        <div><div className="text-white/40 text-xs mb-0.5">Срок</div><div className="text-white">{app.days} дн.</div></div>
                        <div><div className="text-white/40 text-xs mb-0.5">Паспорт</div><div className="text-white">{app.passportSeries} {app.passportNumber}</div></div>
                      </div>
                      {app.birthDate && <div className="text-white/30 text-xs mt-2">Дата рождения: {app.birthDate}</div>}
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
                        <button onClick={approveApp} disabled={appProcessing}
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
                        <button onClick={rejectApp} disabled={appProcessing}
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
        )}

        {/* ===== КЛИЕНТЫ ===== */}
        {mainTab === "clients" && (
          <div className="pt-4 flex gap-5" style={{ minHeight: "calc(100vh - 100px)" }}>
            <div className="w-80 shrink-0 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-oswald text-xl font-bold text-white">Клиенты</h2>
                <span className="text-white/40 text-sm">{filtered.length}</span>
              </div>
              <div className="relative">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input type="text" placeholder="Поиск по телефону или имени"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-white text-sm placeholder-white/20 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)" }} />
              </div>
              <div className="overflow-y-auto space-y-2 pr-1" style={{ maxHeight: "calc(100vh - 210px)" }}>
                {usersLoading && <div className="text-center py-10"><Icon name="Loader2" size={24} className="animate-spin text-purple-400 mx-auto" /></div>}
                {!usersLoading && filtered.length === 0 && <p className="text-white/30 text-sm text-center py-8">Нет клиентов</p>}
                {filtered.map((user) => (
                  <button key={user.id} onClick={() => openUser(user)}
                    className="w-full text-left glass rounded-xl px-4 py-3 transition-all hover:border-purple-500/40"
                    style={{ border: selectedUser?.id === user.id ? "1px solid rgba(124,58,237,0.6)" : "1px solid transparent" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-semibold">{user.phone}</span>
                      <span className="text-white/40 text-xs">{user.loanCount} займ.</span>
                    </div>
                    <div className="text-white/50 text-xs truncate">{user.fullName || "—"}</div>
                    {user.debt > 0 && <div className="text-red-400 text-xs mt-1">Долг: {user.debt.toLocaleString("ru-RU")} ₽</div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 100px)" }}>
              {!selectedUser ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(124,58,237,0.15)" }}>
                    <Icon name="Users" size={28} className="text-purple-400" />
                  </div>
                  <p className="text-white/50">Выберите клиента из списка слева</p>
                </div>
              ) : (
                <>
                  <div className="glass rounded-2xl p-5 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 btn-neon rounded-xl flex items-center justify-center shrink-0">
                        <Icon name="User" size={18} className="text-white" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">{selectedUser.fullName || selectedUser.phone}</div>
                        <div className="text-white/40 text-sm">{selectedUser.phone} · с {selectedUser.createdAt}</div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="text-white/40 hover:text-white p-2 transition-colors">
                      <Icon name="X" size={18} />
                    </button>
                  </div>

                  <div className="flex gap-2 mb-4">
                    {([["loans","Займы","CreditCard"],["add","Добавить займ","Plus"],["register","Новый клиент","UserPlus"]] as const).map(([t, label, icon]) => (
                      <button key={t} onClick={() => { setClientTab(t); setActionMsg(""); setActionErr(""); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={clientTab === t
                          ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                          : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                        <Icon name={icon} size={14} />{label}
                      </button>
                    ))}
                  </div>

                  {clientTab === "loans" && (
                    <div className="space-y-3">
                      {loansLoad && <div className="text-center py-10"><Icon name="Loader2" size={24} className="animate-spin text-purple-400 mx-auto" /></div>}
                      {!loansLoad && loans.length === 0 && <div className="glass rounded-2xl p-8 text-center text-white/40">У клиента нет займов</div>}
                      {loans.map((loan) => {
                        const st = LOAN_STATUSES.find((s) => s.value === loan.status) || LOAN_STATUSES[0];
                        return (
                          <div key={loan.id} className="glass rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <span className="text-white font-bold text-lg">{loan.amount.toLocaleString("ru-RU")} ₽</span>
                                <span className="text-white/40 text-sm ml-3">{loan.days} дн. · {loan.ratePercent}%/день</span>
                              </div>
                              <span className="text-xs px-3 py-1 rounded-full font-semibold"
                                style={{ background: `${st.color}20`, color: st.color }}>{st.label}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white/30 text-xs mr-2">Статус:</span>
                              {LOAN_STATUSES.map((s) => (
                                <button key={s.value} onClick={() => changeStatus(loan.id, s.value)}
                                  className="text-xs px-3 py-1.5 rounded-lg transition-all"
                                  style={loan.status === s.value
                                    ? { background: `${s.color}25`, color: s.color, border: `1px solid ${s.color}60` }
                                    : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid transparent" }}>
                                  {s.label}
                                </button>
                              ))}
                            </div>
                            <div className="text-white/20 text-xs mt-2">Оформлен {loan.createdAt} · #{loan.id}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {clientTab === "add" && (
                    <div className="glass rounded-2xl p-6">
                      <h3 className="text-white font-semibold mb-4">Новый займ для {selectedUser.phone}</h3>
                      <form onSubmit={addLoan} className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Сумма (₽)", key: "amount", min: "1000", placeholder: "50000" },
                            { label: "Срок (дней)", key: "days", min: "1", placeholder: "15" },
                            { label: "Ставка (%/день)", key: "rate", min: "0.1", placeholder: "0.8", step: "0.1" },
                          ].map(({ label, key, min, placeholder, step }) => (
                            <div key={key}>
                              <label className="text-white/50 text-xs mb-1 block">{label}</label>
                              <input type="number" required min={min} step={step} placeholder={placeholder}
                                value={newLoan[key as keyof typeof newLoan]}
                                onChange={(e) => setNewLoan({ ...newLoan, [key]: e.target.value })}
                                className="w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                                style={{ background: "rgba(255,255,255,0.05)" }} />
                            </div>
                          ))}
                        </div>
                        {newLoan.amount && newLoan.days && (
                          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }}>
                            <span className="text-white/50">К возврату: </span>
                            <span className="text-white font-bold">
                              {(parseFloat(newLoan.amount) + parseFloat(newLoan.amount) * (parseFloat(newLoan.rate) / 100) * parseInt(newLoan.days)).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
                            </span>
                          </div>
                        )}
                        {actionErr && <p className="text-red-400 text-sm flex items-center gap-2"><Icon name="AlertCircle" size={14} />{actionErr}</p>}
                        {actionMsg && <p className="text-green-400 text-sm flex items-center gap-2"><Icon name="CheckCircle" size={14} />{actionMsg}</p>}
                        <button type="submit" className="btn-neon text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2">
                          <Icon name="Plus" size={16} />Добавить займ
                        </button>
                      </form>
                    </div>
                  )}

                  {clientTab === "register" && (
                    <div className="glass rounded-2xl p-6">
                      <h3 className="text-white font-semibold mb-4">Зарегистрировать нового клиента</h3>
                      <form onSubmit={registerClient} className="space-y-4">
                        {[
                          { label: "Телефон", key: "phone", type: "tel", placeholder: "+7 (999) 000-00-00", required: true },
                          { label: "ФИО", key: "fullName", type: "text", placeholder: "Иванов Иван Иванович", required: false },
                          { label: "Пароль для клиента", key: "password", type: "text", placeholder: "Пароль, который передадите клиенту", required: true },
                        ].map(({ label, key, type, placeholder, required }) => (
                          <div key={key}>
                            <label className="text-white/50 text-xs mb-1 block">{label}</label>
                            <input type={type} required={required} placeholder={placeholder}
                              value={newClient[key as keyof typeof newClient]}
                              onChange={(e) => setNewClient({ ...newClient, [key]: e.target.value })}
                              className="w-full rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                              style={{ background: "rgba(255,255,255,0.05)" }} />
                          </div>
                        ))}
                        {actionErr && <p className="text-red-400 text-sm flex items-center gap-2"><Icon name="AlertCircle" size={14} />{actionErr}</p>}
                        {actionMsg && <p className="text-green-400 text-sm flex items-center gap-2"><Icon name="CheckCircle" size={14} />{actionMsg}</p>}
                        <button type="submit" className="btn-neon text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2">
                          <Icon name="UserPlus" size={16} />Зарегистрировать
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
