import SignCodeDialog from "@/components/SignCodeDialog";
import { useState } from "react";
import Icon from "@/components/ui/icon";
import ProfileCheck from "./ProfileCheck";
import type { ClientProfile } from "./ClientProfileCard";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

interface Props {
  cardRequestStatus: string | null;
  cardRequestRejectReason?: string;
  profile?: ClientProfile | null;
  phone?: string;
  profileEditable?: boolean;
  onProfileSaved?: () => void;
  onSuccess: () => void;
}

export default function CardRequestBlock({ cardRequestStatus, cardRequestRejectReason, profile = null, phone = "", profileEditable = false, onProfileSaved, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [justSent, setJustSent] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  function submit() { setCodeOpen(true); }

  async function doSubmit() {
    setCodeOpen(false);
    const token = localStorage.getItem("token");
    if (!token) return;
    setSending(true); setError("");
    const res = await fetch(`${LOANS_URL}?sub=card_request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setError(data.error || "Не удалось отправить заявку"); return; }
    setJustSent(true);
    onSuccess();
  }

  if (justSent || cardRequestStatus === "pending") {
    return (
      <div className="glass rounded-2xl overflow-hidden mb-6"
        style={{ border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.04)" }}>
        <div className="px-6 py-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.2)" }}>
            <Icon name="Clock" size={20} className="text-red-600" />
          </div>
          <div>
            <div className="text-emerald-950 font-bold">Заявка на карту РУСФИНАНС 24 на рассмотрении</div>
            <div className="text-red-600 text-sm mt-0.5">Мы сообщим вам, как только карта будет одобрена</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden mb-6"
      style={{ border: "1px solid rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.04)" }}>
      <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.2)" }}>
            <Icon name="CreditCard" size={20} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-emerald-950 font-bold">Карта РУСФИНАНС 24</div>
            <div className="text-emerald-950/40 text-sm">Подайте заявку и получите доступ к лимиту в любое время</div>
            {cardRequestStatus === "rejected" && (
              <div className="text-red-600 text-xs mt-1">
                Предыдущая заявка отклонена{cardRequestRejectReason ? `: ${cardRequestRejectReason}` : ""}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => (profile ? setOpen(!open) : submit())}
          disabled={sending}
          className="btn-neon text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-60"
        >
          {sending ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Send" size={16} />}
          {sending ? "Отправляем..." : open ? "Свернуть" : "Подать заявку на карту"}
        </button>
      </div>
      {open && profile && (
        <div className="px-6 pb-5 space-y-3">
          <ProfileCheck profile={profile} phone={phone} editable={profileEditable} onSaved={() => onProfileSaved?.()} />
          <button onClick={submit} disabled={sending}
            className="w-full btn-neon text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            <Icon name="Send" size={18} />Всё верно, отправить на рассмотрение
          </button>
        </div>
      )}
      {error && (
        <div className="px-6 pb-5">
          <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626" }}>
            {error}
          </div>
        </div>
      )}
      <SignCodeDialog open={codeOpen} title="Подпись заявки на карту" confirmLabel="Подтвердить и отправить" onClose={() => setCodeOpen(false)} onConfirm={doSubmit} />
    </div>
  );
}