import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const BENEFITS = [
  { icon: "CreditCard", title: "Лимит до 200 000 ₽", desc: "Одобрение онлайн без посещения офиса" },
  { icon: "Percent", title: "Кэшбэк 1%", desc: "На все покупки по карте, без ограничений" },
  { icon: "Wallet", title: "Бесплатное обслуживание", desc: "0 ₽ в год при любом остатке" },
  { icon: "Zap", title: "Оформление за 15 минут", desc: "Решение онлайн, карта на любой счёт" },
  { icon: "Shield", title: "Защита покупок", desc: "Страхование транзакций и антифрод" },
  { icon: "Smartphone", title: "Управление в приложении", desc: "Переводы, лимиты, выписки онлайн" },
];

const TARIFFS = [
  { label: "Ставка", value: "от 0.2% / день" },
  { label: "Лимит", value: "5 000 – 200 000 ₽" },
  { label: "Срок", value: "до 24 месяцев" },
  { label: "Обслуживание", value: "Бесплатно" },
  { label: "Кэшбэк", value: "1% на всё" },
  { label: "Одобрение", value: "за 15 минут" },
];

const STEPS = [
  { num: "01", title: "Заполните заявку", desc: "Укажите имя, телефон и желаемый лимит" },
  { num: "02", title: "Получите решение", desc: "Проверяем данные и одобряем за 15 минут" },
  { num: "03", title: "Получите карту", desc: "Выпускаем виртуальную карту мгновенно" },
  { num: "04", title: "Пользуйтесь", desc: "Оплачивайте покупки и получайте кэшбэк" },
];

export default function CardPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", limit: "50000" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [limitVal, setLimitVal] = useState(50000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    setSubmitted(true);
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
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <Icon name="ArrowLeft" size={16} />
            На главную
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-bg pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6" style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>
            <Icon name="CreditCard" size={14} />
            Новый продукт
          </div>
          <h1 className="font-oswald text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            КАРТА <span className="gradient-text">PARAFINANS</span>
          </h1>
          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
            Кредитная карта с лимитом до 200 000 ₽, кэшбэком 1% и бесплатным обслуживанием. Оформление онлайн за 15 минут.
          </p>
          <a href="#card-form" onClick={(e) => { e.preventDefault(); document.querySelector("#card-form")?.scrollIntoView({ behavior: "smooth" }); }}
            className="btn-neon text-white font-semibold px-8 py-4 rounded-xl inline-flex items-center gap-2 text-base">
            Оформить карту
            <Icon name="ArrowRight" size={18} />
          </a>
        </div>
      </section>

      {/* ПРЕИМУЩЕСТВА */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-oswald text-4xl font-bold text-white text-center mb-3">
            Преимущества <span className="gradient-text">карты</span>
          </h2>
          <p className="text-white/50 text-center mb-12">Всё что нужно — в одной карте</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b) => (
              <div key={b.title} className="glass rounded-2xl p-6 hover:card-hover transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl btn-neon flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon name={b.icon} size={22} className="text-white" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{b.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ТАРИФЫ */}
      <section className="py-20 px-4" style={{ background: "rgba(124,58,237,0.05)" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="font-oswald text-4xl font-bold text-white text-center mb-3">
            Тарифы и <span className="gradient-text">условия</span>
          </h2>
          <p className="text-white/50 text-center mb-12">Прозрачные условия без скрытых платежей</p>
          <div className="glass rounded-2xl overflow-hidden">
            {TARIFFS.map((t, i) => (
              <div key={t.label} className="flex justify-between items-center px-6 py-4" style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderBottom: i < TARIFFS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <span className="text-white/60">{t.label}</span>
                <span className="text-white font-semibold gradient-text">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* КАК ПОЛУЧИТЬ */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-oswald text-4xl font-bold text-white text-center mb-3">
            Как <span className="gradient-text">получить</span> карту
          </h2>
          <p className="text-white/50 text-center mb-12">4 простых шага до вашей карты</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {STEPS.map((s) => (
              <div key={s.num} className="glass rounded-2xl p-6 flex gap-4 items-start">
                <div className="font-oswald text-4xl font-bold gradient-text shrink-0 leading-none">{s.num}</div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">{s.title}</h3>
                  <p className="text-white/50 text-sm">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ФОРМА */}
      <section id="card-form" className="py-20 px-4" style={{ background: "rgba(124,58,237,0.05)" }}>
        <div className="max-w-xl mx-auto">
          <h2 className="font-oswald text-4xl font-bold text-white text-center mb-3">
            Заявка на <span className="gradient-text">карту</span>
          </h2>
          <p className="text-white/50 text-center mb-10">Заполните форму — ответим за 15 минут</p>

          {submitted ? (
            <div className="glass rounded-2xl p-10 text-center">
              <div className="w-16 h-16 btn-neon rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Icon name="CheckCircle" size={32} className="text-white" />
              </div>
              <h3 className="font-oswald text-2xl text-white font-bold mb-2">Заявка принята!</h3>
              <p className="text-white/60">Наш специалист свяжется с вами в течение 15 минут по номеру <strong className="text-white">{form.phone}</strong></p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">ФИО</label>
                <input
                  type="text"
                  placeholder="Иванов Иван Иванович"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">Телефон</label>
                <input
                  type="tel"
                  placeholder="+7 (999) 000-00-00"
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
                  placeholder="example@mail.ru"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
              </div>
              <div className="rounded-2xl border border-purple-500/40 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.08))" }}>
                <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-white/10">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.4)" }}>
                    <Icon name="CreditCard" size={14} className="text-purple-300" />
                  </div>
                  <span className="text-white/80 text-sm font-medium">Желаемый лимит</span>
                </div>
                <div className="px-5 py-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-white/60 text-sm">Лимит карты</span>
                    <span className="font-bold text-base gradient-text">{limitVal.toLocaleString("ru-RU")} ₽</span>
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={200000}
                    step={5000}
                    value={limitVal}
                    onChange={(e) => { const v = Number(e.target.value); setLimitVal(v); setForm({ ...form, limit: String(v) }); }}
                    className="slider-custom w-full"
                    style={{ background: `linear-gradient(to right, #7C3AED ${((limitVal - 5000) / (200000 - 5000)) * 100}%, rgba(124,58,237,0.2) ${((limitVal - 5000) / (200000 - 5000)) * 100}%)` }}
                  />
                  <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>5 000 ₽</span>
                    <span>200 000 ₽</span>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={sending}
                className="btn-neon w-full text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-base mt-2"
              >
                {sending ? (
                  <><Icon name="Loader2" size={18} className="animate-spin" /> Отправляем...</>
                ) : (
                  <><Icon name="Send" size={18} /> Отправить заявку</>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 text-center border-t" style={{ borderColor: "rgba(168,85,247,0.15)" }}>
        <p className="text-white/30 text-sm">© 2024 PARAFINANS24 · Лицензия ЦБ РФ · Все права защищены</p>
      </footer>
    </div>
  );
}
