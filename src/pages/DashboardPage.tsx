import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

interface LoanOffer {
  amount: number;
  days: number;
  rate: number;
  ratePercent: number;
  total: number;
}

interface Loan {
  id: number;
  amount: number;
  days: number;
  rate: number;
  ratePercent: number;
  interest: number;
  total: number;
  status: string;
  createdAt: string;
  signed: boolean;
  offer?: LoanOffer;
}

interface User {
  id: number;
  phone: string;
  fullName: string;
  email: string;
}

interface Application {
  id: number;
  amount: number;
  days: number;
  status: string;
  createdAt: string;
  approvedAmount: number | null;
  approvedRate: number;
  approvedRatePercent: number;
  approvedDays: number;
  approvedTotal: number;
  rejectReason: string;
  cardNumber: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: "Активен",         color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  paid:     { label: "Погашен",         color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  overdue:  { label: "Просрочен",       color: "#f87171", bg: "rgba(248,113,113,0.15)" },
  review:   { label: "На рассмотрении", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingId, setSigningId] = useState<number | null>(null);
  const [signMsg, setSignMsg] = useState("");

  // Таймер 5:00 для pending-статуса
  const [timerSec, setTimerSec] = useState(5 * 60);
  const [timerDone, setTimerDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Карта/СБП для approved
  const [cardInput, setCardInput] = useState("");
  const [cardSaving, setCardSaving] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);
  const [cardError, setCardError] = useState("");

  const loadData = (token: string, isInitial = false) => {
    if (isInitial) setLoading(true);
    fetch(LOANS_URL, {
      headers: { "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          if (isInitial) { localStorage.removeItem("token"); navigate("/login"); }
          return;
        }
        setUser(data.user);
        setLoans(data.loans || []);
        const app = data.application || null;
        setApplication(app);
        if (app?.cardNumber) {
          setCardInput(app.cardNumber);
          setCardSaved(true);
        }
        setError("");
      })
      .catch(() => { if (isInitial) setError("Ошибка загрузки данных"); })
      .finally(() => { if (isInitial) setLoading(false); });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    loadData(token, true);

    // Автообновление каждые 10 секунд — чтобы статус одобрения появлялся без перезагрузки
    const interval = setInterval(() => {
      const t = localStorage.getItem("token");
      if (t) loadData(t, false);
    }, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Запускаем таймер только когда заявка pending
  useEffect(() => {
    if (!application || application.status !== "pending") return;
    setTimerSec(5 * 60);
    setTimerDone(false);
    timerRef.current = setInterval(() => {
      setTimerSec((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [application?.id, application?.status]);

  const fmtTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handlePay = (loan: Loan) => {
    alert(`Оплата займа #${loan.id} на сумму ${loan.total.toLocaleString("ru-RU")} ₽\n\nДля оплаты свяжитесь с нами:\n📞 +7 (495) 663-51-24\n📧 PARAFINANS24@ya.ru`);
  };

  const handleSign = async (loan: Loan) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSigningId(loan.id);
    setSignMsg("");
    const res = await fetch(`${LOANS_URL}?loanId=${loan.id}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const data = await res.json();
    setSigningId(null);
    if (!res.ok) { setSignMsg(data.error || "Ошибка"); return; }
    setSignMsg("Договор подписан! Ожидайте перевода средств.");
    setLoans((prev) => prev.map((l) => l.id === loan.id ? { ...l, signed: true, status: "active", offer: undefined } : l));
  };

  const handleSaveCard = async () => {
    if (!cardInput.trim()) { setCardError("Введите номер карты или телефон СБП"); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    setCardSaving(true);
    setCardError("");
    const res = await fetch(LOANS_URL, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber: cardInput.trim() }),
    });
    const data = await res.json();
    setCardSaving(false);
    if (!res.ok) { setCardError(data.error || "Ошибка сохранения"); return; }
    setCardSaved(true);
  };

  return (
    <div className="min-h-screen font-golos" style={{ background: "#0F0A1E" }}>
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ borderBottom: "1px solid rgba(168,85,247,0.2)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center">
              <Icon name="Wallet" size={20} className="text-white" />
            </div>
            <span className="font-oswald text-xl font-bold tracking-wide text-white">
              PARA<span className="gradient-text">FINANS24</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-white/50 text-sm hidden md:block">{user?.phone}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm px-3 py-2 rounded-xl border border-white/10 hover:border-white/30"
            >
              <Icon name="LogOut" size={16} />
              Выйти
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-28 pb-16">

        {/* ПРИВЕТСТВИЕ */}
        {user && (
          <div className="glass rounded-2xl p-6 mb-6 flex items-center gap-4">
            <div className="w-14 h-14 btn-neon rounded-2xl flex items-center justify-center shrink-0">
              <Icon name="User" size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-oswald text-2xl font-bold text-white">
                {user.fullName ? `Здравствуйте, ${user.fullName.split(" ")[0]}!` : "Личный кабинет"}
              </h1>
              <p className="text-white/50 text-sm">{user.phone}{user.email ? ` · ${user.email}` : ""}</p>
            </div>
          </div>
        )}

        {/* СОСТОЯНИЕ ЗАГРУЗКИ */}
        {loading && (
          <div className="text-center py-20">
            <Icon name="Loader2" size={40} className="animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-white/50">Загружаем ваши данные...</p>
          </div>
        )}

        {error && (
          <div className="glass rounded-2xl p-5 flex items-center gap-3 mb-6" style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
            <Icon name="AlertCircle" size={20} className="text-red-400 shrink-0" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ОФФЕР ОТ МЕНЕДЖЕРА (займ в статусе review с offer) */}
            {loans.some((l) => l.status === "review" && !l.signed && l.offer) && (
              <div className="mb-6">
                {loans.filter((l) => l.status === "review" && !l.signed && l.offer).map((loan) => (
                  <div key={loan.id} className="glass rounded-2xl overflow-hidden"
                    style={{ border: "1px solid rgba(14,165,233,0.4)", background: "rgba(14,165,233,0.04)" }}>
                    <div className="px-6 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg,rgba(14,165,233,0.2),rgba(56,189,248,0.08))" }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(14,165,233,0.25)" }}>
                        <Icon name="FileSignature" size={18} className="text-sky-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold">Вам одобрен займ!</div>
                        <div className="text-sky-300 text-xs mt-0.5">Ознакомьтесь с условиями и подпишите договор</div>
                      </div>
                      <span className="text-xs px-3 py-1 rounded-full font-semibold animate-pulse"
                        style={{ background: "rgba(14,165,233,0.2)", color: "#38bdf8" }}>Ожидает подписи</span>
                    </div>
                    <div className="px-6 py-5">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                          { label: "Одобренная сумма", value: `${loan.offer!.amount.toLocaleString("ru-RU")} ₽`, big: true },
                          { label: "К возврату",       value: `${loan.offer!.total.toLocaleString("ru-RU")} ₽`, highlight: true },
                          { label: "Срок",             value: `${loan.offer!.days} дней` },
                          { label: "Процентная ставка",value: `${loan.offer!.ratePercent}% в день` },
                        ].map(({ label, value, big, highlight }) => (
                          <div key={label} className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <div className="text-white/40 text-xs mb-1">{label}</div>
                            <div className={`font-bold ${big ? "text-xl text-white" : highlight ? "text-sky-300 text-xl" : "text-white text-base"}`}>{value}</div>
                          </div>
                        ))}
                      </div>
                      {signMsg && (
                        <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
                          style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                          <Icon name="CheckCircle" size={14} className="inline mr-2" />{signMsg}
                        </div>
                      )}
                      <button onClick={() => handleSign(loan)} disabled={signingId === loan.id}
                        className="w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 text-base transition-all hover:opacity-90 disabled:opacity-60"
                        style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", boxShadow: "0 4px 20px rgba(14,165,233,0.3)" }}>
                        {signingId === loan.id
                          ? <><Icon name="Loader2" size={18} className="animate-spin" />Подписываем...</>
                          : <><Icon name="PenLine" size={18} />Подписать договор</>
                        }
                      </button>
                      <p className="text-white/20 text-xs text-center mt-3">Нажимая «Подписать», вы соглашаетесь с условиями займа</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* БЛОК СТАТУСА ЗАЯВКИ: PENDING — таймер */}
            {application && application.status === "pending" && (
              <div className="glass rounded-2xl overflow-hidden mb-6"
                style={{ border: "1px solid rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.04)" }}>
                <div className="px-6 py-4 flex items-center gap-3"
                  style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.2),rgba(251,191,36,0.05))" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(251,191,36,0.2)" }}>
                    <Icon name="Clock" size={20} className="text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">Заявка #{application.id} принята</div>
                    <div className="text-white/50 text-xs mt-0.5">
                      {application.amount.toLocaleString("ru-RU")} ₽ · {application.days} дн. · подана {application.createdAt}
                    </div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full font-semibold"
                    style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>На рассмотрении</span>
                </div>
                <div className="px-6 py-8 flex flex-col items-center text-center">
                  {!timerDone ? (
                    <>
                      <div className="font-oswald text-6xl font-bold mb-3"
                        style={{ color: "#fbbf24", textShadow: "0 0 30px rgba(251,191,36,0.4)" }}>
                        {fmtTimer(timerSec)}
                      </div>
                      <p className="text-white/50 text-sm">Осталось до завершения рассмотрения</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                        style={{ background: "rgba(251,191,36,0.2)" }}>
                        <Icon name="FileSearch" size={26} className="text-yellow-400" />
                      </div>
                      <p className="text-white font-semibold text-lg mb-1">Ваша заявка на рассмотрении</p>
                      <p className="text-white/50 text-sm">Специалист свяжется с вами в ближайшее время</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* БЛОК СТАТУСА ЗАЯВКИ: APPROVED — детали + карта + договор */}
            {application && application.status === "approved" && (
              <div className="glass rounded-2xl overflow-hidden mb-6"
                style={{ border: "1px solid rgba(74,222,128,0.4)", background: "rgba(74,222,128,0.03)" }}>
                <div className="px-6 py-4 flex items-center gap-3"
                  style={{ background: "linear-gradient(135deg,rgba(22,163,74,0.25),rgba(74,222,128,0.08))" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(74,222,128,0.2)" }}>
                    <Icon name="CheckCircle" size={20} className="text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold">Заявка #{application.id} одобрена!</div>
                    <div className="text-green-400 text-xs mt-0.5">Подана {application.createdAt}</div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full font-semibold"
                    style={{ background: "rgba(74,222,128,0.2)", color: "#4ade80" }}>Одобрено</span>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {/* Условия займа */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Одобренная сумма",  value: `${(application.approvedAmount ?? application.amount).toLocaleString("ru-RU")} ₽`, green: true },
                      { label: "К возврату",         value: `${application.approvedTotal.toLocaleString("ru-RU")} ₽`, big: true },
                      { label: "Срок займа",         value: `${application.approvedDays} дней` },
                      { label: "Процентная ставка",  value: `${application.approvedRatePercent}% в день` },
                    ].map(({ label, value, green, big }) => (
                      <div key={label} className="rounded-xl px-4 py-3"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="text-white/40 text-xs mb-1">{label}</div>
                        <div className={`font-bold text-lg ${green ? "text-green-400" : big ? "text-sky-300" : "text-white"}`}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Ввод карты/СБП */}
                  <div className="rounded-xl p-4 space-y-3"
                    style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)" }}>
                    <div className="text-white/70 text-sm font-medium flex items-center gap-2">
                      <Icon name="CreditCard" size={16} className="text-purple-400" />
                      Укажите реквизиты для перевода
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cardInput}
                        onChange={(e) => { setCardInput(e.target.value); setCardSaved(false); setCardError(""); }}
                        placeholder="Номер карты или телефон СБП"
                        className="flex-1 px-4 py-3 rounded-xl text-white text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}
                        disabled={cardSaved}
                      />
                      {!cardSaved ? (
                        <button
                          onClick={handleSaveCard}
                          disabled={cardSaving}
                          className="px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                        >
                          {cardSaving
                            ? <Icon name="Loader2" size={16} className="animate-spin" />
                            : <Icon name="Save" size={16} />
                          }
                          Сохранить
                        </button>
                      ) : (
                        <button
                          onClick={() => setCardSaved(false)}
                          className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80"
                          style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}
                        >
                          <Icon name="CheckCircle" size={16} />
                          Сохранено
                        </button>
                      )}
                    </div>
                    {cardError && <p className="text-red-400 text-xs">{cardError}</p>}
                    <p className="text-white/30 text-xs">Введите номер карты или номер телефона (СБП) для получения займа</p>
                  </div>

                  {/* Кнопка подписать договор */}
                  {loans.some((l) => l.status === "review" && !l.signed) ? null : (
                    <div className="rounded-xl px-5 py-4 flex items-center gap-3"
                      style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}>
                      <Icon name="FileText" size={20} className="text-purple-400 shrink-0" />
                      <div className="flex-1">
                        <div className="text-white/60 text-sm">Для получения денег подпишите договор в разделе "Мои займы" ниже</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* БЛОК СТАТУСА ЗАЯВКИ: REJECTED */}
            {application && application.status === "rejected" && (
              <div className="glass rounded-2xl overflow-hidden mb-6"
                style={{ border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.03)" }}>
                <div className="px-6 py-4 flex items-center gap-3"
                  style={{ background: "linear-gradient(135deg,rgba(220,38,38,0.25),rgba(239,68,68,0.08))" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(239,68,68,0.2)" }}>
                    <Icon name="XCircle" size={20} className="text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold">По заявке #{application.id} отказано</div>
                    <div className="text-red-400 text-xs mt-0.5">Подана {application.createdAt}</div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full font-semibold"
                    style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>Отказ</span>
                </div>
                <div className="px-6 py-5 space-y-3">
                  {application.rejectReason && (
                    <div className="rounded-xl px-4 py-3"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <div className="text-white/40 text-xs mb-1">Причина отказа</div>
                      <div className="text-white/80 text-sm">{application.rejectReason}</div>
                    </div>
                  )}
                  <p className="text-white/40 text-sm">Вы можете подать повторную заявку или связаться с нами для уточнения деталей.</p>
                  <button
                    onClick={() => navigate("/")}
                    className="btn-neon text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 w-full justify-center"
                  >
                    <Icon name="RefreshCw" size={16} />
                    Подать новую заявку
                  </button>
                </div>
              </div>
            )}

            {/* МОИ ЗАЙМЫ */}
            <h2 className="font-oswald text-2xl font-bold text-white mb-4">Мои займы</h2>

            {loans.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(124,58,237,0.2)" }}>
                  <Icon name="FileText" size={28} className="text-purple-400" />
                </div>
                {application && application.status === "pending" ? (
                  <>
                    <h3 className="text-white font-semibold text-lg mb-2">Заявка отправлена</h3>
                    <p className="text-white/50 text-sm">Как только заявка будет одобрена — займ появится здесь</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-white font-semibold text-lg mb-2">Займов пока нет</h3>
                    <p className="text-white/50 text-sm mb-6">Оформите первый займ прямо сейчас</p>
                    <button
                      onClick={() => navigate("/")}
                      className="btn-neon text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2"
                    >
                      <Icon name="Plus" size={16} />
                      Оформить займ
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => {
                  const st = STATUS_MAP[loan.status] || STATUS_MAP.active;
                  return (
                    <div key={loan.id} className="glass rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10"
                        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(168,85,247,0.08))" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 btn-neon rounded-xl flex items-center justify-center shrink-0">
                            <Icon name="CreditCard" size={18} className="text-white" />
                          </div>
                          <div>
                            <div className="text-white font-semibold">Займ #{loan.id}</div>
                            <div className="text-white/40 text-xs">от {loan.createdAt}</div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                          style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>

                      <div className="px-6 py-5">
                        <div className="grid grid-cols-3 gap-4 mb-5">
                          <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="text-white/40 text-xs mb-1">Сумма займа</div>
                            <div className="text-white font-bold text-lg">{loan.amount.toLocaleString("ru-RU")} ₽</div>
                          </div>
                          <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="text-white/40 text-xs mb-1">Срок</div>
                            <div className="text-white font-bold text-lg">{loan.days} дн.</div>
                          </div>
                          <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="text-white/40 text-xs mb-1">Ставка</div>
                            <div className="text-white font-bold text-lg">{loan.ratePercent}%/день</div>
                          </div>
                        </div>

                        {/* Подпись договора для review-займа */}
                        {loan.status === "review" && !loan.signed && !loan.offer && (
                          <div className="mb-4">
                            {signMsg && (
                              <div className="rounded-xl px-4 py-3 mb-3 text-sm font-medium"
                                style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                                <Icon name="CheckCircle" size={14} className="inline mr-2" />{signMsg}
                              </div>
                            )}
                            <button onClick={() => handleSign(loan)} disabled={signingId === loan.id}
                              className="w-full text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 4px 20px rgba(124,58,237,0.3)" }}>
                              {signingId === loan.id
                                ? <><Icon name="Loader2" size={16} className="animate-spin" />Подписываем...</>
                                : <><Icon name="PenLine" size={16} />Подписать договор</>
                              }
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between rounded-xl px-5 py-4"
                          style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }}>
                          <div>
                            <div className="text-white/50 text-sm">К возврату</div>
                            <div className="font-bold text-2xl gradient-text">{loan.total.toLocaleString("ru-RU")} ₽</div>
                            <div className="text-white/30 text-xs">включая {loan.interest.toLocaleString("ru-RU")} ₽ процентов</div>
                          </div>
                          {loan.status !== "paid" && loan.status !== "review" && (
                            <button
                              onClick={() => handlePay(loan)}
                              className="btn-neon text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2"
                            >
                              <Icon name="CreditCard" size={16} />
                              Оплатить
                            </button>
                          )}
                          {loan.status === "paid" && (
                            <div className="flex items-center gap-2 text-green-400 font-semibold">
                              <Icon name="CheckCircle" size={20} />
                              Погашен
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {loans.length > 0 && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate("/")}
                  className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-2 mx-auto transition-colors"
                >
                  <Icon name="Plus" size={16} />
                  Оформить ещё один займ
                </button>
              </div>
            )}
          </>
        )}

        {/* ПОДДЕРЖКА */}
        <div className="mt-8 glass rounded-2xl p-6" style={{ border: "1px solid rgba(124,58,237,0.2)" }}>
          <h3 className="font-oswald text-lg font-bold text-white mb-4">Нужна помощь?</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <a href="tel:+74956635124"
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
              <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                <Icon name="Phone" size={16} className="text-white" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Позвонить</div>
                <div className="text-white/50 text-xs">+7 (495) 663-51-24</div>
              </div>
            </a>
            <a href="mailto:PARAFINANS24@ya.ru"
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
              <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                <Icon name="Mail" size={16} className="text-white" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Написать email</div>
                <div className="text-white/50 text-xs">PARAFINANS24@ya.ru</div>
              </div>
            </a>
            <a href="https://t.me/PARAFINANS24" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
              <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                <Icon name="Send" size={16} className="text-white" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Telegram</div>
                <div className="text-white/50 text-xs">@PARAFINANS24</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <a href="tel:+74956635124"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold text-sm shadow-2xl transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 24px rgba(168,85,247,0.4)" }}>
        <Icon name="Phone" size={18} />
        Связаться с нами
      </a>
    </div>
  );
}