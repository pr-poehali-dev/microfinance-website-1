import { useState } from "react";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/29f70c88-f1f7-4926-9c65-c642fd11fdfb";

export default function CalculatorForm() {
  const [amount, setAmount] = useState(30000);
  const [days, setDays] = useState(15);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    amount: "",
    passportSeries: "",
    passportNumber: "",
    passportDate: "",
    passportCode: "",
    passportBy: "",
    birthPlace: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const rate = 0.008;
  const interest = Math.round(amount * rate * days);
  const total = amount + interest;

  const amountPct = ((amount - 5000) / (100000 - 5000)) * 100;
  const daysPct = ((days - 5) / (30 - 5)) * 100;

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

  return (
    <>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/70 text-sm mb-2 block">Серия паспорта</label>
                      <input
                        type="text"
                        placeholder="1234"
                        value={form.passportSeries}
                        onChange={(e) => setForm({ ...form, passportSeries: e.target.value })}
                        required
                        maxLength={4}
                        className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      />
                    </div>
                    <div>
                      <label className="text-white/70 text-sm mb-2 block">Номер паспорта</label>
                      <input
                        type="text"
                        placeholder="567890"
                        value={form.passportNumber}
                        onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
                        required
                        maxLength={6}
                        className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/70 text-sm mb-2 block">Дата выдачи</label>
                      <input
                        type="date"
                        value={form.passportDate}
                        onChange={(e) => setForm({ ...form, passportDate: e.target.value })}
                        required
                        className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      />
                    </div>
                    <div>
                      <label className="text-white/70 text-sm mb-2 block">Код подразделения</label>
                      <input
                        type="text"
                        placeholder="123-456"
                        value={form.passportCode}
                        onChange={(e) => setForm({ ...form, passportCode: e.target.value })}
                        required
                        className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Кем выдан</label>
                    <input
                      type="text"
                      placeholder="УМВД России по г. Москве"
                      value={form.passportBy}
                      onChange={(e) => setForm({ ...form, passportBy: e.target.value })}
                      required
                      className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    />
                  </div>
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Место рождения</label>
                    <input
                      type="text"
                      placeholder="г. Москва"
                      value={form.birthPlace}
                      onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
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
    </>
  );
}
