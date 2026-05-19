import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

const STATUS_OPTIONS = [
  { value: "active",  label: "Активен",          color: "#4ade80" },
  { value: "paid",    label: "Погашен",           color: "#a78bfa" },
  { value: "overdue", label: "Просрочен",         color: "#f87171" },
  { value: "review",  label: "На рассмотрении",   color: "#fbbf24" },
];

interface User { id: number; phone: string; fullName: string; email: string; createdAt: string; loanCount: number; debt: number; }
interface Loan  { id: number; amount: number; days: number; rate: number; ratePercent: number; status: string; createdAt: string; }

export default function AdminPage() {
  const navigate = useNavigate();
  const [token, setToken]       = useState(() => sessionStorage.getItem("admin_token") || "");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoad, setLoginLoad] = useState(false);

  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");

  const [selectedUser, setSelectedUser]   = useState<User | null>(null);
  const [loans, setLoans]                 = useState<Loan[]>([]);
  const [loansLoad, setLoansLoad]         = useState(false);

  const [tab, setTab]   = useState<"loans" | "add" | "register">("loans");
  const [newLoan, setNewLoan] = useState({ amount: "", days: "", rate: "0.8" });
  const [newClient, setNewClient] = useState({ phone: "", fullName: "", password: "" });
  const [actionMsg, setActionMsg] = useState("");
  const [actionErr, setActionErr] = useState("");

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  }), [token]);

  // --- Загрузка клиентов ---
  const loadUsers = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(ADMIN_URL, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setLoading(false));
  }, [token, authHeaders]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // --- Вход ---
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

  // --- Займы клиента ---
  const openUser = (user: User) => {
    setSelectedUser(user); setLoansLoad(true); setTab("loans");
    setActionMsg(""); setActionErr("");
    fetch(`${ADMIN_URL}?sub=loans&userId=${user.id}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setLoans(d.loans || []))
      .finally(() => setLoansLoad(false));
  };

  // --- Изменить статус ---
  const changeStatus = async (loanId: number, status: string) => {
    await fetch(`${ADMIN_URL}?sub=loan&loanId=${loanId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    setLoans((prev) => prev.map((l) => l.id === loanId ? { ...l, status } : l));
  };

  // --- Добавить займ ---
  const addLoan = async (e: React.FormEvent) => {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    const res = await fetch(`${ADMIN_URL}?sub=loans`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ phone: selectedUser?.phone, amount: parseFloat(newLoan.amount), days: parseInt(newLoan.days), rate: parseFloat(newLoan.rate) / 100 }),
    });
    const data = await res.json();
    if (!res.ok) { setActionErr(data.error); return; }
    setActionMsg("Займ успешно добавлен!"); setNewLoan({ amount: "", days: "", rate: "0.8" });
    openUser(selectedUser!);
  };

  // --- Зарегистрировать клиента ---
  const registerClient = async (e: React.FormEvent) => {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    const res = await fetch(`${ADMIN_URL}?sub=register`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(newClient),
    });
    const data = await res.json();
    if (!res.ok) { setActionErr(data.error); return; }
    setActionMsg("Клиент зарегистрирован!"); setNewClient({ phone: "", fullName: "", password: "" });
    loadUsers();
  };

  const logout = () => { sessionStorage.removeItem("admin_token"); setToken(""); setUsers([]); setSelectedUser(null); };
  const filtered = users.filter((u) => u.phone.includes(search) || u.fullName.toLowerCase().includes(search.toLowerCase()));

  // ========= ЭКРАН ВХОДА =========
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
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 btn-neon rounded-lg flex items-center justify-center">
              <Icon name="ShieldCheck" size={16} className="text-white" />
            </div>
            <span className="font-oswald text-lg font-bold text-white">Администратор</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadUsers} className="text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
              <Icon name="RefreshCw" size={16} />
            </button>
            <button onClick={logout} className="flex items-center gap-2 text-white/60 hover:text-white text-sm px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-all">
              <Icon name="LogOut" size={14} />Выйти
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 pt-20 pb-10 flex gap-5 h-screen">

        {/* ЛЕВАЯ КОЛОНКА: клиенты */}
        <div className="w-80 shrink-0 flex flex-col gap-3 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-oswald text-xl font-bold text-white">Клиенты</h2>
            <span className="text-white/40 text-sm">{filtered.length}</span>
          </div>
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text" placeholder="Поиск по телефону или имени"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-white text-sm placeholder-white/20 outline-none border border-white/10 focus:border-purple-500 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: "calc(100vh - 160px)" }}>
            {loading && <div className="text-center py-10"><Icon name="Loader2" size={24} className="animate-spin text-purple-400 mx-auto" /></div>}
            {!loading && filtered.length === 0 && <p className="text-white/30 text-sm text-center py-8">Нет клиентов</p>}
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

        {/* ПРАВАЯ КОЛОНКА: займы */}
        <div className="flex-1 pt-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 80px)" }}>
          {!selectedUser ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(124,58,237,0.15)" }}>
                <Icon name="Users" size={28} className="text-purple-400" />
              </div>
              <p className="text-white/50">Выберите клиента из списка слева</p>
            </div>
          ) : (
            <>
              {/* ЗАГОЛОВОК */}
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

              {/* ТАБЫ */}
              <div className="flex gap-2 mb-4">
                {([["loans","Займы","CreditCard"],["add","Добавить займ","Plus"],["register","Новый клиент","UserPlus"]] as const).map(([t, label, icon]) => (
                  <button key={t} onClick={() => { setTab(t); setActionMsg(""); setActionErr(""); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={tab === t ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                    <Icon name={icon} size={14} />{label}
                  </button>
                ))}
              </div>

              {/* СПИСОК ЗАЙМОВ */}
              {tab === "loans" && (
                <div className="space-y-3">
                  {loansLoad && <div className="text-center py-10"><Icon name="Loader2" size={24} className="animate-spin text-purple-400 mx-auto" /></div>}
                  {!loansLoad && loans.length === 0 && (
                    <div className="glass rounded-2xl p-8 text-center text-white/40">У клиента нет займов</div>
                  )}
                  {loans.map((loan) => {
                    const st = STATUS_OPTIONS.find((s) => s.value === loan.status) || STATUS_OPTIONS[0];
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
                          {STATUS_OPTIONS.map((s) => (
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

              {/* ДОБАВИТЬ ЗАЙМ */}
              {tab === "add" && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4">Новый займ для {selectedUser.phone}</h3>
                  <form onSubmit={addLoan} className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-white/50 text-xs mb-1 block">Сумма (₽)</label>
                        <input type="number" required min="1000" placeholder="50000"
                          value={newLoan.amount} onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })}
                          className="w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                          style={{ background: "rgba(255,255,255,0.05)" }} />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs mb-1 block">Срок (дней)</label>
                        <input type="number" required min="1" max="365" placeholder="15"
                          value={newLoan.days} onChange={(e) => setNewLoan({ ...newLoan, days: e.target.value })}
                          className="w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                          style={{ background: "rgba(255,255,255,0.05)" }} />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs mb-1 block">Ставка (%/день)</label>
                        <input type="number" required min="0.1" max="5" step="0.1" placeholder="0.8"
                          value={newLoan.rate} onChange={(e) => setNewLoan({ ...newLoan, rate: e.target.value })}
                          className="w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                          style={{ background: "rgba(255,255,255,0.05)" }} />
                      </div>
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

              {/* ЗАРЕГИСТРИРОВАТЬ КЛИЕНТА */}
              {tab === "register" && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4">Зарегистрировать нового клиента</h3>
                  <form onSubmit={registerClient} className="space-y-4">
                    <div>
                      <label className="text-white/50 text-xs mb-1 block">Телефон</label>
                      <input type="tel" required placeholder="+7 (999) 000-00-00"
                        value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        className="w-full rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)" }} />
                    </div>
                    <div>
                      <label className="text-white/50 text-xs mb-1 block">ФИО</label>
                      <input type="text" placeholder="Иванов Иван Иванович"
                        value={newClient.fullName} onChange={(e) => setNewClient({ ...newClient, fullName: e.target.value })}
                        className="w-full rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)" }} />
                    </div>
                    <div>
                      <label className="text-white/50 text-xs mb-1 block">Пароль для клиента</label>
                      <input type="text" required placeholder="Пароль, который скажете клиенту"
                        value={newClient.password} onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                        className="w-full rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)" }} />
                    </div>
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
    </div>
  );
}
