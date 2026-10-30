import { useState } from "react";
import Icon from "@/components/ui/icon";
import OfferDialog from "@/components/OfferDialog";
import TermsDialog from "@/components/TermsDialog";
import PrivacyDialog from "@/components/PrivacyDialog";

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
  const [offerOpen, setOfferOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-emerald-600 text-sm mb-4">
              FAQ
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-emerald-950">
              ЧАСТЫЕ <span className="gradient-text">ВОПРОСЫ</span>
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="glass card-hover rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 sm:p-6 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-emerald-950 font-semibold pr-4">{item.q}</span>
                  <div
                    className="shrink-0 w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center transition-transform duration-300"
                    style={{ transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)" }}
                  >
                    <Icon name="Plus" size={16} className="text-emerald-600" />
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-4 sm:px-6 pb-6 text-emerald-950/60 leading-relaxed border-t border-emerald-900/10 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTS */}
      <section id="contacts" className="py-24" style={{ background: "rgba(16,185,129,0.04)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-block glass px-4 py-1.5 rounded-full text-emerald-600 text-sm mb-4">
              Контакты
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl font-bold text-emerald-950">
              МЫ ВСЕГДА <span className="gradient-text">НА СВЯЗИ</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { icon: "Phone", title: "Телефон", value: "8-499-394-70-22", sub: "Бесплатно, круглосуточно", href: "tel:+74993947022" },
              { icon: "Mail", title: "Email", value: "support@rusfinans24.ru", sub: "Ответим в течение часа", href: "mailto:support@rusfinans24.ru" },
              { icon: "Clock", title: "Режим работы", value: "Круглосуточно", sub: "Онлайн: 24/7", href: null },
            ].map((c) => (
              <div key={c.title} className="glass card-hover rounded-2xl p-4 sm:p-6 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-600/10 flex items-center justify-center">
                  <Icon name={c.icon} size={24} className="text-emerald-600" />
                </div>
                <div className="text-emerald-950/50 text-sm mb-2">{c.title}</div>
                {c.href ? (
                  <a href={c.href} className="text-emerald-950 font-bold text-lg mb-1 hover:text-emerald-600 transition-colors block">
                    {c.value}
                  </a>
                ) : (
                  <div className="text-emerald-950 font-bold text-lg mb-1">{c.value}</div>
                )}
                <div className="text-emerald-950/40 text-sm">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Карта */}
          <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.15)", height: 360 }}>
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

          <div className="mt-5 flex items-center gap-3 glass rounded-2xl px-4 sm:px-6 py-4 w-fit">
            <Icon name="Navigation" size={18} className="text-emerald-600 shrink-0" />
            <span className="text-emerald-950/70 text-sm">
              <span className="text-emerald-950 font-semibold">Москва, Проспект Мира, д. 112</span>
              {" "}· метро Алексеевская / Рижская
            </span>
          </div>
        </div>
      </section>

      {/* ДИСКЛЕЙМЕР ЧАСТНЫЙ ИНВЕСТОР */}
      <section className="border-t border-emerald-900/10" style={{ background: "rgba(16,185,129,0.03)" }}>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ background: "rgba(16,185,129,0.12)", color: "#059669", border: "1px solid rgba(16,185,129,0.25)" }}>
            Частный инвестор
          </div>
          <p className="text-emerald-950/50 text-sm leading-relaxed">
            Займы выдаются частными инвесторами, которые самостоятельно принимают решение о выдаче суммы займа, сроке и процентной ставке. Перед подписанием договора внимательно ознакомьтесь с условиями займа. Займы выдаются на банковскую карту партнёра.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-emerald-900/10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="Русфинанс 24" className="w-8 h-8 rounded-lg" />
            <span className="font-oswald text-lg font-bold text-emerald-950">
              <span className="gradient-text">РУСФИНАНС24</span>
            </span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-6">
              {["Политика", "Условия"].map((l) => (
                <button key={l} onClick={l === "Условия" ? () => setTermsOpen(true) : () => setPrivacyOpen(true)} className="text-emerald-950/50 hover:text-emerald-600 text-sm transition-colors">
                  {l}
                </button>
              ))}
              <button onClick={() => setOfferOpen(true)} className="text-emerald-950/50 hover:text-emerald-600 text-sm transition-colors">
                Оферта
              </button>
            </div>
            <div className="text-emerald-950/30 text-sm text-center">
              © 2026 РУСФИНАНС 24. Все права защищены.
            </div>
          </div>
          <div className="max-w-4xl w-full border-t border-emerald-900/10 pt-6 text-emerald-950/50 text-xs leading-relaxed space-y-2 text-center sm:text-left">
            <p className="font-semibold text-emerald-950/70">Сервис не является кредитной организацией и не выдаёт займы от своего имени — условия сделки определяют участники. Переходя по ссылкам на сторонние ресурсы, вы действуете на свой риск.</p>
            <p>Адрес: Город Москва, Проспект Мира д. 112</p>
            <p>Выдача займов у партнеров осуществляется гражданам Российской Федерации старше 18 лет в российских рублях на банковский счет, наличными или на карту. Сервис не относится к финансовым учреждениям, не является кредитором или банком и не несет ответственности за заключенные впоследствии клиентами и партнерами договоры кредитования.</p>
            <p>*Займы без % доступны в формате промоакции для новых заемщиков при наличии хорошего кредитного рейтинга, условия займа не гарантированы.</p>
            <p>Доступные суммы займов: от 1 000 рублей до 200 000 рублей, диапазон значений ПСК: от 0% до 292% годовых. Полные условия договора займа доступны в личном кабинете.</p>
            <p>По любым вопросам вы можете связаться со специалистами сервиса по электронной почте <a href="mailto:Rusfinans.24@ya.ru" className="underline hover:text-emerald-600">Rusfinans.24@ya.ru</a>, или по телефону <a href="tel:+74993947022" className="underline hover:text-emerald-600">8-499-394-70-22</a></p>
            <p>Режим работы службы поддержки: 08:00 - 21:00 по Мск, без выходных.</p>
          </div>
        </div>
      </footer>
      <OfferDialog open={offerOpen} onOpenChange={setOfferOpen} />
      <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} />
      <PrivacyDialog open={privacyOpen} onOpenChange={setPrivacyOpen} />
    </>
  );
}