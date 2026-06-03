import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const STAGES = [
  {
    num: "01",
    title: "1 этап",
    amount: "500 — 5 000 ₽",
    desc: "Оформление карты партнёра. Первый шаг к восстановлению кредитной истории.",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.35)",
  },
  {
    num: "02",
    title: "2 этап",
    amount: "1 000 — 15 000 ₽",
    desc: "Успешное прохождение первого этапа открывает увеличенный лимит.",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.3)",
  },
  {
    num: "03",
    title: "3 этап",
    amount: "1 000 — 30 000 ₽",
    desc: "Ваш кредитный рейтинг растёт — и вместе с ним доступный лимит.",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.3)",
  },
  {
    num: "04",
    title: "4 этап",
    amount: "1 000 — 50 000 ₽",
    desc: "Максимальный лимит программы. Ваша история полностью восстановлена.",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.3)",
  },
];

const FEATURES = [
  { icon: "CheckCircle", title: "Одобрение 100%", desc: "Принимаем всех, даже с плохой кредитной историей" },
  { icon: "Clock", title: "Рассмотрение 1–30 мин", desc: "Быстрое решение без долгого ожидания" },
  { icon: "CreditCard", title: "Выдача на карту партнёра", desc: "Средства поступают только на карту, оформленную на нашем сайте" },
  { icon: "TrendingUp", title: "Ставка индивидуально", desc: "Процентная ставка устанавливается персонально для каждого клиента" },
  { icon: "Shield", title: "Безопасно и официально", desc: "Прозрачные условия, договор на каждый займ" },
  { icon: "Star", title: "Восстанавливаем историю", desc: "Каждый погашенный займ улучшает ваш кредитный рейтинг" },
];

export default function CreditDoctorPage() {
  const navigate = useNavigate();

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
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <Icon name="ArrowLeft" size={16} />
            На главную
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-bg pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #A855F7, transparent)" }} />
        <div className="absolute bottom-10 left-10 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #06B6D4, transparent)" }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
            style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.4)", color: "#c084fc" }}>
            <Icon name="HeartPulse" size={15} />
            Специальная программа
          </div>

          <h1 className="font-oswald text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            КРЕДИТНЫЙ <span className="gradient-text">ДОКТОР</span>
          </h1>

          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-6"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }}>
            <Icon name="CheckCircle" size={20} className="text-green-400" />
            <span className="text-green-300 font-bold text-xl">ОДОБРЕНИЕ 100%</span>
          </div>

          <p className="text-white/60 text-lg mb-4 max-w-2xl mx-auto leading-relaxed">
            Программа для клиентов с <span className="text-white font-semibold">плохой кредитной историей</span>.
            Восстановите свой кредитный рейтинг поэтапно и получите доступ к большим суммам.
          </p>
          <p className="text-white/50 text-base mb-10">
            Сумма займа от <span className="text-purple-300 font-bold">500 ₽</span> до <span className="text-purple-300 font-bold">50 000 ₽</span>
          </p>

          <button
            onClick={() => navigate("/apply")}
            className="btn-neon text-white font-bold px-10 py-5 rounded-2xl text-lg inline-flex items-center gap-3"
          >
            <Icon name="HeartPulse" size={22} />
            Оформить Кредитный Доктор
          </button>
        </div>
      </section>

      {/* ЭТАПЫ */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-oswald text-4xl font-bold text-white mb-3">
              Этапы <span className="gradient-text">программы</span>
            </h2>
            <p className="text-white/50">С каждым этапом ваш лимит растёт</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {STAGES.map((s) => (
              <div key={s.num} className="rounded-2xl p-6 relative overflow-hidden"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <div className="absolute top-4 right-4 font-oswald text-5xl font-bold opacity-10"
                  style={{ color: s.color }}>{s.num}</div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <span className="font-oswald font-bold text-lg" style={{ color: s.color }}>{s.num}</span>
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg mb-1">{s.title}</div>
                    <div className="font-oswald text-2xl font-bold mb-2" style={{ color: s.color }}>{s.amount}</div>
                    <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Стрелка прогресса */}
          <div className="mt-8 glass rounded-2xl p-5 flex items-center gap-4">
            <Icon name="TrendingUp" size={24} className="text-purple-400 shrink-0" />
            <div>
              <div className="text-white font-semibold mb-1">Прогресс без остановок</div>
              <div className="text-white/50 text-sm">После успешного погашения каждого этапа вы автоматически переходите на следующий уровень с увеличенным лимитом</div>
            </div>
          </div>
        </div>
      </section>

      {/* ПРЕИМУЩЕСТВА */}
      <section className="py-20 px-4" style={{ background: "rgba(124,58,237,0.05)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-oswald text-4xl font-bold text-white mb-3">
              Условия <span className="gradient-text">программы</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-5 hover:card-hover transition-all duration-300 group">
                <div className="w-11 h-11 rounded-xl btn-neon flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon name={f.icon} size={20} className="text-white" />
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ВАЖНО */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl p-6"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <div className="flex items-start gap-4">
              <Icon name="AlertTriangle" size={22} className="text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-yellow-300 font-bold text-base mb-2">Важное условие программы</div>
                <p className="text-white/60 text-sm leading-relaxed">
                  Выдача займов по программе «Кредитный Доктор» производится <strong className="text-white">только на карту партнёра</strong>,
                  полученную на нашем сайте. Убедитесь, что карта оформлена до подачи заявки.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "rgba(124,58,237,0.05)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-oswald text-4xl font-bold text-white mb-4">
            Начните <span className="gradient-text">прямо сейчас</span>
          </h2>
          <p className="text-white/50 mb-8">Одобряем 100% заявок. Срок рассмотрения от 1 до 30 минут.</p>
          <button
            onClick={() => navigate("/apply")}
            className="btn-neon text-white font-bold px-10 py-5 rounded-2xl text-lg inline-flex items-center gap-3"
          >
            <Icon name="HeartPulse" size={22} />
            Оформить Кредитный Доктор
          </button>
          <div className="mt-6 flex flex-wrap justify-center gap-6">
            {[
              { icon: "CheckCircle", text: "Одобрение 100%" },
              { icon: "Clock", text: "От 1 до 30 минут" },
              { icon: "Lock", text: "Безопасно" },
            ].map((i) => (
              <div key={i.text} className="flex items-center gap-2 text-white/40 text-sm">
                <Icon name={i.icon} size={14} className="text-purple-400" />
                {i.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 text-center">
        <p className="text-white/20 text-sm">© 2024 PARAFINANS24 · Займы от частных инвесторов</p>
      </footer>
    </div>
  );
}
