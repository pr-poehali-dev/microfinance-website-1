import Icon from "@/components/ui/icon";

const HERO_IMAGE = "https://cdn.poehali.dev/projects/90d9ac81-f75d-4f07-a891-12ef6edb872c/files/ce73ebf4-d796-4671-bf2d-ce095688b5fb.jpg";

const SERVICES = [
  {
    icon: "Zap",
    title: "Экспресс-кредит",
    desc: "До 30 000 ₽ за 15 минут. Минимум документов, решение онлайн.",
    badge: "Популярно",
    rate: "от 0.8%/день",
    term: "до 30 дней",
    color: "from-purple-600 to-violet-700",
  },
  {
    icon: "TrendingUp",
    title: "Стандартный займ",
    desc: "До 100 000 ₽ на выгодных условиях. Гибкий график платежей.",
    badge: "Выгодно",
    rate: "от 0.5%/день",
    term: "до 6 месяцев",
    color: "from-cyan-600 to-blue-700",
  },
  {
    icon: "Shield",
    title: "Займ под залог",
    desc: "До 500 000 ₽ под залог имущества. Самая низкая ставка.",
    badge: "Максимум",
    rate: "от 0.2%/день",
    term: "до 24 месяцев",
    color: "from-emerald-600 to-teal-700",
  },
];

const ADVANTAGES = [
  { icon: "Clock", value: "15 мин", label: "время одобрения" },
  { icon: "Users", value: "50 000+", label: "клиентов доверяют нам" },
  { icon: "Percent", value: "98%", label: "одобрение заявок" },
  { icon: "Star", value: "4.9", label: "рейтинг на картах" },
];

const STEPS = [
  { num: "01", title: "Оставьте заявку", desc: "Заполните короткую форму онлайн — займёт 2 минуты" },
  { num: "02", title: "Получите решение", desc: "Наш специалист свяжется с вами в течение 15 минут" },
  { num: "03", title: "Получите деньги", desc: "Переведём на карту или выдадим наличными в офисе" },
];

interface HeroAboutServicesProps {
  scrollTo: (href: string) => void;
}

export default function HeroAboutServices({ scrollTo }: HeroAboutServicesProps) {
  return (
    <>
      {/* HERO */}
      <section id="home" className="hero-bg min-h-screen flex items-center pt-20 relative overflow-hidden">
        <div
          className="absolute top-20 right-10 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #A855F7, transparent)" }}
        />
        <div
          className="absolute bottom-20 left-10 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #06B6D4, transparent)" }}
        />

        <div className="max-w-7xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-purple-300 mb-6">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Одобряем 98% заявок · Онлайн 24/7
            </div>

            <h1 className="font-oswald text-5xl md:text-7xl font-bold leading-tight text-white mb-6">
              ДЕНЬГИ<br />
              <span className="gradient-text">ЗА 15 МИНУТ</span>
            </h1>

            <p className="text-white/60 text-lg mb-8 leading-relaxed max-w-md">
              Быстрые займы без лишних документов. От 5 000 до 500 000 ₽. Одобрение онлайн, перевод на любую карту.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => scrollTo("#form")}
                className="btn-neon text-white font-bold px-8 py-4 rounded-2xl text-lg"
              >
                Оформить займ
              </button>
              <button
                onClick={() => scrollTo("#calc")}
                className="glass text-white font-semibold px-8 py-4 rounded-2xl text-lg hover:bg-white/10 transition-all"
              >
                Рассчитать
              </button>
            </div>

            <div className="flex flex-wrap gap-6 mt-12">
              {[
                { v: "15 мин", l: "одобрение" },
                { v: "0 ₽", l: "без комиссий" },
                { v: "24/7", l: "поддержка" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-oswald text-2xl font-bold text-purple-300">{s.v}</div>
                  <div className="text-white/50 text-sm">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{ boxShadow: "0 0 60px rgba(168,85,247,0.3)" }}
            >
              <img src={HERO_IMAGE} alt="Быстрый займ" className="w-full h-96 object-cover" />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))" }}
              />
            </div>
            <div className="absolute -bottom-6 -left-6 glass px-5 py-4 rounded-2xl animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Icon name="CheckCircle" size={20} className="text-green-400" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Займ одобрен!</div>
                  <div className="text-white/50 text-xs">50 000 ₽ · только что</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ADVANTAGES */}
      <section className="py-16" style={{ background: "rgba(124,58,237,0.05)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {ADVANTAGES.map((a) => (
              <div key={a.label} className="glass card-hover rounded-2xl p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-600/20 flex items-center justify-center">
                  <Icon name={a.icon} size={22} className="text-purple-400" />
                </div>
                <div className="font-oswald text-3xl font-bold gradient-text mb-1">{a.value}</div>
                <div className="text-white/50 text-sm">{a.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block glass px-4 py-1.5 rounded-full text-purple-300 text-sm mb-4">
                О компании
              </div>
              <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white mb-6">
                МЫ ДЕЛАЕМ ЗАЙМЫ <span className="gradient-text">ПРОСТЫМИ</span>
              </h2>
              <p className="text-white/60 mb-6 leading-relaxed">
                БыстроЗайм — лицензированная микрофинансовая компания с 2012 года. За это время мы помогли более 50 000 клиентам решить финансовые вопросы быстро и без лишних сложностей.
              </p>
              <p className="text-white/60 mb-8 leading-relaxed">
                Мы верим, что доступ к деньгам должен быть простым для каждого. Именно поэтому мы упростили процесс до минимума: заявка онлайн, решение за 15 минут, деньги на карте.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "Award", text: "Лицензия ЦБ РФ" },
                  { icon: "Lock", text: "Защита данных" },
                  { icon: "HeartHandshake", text: "Ответственный займ" },
                  { icon: "BadgeCheck", text: "Прозрачные условия" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-3 glass rounded-xl p-3">
                    <Icon name={f.icon} size={18} className="text-purple-400 shrink-0" />
                    <span className="text-white/80 text-sm">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="glass rounded-3xl p-8">
                <h3 className="font-oswald text-2xl font-bold text-white mb-6">Как это работает</h3>
                <div className="flex flex-col gap-6">
                  {STEPS.map((step, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="step-number">{step.num}</div>
                      <div>
                        <div className="text-white font-semibold mb-1">{step.title}</div>
                        <div className="text-white/50 text-sm">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24" style={{ background: "rgba(124,58,237,0.05)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-purple-300 text-sm mb-4">
              Наши услуги
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white">
              ЗАЙМЫ ДЛЯ <span className="gradient-text">ЛЮБЫХ ЦЕЛЕЙ</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {SERVICES.map((s) => (
              <div key={s.title} className="glass card-hover rounded-3xl overflow-hidden">
                <div className={`bg-gradient-to-br ${s.color} p-6`}>
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Icon name={s.icon} size={24} className="text-white" />
                    </div>
                    <span className="bg-white/20 backdrop-blur text-white text-xs px-3 py-1 rounded-full font-medium">
                      {s.badge}
                    </span>
                  </div>
                  <h3 className="font-oswald text-2xl font-bold text-white mt-4">{s.title}</h3>
                </div>
                <div className="p-6">
                  <p className="text-white/60 text-sm mb-5 leading-relaxed">{s.desc}</p>
                  <div className="flex justify-between mb-5">
                    <div>
                      <div className="text-white/40 text-xs mb-1">Ставка</div>
                      <div className="text-purple-300 font-bold">{s.rate}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/40 text-xs mb-1">Срок</div>
                      <div className="text-purple-300 font-bold">{s.term}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => document.querySelector("#form")?.scrollIntoView({ behavior: "smooth" })}
                    className="w-full btn-neon text-white font-semibold py-3 rounded-xl"
                  >
                    Оформить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
