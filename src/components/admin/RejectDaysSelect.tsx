const OPTIONS = [
  { v: 0, l: "Без ограничения" },
  { v: 7, l: "7 дней" },
  { v: 14, l: "14 дней" },
  { v: 30, l: "30 дней" },
  { v: 60, l: "60 дней" },
  { v: 90, l: "90 дней" },
  { v: 180, l: "180 дней" },
  { v: 365, l: "365 дней" },
];

interface Props {
  value: number;
  onChange: (v: number) => void;
  width?: number | string;
}

export default function RejectDaysSelect({ value, onChange, width = "100%" }: Props) {
  return (
    <label style={{ display: "block", width }}>
      <span style={{ display: "block", fontSize: 11, color: "rgba(2,44,34,0.55)", marginBottom: 4 }}>Отказ на срок (клиент не сможет подать новую заявку)</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.3)", background: "#fff", color: "#022c22", fontSize: 13, boxSizing: "border-box" }}>
        {OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}
