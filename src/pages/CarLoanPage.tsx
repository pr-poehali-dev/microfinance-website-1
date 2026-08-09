import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Navbar from "@/components/Navbar";
import { useState } from "react";

const CONDITIONS = [
  { icon: "Banknote", title: "Сумма займа", value: "100 000 — 1 000 000 ₽", color: "#a855f7" },
  { icon: "Calendar", title: "Срок займа", value: "до 36 месяцев", color: "#06b6d4" },
  { icon: "Percent", title: "Ставка", value: "от 12% в месяц", color: "#22c55e" },
  { icon: "Clock", title: "Решение", value: "в течение 2 часов", color: "#f59e0b" },
];

const DOCS = [
  { icon: "BookUser", title: "Паспорт", desc: "Паспорт гражданина РФ" },
  { icon: "FileText", title: "СТС", desc: "Свидетельство о регистрации ТС" },
  { icon: "ScrollText", title: "ПТС", desc: "Паспорт транспортного средства" },
];

const CAR_REQS = [
  {
    icon: "Globe",
    title: "Иностранное производство",
    value: "не старше 10 лет",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.3)",
    examples: "Toyota, BMW, Volkswagen, Hyundai...",
  },
  {
    icon: "Flag",
    title: "Отечественное производство",
    value: "не старше 5 лет",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.3)",
    examples: "LADA, УАЗ, ГАЗ, Москвич...",
  },
];

const HOW_STEPS = [
  { num: "01", title: "Оставьте заявку", desc: "Заполните онлайн-анкету — займёт 5 минут" },
  { num: "02", title: "Оценка автомобиля", desc: "Наш специалист оценит ваш автомобиль и подберёт условия" },
  { num: "03", title: "Решение за 2 часа", desc: "Оперативно рассмотрим заявку и вынесем решение" },
  { num: "04", title: "Деньги на карту", desc: "Средства переводим в день одобрения на вашу карту" },
];

export default function CarLoanPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen font-golos" style={{ background: "#0F0A1E" }}>
      <Navbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} scrollTo={scrollTo} />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Фоновые блики */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-20 left-[-100px] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />
          <div className="absolute bottom-0 right-[-50px] w-[400px] h-[400px] rounded-full opacity-15 blur-3xl"
            style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(ellipse, #06b6d4, transparent)" }} />
        </div>

        {/* Сетка-фон */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="max-w-7xl mx-auto px-4 py-20 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
                style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "#fbbf24" }}>
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Займы под залог автомобиля
              </div>

              <h1 className="font-oswald text-5xl md:text-7xl font-bold leading-tight text-white mb-6">
                ДЕНЬГИ ПОД<br />
                <span style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  ЗАЛОГ АВТО
                </span>
              </h1>

              <p className="text-white/60 text-lg mb-8 leading-relaxed max-w-lg">
                До <strong className="text-white">1 000 000 ₽</strong> на срок до <strong className="text-white">36 месяцев</strong>. Решение принимается в течение <strong className="text-white">2 часов</strong>. Автомобиль остаётся у вас!
              </p>

              {/* Ключевые цифры */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { v: "1 млн ₽", l: "максимум" },
                  { v: "36 мес", l: "срок" },
                  { v: "2 часа", l: "решение" },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl p-4 text-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="font-oswald text-2xl font-bold mb-1"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {s.v}
                    </div>
                    <div className="text-white/40 text-xs">{s.l}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate("/car-loan/apply")}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  boxShadow: "0 0 40px rgba(245,158,11,0.4), 0 0 80px rgba(239,68,68,0.2)",
                }}>
                <Icon name="Car" size={22} />
                Оформить займ под залог авто
                <Icon name="ArrowRight" size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Правая колонка — карточка условий */}
            <div className="relative">
              <div className="rounded-3xl p-8 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(239,68,68,0.08), rgba(168,85,247,0.1))",
                  border: "1px solid rgba(245,158,11,0.3)",
                  boxShadow: "0 0 60px rgba(245,158,11,0.15)",
                }}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-20 blur-2xl pointer-events-none"
                  style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                    <Icon name="Car" size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">Займ под залог авто</div>
                    <div className="text-white/40 text-sm">FINANS 24</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {CONDITIONS.map((c) => (
                    <div key={c.title} className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${c.color}22` }}>
                          <Icon name={c.icon} size={16} style={{ color: c.color }} />
                        </div>
                        <span className="text-white/60 text-sm">{c.title}</span>
                      </div>
                      <span className="font-bold text-sm text-right" style={{ color: c.color }}>{c.value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate("/car-loan/apply")}
                  className="w-full mt-6 py-4 rounded-2xl font-bold text-white text-center transition-all"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                    boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
                  }}>
                  Получить деньги →
                </button>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 glass px-5 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Icon name="ShieldCheck" size={18} className="text-green-400" />
                  <div>
                    <div className="text-white text-sm font-semibold">Авто остаётся у вас</div>
                    <div className="text-white/40 text-xs">Продолжаете пользоваться</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ТРЕБОВАНИЯ К АВТО */}
      <section className="py-20 px-4" style={{ background: "rgba(245,158,11,0.03)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}>
              Требования к автомобилю
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white">
              КАКОЙ АВТО <span style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ПОДОЙДЁТ</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {CAR_REQS.map((r) => (
              <div key={r.title} className="rounded-3xl p-8 relative overflow-hidden"
                style={{ background: r.bg, border: `1px solid ${r.border}` }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${r.color}, transparent)` }} />
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: `${r.color}22`, border: `1px solid ${r.color}44` }}>
                  <Icon name={r.icon} size={26} style={{ color: r.color }} />
                </div>
                <h3 className="font-oswald text-2xl font-bold text-white mb-2">{r.title}</h3>
                <div className="font-bold text-3xl mb-3" style={{ color: r.color }}>{r.value}</div>
                <p className="text-white/40 text-sm">{r.examples}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-5 flex items-start gap-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "rgba(245,158,11,0.2)" }}>
              <Icon name="Info" size={18} className="text-yellow-400" />
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Дополнительные условия</div>
              <div className="text-white/50 text-sm leading-relaxed">
                Автомобиль не должен быть в залоге у других кредиторов, под арестом или в угоне. Право собственности должно принадлежать заёмщику.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ДОКУМЕНТЫ */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-purple-300 text-sm mb-4">Документы</div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white">
              МИНИМУМ <span className="gradient-text">ДОКУМЕНТОВ</span>
            </h2>
            <p className="text-white/40 mt-3">Всего 3 документа — и деньги уже у вас</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {DOCS.map((d, i) => (
              <div key={d.title} className="glass card-hover rounded-3xl p-7 text-center relative overflow-hidden">
                <div className="absolute top-3 right-4 font-oswald text-6xl font-bold opacity-5 text-white">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.15))", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <Icon name={d.icon} size={28} className="text-yellow-400" />
                </div>
                <h3 className="font-oswald text-2xl font-bold text-white mb-2">{d.title}</h3>
                <p className="text-white/50 text-sm">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* КАК РАБОТАЕТ */}
      <section className="py-20 px-4" style={{ background: "rgba(124,58,237,0.05)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-purple-300 text-sm mb-4">Как получить</div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white">
              4 ПРОСТЫХ <span className="gradient-text">ШАГА</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mb-10">
            {HOW_STEPS.map((s) => (
              <div key={s.num} className="glass rounded-2xl p-6 flex gap-5 items-start card-hover">
                <div className="step-number shrink-0">{s.num}</div>
                <div>
                  <div className="text-white font-bold text-lg mb-1">{s.title}</div>
                  <div className="text-white/50 text-sm leading-relaxed">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="rounded-3xl p-8 md:p-12 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1), rgba(168,85,247,0.15))",
              border: "1px solid rgba(245,158,11,0.3)",
            }}>
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-[-50px] left-[-50px] w-64 h-64 rounded-full opacity-20 blur-3xl"
                style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />
              <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 rounded-full opacity-20 blur-3xl"
                style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mx-auto mb-6"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", boxShadow: "0 0 40px rgba(245,158,11,0.4)" }}>
                <Icon name="Car" size={36} className="text-white" />
              </div>
              <h3 className="font-oswald text-3xl md:text-4xl font-bold text-white mb-4">
                ГОТОВЫ ПОЛУЧИТЬ ДЕНЬГИ?
              </h3>
              <p className="text-white/50 mb-8 max-w-md mx-auto">
                Оставьте заявку прямо сейчас — наш специалист свяжется с вами в течение 15 минут
              </p>
              <button
                onClick={() => navigate("/car-loan/apply")}
                className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-xl text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  boxShadow: "0 0 50px rgba(245,158,11,0.5), 0 0 100px rgba(239,68,68,0.3)",
                }}>
                <Icon name="Car" size={24} />
                Оформить займ под залог авто
                <Icon name="ArrowRight" size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}