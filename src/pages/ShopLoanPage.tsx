import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Icon from "@/components/ui/icon";
import Navbar from "@/components/Navbar";

const CONDITIONS = [
  { icon: "Banknote",  title: "Сумма займа",  value: "3 000 — 150 000 ₽",  color: "#a855f7" },
  { icon: "Calendar",  title: "Срок займа",   value: "от 1 до 24 месяцев",  color: "#06b6d4" },
  { icon: "Percent",   title: "Ставка",        value: "от 9% в месяц",       color: "#22c55e" },
  { icon: "Clock",     title: "Решение",       value: "от 1 мин до 1 часа",  color: "#f59e0b" },
];

const DOCS = [
  { icon: "BookUser",  title: "Паспорт",  desc: "Главная страница + прописка + селфи" },
  { icon: "CreditCard", title: "СНИЛС",   desc: "Страховой номер индивидуального лицевого счёта" },
];

const PARTNERS = [
  { name: "Wildberries", emoji: "🛍️" },
  { name: "Ozon",        emoji: "📦" },
  { name: "М.Видео",     emoji: "📺" },
  { name: "Эльдорадо",   emoji: "🏪" },
  { name: "DNS",         emoji: "💻" },
  { name: "Яндекс Маркет", emoji: "🛒" },
  { name: "Любой магазин", emoji: "✨" },
];

const HOW = [
  { num: "01", icon: "ShoppingBag", title: "Выбираете товар",     desc: "Находите нужный товар в магазинах наших партнёров" },
  { num: "02", icon: "FileText",    title: "Подаёте заявку",       desc: "Заполняете анкету онлайн — паспорт и СНИЛС" },
  { num: "03", icon: "Clock",       title: "Решение за минуты",    desc: "Рассматриваем заявку от 1 минуты до 1 часа" },
  { num: "04", icon: "Store",       title: "Деньги идут в магазин", desc: "Переводим сумму напрямую продавцу — вам ничего делать не надо" },
  { num: "05", icon: "Gift",        title: "Радуйтесь покупке!",   desc: "Получайте товар и вносите платежи в удобное время" },
];

const ADVANTAGES = [
  { icon: "ShieldCheck",  title: "Только паспорт и СНИЛС",  desc: "Минимум документов — максимум удобства" },
  { icon: "Zap",          title: "Решение за 1 минуту",     desc: "Моментальное рассмотрение без очередей" },
  { icon: "Store",        title: "Деньги — в магазин",      desc: "Вам не нужно снимать наличные и никуда ехать" },
  { icon: "Heart",        title: "Любой товар мечты",       desc: "Электроника, мебель, одежда — всё что угодно" },
];

export default function ShopLoanPage() {
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

      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Фоновые блики */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-[-80px] w-[500px] h-[500px] rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
          <div className="absolute bottom-0 right-[-60px] w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[200px] rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(ellipse, #22c55e, transparent)" }} />
        </div>
        {/* Сетка */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.15) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Левая колонка */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
                style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.4)", color: "#d8b4fe" }}>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                Займ на покупку товаров онлайн
              </div>

              <h1 className="font-oswald text-5xl md:text-7xl font-bold leading-tight text-white mb-6">
                КУПИ МЕЧТУ<br />
                <span style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4,#22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  СЕЙЧАС
                </span>
              </h1>

              <p className="text-white/60 text-lg mb-8 leading-relaxed max-w-lg">
                Одобрим займ на покупку вашей мечты за несколько минут. Выбираете товар — <strong className="text-white">деньги мы переведём в магазин сами</strong>. Вам остаётся только радоваться покупке!
              </p>

              {/* Ключевые цифры */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { v: "150 тыс ₽", l: "максимум" },
                  { v: "24 мес",    l: "срок" },
                  { v: "от 1 мин",  l: "решение" },
                ].map(st => (
                  <div key={st.l} className="rounded-2xl p-4 text-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="font-oswald text-xl font-bold mb-1"
                      style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {st.v}
                    </div>
                    <div className="text-white/40 text-xs">{st.l}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => navigate("/shop-loan/apply")}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-white transition-all"
                style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)", boxShadow: "0 0 40px rgba(168,85,247,0.4),0 0 80px rgba(6,182,212,0.2)" }}>
                <Icon name="ShoppingBag" size={22} />
                Оформить займ на товар
                <Icon name="ArrowRight" size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Правая колонка — карточка условий */}
            <div className="relative">
              <div className="rounded-3xl p-8 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.12),rgba(6,182,212,0.08),rgba(34,197,94,0.08))", border: "1px solid rgba(168,85,247,0.3)", boxShadow: "0 0 60px rgba(168,85,247,0.15)" }}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-20 blur-2xl pointer-events-none"
                  style={{ background: "radial-gradient(circle,#a855f7,transparent)" }} />

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)" }}>
                    <Icon name="ShoppingCart" size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">Займ на товары</div>
                    <div className="text-white/40 text-sm">PARAFINANS</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {CONDITIONS.map(c => (
                    <div key={c.title} className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${c.color}22` }}>
                          <Icon name={c.icon} size={16} style={{ color: c.color }} />
                        </div>
                        <span className="text-white/60 text-sm">{c.title}</span>
                      </div>
                      <span className="font-bold text-sm" style={{ color: c.color }}>{c.value}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => navigate("/shop-loan/apply")}
                  className="w-full mt-6 py-4 rounded-2xl font-bold text-white text-center"
                  style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)", boxShadow: "0 4px 20px rgba(168,85,247,0.3)" }}>
                  Получить деньги →
                </button>
              </div>

              <div className="absolute -bottom-4 -right-4 glass px-5 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Icon name="ShieldCheck" size={18} className="text-green-400" />
                  <div>
                    <div className="text-white text-sm font-semibold">Деньги — прямо в магазин</div>
                    <div className="text-white/40 text-xs">Без наличных и поездок</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ КАК ЭТО РАБОТАЕТ ═══════════════════════════════════════════════ */}
      <section className="py-24 px-4" style={{ background: "rgba(168,85,247,0.04)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#d8b4fe" }}>
              Как это работает
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white">
              5 ПРОСТЫХ <span className="gradient-text">ШАГОВ</span>
            </h2>
          </div>

          <div className="relative">
            {/* Линия */}
            <div className="hidden md:block absolute left-[28px] top-8 bottom-8 w-0.5"
              style={{ background: "linear-gradient(to bottom, #a855f7, #06b6d4, #22c55e)" }} />
            <div className="flex flex-col gap-5">
              {HOW.map((step, i) => {
                const colors = ["#a855f7","#7c3aed","#06b6d4","#22c55e","#f59e0b"];
                const c = colors[i];
                return (
                  <div key={step.num} className="glass card-hover rounded-2xl p-5 flex gap-5 items-start md:ml-0">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: `${c}22`, border: `1px solid ${c}44` }}>
                      <Icon name={step.icon} size={24} style={{ color: c }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-oswald text-xs font-bold" style={{ color: c }}>{step.num}</span>
                        <span className="text-white font-bold text-lg">{step.title}</span>
                      </div>
                      <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ПРЕИМУЩЕСТВА ════════════════════════════════════════════════════ */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white">
              ПОЧЕМУ <span className="gradient-text">ВЫБИРАЮТ НАС</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {ADVANTAGES.map((a, i) => {
              const colors = ["#a855f7","#06b6d4","#22c55e","#f59e0b"];
              const c = colors[i % colors.length];
              return (
                <div key={a.title} className="glass card-hover rounded-3xl p-7 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${c}, transparent)` }} />
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: `${c}22`, border: `1px solid ${c}44` }}>
                    <Icon name={a.icon} size={26} style={{ color: c }} />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{a.title}</h3>
                  <p className="text-white/50 text-sm">{a.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ ДОКУМЕНТЫ ══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4" style={{ background: "rgba(168,85,247,0.04)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white">
              ВСЕГО <span className="gradient-text">2 ДОКУМЕНТА</span>
            </h2>
            <p className="text-white/40 mt-3">Никаких справок о доходах, поручителей и залогов</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {DOCS.map((d, i) => (
              <div key={d.title} className="glass card-hover rounded-3xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-3 right-4 font-oswald text-6xl font-bold opacity-5 text-white">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.2),rgba(6,182,212,0.15))", border: "1px solid rgba(168,85,247,0.3)" }}>
                  <Icon name={d.icon} size={28} className="text-purple-400" />
                </div>
                <h3 className="font-oswald text-2xl font-bold text-white mb-2">{d.title}</h3>
                <p className="text-white/50 text-sm">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ МАГАЗИНЫ-ПАРТНЁРЫ ══════════════════════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-oswald text-4xl font-bold text-white">
              МАГАЗИНЫ <span className="gradient-text">ПАРТНЁРЫ</span>
            </h2>
            <p className="text-white/40 mt-2">Выбирайте товары в любимых магазинах</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {PARTNERS.map(p => (
              <div key={p.name} className="glass card-hover rounded-2xl px-6 py-4 flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <span className="text-white font-semibold">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl p-10 md:p-14 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.18),rgba(6,182,212,0.12),rgba(34,197,94,0.1))", border: "1px solid rgba(168,85,247,0.3)" }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-50px] left-[-50px] w-64 h-64 rounded-full opacity-20 blur-3xl"
                style={{ background: "radial-gradient(circle,#a855f7,transparent)" }} />
              <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 rounded-full opacity-20 blur-3xl"
                style={{ background: "radial-gradient(circle,#06b6d4,transparent)" }} />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mx-auto mb-6"
                style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)", boxShadow: "0 0 40px rgba(168,85,247,0.4)" }}>
                <Icon name="ShoppingBag" size={36} className="text-white" />
              </div>
              <h3 className="font-oswald text-3xl md:text-4xl font-bold text-white mb-4">
                ГОТОВЫ К ПОКУПКЕ?
              </h3>
              <p className="text-white/50 mb-8 max-w-md mx-auto leading-relaxed">
                Оставьте заявку прямо сейчас и получите решение уже через несколько минут. Ваш товар ждёт!
              </p>
              <button onClick={() => navigate("/shop-loan/apply")}
                className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-xl text-white transition-all"
                style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)", boxShadow: "0 0 50px rgba(168,85,247,0.5),0 0 100px rgba(6,182,212,0.3)" }}>
                <Icon name="ShoppingBag" size={24} />
                Оформить займ на товар
                <Icon name="ArrowRight" size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
