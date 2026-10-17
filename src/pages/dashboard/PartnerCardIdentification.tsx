import { useState } from "react";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";
const UPLOAD_URL = "https://functions.poehali.dev/45733e38-49ca-4566-9ae3-b5323aec9a63";

export interface PartnerCardInfo {
  status: string;
  number: string;
  photo: string;
  rejectReason: string;
}

interface Props {
  info?: PartnerCardInfo;
  phone: string;
  onSent: () => void;
}

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

const formatCard = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

export default function PartnerCardIdentification({ info, phone, onSent }: Props) {
  const status = info?.status || "none";
  const [number, setNumber] = useState(info?.number || "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  async function send() {
    const digits = number.replace(/\D/g, "");
    if (digits.length < 16 || digits.length > 19) { setError("Введите номер карты партнёра (16–19 цифр)"); return; }
    if (!file && !info?.photo) { setError("Прикрепите фото карты партнёра"); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    setSending(true); setError("");
    let photoUrl = info?.photo || "";
    try {
      if (file) {
        const b64 = await compress(file);
        const up = await fetch(UPLOAD_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: b64, filename: `${Date.now()}_${phone.replace(/\D/g, "")}_partner_card.webp`, folder: "partner-cards" }),
        });
        if (!up.ok) throw new Error("upload");
        photoUrl = (await up.json()).url;
      }
    } catch {
      setSending(false);
      setError("Не удалось загрузить фото. Попробуйте ещё раз");
      return;
    }
    const res = await fetch(`${LOANS_URL}?sub=partner_card_submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
      body: JSON.stringify({ cardNumber: number.trim(), photoUrl }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) { setError(data.error || "Не удалось отправить на идентификацию"); return; }
    setEditing(false);
    setFile(null);
    onSent();
  }

  if (status === "approved") {
    return (
      <div className="rounded-xl px-5 py-4 flex items-center gap-3"
        style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
        <Icon name="BadgeCheck" size={20} className="text-green-500 shrink-0" />
        <div>
          <div className="text-green-700 text-sm font-semibold">Идентификация пройдена</div>
          <div className="text-emerald-950/50 text-xs mt-0.5">Карта партнёра подтверждена, можно подписывать договор</div>
        </div>
      </div>
    );
  }

  if (status === "pending" && !editing) {
    return (
      <div className="rounded-xl px-5 py-4 flex items-center gap-3"
        style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.35)" }}>
        <Icon name="Clock" size={20} className="text-amber-600 shrink-0 animate-pulse" />
        <div>
          <div className="text-amber-700 text-sm font-semibold">Карта партнёра на идентификации</div>
          <div className="text-emerald-950/50 text-xs mt-0.5">Мы проверяем данные. Договор можно будет подписать после одобрения</div>
        </div>
      </div>
    );
  }

  const shownPhoto = preview || info?.photo || "";

  return (
    <div className="rounded-xl p-4 space-y-3"
      style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)" }}>
      <div className="text-emerald-950 text-sm font-semibold flex items-center gap-2">
        <Icon name="IdCard" fallback="CreditCard" size={16} className="text-emerald-600" />
        Идентификация карты партнёра
      </div>

      {status === "rejected" && (
        <div className="rounded-lg px-3 py-2 text-sm text-red-700" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          Идентификация не пройдена{info?.rejectReason ? `: ${info.rejectReason}` : ""}. Проверьте данные и отправьте ещё раз.
        </div>
      )}

      <p className="text-emerald-950/60 text-xs leading-relaxed">
        Когда получите карту партнёра, введите её номер и прикрепите фото карты. Без этого подписать договор и получить займ нельзя.
      </p>

      <div>
        <label className="text-emerald-950/70 text-sm mb-1.5 block font-medium">Номер карты партнёра <span className="text-red-500">*</span></label>
        <input
          type="text" inputMode="numeric" value={number}
          onChange={(e) => { setNumber(formatCard(e.target.value)); setError(""); }}
          placeholder="0000 0000 0000 0000"
          className="w-full px-4 py-3 rounded-xl text-emerald-950 text-sm outline-none font-mono tracking-wide"
          style={{ background: "#fff", border: "1px solid rgba(16,185,129,0.3)" }}
        />
      </div>

      <div>
        <label className="text-emerald-950/70 text-sm mb-1.5 block font-medium">Фото карты партнёра <span className="text-red-500">*</span></label>
        <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer text-sm font-semibold text-emerald-800 hover:opacity-90"
          style={{ background: "rgba(16,185,129,0.12)", border: "1px dashed rgba(16,185,129,0.5)" }}>
          <Icon name="Camera" size={16} />
          {shownPhoto ? "Заменить фото" : "Прикрепить фото"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {shownPhoto && (
          <img src={shownPhoto} alt="Карта партнёра" className="mt-2 rounded-lg max-h-48 object-contain border border-emerald-900/10" />
        )}
      </div>

      {error && <p className="text-red-600 text-xs font-medium">{error}</p>}

      <button onClick={send} disabled={sending}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", boxShadow: "0 4px 20px rgba(16,185,129,0.3)" }}>
        {sending ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Send" size={18} />}
        {sending ? "Отправляем..." : "Отправить на идентификацию"}
      </button>
    </div>
  );
}
