import { useState } from "react";
import Icon from "@/components/ui/icon";
import SignCodeDialog from "@/components/SignCodeDialog";
import SavedCardPicker from "@/components/SavedCardPicker";
import LoanCalculatorCard from "./LoanCalculatorCard";
import ProfileCheck from "./ProfileCheck";
import type { ClientProfile } from "./ClientProfileCard";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

interface Props {
  kind: "car" | "shop";
  profile: ClientProfile | null;
  phone: string;
  profileEditable: boolean;
  onProfileSaved: () => void;
  onSuccess: () => void;
}

const INPUT = "w-full rounded-xl px-3 py-2.5 text-sm text-emerald-950 outline-none";
const INPUT_STYLE = { background: "#fff", border: "1px solid rgba(16,185,129,0.3)" } as const;

export default function TermLoanRequestForm({ kind, profile, phone, profileEditable, onProfileSaved, onSuccess }: Props) {
  const isCar = kind === "car";
  const min = isCar ? 100000 : 3000;
  const max = isCar ? 1000000 : 150000;
  const step = isCar ? 10000 : 1000;
  const maxMonths = isCar ? 36 : 24;
  const rate = isCar ? 0.12 : 0.09;

  const [amount, setAmount] = useState(isCar ? 300000 : 30000);
  const [months, setMonths] = useState(12);
  const [cardNumber, setCardNumber] = useState("");
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [carMileage, setCarMileage] = useState("");
  const [shopName, setShopName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const total = Math.round(amount * (1 + rate * months));
  const monthly = Math.round(total / months);

  function submit() {
    const digits = cardNumber.replace(/\D/g, "");
    if (!(digits.length === 10 || digits.length === 11 || (digits.length >= 16 && digits.length <= 19))) {
      setError("Укажите номер карты (16–19 цифр) или телефон СБП, куда перевести деньги"); return;
    }
    if (isCar && (!carBrand.trim() || !carModel.trim() || !carYear)) { setError("Заполните марку, модель и год автомобиля"); return; }
    if (!isCar && !itemName.trim()) { setError("Укажите название товара"); return; }
    if (!profile) { setError("Сначала должна быть заполнена анкета"); return; }
    setError("");
    setCodeOpen(true);
  }

  async function doSubmit() {
    setCodeOpen(false);
    const token = localStorage.getItem("token");
    if (!token) return;
    setSending(true); setError("");
    const res = await fetch(`${LOANS_URL}?sub=term_request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        kind, amount, months, cardNumber: cardNumber.trim(),
        ...(isCar ? { carBrand, carModel, carYear, carMileage } : { shopName, itemName, itemPrice }),
      }),
    }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (!res || !res.ok) { setError(d.error || "Не удалось отправить заявку"); return; }
    setDone(true);
    onSuccess();
  }

  if (done) {
    return (
      <div className="rounded-2xl px-6 py-5 flex items-center gap-3" style={{ border: "1px solid rgba(74,222,128,0.4)", background: "rgba(74,222,128,0.06)" }}>
        <Icon name="CheckCircle" size={24} className="text-green-500 shrink-0" />
        <div>
          <div className="text-emerald-950 font-bold">Заявка отправлена на рассмотрение</div>
          <div className="text-emerald-950/50 text-sm mt-0.5">Статус появится в разделе «Мои заявки»</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProfileCheck profile={profile} phone={phone} editable={profileEditable} onSaved={onProfileSaved} />

      {isCar ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block"><span className="text-emerald-950/50 text-xs mb-1 block">Марка</span>
            <input className={INPUT} style={INPUT_STYLE} value={carBrand} onChange={(e) => setCarBrand(e.target.value)} placeholder="Toyota" /></label>
          <label className="block"><span className="text-emerald-950/50 text-xs mb-1 block">Модель</span>
            <input className={INPUT} style={INPUT_STYLE} value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder="Camry" /></label>
          <label className="block"><span className="text-emerald-950/50 text-xs mb-1 block">Год выпуска</span>
            <input type="number" className={INPUT} style={INPUT_STYLE} value={carYear} onChange={(e) => setCarYear(e.target.value)} placeholder="2020" /></label>
          <label className="block"><span className="text-emerald-950/50 text-xs mb-1 block">Пробег, км</span>
            <input type="number" className={INPUT} style={INPUT_STYLE} value={carMileage} onChange={(e) => setCarMileage(e.target.value)} placeholder="50000" /></label>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block"><span className="text-emerald-950/50 text-xs mb-1 block">Магазин</span>
            <input className={INPUT} style={INPUT_STYLE} value={shopName} onChange={(e) => setShopName(e.target.value)} /></label>
          <label className="block"><span className="text-emerald-950/50 text-xs mb-1 block">Товар</span>
            <input className={INPUT} style={INPUT_STYLE} value={itemName} onChange={(e) => setItemName(e.target.value)} /></label>
          <label className="block"><span className="text-emerald-950/50 text-xs mb-1 block">Цена товара, ₽</span>
            <input type="number" className={INPUT} style={INPUT_STYLE} value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} /></label>
        </div>
      )}

      <LoanCalculatorCard
        amount={amount} amountMin={min} amountMax={max} amountStep={step} onAmount={setAmount}
        term={months} termMin={1} termMax={maxMonths} termUnit="мес." onTerm={setMonths}
        total={total} overpay={total - amount}
        extraLabel="Платёж в месяц" extraValue={monthly}
      />

      <div>
        <div className="text-emerald-950/60 text-sm mb-2">Карта или телефон СБП для получения денег <span className="text-red-500">*</span></div>
        <SavedCardPicker autoFill value={cardNumber} onPick={setCardNumber} />
        <input type="text" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}
          placeholder="2200 1234 5678 9012 или +7 900 000-00-00" className={INPUT} style={INPUT_STYLE} />
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626" }}>{error}</div>
      )}
      <button onClick={submit} disabled={sending}
        className="w-full btn-neon text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
        {sending ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Send" size={18} />}
        {sending ? "Отправляем..." : "Отправить на рассмотрение"}
      </button>
      <SignCodeDialog open={codeOpen} title="Подпись заявки" confirmLabel="Подтвердить и отправить" onClose={() => setCodeOpen(false)} onConfirm={doSubmit} />
    </div>
  );
}
