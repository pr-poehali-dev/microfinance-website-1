import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { ClientProfile } from "./ClientProfileCard";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

type Key = keyof ClientProfile;

const FIELDS: { key: Key; label: string; type?: string }[] = [
  { key: "fullName", label: "ФИО" },
  { key: "email", label: "Email", type: "email" },
  { key: "birthDate", label: "Дата рождения", type: "date" },
  { key: "birthPlace", label: "Место рождения" },
  { key: "passportSeries", label: "Серия паспорта" },
  { key: "passportNumber", label: "Номер паспорта" },
  { key: "passportDate", label: "Дата выдачи паспорта", type: "date" },
  { key: "passportCode", label: "Код подразделения" },
  { key: "passportBy", label: "Кем выдан" },
  { key: "snils", label: "СНИЛС" },
  { key: "workplace", label: "Место работы" },
  { key: "position", label: "Должность" },
  { key: "workPhone", label: "Рабочий телефон" },
  { key: "salary", label: "Зарплата, ₽" },
  { key: "contactPerson", label: "Контактное лицо" },
];

interface Props {
  profile: ClientProfile;
  phone: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function ProfileEditForm({ profile, phone, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    FIELDS.forEach((f) => {
      const v = profile[f.key];
      init[f.key] = v === null || v === undefined ? "" : String(v);
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    setError("");
    const res = await fetch(`${LOANS_URL}?sub=profile_update`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(data.error || "Не удалось сохранить анкету"); return; }
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 text-sm text-emerald-950/70" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
        Телефон <b className="text-emerald-950">{phone}</b> изменить нельзя. Остальные данные можно поправить.
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-emerald-950/50 text-xs mb-1 block">{f.label}</span>
            <input
              type={f.type || "text"}
              value={form[f.key]}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-emerald-950 outline-none"
              style={{ background: "#fff", border: "1px solid rgba(16,185,129,0.3)" }}
            />
          </label>
        ))}
      </div>
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626" }}>
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className="btn-neon text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-60">
          {saving ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Save" size={16} />}
          Сохранить анкету
        </button>
        <button onClick={onCancel} className="glass text-emerald-950/60 font-semibold px-6 py-3 rounded-xl">Отмена</button>
      </div>
    </div>
  );
}
