import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import CardBindDialog, { BIND_PRICE, isCardBound } from "@/components/CardBindDialog";

export default function CardBindBanner({ phone }: { phone: string }) {
  const [bound, setBound] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!phone) return;
    isCardBound(phone).then(setBound);
  }, [phone]);

  if (bound !== false) return null;

  return (
    <div className="rounded-2xl px-4 sm:px-6 py-4 mb-6 flex items-center justify-between gap-4 flex-wrap"
      style={{ border: "1px solid rgba(245,158,11,0.45)", background: "rgba(245,158,11,0.08)" }}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.2)" }}>
          <Icon name="CreditCard" size={20} className="text-amber-600" />
        </div>
        <div>
          <div className="text-emerald-950 font-bold">Привяжите свою карту</div>
          <div className="text-emerald-950/60 text-sm">Без привязки карты заявки отправить нельзя. Стоимость — {BIND_PRICE} ₽, платится один раз.</div>
        </div>
      </div>
      <button onClick={() => setOpen(true)} className="btn-neon text-white font-semibold px-5 py-3 rounded-xl flex items-center gap-2">
        <Icon name="Lock" size={16} />Привязать за {BIND_PRICE} ₽
      </button>
      <CardBindDialog open={open} phone={phone} onClose={() => setOpen(false)} onBound={() => { setOpen(false); setBound(true); }} />
    </div>
  );
}
