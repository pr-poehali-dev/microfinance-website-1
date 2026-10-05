import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";

interface Props {
  open: boolean;
  title?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}

const newCode = () => String(Math.floor(1000 + Math.random() * 9000));

export default function SignCodeDialog({ open, title = "Цифровая подпись", confirmLabel = "Подтвердить", onClose, onConfirm }: Props) {
  const [code, setCode] = useState(newCode);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setCode(newCode()); setValue(""); setError(""); }
  }, [open]);

  const submit = () => {
    if (value.trim() !== code) { setError("Неверный код. Введите цифры, указанные выше"); return; }
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle className="text-emerald-950 text-xl flex items-center gap-2">
            <Icon name="PenLine" size={20} className="text-emerald-600" />{title}
          </DialogTitle>
          <DialogDescription className="text-emerald-950/60">
            Для подтверждения введите код из 4 цифр
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl py-4 text-center select-none" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <div className="text-emerald-950/50 text-xs mb-1">Ваш код</div>
            <div className="text-emerald-900 font-extrabold text-4xl tracking-[0.5em] pl-[0.5em]">{code}</div>
          </div>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="Введите код"
            value={value}
            onChange={(e) => { setValue(e.target.value.replace(/\D/g, "")); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (value.length === 4) submit(); } }}
            className="w-full rounded-xl px-4 py-3 text-center text-xl tracking-widest text-emerald-950 outline-none"
            style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.3)" }}
          />
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <button
            type="button"
            onClick={submit}
            disabled={value.length !== 4}
            className="w-full btn-neon text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Icon name="Check" size={18} />{confirmLabel}
          </button>
          <button
            type="button"
            onClick={() => { setCode(newCode()); setValue(""); setError(""); }}
            className="w-full text-emerald-700 text-sm underline underline-offset-2"
          >
            Получить новый код
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
