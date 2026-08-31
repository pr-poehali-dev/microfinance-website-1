import { useState } from "react";
import Icon from "@/components/ui/icon";

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
    a: "Мы рассматриваем каждую заявку индивидуально. Мы одобряем 100% заявок — даже при плохой кредитной истории вы получите положительный ответ.",
  },
];

export default function FaqContactsFooter() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
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
              { icon: "Phone", title: "Телефон", value: "+7-863-270-85-24", sub: "Бесплатно, круглосуточно", href: "tel:+78632708524" },
              { icon: "Mail", title: "Email", value: "investorparafinans@ya.ru", sub: "Ответим в течение часа", href: "mailto:investorparafinans@ya.ru" },
              { icon: "Clock", title: "Режим работы", value: "Круглосуточно", sub: "Онлайн: 24/7", href: null },
            ].map((c) => (
              <div key={c.title} className="glass card-hover rounded-2xl p-6 text-center">
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

      {/* ДИСКЛЕЙМЕР ЧАСТНЫЙ ИНВЕСТОР */}
      <section className="border-t border-purple-900/30" style={{ background: "rgba(124,58,237,0.04)" }}>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.25)" }}>
            Частный инвестор
          </div>
          <p className="text-white/50 text-sm leading-relaxed">
            Займы выдаются частными инвесторами, которые самостоятельно принимают решение о выдаче суммы займа, сроке и процентной ставке. Перед подписанием договора внимательно ознакомьтесь с условиями займа. Займы выдаются на банковскую карту партнёра.
          </p>
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
              <span className="gradient-text">FINANS24</span>
            </span>
          </div>
          <div className="text-white/30 text-sm text-center">
            © 2026 FINANS 24. Все права защищены.
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
    </>
  );
}