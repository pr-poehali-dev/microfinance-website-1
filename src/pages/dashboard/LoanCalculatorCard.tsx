import Icon from "@/components/ui/icon";

interface Props {
  amount: number;
  amountMin: number;
  amountMax: number;
  amountStep: number;
  onAmount: (v: number) => void;
  term: number;
  termMin: number;
  termMax: number;
  termUnit: string;
  onTerm: (v: number) => void;
  total: number;
  overpay: number;
  extraLabel?: string;
  extraValue?: number;
  note?: string;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const fill = (v: number, min: number, max: number) => {
  const p = ((v - min) / (max - min)) * 100;
  return `linear-gradient(to right, #10b981 ${p}%, rgba(16,185,129,0.22) ${p}%)`;
};

export default function LoanCalculatorCard({
  amount, amountMin, amountMax, amountStep, onAmount,
  term, termMin, termMax, termUnit, onTerm,
  total, overpay, extraLabel, extraValue, note,
}: Props) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(16,185,129,0.45)", background: "#ffffff", boxShadow: "0 8px 24px rgba(16,185,129,0.15)" }}>
      <div className="px-5 py-3 flex items-center gap-2" style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)" }}>
        <Icon name="Calculator" size={18} className="text-white" />
        <span className="text-white font-bold">Калькулятор займа</span>
      </div>

      <div className="px-5 py-5 space-y-6">
        <div>
          <div className="flex items-end justify-between mb-3">
            <span className="text-emerald-950/70 text-sm font-medium">Сумма</span>
            <span className="font-oswald text-3xl font-bold text-emerald-700 leading-none">{fmt(amount)}</span>
          </div>
          <input type="range" min={amountMin} max={amountMax} step={amountStep} value={amount}
            onChange={(e) => onAmount(Number(e.target.value))} className="slider-custom w-full" style={{ background: fill(amount, amountMin, amountMax), height: 8 }} />
          <div className="flex justify-between text-emerald-950/50 text-xs mt-2">
            <span>{fmt(amountMin)}</span><span>{fmt(amountMax)}</span>
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between mb-3">
            <span className="text-emerald-950/70 text-sm font-medium">Срок</span>
            <span className="font-oswald text-3xl font-bold text-emerald-700 leading-none">{term} {termUnit}</span>
          </div>
          <input type="range" min={termMin} max={termMax} step={1} value={term}
            onChange={(e) => onTerm(Number(e.target.value))} className="slider-custom w-full" style={{ background: fill(term, termMin, termMax), height: 8 }} />
          <div className="flex justify-between text-emerald-950/50 text-xs mt-2">
            <span>{termMin} {termUnit}</span><span>{termMax} {termUnit}</span>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.35)" }}>
          <div className="flex items-end justify-between gap-3">
            <span className="text-emerald-950/70 text-sm font-medium">К возврату</span>
            <span className="font-oswald text-3xl font-bold text-emerald-950 leading-none">{fmt(total)}</span>
          </div>
          <div className="flex justify-between text-sm mt-3 pt-3" style={{ borderTop: "1px dashed rgba(16,185,129,0.4)" }}>
            <span className="text-emerald-950/60">Проценты</span>
            <span className="text-emerald-950 font-semibold">{fmt(overpay)}</span>
          </div>
          {extraLabel && extraValue !== undefined && (
            <div className="flex justify-between text-sm mt-2">
              <span className="text-emerald-950/60">{extraLabel}</span>
              <span className="text-emerald-950 font-semibold">{fmt(extraValue)}</span>
            </div>
          )}
          {note && <div className="text-emerald-950/50 text-xs mt-2">{note}</div>}
        </div>
      </div>
    </div>
  );
}
