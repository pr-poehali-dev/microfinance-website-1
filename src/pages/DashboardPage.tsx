import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

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
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: "Активен",       color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  paid:     { label: "Погашен",       color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  overdue:  { label: "Просрочен",     color: "#f87171", bg: "rgba(248,113,113,0.15)" },
  review:   { label: "На рассмотрении", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    fetch(LOANS_URL, {
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { localStorage.removeItem("token"); navigate("/login"); return; }
        setUser(data.user);
        setLoans(data.loans);
        setApplication(data.application || null);
      })
      .catch(() => setError("Ошибка загрузки данных"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handlePay = (loan: Loan) => {
    alert(`Оплата займа #${loan.id} на сумму ${loan.total.toLocaleString("ru-RU")} ₽\n\nДля оплаты свяжитесь с нами:\n📞 +7 (495) 663-51-24\n📧 PARAFINANS24@ya.ru`);
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

        {/* ЗАЙМЫ */}
        {!loading && !error && (
          <>
            {/* БЛОК СТАТУСА ЗАЯВКИ */}
            {application && application.status === "pending" && (
              <div className="glass rounded-2xl p-5 mb-6 flex items-center gap-4"
                style={{ border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.05)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(251,191,36,0.2)" }}>
                  <Icon name="Clock" size={22} className="text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold mb-0.5">Заявка #{application.id} на рассмотрении</div>
                  <div className="text-white/50 text-sm">
                    {application.amount.toLocaleString("ru-RU")} ₽ · {application.days} дн. · подана {application.createdAt}
                  </div>
                  <div className="text-yellow-400 text-xs mt-1">Обычно рассматриваем в течение 15 минут</div>
                </div>
              </div>
            )}

            <h2 className="font-oswald text-2xl font-bold text-white mb-4">
              Мои займы
            </h2>

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
                      {/* ШАПКА КАРТОЧКИ */}
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

                      {/* ПАРАМЕТРЫ */}
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

                        {/* ИТОГ + КНОПКА */}
                        <div className="flex items-center justify-between rounded-xl px-5 py-4"
                          style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }}>
                          <div>
                            <div className="text-white/50 text-sm">К возврату</div>
                            <div className="font-bold text-2xl gradient-text">{loan.total.toLocaleString("ru-RU")} ₽</div>
                            <div className="text-white/30 text-xs">включая {loan.interest.toLocaleString("ru-RU")} ₽ процентов</div>
                          </div>
                          {loan.status !== "paid" && (
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

            {/* КНОПКА НОВОГО ЗАЙМА */}
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
        {/* БЛОК ПОДДЕРЖКИ */}
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

      {/* ПЛАВАЮЩАЯ КНОПКА */}
      <a href="tel:+74956635124"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold text-sm shadow-2xl transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 24px rgba(168,85,247,0.4)" }}>
        <Icon name="Phone" size={18} />
        Связаться с нами
      </a>
    </div>
  );
}