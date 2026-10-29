import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";

const PAY_URL = "https://functions.poehali.dev/64ba6f22-6243-4b3f-ab24-f5bb294d5bfe";
export const BIND_PRICE = 59;

const post = (sub: string, body: object) =>
  fetch(`${PAY_URL}?sub=${sub}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }));

export async function isCardBound(phone: string): Promise<boolean> {
  try {
    const r = await post("bind_check", { phone });
    return !!r.d.bound;
  } catch {
    return false;
  }
}

const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

interface Props {
  open: boolean;
  phone: string;
  onClose: () => void;
  onBound: () => void;
}

export default function CardBindDialog({ open, phone, onClose, onBound }: Props) {
  const [card, setCard] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [payLink, setPayLink] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };

  useEffect(() => {
    if (open) { setError(""); setWaiting(false); setPayLink(""); setBusy(false); }
    return stop;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    isCardBound(phone).then((b) => { if (b) onBound(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startPolling = useCallback((paymentId: string) => {
    stop();
    let tries = 0;
    timer.current = setInterval(async () => {
      tries += 1;
      const r = await post("bind_status", { paymentId }).catch(() => null);
      if (r?.d.bound) { stop(); setWaiting(false); onBound(); return; }
      if (tries > 150) { stop(); setWaiting(false); setError("Оплата не подтверждена. Если вы оплатили, подождите минуту и нажмите «Оплатить» ещё раз — повторно платить не придётся."); }
    }, 4000);
  }, [onBound]);

  const pay = async () => {
    setError("");
    if (card.replace(/\D/g, "").length < 16) { setError("Введите номер карты полностью (16–19 цифр)"); return; }
    setBusy(true);
    const win = window.open("", "_blank");
    const r = await post("bind_create", { phone, cardNumber: card, returnUrl: `${window.location.origin}/pay-done` }).catch(() => null);
    setBusy(false);
    if (!r || !r.ok || !r.d.confirmationUrl) {
      win?.close();
      setError(r?.d?.error || "Не удалось открыть оплату. Попробуйте ещё раз.");
      return;
    }
    if (win) win.location.href = r.d.confirmationUrl; else setPayLink(r.d.confirmationUrl);
    setWaiting(true);
    startPolling(r.d.paymentId);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { stop(); onClose(); } }}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-emerald-950 text-xl flex items-center gap-2">
            <Icon name="CreditCard" size={20} className="text-emerald-600" />Привяжите свою карту
          </DialogTitle>
          <DialogDescription className="text-emerald-950/60">
            Без привязки карты заявку отправить нельзя. Привязка стоит {BIND_PRICE} ₽ — после оплаты карта закрепится за вашим личным кабинетом, а заявка уйдёт на рассмотрение.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-emerald-950/70 text-sm mb-1.5 block font-medium">Номер вашей карты <span className="text-red-500">*</span></label>
            <input
              type="text" inputMode="numeric" autoComplete="cc-number" value={card} disabled={waiting}
              onChange={(e) => { setCard(fmtCard(e.target.value)); setError(""); }}
              placeholder="0000 0000 0000 0000"
              className="w-full px-4 py-3 rounded-xl text-emerald-950 font-mono tracking-wide outline-none"
              style={{ background: "#fff", border: "1px solid rgba(16,185,129,0.35)" }}
            />
          </div>
          {error && <div className="rounded-lg px-3 py-2 text-sm text-red-700" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>{error}</div>}
          {waiting ? (
            <div className="rounded-xl px-4 py-4 text-center space-y-2" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Icon name="Loader2" size={22} className="animate-spin text-emerald-600 mx-auto" />
              <div className="text-emerald-950 font-semibold text-sm">Ждём подтверждения оплаты...</div>
              <div className="text-emerald-950/60 text-xs">Оплатите {BIND_PRICE} ₽ во вкладке с оплатой и вернитесь сюда. Эта страница обновится сама.</div>
            </div>
          ) : (
            <button type="button" onClick={pay} disabled={busy}
              className="w-full btn-neon text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Lock" size={18} />}
              Оплатить {BIND_PRICE} ₽ и привязать карту
            </button>
          )}
          {payLink && (
            <a href={payLink} target="_blank" rel="noopener noreferrer" className="block text-center text-emerald-700 text-sm font-semibold underline">Открыть страницу оплаты</a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
