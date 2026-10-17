import { useState } from "react";
import Icon from "@/components/ui/icon";

interface Props { fullName?: string; birthDate?: string | null }

function toRuDate(v?: string | null): string {
  if (!v) return "";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(v);
}

export default function FsspCheckButton({ fullName, birthDate }: Props) {
  const [copied, setCopied] = useState(false);
  const parts = (fullName || "").trim().split(/\s+/);
  const date = toRuDate(birthDate);

  const open = () => {
    const q = new URLSearchParams({
      "is[extended]": "1",
      "is[variant]": "1",
      "is[last_name]": parts[0] || "",
      "is[first_name]": parts[1] || "",
      "is[patronymic]": parts.slice(2).join(" "),
      "is[date]": date,
    });
    navigator.clipboard?.writeText([fullName, date].filter(Boolean).join(", ")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => undefined);
    window.open(`https://fssp.gov.ru/iss/ip/?${q.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={!fullName}
      title="Откроет сайт ФССП с данными клиента. ФИО и дата рождения скопируются в буфер"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
        fontSize: 13, fontWeight: 700, cursor: fullName ? "pointer" : "not-allowed", whiteSpace: "nowrap",
        background: "#1e3a8a", color: "#fff", border: "none", opacity: fullName ? 1 : 0.5,
        boxShadow: "0 4px 14px rgba(30,58,138,0.25)",
      }}
    >
      <Icon name={copied ? "Check" : "ShieldSearch"} fallback="Search" size={14} />
      {copied ? "ФИО и дата скопированы" : "Проверить по ФССП"}
    </button>
  );
}
