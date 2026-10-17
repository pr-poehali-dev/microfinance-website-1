import Icon from "@/components/ui/icon";

export type InvestorSection = "invest" | "request" | "topup" | "payouts" | "cards" | "docs";

const ITEMS: { key: InvestorSection; label: string; icon: string }[] = [
  { key: "invest", label: "Мои инвестиции", icon: "TrendingUp" },
  { key: "request", label: "Заявка на инвестицию", icon: "FilePlus" },
  { key: "topup", label: "Пополнить баланс", icon: "PlusCircle" },
  { key: "payouts", label: "Выплаты", icon: "Wallet" },
  { key: "cards", label: "Карты", icon: "CreditCard" },
  { key: "docs", label: "Договоры", icon: "FileText" },
];

interface Props {
  active: InvestorSection;
  onChange: (s: InvestorSection) => void;
}

export default function InvestorSidebar({ active, onChange }: Props) {
  return (
    <aside className="md:w-64 shrink-0">
      <div className="md:sticky md:top-28">
        <div className="hidden md:block font-oswald text-lg font-bold text-emerald-950 mb-3 px-2">Кабинет инвестора</div>
        <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
          {ITEMS.map((it) => {
            const on = it.key === active;
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => onChange(it.key)}
                className="flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-colors text-left"
                style={on
                  ? { background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "#ffffff" }
                  : { background: "rgba(16,185,129,0.07)", color: "#064e3b" }}
              >
                <Icon name={it.icon} size={18} />
                {it.label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
