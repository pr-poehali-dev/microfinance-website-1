import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const CREDIT_DOCTOR_PRICE = 1799;

export default function CreditDoctorOffer({ pending = false }: { pending?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl p-4 space-y-3"
        style={{ background: "linear-gradient(135deg,rgba(244,63,94,0.08),rgba(236,72,153,0.06))", border: "2px solid rgba(244,63,94,0.35)" }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(244,63,94,0.15)" }}>
            <Icon name="HeartPulse" size={18} className="text-rose-600" />
          </div>
          <div>
            <div className="text-emerald-950 font-semibold text-sm leading-snug">
              {pending ? "Для рассмотрения заявки оплатите услугу «Кредитный Доктор»" : "Вы можете воспользоваться услугой «Кредитный Доктор»"}
            </div>
            <div className="text-emerald-950/50 text-xs mt-1">
              Программа для клиентов с плохой кредитной историей: помогает получить деньги и исправить кредитную историю
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#be123c,#f43f5e)", boxShadow: "0 4px 20px rgba(244,63,94,0.3)" }}>
          <Icon name="HeartPulse" size={18} />
          {pending ? `Оплатить ${CREDIT_DOCTOR_PRICE.toLocaleString("ru-RU")} ₽` : "Оформить Кредитный Доктор"}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-24px)] rounded-2xl">
          <DialogHeader>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center" style={{ background: "rgba(244,63,94,0.12)" }}>
              <Icon name="PartyPopper" fallback="HeartPulse" size={28} className="text-rose-600" />
            </div>
            <DialogTitle className="text-center font-oswald text-2xl text-emerald-950">Поздравляем!</DialogTitle>
            <DialogDescription className="text-center text-emerald-950/70 text-sm leading-relaxed">
              Вам доступен «Кредитный Доктор». Вы в одном шаге от получения денег и исправления кредитной истории.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl py-4 text-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <div className="text-emerald-950/50 text-xs mb-1">Стоимость услуги</div>
            <div className="font-oswald text-4xl font-bold text-emerald-700">{CREDIT_DOCTOR_PRICE.toLocaleString("ru-RU")} ₽</div>
          </div>
          <p className="text-center text-emerald-950/60 text-sm">Оплата онлайн временно недоступна. Для оформления услуги свяжитесь с нами через раздел «Поддержка».</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
