import { useState } from "react";
import Icon from "@/components/ui/icon";

const INVEST_URL = "https://functions.poehali.dev/1244293e-9832-493e-bbb5-de820fbe56c6";

const TERMS = [
  { icon: "Banknote", label: "Сумма", value: "от 300 000 ₽ до 15 000 000 ₽" },
  { icon: "CalendarClock", label: "Срок", value: "от 6 месяцев до 5 лет" },
  { icon: "Percent", label: "Ставка", value: "от 8% в месяц" },
  { icon: "CalendarCheck", label: "Выплата процентов", value: "каждый месяц или в конце срока" },
  { icon: "PlusCircle", label: "Пополнение", value: "доступно в любой момент" },
];

const TERM_OPTIONS = [
  { value: "6", label: "6 месяцев" },
  { value: "12", label: "1 год" },
  { value: "36", label: "3 года" },
  { value: "60", label: "5 лет" },
];

const PAYOUT_OPTIONS = [
  { value: "monthly", label: "Каждый месяц" },
  { value: "end", label: "В конце срока" },
];

const INPUT = "w-full rounded-xl px-4 py-3 text-sm text-emerald-950 bg-white border border-emerald-900/15 focus:border-emerald-500 focus:outline-none placeholder:text-emerald-950/35";

export default function InvestSection() {
  const [form, setForm] = useState({ fullName: "", birthDate: "", phone: "", email: "", amount: "", termMonths: "", payout: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    if (!form.termMonths || !form.payout) {
      setBusy(false);
      setError("Выберите срок и способ выплаты процентов");
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch(INVEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, termMonths: Number(form.termMonths) }),
      signal: ctrl.signal,
    }).catch(() => null);
    clearTimeout(timer);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (r && r.ok) {
      setSent(true);
      setForm({ fullName: "", birthDate: "", phone: "", email: "", amount: "", termMonths: "", payout: "" });
    } else {
      setError(d.error || "Не удалось отправить заявку. Попробуйте ещё раз");
    }
  };

  return (
    <section id="invest" className="py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <div className="inline-block glass px-4 py-1.5 rounded-full text-emerald-600 text-sm mb-4">Для инвесторов</div>
          <h2 className="font-oswald text-4xl md:text-5xl font-bold text-emerald-950">
            <span className="gradient-text">ИНВЕСТИРОВАНИЕ</span>
          </h2>
          <p className="text-emerald-950/60 mt-4 max-w-2xl mx-auto">
            Размещайте средства под высокий доход и получайте проценты на удобных для вас условиях
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="glass rounded-3xl p-4 sm:p-6 md:p-8 space-y-4">
            {TERMS.map((t) => (
              <div key={t.label} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)" }}>
                  <Icon name={t.icon} size={22} className="text-white" />
                </div>
                <div>
                  <div className="text-emerald-950/45 text-xs">{t.label}</div>
                  <div className="text-emerald-950 font-semibold">{t.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass rounded-3xl p-4 sm:p-6 md:p-8">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)" }}>
                  <Icon name="Check" size={32} className="text-white" />
                </div>
                <div className="font-oswald text-2xl font-bold text-emerald-950 mb-2">Заявка отправлена</div>
                <p className="text-emerald-950/60 text-sm mb-6">Мы свяжемся с вами в ближайшее время и расскажем все детали</p>
                <button onClick={() => setSent(false)} className="text-emerald-600 text-sm font-semibold">Отправить ещё одну заявку</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="font-oswald text-2xl font-bold text-emerald-950">Заявка инвестора</div>
                <input className={INPUT} placeholder="Фамилия Имя Отчество" value={form.fullName} onChange={set("fullName")} required />
                <div>
                  <label className="text-emerald-950/45 text-xs block mb-1 ml-1">Дата рождения</label>
                  <input className={INPUT} type="date" value={form.birthDate} onChange={set("birthDate")} required />
                </div>
                <div>
                  <label className="text-emerald-950/45 text-xs block mb-1 ml-1">Сумма инвестирования, ₽ (от 300 000 до 15 000 000)</label>
                  <input className={INPUT} type="number" inputMode="numeric" min={300000} max={15000000} step={1000} placeholder="Например, 500000" value={form.amount} onChange={set("amount")} required />
                </div>
                <div>
                  <label className="text-emerald-950/45 text-xs block mb-2 ml-1">Срок инвестирования</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TERM_OPTIONS.map((o) => (
                      <button key={o.value} type="button" onClick={() => setForm({ ...form, termMonths: o.value })}
                        className="rounded-xl py-2.5 text-sm font-semibold transition-colors"
                        style={form.termMonths === o.value
                          ? { background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "#ffffff", border: "1px solid transparent" }
                          : { background: "#ffffff", color: "#064e3b", border: "1px solid rgba(6,78,59,0.15)" }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-emerald-950/45 text-xs block mb-2 ml-1">Выплата процентов</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYOUT_OPTIONS.map((o) => (
                      <button key={o.value} type="button" onClick={() => setForm({ ...form, payout: o.value })}
                        className="rounded-xl py-2.5 text-sm font-semibold transition-colors"
                        style={form.payout === o.value
                          ? { background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "#ffffff", border: "1px solid transparent" }
                          : { background: "#ffffff", color: "#064e3b", border: "1px solid rgba(6,78,59,0.15)" }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input className={INPUT} type="tel" placeholder="Номер телефона" value={form.phone} onChange={set("phone")} required />
                <input className={INPUT} type="email" placeholder="Адрес электронной почты" value={form.email} onChange={set("email")} required />
                {error && <div className="text-red-600 text-sm font-medium">{error}</div>}
                <button type="submit" disabled={busy} className="w-full btn-neon text-white font-semibold py-3.5 rounded-xl disabled:opacity-60">
                  {busy ? "Отправляем..." : "Отправить"}
                </button>
                <p className="text-emerald-950/40 text-xs text-center">Нажимая «Отправить», вы соглашаетесь на обработку персональных данных</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
