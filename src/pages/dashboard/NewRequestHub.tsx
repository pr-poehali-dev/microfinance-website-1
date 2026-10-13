import { useState, ReactNode } from "react";
import Icon from "@/components/ui/icon";
import CardRequestBlock from "./CardRequestBlock";
import TermLoanRequestForm from "./TermLoanRequestForm";
import type { ClientProfile } from "./ClientProfileCard";

type Tab = "cash" | "card" | "car" | "shop";

interface Props {
  phone: string;
  profile: ClientProfile | null;
  profileEditable: boolean;
  cashForm: ReactNode | null;
  hasCard: boolean;
  cardRequestStatus: string | null;
  cardRequestRejectReason?: string;
  onRefresh: () => void;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "cash", label: "Займ наличными", icon: "Banknote" },
  { id: "card", label: "Карта РУСФИНАНС 24", icon: "CreditCard" },
  { id: "car", label: "Под залог авто", icon: "Car" },
  { id: "shop", label: "Займ на покупки", icon: "ShoppingCart" },
];

function Note({ text }: { text: string }) {
  return (
    <div className="rounded-xl px-4 py-4 flex items-start gap-3" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
      <Icon name="Info" size={18} className="text-emerald-600 shrink-0 mt-0.5" />
      <div className="text-emerald-950/70 text-sm">{text}</div>
    </div>
  );
}

export default function NewRequestHub({ phone, profile, profileEditable, cashForm, hasCard, cardRequestStatus, cardRequestRejectReason, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>("cash");

  return (
    <div className="glass rounded-2xl p-6 mb-6">
      <h2 className="font-oswald text-2xl font-bold text-emerald-950 mb-1">Новая заявка</h2>
      <p className="text-emerald-950/50 text-sm mb-4">Данные анкеты подставятся автоматически — проверьте их и отправьте заявку, не выходя из кабинета.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors"
            style={tab === t.id
              ? { background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "#fff", border: "1px solid transparent" }
              : { background: "rgba(16,185,129,0.07)", color: "#022c22", border: "1px solid rgba(16,185,129,0.25)" }}>
            <Icon name={t.icon} size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab === "cash" && (cashForm ?? <Note text="Новую заявку на займ наличными можно подать, когда нет действующего займа или заявки на рассмотрении." />)}

      {tab === "card" && (hasCard
        ? <Note text="Карта РУСФИНАНС 24 уже оформлена. Она доступна в разделе «Мои карты»." />
        : <CardRequestBlock
            cardRequestStatus={cardRequestStatus}
            cardRequestRejectReason={cardRequestRejectReason}
            profile={profile}
            phone={phone}
            profileEditable={profileEditable}
            onProfileSaved={onRefresh}
            onSuccess={onRefresh}
          />)}

      {tab === "car" && (
        <TermLoanRequestForm key="car" kind="car" profile={profile} phone={phone} profileEditable={profileEditable} onProfileSaved={onRefresh} onSuccess={onRefresh} />
      )}
      {tab === "shop" && (
        <TermLoanRequestForm key="shop" kind="shop" profile={profile} phone={phone} profileEditable={profileEditable} onProfileSaved={onRefresh} onSuccess={onRefresh} />
      )}
    </div>
  );
}
