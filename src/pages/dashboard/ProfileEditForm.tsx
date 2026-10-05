import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { ClientProfile } from "./ClientProfileCard";

const UPLOAD_URL = "https://functions.poehali.dev/45733e38-49ca-4566-9ae3-b5323aec9a63";
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

const PHOTO_FIELDS: { key: "filePassport" | "fileRegistration" | "fileSelfie" | "filePreviousPassports"; label: string }[] = [
  { key: "filePassport", label: "Паспорт — главная страница" },
  { key: "fileRegistration", label: "Прописка" },
  { key: "fileSelfie", label: "Селфи с паспортом" },
  { key: "filePreviousPassports", label: "Ранее выданные паспорта" },
];

const compress = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 900;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.6).split(",")[1]);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

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
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    setError("");
    const urls: Record<string, string> = {};
    try {
      const now = Date.now();
      const phoneDigits = phone.replace(/\D/g, "");
      await Promise.all(
        Object.entries(photos).filter(([, f]) => f).map(async ([key, file]) => {
          const b64 = await compress(file as File);
          const up = await fetch(UPLOAD_URL, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: b64, filename: `${now}_${phoneDigits}_${key}.webp`, folder: "applications" }),
          });
          if (!up.ok) throw new Error("upload");
          urls[key] = (await up.json()).url;
        })
      );
    } catch {
      setSaving(false);
      setError("Не удалось загрузить фото. Попробуйте ещё раз");
      return;
    }
    const res = await fetch(`${LOANS_URL}?sub=profile_update`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
      body: JSON.stringify({ ...form, ...urls }),
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
      <div>
        <div className="text-emerald-950 font-semibold text-sm mb-2">Фото документов</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {PHOTO_FIELDS.map((f) => {
            const current = profile[f.key];
            const picked = photos[f.key];
            return (
              <label key={f.key} className="block rounded-xl p-3 cursor-pointer" style={{ background: "rgba(16,185,129,0.04)", border: "1px dashed rgba(16,185,129,0.4)" }}>
                <span className="text-emerald-950/60 text-xs block mb-2">{f.label}</span>
                <div className="flex items-center gap-3">
                  {picked ? (
                    <img src={URL.createObjectURL(picked)} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  ) : current ? (
                    <img src={current} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                      <Icon name="ImagePlus" size={20} className="text-emerald-600" />
                    </div>
                  )}
                  <span className="text-emerald-950/70 text-xs">
                    {picked ? picked.name : current ? "Нажмите, чтобы заменить" : "Нажмите, чтобы загрузить"}
                  </span>
                </div>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => setPhotos((p) => ({ ...p, [f.key]: e.target.files?.[0] ?? null }))} />
              </label>
            );
          })}
        </div>
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
