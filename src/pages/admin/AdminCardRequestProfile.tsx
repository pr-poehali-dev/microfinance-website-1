import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Field { key: string; label: string; type?: string; wide?: boolean }
const SECTIONS: { title: string; fields: Field[] }[] = [
  { title: "Личные данные", fields: [
    { key: "fullName", label: "ФИО", wide: true },
    { key: "birthDate", label: "Дата рождения" },
    { key: "birthPlace", label: "Место рождения" },
    { key: "snils", label: "СНИЛС" },
  ] },
  { title: "Контакты", fields: [
    { key: "phone", label: "Телефон" },
    { key: "email", label: "Email", type: "email" },
    { key: "telegramId", label: "Telegram" },
  ] },
  { title: "Паспорт", fields: [
    { key: "passportSeries", label: "Серия" },
    { key: "passportNumber", label: "Номер" },
    { key: "passportDate", label: "Дата выдачи" },
    { key: "passportCode", label: "Код подразделения" },
    { key: "passportBy", label: "Кем выдан", wide: true },
  ] },
  { title: "Работа и доходы", fields: [
    { key: "workplace", label: "Место работы" },
    { key: "position", label: "Должность" },
    { key: "workPhone", label: "Рабочий телефон" },
    { key: "salary", label: "Зарплата, ₽" },
    { key: "contactPerson", label: "Контактное лицо", wide: true },
  ] },
  { title: "Банковская карта", fields: [
    { key: "cardNumber", label: "Карта / СБП для выплаты" },
    { key: "cardNumberTransfer", label: "Карта для перевода" },
  ] },
];

const PHOTOS: { key: string; upKey: string; label: string }[] = [
  { key: "filePassport", upKey: "passportMain", label: "Паспорт" },
  { key: "fileRegistration", upKey: "registration", label: "Прописка" },
  { key: "fileSelfie", upKey: "selfie", label: "Селфи с паспортом" },
  { key: "filePreviousPassports", upKey: "previousPassports", label: "Ранее выданные паспорта" },
];

const compress = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.7).split(",")[1]);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

const INPUT = { background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "9px 12px", color: "#022c22", fontSize: 14, width: "100%", boxSizing: "border-box" as const };

interface Props {
  token: string;
  userId: number;
  onClose: () => void;
}

export default function AdminCardRequestProfile({ token, userId, onClose }: Props) {
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState("");
  const [uploading, setUploading] = useState("");

  const hdrs = useCallback(() => ({ "Content-Type": "application/json", "Authorization": `Bearer ${token}` }), [token]);

  const loadProfile = useCallback(() => {
    return fetch(`${ADMIN_URL}?sub=client_profile&userId=${userId}`, { headers: hdrs() })
      .then(r => r.json())
      .then(p => {
        const f: Record<string, string> = {};
        Object.entries(p).forEach(([k, v]) => { if (typeof v === "string") f[k] = v; });
        setData(f);
      });
  }, [userId, hdrs]);

  useEffect(() => {
    loadProfile()
      .catch(() => setErr("Не удалось загрузить анкету"))
      .finally(() => setLoading(false));
  }, [loadProfile]);

  async function replacePhoto(ph: { key: string; upKey: string }, file: File | undefined) {
    if (!file) return;
    setUploading(ph.key); setMsg(""); setErr("");
    try {
      const b64 = await compress(file);
      const r = await fetch(`${ADMIN_URL}?sub=docs_upload&userId=${userId}`, {
        method: "POST", headers: hdrs(), body: JSON.stringify({ [ph.upKey]: b64 }),
      });
      if (!r.ok) throw new Error("upload");
      await loadProfile();
      setMsg("Фото обновлено");
    } catch {
      setErr("Не удалось загрузить фото");
    } finally {
      setUploading("");
    }
  }

  async function save() {
    setSaving(true); setMsg(""); setErr("");
    const body: Record<string, string> = {};
    SECTIONS.forEach(s => s.fields.forEach(f => { body[f.key] = data[f.key] ?? ""; }));
    const r = await fetch(`${ADMIN_URL}?sub=client_profile_update&userId=${userId}`, {
      method: "POST", headers: hdrs(), body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setErr(d.error || "Ошибка при сохранении"); return; }
    setMsg("Анкета сохранена");
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(16,185,129,0.15)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ color: "#022c22", fontWeight: 700, fontSize: 15 }}>Анкета клиента</div>
        <button onClick={onClose} style={{ background: "rgba(16,185,129,0.07)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: "rgba(2,44,34,0.5)" }}>
          <Icon name="X" size={16} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 24 }}><Icon name="Loader2" size={26} className="animate-spin text-emerald-600" /></div>
      ) : (
        <>
          {SECTIONS.map(sec => (
            <div key={sec.title} style={{ marginBottom: 14 }}>
              <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{sec.title}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                {sec.fields.map(f => (
                  <label key={f.key} style={{ gridColumn: f.wide ? "1 / -1" : undefined }}>
                    <span style={{ color: "rgba(2,44,34,0.45)", fontSize: 12, display: "block", marginBottom: 4 }}>{f.label}</span>
                    <input type={f.type || "text"} value={data[f.key] ?? ""} style={INPUT}
                      onChange={e => setData(p => ({ ...p, [f.key]: e.target.value }))} />
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Фото документов</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {PHOTOS.map(ph => (
                <div key={ph.key} style={{ width: 112, border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: 4, background: "#fff" }}>
                  {data[ph.key] ? (
                    <button onClick={() => setZoom(data[ph.key])} style={{ border: "none", padding: 0, background: "none", cursor: "zoom-in", display: "block" }}>
                      <img src={data[ph.key]} alt={ph.label} style={{ width: 102, height: 96, objectFit: "cover", borderRadius: 8, display: "block" }} />
                    </button>
                  ) : (
                    <div style={{ width: 102, height: 96, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "rgba(2,44,34,0.35)", background: "rgba(16,185,129,0.05)", borderRadius: 8 }}>
                      нет фото
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "rgba(2,44,34,0.6)", margin: "4px 0" }}>{ph.label}</div>
                  <label style={{ display: "block", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#047857", background: "rgba(16,185,129,0.1)", borderRadius: 6, padding: "5px 0", cursor: "pointer" }}>
                    {uploading === ph.key ? "Загрузка..." : data[ph.key] ? "Заменить" : "Загрузить"}
                    <input type="file" accept="image/*" style={{ display: "none" }} disabled={!!uploading}
                      onChange={e => { replacePhoto(ph, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {err && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{err}</div>}
          {msg && <div style={{ color: "#047857", fontSize: 13, marginBottom: 8 }}>{msg}</div>}
          <button onClick={save} disabled={saving}
            style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Сохраняем..." : "Сохранить анкету"}
          </button>
        </>
      )}

      {zoom && (
        <div onClick={() => setZoom("")}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={zoom} alt="" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
