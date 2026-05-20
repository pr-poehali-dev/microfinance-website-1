import Icon from "@/components/ui/icon";

const LOAN_STATUSES = [
  { value: "active",  label: "Активен",          color: "#4ade80" },
  { value: "paid",    label: "Погашен",           color: "#a78bfa" },
  { value: "overdue", label: "Просрочен",         color: "#f87171" },
  { value: "review",  label: "На рассмотрении",   color: "#fbbf24" },
];

interface User { id: number; phone: string; fullName: string; email: string; createdAt: string; loanCount: number; debt: number; }
interface Loan  { id: number; amount: number; days: number; rate: number; ratePercent: number; status: string; createdAt: string; }

interface Props {
  users: User[];
  usersLoading: boolean;
  search: string;
  setSearch: (v: string) => void;
  filtered: User[];
  selectedUser: User | null;
  setSelectedUser: (u: User | null) => void;
  loans: Loan[];
  loansLoad: boolean;
  clientTab: "loans" | "add" | "register" | "offer";
  setClientTab: (t: "loans" | "add" | "register" | "offer") => void;
  newLoan: { amount: string; days: string; rate: string };
  setNewLoan: (v: { amount: string; days: string; rate: string }) => void;
  newClient: { phone: string; fullName: string; password: string };
  setNewClient: (v: { phone: string; fullName: string; password: string }) => void;
  newOffer: { amount: string; days: string; rate: string };
  setNewOffer: (v: { amount: string; days: string; rate: string }) => void;
  actionMsg: string;
  actionErr: string;
  setActionMsg: (v: string) => void;
  setActionErr: (v: string) => void;
  onOpenUser: (u: User) => void;
  onChangeStatus: (loanId: number, status: string) => void;
  onAddLoan: (e: React.FormEvent) => void;
  onRegisterClient: (e: React.FormEvent) => void;
  onCreateOffer: (e: React.FormEvent) => void;
}

export default function AdminClients({
  usersLoading, search, setSearch, filtered,
  selectedUser, setSelectedUser,
  loans, loansLoad,
  clientTab, setClientTab,
  newLoan, setNewLoan,
  newClient, setNewClient,
  newOffer, setNewOffer,
  actionMsg, actionErr, setActionMsg, setActionErr,
  onOpenUser, onChangeStatus, onAddLoan, onRegisterClient, onCreateOffer,
}: Props) {
  return (
    <div className="pt-4 flex gap-5" style={{ minHeight: "calc(100vh - 100px)" }}>
      {/* Левая колонка — список */}
      <div className="w-80 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-oswald text-xl font-bold text-white">Клиенты</h2>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm">{filtered.length}</span>
            <button
              onClick={() => { setSelectedUser(null); setClientTab("register"); setActionMsg(""); setActionErr(""); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
              <Icon name="UserPlus" size={13} />Добавить
            </button>
          </div>
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
            <button key={user.id} onClick={() => onOpenUser(user)}
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

      {/* Правая колонка — детали */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 100px)" }}>
        {!selectedUser && clientTab !== "register" ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(124,58,237,0.15)" }}>
              <Icon name="Users" size={28} className="text-purple-400" />
            </div>
            <p className="text-white/50 mb-4">Выберите клиента из списка слева</p>
            <button
              onClick={() => { setClientTab("register"); setActionMsg(""); setActionErr(""); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
              <Icon name="UserPlus" size={15} />Добавить нового клиента
            </button>
          </div>
        ) : !selectedUser && clientTab === "register" ? (
          <div className="pt-2">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Icon name="UserPlus" size={18} className="text-purple-400" />
                Новый клиент
              </h3>
              <form onSubmit={onRegisterClient} className="space-y-4">
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
                <div className="flex gap-3">
                  <button type="submit" className="btn-neon text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2">
                    <Icon name="UserPlus" size={16} />Зарегистрировать
                  </button>
                  <button type="button" onClick={() => setClientTab("loans")}
                    className="px-4 py-3 rounded-xl text-white/50 hover:text-white transition-colors text-sm"
                    style={{ background: "rgba(255,255,255,0.05)" }}>
                    Отмена
                  </button>
                </div>
              </form>
            </div>
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

            <div className="flex gap-2 mb-4 flex-wrap">
              {([["loans","Займы","CreditCard"],["offer","Создать оффер","FileSignature"],["add","Добавить займ","Plus"],["register","Новый клиент","UserPlus"]] as const).map(([t, label, icon]) => (
                <button key={t} onClick={() => { setClientTab(t); setActionMsg(""); setActionErr(""); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={clientTab === t
                    ? t === "offer"
                      ? { background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", color: "white" }
                      : { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
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
                          <button key={s.value} onClick={() => onChangeStatus(loan.id, s.value)}
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
                <form onSubmit={onAddLoan} className="space-y-4">
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

            {clientTab === "offer" && (
              <div className="glass rounded-2xl p-6" style={{ border: "1px solid rgba(14,165,233,0.3)" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(14,165,233,0.2)" }}>
                    <Icon name="FileSignature" size={18} className="text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Создать оффер для {selectedUser.phone}</h3>
                    <p className="text-white/40 text-xs">Клиент увидит условия в личном кабинете и сможет подписать</p>
                  </div>
                </div>
                <form onSubmit={onCreateOffer} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Одобренная сумма (₽)", key: "amount", placeholder: "50000", min: "1000" },
                      { label: "Срок (дней)", key: "days", placeholder: "15", min: "1" },
                      { label: "Ставка (%/день)", key: "rate", placeholder: "0.8", min: "0.1", step: "0.1" },
                    ].map(({ label, key, placeholder, min, step }) => (
                      <div key={key}>
                        <label className="text-white/50 text-xs mb-1 block">{label}</label>
                        <input type="number" required min={min} step={step || "1"} placeholder={placeholder}
                          value={newOffer[key as keyof typeof newOffer]}
                          onChange={(e) => setNewOffer({ ...newOffer, [key]: e.target.value })}
                          className="w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 outline-none border border-white/10 focus:border-sky-500 transition-colors"
                          style={{ background: "rgba(255,255,255,0.05)" }} />
                      </div>
                    ))}
                  </div>

                  {newOffer.amount && newOffer.days && newOffer.rate && (
                    <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.25)" }}>
                      <div className="text-sky-400 text-xs font-semibold uppercase tracking-wider mb-3">Условия оффера</div>
                      {[
                        { label: "Одобренная сумма", value: `${parseFloat(newOffer.amount).toLocaleString("ru-RU")} ₽` },
                        { label: "Срок", value: `${newOffer.days} дней` },
                        { label: "Ставка", value: `${newOffer.rate}% в день` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-white/50">{label}</span>
                          <span className="text-white font-medium">{value}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                        <span className="text-white/50">К возврату</span>
                        <span className="text-sky-300 font-bold text-base">
                          {Math.round(parseFloat(newOffer.amount) * (1 + parseFloat(newOffer.rate) / 100 * parseInt(newOffer.days))).toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                    </div>
                  )}

                  {actionErr && <p className="text-red-400 text-sm flex items-center gap-2"><Icon name="AlertCircle" size={14} />{actionErr}</p>}
                  {actionMsg && <p className="text-green-400 text-sm flex items-center gap-2"><Icon name="CheckCircle" size={14} />{actionMsg}</p>}
                  <button type="submit"
                    className="text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)" }}>
                    <Icon name="Send" size={16} />Отправить оффер клиенту
                  </button>
                </form>
              </div>
            )}

            {clientTab === "register" && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Зарегистрировать нового клиента</h3>
                <form onSubmit={onRegisterClient} className="space-y-4">
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
  );
}