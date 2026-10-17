import SavedCardPicker from "@/components/SavedCardPicker";
import { SBP_BANKS, splitPayout, joinPayout, isCardValue } from "@/data/banks";

interface Props {
  value: string;
  onChange: (value: string) => void;
  inputClassName: string;
  inputStyle?: React.CSSProperties;
  labelClassName?: string;
}

export default function PayoutField({ value, onChange, inputClassName, inputStyle, labelClassName = "text-emerald-950/60 text-sm mb-2 block" }: Props) {
  const { main, bank } = splitPayout(value);
  const card = isCardValue(main);

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClassName}>
          {card ? "Карта для получения денег" : "Телефон для получения денег по СБП"} <span className="text-red-500">*</span>
        </label>
        <SavedCardPicker autoFill value={value} onPick={onChange} />
        <input
          type="text"
          inputMode="tel"
          placeholder="+7 (900) 000-00-00"
          value={main}
          onChange={(e) => onChange(joinPayout(e.target.value, isCardValue(e.target.value) ? "" : bank))}
          className={inputClassName}
          style={inputStyle}
        />
      </div>
      {!card && (
        <div>
          <label className={labelClassName}>Банк получателя (СБП) <span className="text-red-500">*</span></label>
          <select
            value={bank}
            onChange={(e) => onChange(joinPayout(main, e.target.value))}
            className={inputClassName}
            style={inputStyle}
          >
            <option value="">Выберите банк</option>
            {SBP_BANKS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <p className="text-emerald-950/30 text-xs mt-1">Деньги поступят по СБП на этот номер в выбранный банк</p>
        </div>
      )}
    </div>
  );
}
