import { useState } from "react";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/29f70c88-f1f7-4926-9c65-c642fd11fdfb";

const HERO_IMAGE = "https://cdn.poehali.dev/projects/90d9ac81-f75d-4f07-a891-12ef6edb872c/files/ce73ebf4-d796-4671-bf2d-ce095688b5fb.jpg";

const NAV_LINKS = [
  { label: "Главная", href: "#home" },
  { label: "О компании", href: "#about" },
  { label: "Услуги", href: "#services" },
  { label: "Калькулятор", href: "#calc" },
  { label: "Контакты", href: "#contacts" },
  { label: "FAQ", href: "#faq" },
];

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

const FAQ_ITEMS = [
  {
    q: "Какие документы нужны для получения займа?",
    a: "Для оформления экспресс-займа достаточно паспорта гражданина РФ. Для крупных сумм может потребоваться дополнительный документ, подтверждающий доход.",
  },
  {
    q: "Как быстро я получу деньги?",
    a: "После одобрения заявки деньги поступают на карту в течение 15 минут. Перевод доступен круглосуточно, включая выходные и праздники.",
  },
  {
    q: "Можно ли досрочно погасить займ?",
    a: "Да, вы можете погасить займ досрочно в любое время без штрафов и комиссий. Проценты начисляются только за фактические дни пользования.",
  },
  {
    q: "Что делать, если я не могу вовремя оплатить?",
    a: "Свяжитесь с нами заранее. Мы предложим реструктуризацию или пролонгацию займа на удобных условиях. Мы всегда идём навстречу клиентам.",
  },
  {
    q: "Влияет ли кредитная история на одобрение?",
    a: "Мы рассматриваем каждую заявку индивидуально. Даже при плохой кредитной истории шанс одобрения очень высокий — до 98% заявок получают положительный ответ.",
  },
];

export default function Index() {
  const [amount, setAmount] = useState(30000);
  const [days, setDays] = useState(15);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", amount: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const rate = 0.008;
  const interest = Math.round(amount * rate * days);
  const total = amount + interest;

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setSendError("Ошибка при отправке. Попробуйте ещё раз.");
      }
    } catch {
      setSendError("Нет связи с сервером. Попробуйте позже.");
    } finally {
      setSending(false);
    }
  };

  const amountPct = ((amount - 5000) / (100000 - 5000)) * 100;
  const daysPct = ((days - 5) / (30 - 5)) * 100;

  return (
    <div className="min-h-screen font-golos" style={{ background: "#0F0A1E" }}>
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ borderBottom: "1px solid rgba(168,85,247,0.2)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center">
              <Icon name="Wallet" size={20} className="text-white" />
            </div>
            <span className="font-oswald text-xl font-bold tracking-wide text-white">
              БЫСТРО<span className="gradient-text">ЗАЙМ</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="text-sm text-white/70 hover:text-purple-300 transition-colors"
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => scrollTo("#form")}
            className="hidden md:flex btn-neon text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            Получить займ
          </button>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Icon name={mobileOpen ? "X" : "Menu"} size={24} />
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden glass border-t border-purple-900/30 px-4 py-4 flex flex-col gap-3">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="text-left text-white/80 hover:text-purple-300 py-2 transition-colors"
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={() => scrollTo("#form")}
              className="btn-neon text-white font-semibold py-3 rounded-xl mt-2"
            >
              Получить займ
            </button>
          </div>
        )}
      </nav>

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

      {/* CALCULATOR */}
      <section id="calc" className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-purple-300 text-sm mb-4">
              Калькулятор
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white">
              РАССЧИТАЙТЕ <span className="gradient-text">ЗАЙМ</span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="glass rounded-3xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-10">
                  <div>
                    <div className="flex justify-between mb-3">
                      <span className="text-white/60">Сумма займа</span>
                      <span className="font-oswald text-2xl font-bold gradient-text">
                        {amount.toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5000}
                      max={100000}
                      step={1000}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="slider-custom w-full"
                      style={{
                        background: `linear-gradient(to right, #7C3AED ${amountPct}%, rgba(124,58,237,0.2) ${amountPct}%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-white/30 mt-1">
                      <span>5 000 ₽</span>
                      <span>100 000 ₽</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-3">
                      <span className="text-white/60">Срок займа</span>
                      <span className="font-oswald text-2xl font-bold gradient-text">{days} дней</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={30}
                      step={1}
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="slider-custom w-full"
                      style={{
                        background: `linear-gradient(to right, #7C3AED ${daysPct}%, rgba(124,58,237,0.2) ${daysPct}%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-white/30 mt-1">
                      <span>5 дней</span>
                      <span>30 дней</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="glass-light rounded-2xl p-6 space-y-1">
                    <div className="flex justify-between py-3 border-b border-white/10">
                      <span className="text-white/60">Сумма займа</span>
                      <span className="text-white font-semibold">{amount.toLocaleString("ru-RU")} ₽</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-white/10">
                      <span className="text-white/60">Проценты ({days} дн.)</span>
                      <span className="text-yellow-400 font-semibold">{interest.toLocaleString("ru-RU")} ₽</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-white/10">
                      <span className="text-white/60">Ставка</span>
                      <span className="text-white font-semibold">0.8% в день</span>
                    </div>
                    <div className="flex justify-between py-3">
                      <span className="text-white font-semibold">Итого к возврату</span>
                      <span className="font-oswald text-2xl font-bold gradient-text">
                        {total.toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => document.querySelector("#form")?.scrollIntoView({ behavior: "smooth" })}
                    className="btn-neon text-white font-bold py-4 rounded-2xl mt-6 text-lg"
                  >
                    Оформить {amount.toLocaleString("ru-RU")} ₽
                  </button>

                  <p className="text-white/30 text-xs text-center mt-3">
                    Расчёт является предварительным
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section id="form" className="py-24" style={{ background: "rgba(124,58,237,0.05)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block glass px-4 py-1.5 rounded-full text-purple-300 text-sm mb-4">
                Быстрая заявка
              </div>
              <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white mb-6">
                ПОЛУЧИТЕ ДЕНЬГИ <span className="gradient-text">СЕГОДНЯ</span>
              </h2>
              <p className="text-white/60 mb-8 leading-relaxed">
                Заполните короткую форму — и мы перезвоним вам в течение 15 минут. Без очередей, без лишних бумаг.
              </p>
              <div className="space-y-4">
                {[
                  { icon: "Shield", text: "Ваши данные надёжно защищены" },
                  { icon: "Clock", text: "Ответ в течение 15 минут" },
                  { icon: "CreditCard", text: "Перевод на любую карту" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0">
                      <Icon name={f.icon} size={16} className="text-purple-400" />
                    </div>
                    <span className="text-white/70 text-sm">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-3xl p-8">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Icon name="CheckCircle" size={40} className="text-green-400" />
                  </div>
                  <h3 className="font-oswald text-2xl font-bold text-white mb-2">Заявка отправлена!</h3>
                  <p className="text-white/60">Наш специалист свяжется с вами в течение 15 минут</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Ваше имя</label>
                    <input
                      type="text"
                      placeholder="Иван Иванов"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    />
                  </div>
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Телефон</label>
                    <input
                      type="tel"
                      placeholder="+7 (900) 000-00-00"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                      className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    />
                  </div>
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Email</label>
                    <input
                      type="email"
                      placeholder="ivan@mail.ru"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    />
                  </div>
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Желаемая сумма</label>
                    <select
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                      className="w-full rounded-xl px-4 py-3.5 text-white outline-none border border-white/10 focus:border-purple-500 transition-colors"
                      style={{ background: "#1A1035" }}
                    >
                      <option value="">Выберите сумму</option>
                      <option value="10000">До 10 000 ₽</option>
                      <option value="30000">До 30 000 ₽</option>
                      <option value="50000">До 50 000 ₽</option>
                      <option value="100000">До 100 000 ₽</option>
                      <option value="500000">До 500 000 ₽</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full btn-neon text-white font-bold py-4 rounded-2xl text-lg mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {sending ? "Отправляем..." : "Отправить заявку"}
                  </button>
                  {sendError && (
                    <p className="text-red-400 text-sm text-center">{sendError}</p>
                  )}
                  <p className="text-white/30 text-xs text-center">
                    Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-purple-300 text-sm mb-4">
              FAQ
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white">
              ЧАСТЫЕ <span className="gradient-text">ВОПРОСЫ</span>
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="glass card-hover rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-6 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-white font-semibold pr-4">{item.q}</span>
                  <div
                    className="shrink-0 w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center transition-transform duration-300"
                    style={{ transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)" }}
                  >
                    <Icon name="Plus" size={16} className="text-purple-400" />
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-white/60 leading-relaxed border-t border-white/5 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTS */}
      <section id="contacts" className="py-24" style={{ background: "rgba(124,58,237,0.05)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-purple-300 text-sm mb-4">
              Контакты
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white">
              МЫ ВСЕГДА <span className="gradient-text">НА СВЯЗИ</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { icon: "Phone", title: "Телефон", value: "+7 (495) 663-51-24", sub: "Бесплатно, круглосуточно", href: "tel:+74956635124" },
              { icon: "Mail", title: "Email", value: "info@bystrozaim.ru", sub: "Ответим в течение 1 часа", href: "mailto:info@bystrozaim.ru" },
              { icon: "MapPin", title: "Офис", value: "Москва, Проспект Мира, 112", sub: "Пн–Пт: 9:00–20:00", href: null },
            ].map((c) => (
              <div key={c.title} className="glass card-hover rounded-2xl p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-600/20 flex items-center justify-center">
                  <Icon name={c.icon} size={24} className="text-purple-400" />
                </div>
                <div className="text-white/50 text-sm mb-2">{c.title}</div>
                {c.href ? (
                  <a href={c.href} className="text-white font-bold text-lg mb-1 hover:text-purple-300 transition-colors block">
                    {c.value}
                  </a>
                ) : (
                  <div className="text-white font-bold text-lg mb-1">{c.value}</div>
                )}
                <div className="text-white/40 text-sm">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Карта */}
          <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(168,85,247,0.2)", height: 360 }}>
            <iframe
              src="https://yandex.ru/map-widget/v1/?ll=37.641%2C55.820&z=16&pt=37.641%2C55.820~Москва%2C+Проспект+Мира%2C+112&text=Москва%2C+Проспект+Мира%2C+112"
              width="100%"
              height="360"
              frameBorder="0"
              allowFullScreen
              title="Карта офиса БыстроЗайм"
              style={{ display: "block" }}
            />
          </div>

          <div className="mt-5 flex items-center gap-3 glass rounded-2xl px-6 py-4 w-fit">
            <Icon name="Navigation" size={18} className="text-purple-400 shrink-0" />
            <span className="text-white/70 text-sm">
              <span className="text-white font-semibold">Москва, Проспект Мира, д. 112</span>
              {" "}· метро Алексеевская / Рижская
            </span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-purple-900/30">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg btn-neon flex items-center justify-center">
              <Icon name="Wallet" size={16} className="text-white" />
            </div>
            <span className="font-oswald text-lg font-bold text-white">
              БЫСТРО<span className="gradient-text">ЗАЙМ</span>
            </span>
          </div>
          <div className="text-white/30 text-sm text-center">
            © 2024 БыстроЗайм. Лицензия ЦБ РФ. Все права защищены.
          </div>
          <div className="flex gap-4">
            {["Политика", "Условия", "Реквизиты"].map((l) => (
              <button key={l} className="text-white/40 hover:text-purple-300 text-sm transition-colors">
                {l}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}