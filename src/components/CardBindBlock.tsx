import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import CardBindDialog, { BIND_PRICE, isCardBound } from "@/components/CardBindDialog";

interface Props {
  phone: string;
  bound: boolean;
  onBoundChange: (v: boolean) => void;
}

export default function CardBindBlock({ phone, bound, onBoundChange }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (phone.replace(/\D/g, "").length >= 10) isCardBound(phone).then(onBoundChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  useEffect(() => {
    if (bound) return;
    const recheck = () => {
      if (document.hidden || phone.replace(/\D/g, "").length < 10) return;
      isCardBound(phone).then((v) => { if (v) onBoundChange(true); });
    };
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    const timer = setInterval(recheck, 5000);
    return () => {
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
      clearInterval(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bound, phone]);

  if (bound) {
    return (
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.35)" }}>
        <Icon name="CheckCircle" size={20} className="text-emerald-600 shrink-0" />
        <span className="text-emerald-950 text-sm font-semibold">Карта привязана к личному кабинету</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl px-4 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.45)" }}>
      <div className="flex items-center gap-3">
        <Icon name="CreditCard" size={22} className="text-amber-600 shrink-0" />
        <div>
          <div className="text-emerald-950 font-semibold text-sm">Привяжите свою карту</div>
          <div className="text-emerald-950/60 text-xs">Перед отправкой заявки нужно привязать карту. Стоимость — {BIND_PRICE} ₽, оплата один раз.</div>
        </div>
      </div>
      <button type="button" onClick={() => setOpen(true)} className="btn-neon text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2">
        <Icon name="Lock" size={16} />Привязать за {BIND_PRICE} ₽
      </button>
      <CardBindDialog open={open} phone={phone} onClose={() => setOpen(false)} onBound={() => { setOpen(false); onBoundChange(true); }} />
    </div>
  );
}
