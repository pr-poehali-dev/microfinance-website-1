import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Navbar from "@/components/Navbar";

const inputCls = "w-full bg-transparent border rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all text-sm";
const inputStyle = { borderColor: "rgba(255,255,255,0.12)" };
const labelCls = "block text-white/60 text-sm mb-1.5 font-medium";

const API_URL = "https://functions.poehali.dev/651adde1-4432-4e5a-8086-3cda9898b7ac";

const AMOUNT_MIN = 100000;
const AMOUNT_MAX = 1000000;
const MONTHS_MIN = 1;
const MONTHS_MAX = 36;
const RATE = 0.12;

export default function CarLoanApplyPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const [loanAmount, setLoanAmount] = useState(300000);
  const [loanMonths, setLoanMonths] = useState(12);
  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", birthDate: "",
    carBrand: "", carModel: "", carYear: "", carMileage: "",
    passportSerial: "", passportNum: "", passportIssued: "",
    address: "", contactPerson: "", cardNumber: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const setF = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const totalReturn = Math.round(loanAmount * (1 + RATE * loanMonths));
  const monthPayment = Math.round(totalReturn / loanMonths);
  const overpay = totalReturn - loanAmount;

  const amountBg = `linear-gradient(to right, #f59e0b ${((loanAmount - AMOUNT_MIN) / (AMOUNT_MAX - AMOUNT_MIN)) * 100}%, rgba(245,158,11,0.2) ${((loanAmount - AMOUNT_MIN) / (AMOUNT_MAX - AMOUNT_MIN)) * 100}%)`;
  const monthsBg = `linear-gradient(to right, #ef4444 ${((loanMonths - MONTHS_MIN) / (MONTHS_MAX - MONTHS_MIN)) * 100}%, rgba(239,68,68,0.2) ${((loanMonths - MONTHS_MIN) / (MONTHS_MAX - MONTHS_MIN)) * 100}%)`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          birthDate: form.birthDate,
          address: form.address,
          passportSerial: form.passportSerial,
          passportNum: form.passportNum,
          passportIssued: form.passportIssued,
          carBrand: form.carBrand,
          carModel: form.carModel,
          carYear: form.carYear ? parseInt(form.carYear) : null,
          carMileage: form.carMileage ? parseInt(form.carMileage) : null,
          contactPerson: form.contactPerson,
          cardNumber: form.cardNumber,
          loanAmount,
          loanMonths,
        }),
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

  if (submitted) {
    return (
      <div className="min-h-screen font-golos flex items-center justify-center px-4" style={{ background: "#0F0A1E" }}>
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", boxShadow: "0 0 60px rgba(245,158,11,0.4)" }}>
            <Icon name="CheckCircle" size={44} className="text-white" />
          </div>
          <h2 className="font-oswald text-4xl font-bold text-white mb-4">ЗАЯВКА ПРИНЯТА!</h2>
          <p className="text-white/50 mb-2 leading-relaxed">
            Ваша заявка на займ под залог автомобиля успешно отправлена.
          </p>
          <p className="text-yellow-400 font-semibold mb-8">
            Наш специалист свяжется с вами в течение 2 часов.
          </p>
          <button onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            <Icon name="Home" size={18} />
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-golos" style={{ background: "#0F0A1E" }}>
      <Navbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} scrollTo={scrollTo} />

      <div className="max-w-3xl mx-auto px-4 pt-28 pb-16">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "#fbbf24" }}>
            <Icon name="Car" size={14} />
            Займ под залог автомобиля
          </div>
          <h1 className="font-oswald text-4xl md:text-5xl font-bold text-white mb-2">
            ОФОРМИТЬ <span style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ЗАЯВКУ</span>
          </h1>
          <p className="text-white/40">Заполните форму — займёт около 5 минут</p>
        </div>

        {/* Условия кратко */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: "Banknote", v: "100т — 1 млн ₽", l: "сумма", color: "#f59e0b" },
            { icon: "Calendar", v: "до 36 мес.", l: "срок", color: "#06b6d4" },
            { icon: "Percent", v: "от 12%/мес.", l: "ставка", color: "#a855f7" },
          ].map((c) => (
            <div key={c.l} className="rounded-2xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Icon name={c.icon} size={18} style={{ color: c.color }} className="mx-auto mb-1" />
              <div className="font-bold text-sm" style={{ color: c.color }}>{c.v}</div>
              <div className="text-white/30 text-xs">{c.l}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* КАЛЬКУЛЯТОР */}
          <div className="rounded-2xl p-6 space-y-5"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                <Icon name="Calculator" size={16} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-lg">Параметры займа</h3>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white/60 text-sm">Сумма займа</span>
                <span className="font-bold text-yellow-400 text-base">{loanAmount.toLocaleString("ru-RU")} ₽</span>
              </div>
              <input type="range" min={AMOUNT_MIN} max={AMOUNT_MAX} step={10000} value={loanAmount}
                onChange={e => setLoanAmount(Number(e.target.value))}
                className="slider-custom w-full" style={{ background: amountBg }} />
              <div className="flex justify-between text-white/30 text-xs mt-1">
                <span>100 000 ₽</span><span>1 000 000 ₽</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white/60 text-sm">Срок займа</span>
                <span className="font-bold text-red-400 text-base">{loanMonths} мес.</span>
              </div>
              <input type="range" min={MONTHS_MIN} max={MONTHS_MAX} step={1} value={loanMonths}
                onChange={e => setLoanMonths(Number(e.target.value))}
                className="slider-custom w-full" style={{ background: monthsBg }} />
              <div className="flex justify-between text-white/30 text-xs mt-1">
                <span>1 мес.</span><span>36 мес.</span>
              </div>
            </div>

            {/* Итог */}
            <div className="rounded-xl p-4 grid grid-cols-2 gap-3"
              style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div className="text-center">
                <div className="text-white/40 text-xs mb-1">Ставка</div>
                <div className="text-yellow-300 font-bold">12% / мес.</div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-xs mb-1">Платёж / мес.</div>
                <div className="text-white font-bold">{monthPayment.toLocaleString("ru-RU")} ₽</div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-xs mb-1">Переплата</div>
                <div className="text-red-400 font-bold">{overpay.toLocaleString("ru-RU")} ₽</div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-xs mb-1">К возврату</div>
                <div className="font-bold" style={{ color: "#f59e0b" }}>{totalReturn.toLocaleString("ru-RU")} ₽</div>
              </div>
            </div>
          </div>

          {/* ЛИЧНЫЕ ДАННЫЕ */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                <Icon name="User" size={16} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-lg">Личные данные</h3>
            </div>
            <div>
              <label className={labelCls}>ФИО <span className="text-red-400">*</span></label>
              <input type="text" placeholder="Иванов Иван Иванович" value={form.fullName}
                onChange={e => setF("fullName", e.target.value)} required className={inputCls} style={inputStyle} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Телефон <span className="text-red-400">*</span></label>
                <input type="tel" placeholder="+7 (900) 000-00-00" value={form.phone}
                  onChange={e => setF("phone", e.target.value)} required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" placeholder="email@mail.ru" value={form.email}
                  onChange={e => setF("email", e.target.value)} className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Дата рождения <span className="text-red-400">*</span></label>
                <input type="date" value={form.birthDate}
                  onChange={e => setF("birthDate", e.target.value)} required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Адрес регистрации <span className="text-red-400">*</span></label>
                <input type="text" placeholder="г. Москва, ул. Примерная, д. 1" value={form.address}
                  onChange={e => setF("address", e.target.value)} required className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* ПАСПОРТ */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                <Icon name="BookUser" size={16} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-lg">Паспортные данные</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Серия <span className="text-red-400">*</span></label>
                <input type="text" placeholder="1234" value={form.passportSerial}
                  onChange={e => setF("passportSerial", e.target.value)} required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Номер <span className="text-red-400">*</span></label>
                <input type="text" placeholder="567890" value={form.passportNum}
                  onChange={e => setF("passportNum", e.target.value)} required className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Кем выдан <span className="text-red-400">*</span></label>
              <input type="text" placeholder="УМВД России по г. Москва" value={form.passportIssued}
                onChange={e => setF("passportIssued", e.target.value)} required className={inputCls} style={inputStyle} />
            </div>
          </div>

          {/* ДАННЫЕ ОБ АВТОМОБИЛЕ */}
          <div className="rounded-2xl p-6 space-y-5"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                <Icon name="Car" size={16} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-lg">Данные об автомобиле</h3>
            </div>

            {/* Требования */}
            <div className="grid grid-cols-2 gap-3 mb-1">
              <div className="rounded-xl p-3 flex items-center gap-2"
                style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}>
                <Icon name="Globe" size={14} className="text-cyan-400 shrink-0" />
                <div className="text-xs text-white/50">Иностранное: <span className="text-cyan-400 font-semibold">не старше 10 лет</span></div>
              </div>
              <div className="rounded-xl p-3 flex items-center gap-2"
                style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <Icon name="Flag" size={14} className="text-purple-400 shrink-0" />
                <div className="text-xs text-white/50">Отечественное: <span className="text-purple-400 font-semibold">не старше 5 лет</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Марка авто <span className="text-red-400">*</span></label>
                <input type="text" placeholder="Toyota" value={form.carBrand}
                  onChange={e => setF("carBrand", e.target.value)} required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Модель <span className="text-red-400">*</span></label>
                <input type="text" placeholder="Camry" value={form.carModel}
                  onChange={e => setF("carModel", e.target.value)} required className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Год выпуска <span className="text-red-400">*</span></label>
                <input type="number" placeholder="2020" min="1990" max="2026" value={form.carYear}
                  onChange={e => setF("carYear", e.target.value)} required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Пробег (км)</label>
                <input type="number" placeholder="50000" value={form.carMileage}
                  onChange={e => setF("carMileage", e.target.value)} className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* РЕКВИЗИТЫ */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                <Icon name="CreditCard" size={16} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-lg">Реквизиты для перевода</h3>
            </div>
            <div>
              <label className={labelCls}>Контактный телефон родственника <span className="text-red-400">*</span></label>
              <input type="tel" placeholder="+7 (900) 000-00-00 (ФИО)" value={form.contactPerson}
                onChange={e => setF("contactPerson", e.target.value)} required className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Карта или телефон СБП для перевода <span className="text-red-400">*</span></label>
              <input type="text" placeholder="2200 1234 5678 9012 или +7 (900) 000-00-00" value={form.cardNumber}
                onChange={e => setF("cardNumber", e.target.value)} required className={inputCls} style={inputStyle} />
            </div>
          </div>

          {/* Согласие */}
          <div className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <Icon name="ShieldCheck" size={18} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-white/40 text-xs leading-relaxed">
              Нажимая «Отправить заявку», вы соглашаетесь с обработкой персональных данных и условиями программы займа под залог транспортного средства. Ставка от 12% в месяц. Срок — до 36 месяцев. Решение — в течение 2 часов.
            </p>
          </div>

          {sendError && (
            <div className="rounded-xl p-4 text-red-400 text-sm text-center"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              {sendError}
            </div>
          )}

          <button type="submit" disabled={sending}
            className="w-full py-5 rounded-2xl font-bold text-xl text-white transition-all flex items-center justify-center gap-3"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              boxShadow: "0 0 40px rgba(245,158,11,0.4)",
              opacity: sending ? 0.7 : 1,
            }}>
            {sending ? (
              <><Icon name="Loader" size={22} className="animate-spin" /> Отправляем...</>
            ) : (
              <><Icon name="Car" size={22} /> Отправить заявку</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}