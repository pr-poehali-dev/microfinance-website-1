import { SBP_BANKS, OTHER_BANK, splitPayout, joinPayout, isCardValue, isOtherBank, customBankName } from "@/data/banks";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}

export default function AdminPayoutField({ label, value, onChange, inputStyle, labelStyle }: Props) {
  const { main, bank } = splitPayout(value);
  const card = isCardValue(main);
  const other = isOtherBank(bank);
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <div style={labelStyle}>{label}</div>
      <input
        type="text"
        placeholder="+7 (900) 000-00-00"
        value={main}
        onChange={(e) => onChange(joinPayout(e.target.value, isCardValue(e.target.value) ? "" : bank))}
        style={inputStyle}
      />
      {!card && (
        <>
          <div style={{ ...labelStyle, marginTop: 8 }}>Банк получателя (СБП)</div>
          <select value={other ? OTHER_BANK : bank} onChange={(e) => onChange(joinPayout(main, e.target.value))} style={inputStyle}>
            <option value="">Выберите банк</option>
            {SBP_BANKS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {other && (
            <>
              <div style={{ ...labelStyle, marginTop: 8 }}>Название банка (вписал клиент)</div>
              <input
                type="text"
                placeholder="Название банка"
                value={customBankName(bank)}
                onChange={(e) => onChange(joinPayout(main, e.target.value || OTHER_BANK))}
                style={inputStyle}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
