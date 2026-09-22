import { useState } from "react";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

interface Props {
  cardRequestStatus: string | null;
  cardRequestRejectReason?: string;
  onSuccess: () => void;
}

export default function CardRequestBlock({ cardRequestStatus, cardRequestRejectReason, onSuccess }: Props) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [justSent, setJustSent] = useState(false);

  async function submit() {
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
        style={{ border: "1px solid rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.04)" }}>
        <div className="px-6 py-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(251,191,36,0.2)" }}>
            <Icon name="Clock" size={20} className="text-yellow-400" />
          </div>
          <div>
            <div className="text-white font-bold">Заявка на карту РУСФИНАНС 24 на рассмотрении</div>
            <div className="text-yellow-300 text-sm mt-0.5">Мы сообщим вам, как только карта будет одобрена</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden mb-6"
      style={{ border: "1px solid rgba(234,128,52,0.35)", background: "rgba(234,128,52,0.04)" }}>
      <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(234,128,52,0.2)" }}>
            <Icon name="CreditCard" size={20} className="text-orange-400" />
          </div>
          <div>
            <div className="text-white font-bold">Карта РУСФИНАНС 24</div>
            <div className="text-white/40 text-sm">Подайте заявку и получите доступ к лимиту в любое время</div>
            {cardRequestStatus === "rejected" && (
              <div className="text-red-400 text-xs mt-1">
                Предыдущая заявка отклонена{cardRequestRejectReason ? `: ${cardRequestRejectReason}` : ""}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={submit}
          disabled={sending}
          className="btn-neon text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-60"
        >
          {sending ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Send" size={16} />}
          {sending ? "Отправляем..." : "Подать заявку на карту"}
        </button>
      </div>
      {error && (
        <div className="px-6 pb-5">
          <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
