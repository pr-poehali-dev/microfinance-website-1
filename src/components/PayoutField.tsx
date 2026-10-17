import SavedCardPicker from "@/components/SavedCardPicker";
import { SBP_BANKS, OTHER_BANK, splitPayout, joinPayout, isCardValue, isOtherBank, customBankName } from "@/data/banks";

interface Props {
  value: string;
  onChange: (value: string) => void;
  inputClassName: string;
  inputStyle?: React.CSSProperties;
  labelClassName?: string;
  sbpOnly?: boolean;
}

export default function PayoutField({ value, onChange, inputClassName, inputStyle, labelClassName = "text-emerald-950/60 text-sm mb-2 block", sbpOnly = false }: Props) {
  const { main, bank } = splitPayout(value);
  const card = !sbpOnly && isCardValue(main);
  const other = isOtherBank(bank);

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClassName}>
          {card ? "Карта для получения денег" : "Телефон для получения денег по СБП"} <span className="text-red-500">*</span>
        </label>
        <SavedCardPicker autoFill onlyPhones={sbpOnly} value={value} onPick={onChange} />
        <input
          type="text"
          inputMode="tel"
          placeholder="+7 (900) 000-00-00"
          value={main}
          onChange={(e) => onChange(joinPayout(e.target.value, !sbpOnly && isCardValue(e.target.value) ? "" : bank))}
          className={inputClassName}
          style={inputStyle}
        />
      </div>
      {!card && (
        <div>
          <label className={labelClassName}>Банк получателя (СБП) <span className="text-red-500">*</span></label>
          <select
            value={other ? OTHER_BANK : bank}
            onChange={(e) => onChange(joinPayout(main, e.target.value))}
            className={inputClassName}
            style={inputStyle}
          >
            <option value="">Выберите банк</option>
            {SBP_BANKS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {other && (
            <div className="mt-3">
              <label className={labelClassName}>Название вашего банка <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Например: Банк Санкт-Петербург"
                value={customBankName(bank)}
                onChange={(e) => onChange(joinPayout(main, e.target.value || OTHER_BANK))}
                className={inputClassName}
                style={inputStyle}
              />
            </div>
          )}
          <p className="text-emerald-950/30 text-xs mt-1">Деньги поступят по СБП на этот номер в выбранный банк</p>
        </div>
      )}
    </div>
  );
}
