import { memo } from "react";
import Icon from "@/components/ui/icon";

const REVIEWS = [
  {
    name: "Марина Соколова",
    city: "Москва",
    date: "2 недели назад",
    rating: 5,
    text: "Оформила займ прямо перед праздниками — деньги пришли на карту буквально за 12 минут. Никаких скрытых комиссий, всё как обещали. Очень удобно, что можно погасить досрочно без штрафов.",
    initials: "МС",
  },
  {
    name: "Дмитрий Волков",
    city: "Санкт-Петербург",
    date: "3 недели назад",
    rating: 5,
    text: "Обращался по программе «Кредитный Доктор» — история подпорчена, но одобрили сразу. Менеджер всё подробно объяснил по телефону, договор прозрачный. Спасибо, что идёте навстречу!",
    initials: "ДВ",
  },
  {
    name: "Елена Кузнецова",
    city: "Казань",
    date: "1 месяц назад",
    rating: 5,
    text: "Пользуюсь уже третий раз — всегда быстро и без лишних вопросов. Оформление заняло меньше 5 минут, только паспорт понадобился. Поддержка отвечает круглосуточно, проверено ночью в 2 часа.",
    initials: "ЕК",
  },
  {
    name: "Игорь Петренко",
    city: "Новосибирск",
    date: "1 месяц назад",
    rating: 5,
    text: "Брал займ под залог авто на ремонт бизнеса. Решение приняли за два часа, ставка оказалась ниже, чем в банке предлагали. Отдельное спасибо за человеческое отношение и гибкий график платежей.",
    initials: "ИП",
  },
  {
    name: "Анастасия Романова",
    city: "Екатеринбург",
    date: "2 месяца назад",
    rating: 5,
    text: "Была скептически настроена, но всё прошло гладко: заявка, звонок, деньги на карте. Пользовалась картой РУСФИНАНС 24 для покупок — лимит хороший, проценты понятные, без сюрпризов в конце месяца.",
    initials: "АР",
  },
  {
    name: "Сергей Никитин",
    city: "Краснодар",
    date: "2 месяца назад",
    rating: 5,
    text: "Оформлял займ на товары в интернет-магазине — деньги перевели напрямую продавцу, мне осталось только забрать покупку. Быстро, удобно и никакой беготни с документами.",
    initials: "СН",
  },
];

const SUMMARY = [
  { icon: "Star", value: "4.9", label: "средняя оценка" },
  { icon: "Users", value: "50 000+", label: "клиентов оставили отзыв" },
  { icon: "ThumbsUp", value: "98%", label: "рекомендуют нас друзьям" },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon
          key={i}
          name="Star"
          size={15}
          className={i < count ? "text-emerald-500 fill-emerald-500" : "text-emerald-100 fill-emerald-100"}
        />
      ))}
    </div>
  );
}

function Testimonials() {
  return (
    <section id="reviews" className="py-24" style={{ background: "rgba(16,185,129,0.04)" }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <div className="inline-block glass px-4 py-1.5 rounded-full text-emerald-600 text-sm mb-4">
            Отзывы клиентов
          </div>
          <h2 className="font-oswald text-4xl md:text-5xl font-bold text-emerald-950">
            НАМ ДОВЕРЯЮТ <span className="gradient-text">ТЫСЯЧИ КЛИЕНТОВ</span>
          </h2>
          <p className="text-emerald-950/50 mt-4 max-w-xl mx-auto">
            Реальные истории людей, которые уже получили деньги быстро и без лишних сложностей
          </p>
        </div>

        {/* Сводная статистика */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-14 max-w-3xl mx-auto">
          {SUMMARY.map((s) => (
            <div key={s.label} className="glass card-hover rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-600/10 flex items-center justify-center">
                <Icon name={s.icon} size={22} className="text-emerald-600" />
              </div>
              <div className="font-oswald text-3xl font-bold gradient-text mb-1">{s.value}</div>
              <div className="text-emerald-950/50 text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Карточки отзывов */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {REVIEWS.map((r) => (
            <div key={r.name} className="glass card-hover rounded-3xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <Stars count={r.rating} />
                <Icon name="Quote" size={22} className="text-emerald-200" />
              </div>
              <p className="text-emerald-950/70 text-sm leading-relaxed mb-6 flex-1">
                {r.text}
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-emerald-900/10">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-oswald font-bold text-white text-sm"
                  style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)" }}
                >
                  {r.initials}
                </div>
                <div>
                  <div className="text-emerald-950 font-semibold text-sm">{r.name}</div>
                  <div className="text-emerald-950/40 text-xs">{r.city} · {r.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(Testimonials);
