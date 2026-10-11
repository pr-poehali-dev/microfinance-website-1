import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import SignCodeDialog from "@/components/SignCodeDialog";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

interface Props {
  open: boolean;
  onSigned: () => void;
}

const POINTS = [
  "За просрочку платежа по займу или по карте РУСФИНАНС 24 ежедневно автоматически начисляется штраф 2,99% в день от суммы просроченного основного долга до полного погашения задолженности.",
  "Ежемесячное обслуживание карты РУСФИНАНС 24 стоит 399 ₽. Сумма автоматически списывается с лимита карты при активации и далее каждый месяц.",
  "За перевод денежных средств с карты РУСФИНАНС 24 на любую другую карту взимается комиссия 199 ₽ + 3,9% от суммы перевода.",
  "Остальные условия ранее заключённых договоров остаются без изменений.",
];

export default function AddendumDialog({ open, onSigned }: Props) {
  const [signOpen, setSignOpen] = useState(false);
  const [error, setError] = useState("");

  const sign = async () => {
    setSignOpen(false);
    const token = localStorage.getItem("token");
    if (!token) return;
    const r = await fetch(`${LOANS_URL}?sub=addendum_sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
      body: "{}",
    }).catch(() => null);
    if (!r || !r.ok) { setError("Не удалось сохранить подпись. Попробуйте ещё раз."); return; }
    onSigned();
  };

  return (
    <>
      <Dialog open={open && !signOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-emerald-950 text-xl flex items-center gap-2">
              <Icon name="FileText" size={20} className="text-emerald-600" />Дополнительное соглашение
            </DialogTitle>
            <DialogDescription className="text-emerald-950/60">
              К договорам займа и карте РУСФИНАНС 24. Ознакомьтесь с изменениями условий.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 text-sm text-emerald-950/80 leading-relaxed">
            {POINTS.map((t, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-emerald-600 font-bold shrink-0">{i + 1}.</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="button"
            onClick={() => setSignOpen(true)}
            className="btn-neon text-white font-semibold w-full py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Icon name="PenLine" size={16} />
            Согласен(а), подписать
          </button>
        </DialogContent>
      </Dialog>
      <SignCodeDialog
        open={open && signOpen}
        title="Подпись соглашения"
        confirmLabel="Подписать"
        onClose={() => setSignOpen(false)}
        onConfirm={sign}
      />
    </>
  );
}
