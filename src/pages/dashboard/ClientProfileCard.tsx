import { useState } from "react";
import Icon from "@/components/ui/icon";

export interface ClientProfile {
  fullName: string;
  email: string;
  birthDate: string;
  birthPlace: string;
  passportSeries: string;
  passportNumber: string;
  passportDate: string;
  passportCode: string;
  passportBy: string;
  workplace: string;
  position: string;
  workPhone: string;
  salary: number | null;
  contactPerson: string;
  snils: string;
}

interface Props {
  profile: ClientProfile;
  phone: string;
}

export default function ClientProfileCard({ profile, phone }: Props) {
  const [open, setOpen] = useState(false);

  const rows: { label: string; value: string }[] = [
    { label: "ФИО", value: profile.fullName },
    { label: "Телефон", value: phone },
    { label: "Email", value: profile.email },
    { label: "Дата рождения", value: profile.birthDate },
    { label: "Место рождения", value: profile.birthPlace },
    { label: "Паспорт", value: profile.passportSeries || profile.passportNumber ? `${profile.passportSeries} ${profile.passportNumber}`.trim() : "" },
    { label: "Дата выдачи паспорта", value: profile.passportDate },
    { label: "Код подразделения", value: profile.passportCode },
    { label: "Кем выдан", value: profile.passportBy },
    { label: "СНИЛС", value: profile.snils },
    { label: "Место работы", value: profile.workplace },
    { label: "Должность", value: profile.position },
    { label: "Рабочий телефон", value: profile.workPhone },
    { label: "Зарплата", value: profile.salary ? `${profile.salary.toLocaleString("ru-RU")} ₽` : "" },
    { label: "Контактное лицо", value: profile.contactPerson },
  ].filter(r => r.value);

  if (rows.length === 0) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-5 flex items-center gap-3 transition-colors hover:bg-white/5"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.05))" }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 btn-neon">
          <Icon name="UserCircle" size={20} className="text-white" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-white font-bold">Моя анкета</div>
          <div className="text-white/40 text-xs">Данные, указанные при подаче заявки</div>
        </div>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} className="text-white/40 shrink-0" />
      </button>

      {open && (
        <div className="p-5 grid sm:grid-cols-2 gap-3">
          {rows.map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-white/40 text-xs mb-1">{label}</div>
              <div className="text-white text-sm font-medium break-words">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
