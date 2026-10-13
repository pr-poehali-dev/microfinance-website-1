import { useState } from "react";
import Icon from "@/components/ui/icon";
import ProfileEditForm from "./ProfileEditForm";
import type { ClientProfile } from "./ClientProfileCard";

interface Props {
  profile: ClientProfile | null;
  phone: string;
  editable: boolean;
  onSaved: () => void;
}

const fmtVal = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(v));

export default function ProfileCheck({ profile, phone, editable, onSaved }: Props) {
  const [editing, setEditing] = useState(false);

  if (!profile) {
    return (
      <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#b91c1c" }}>
        Анкета ещё не заполнена. Оформите первую заявку на займ наличными, после этого данные будут подтягиваться автоматически.
      </div>
    );
  }

  if (editing) {
    return (
      <ProfileEditForm
        profile={profile}
        phone={phone}
        onCancel={() => setEditing(false)}
        onSaved={() => { setEditing(false); onSaved(); }}
      />
    );
  }

  const rows: [string, string][] = [
    ["ФИО", fmtVal(profile.fullName)],
    ["Телефон", phone],
    ["Дата рождения", fmtVal(profile.birthDate)],
    ["Паспорт", `${fmtVal(profile.passportSeries)} ${fmtVal(profile.passportNumber)}`.trim()],
    ["Адрес регистрации", fmtVal(profile.regAddress)],
    ["Место работы", fmtVal(profile.workplace)],
    ["Зарплата", profile.salary ? `${profile.salary.toLocaleString("ru-RU")} ₽` : ""],
  ];
  const missing = [
    !profile.passportSeries && "паспорт", !profile.birthDate && "дата рождения",
    !profile.regAddress && "адрес регистрации", !profile.filePassport && "фото паспорта",
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)" }}>
      <div className="flex items-center gap-2 text-emerald-950/60 text-xs uppercase tracking-wider">
        <Icon name="UserCheck" size={14} className="text-emerald-600" />Проверьте свою анкету
      </div>
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 text-sm">
          <span className="text-emerald-950/50">{k}</span>
          <span className="text-emerald-950 font-medium text-right break-words">{v}</span>
        </div>
      ))}
      {missing.length > 0 && (
        <div className="text-xs" style={{ color: "#b91c1c" }}>Не хватает: {missing.join(", ")}. Дополните анкету.</div>
      )}
      {editable ? (
        <button onClick={() => setEditing(true)} className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold flex items-center gap-2 pt-1">
          <Icon name="Pencil" size={14} />Что-то изменилось? Исправить анкету
        </button>
      ) : (
        <div className="text-emerald-950/40 text-xs flex items-center gap-2 pt-1">
          <Icon name="Lock" size={13} />Анкету можно изменить, когда нет действующего займа или заявки на рассмотрении
        </div>
      )}
    </div>
  );
}
