import { useMemo, memo } from "react";

interface LoanCalculatorProps {
  amount: number;
  days: number;
  onAmountChange: (v: number) => void;
  onDaysChange: (v: number) => void;
}

const RATE = 0.008;

function LoanCalculator({ amount, days, onAmountChange, onDaysChange }: LoanCalculatorProps) {
  const { interest, total, amountPct, daysPct, amountBg, daysBg } = useMemo(() => {
    const interest = Math.round(amount * RATE * days);
    const total = amount + interest;
    const amountPct = ((amount - 5000) / (100000 - 5000)) * 100;
    const daysPct = ((days - 5) / (365 - 5)) * 100;
    const amountBg = `linear-gradient(to right, #7C3AED ${amountPct}%, rgba(124,58,237,0.2) ${amountPct}%)`;
    const daysBg = `linear-gradient(to right, #7C3AED ${daysPct}%, rgba(124,58,237,0.2) ${daysPct}%)`;
    return { interest, total, amountPct, daysPct, amountBg, daysBg };
  }, [amount, days]);

  return (
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
                    onChange={(e) => onAmountChange(Number(e.target.value))}
                    className="slider-custom w-full"
                    style={{ background: amountBg }}
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
                    max={365}
                    step={1}
                    value={days}
                    onChange={(e) => onDaysChange(Number(e.target.value))}
                    className="slider-custom w-full"
                    style={{ background: daysBg }}
                  />
                  <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>5 дней</span>
                    <span>365 дней</span>
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
  );
}

export default memo(LoanCalculator);