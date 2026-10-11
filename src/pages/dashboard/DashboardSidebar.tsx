import Icon from "@/components/ui/icon";

export type DashboardSection = "apps" | "history" | "repay" | "new" | "cards" | "docs" | "profile";

const ITEMS: { key: DashboardSection; label: string; icon: string }[] = [
  { key: "apps", label: "Мои заявки", icon: "ClipboardList" },
  { key: "history", label: "История займов", icon: "History" },
  { key: "repay", label: "История выплат", icon: "Wallet" },
  { key: "new", label: "Новая заявка", icon: "FilePlus" },
  { key: "cards", label: "Мои карты", icon: "CreditCard" },
  { key: "docs", label: "Документы", icon: "FileText" },
  { key: "profile", label: "Профиль", icon: "User" },
];

interface Props {
  active: DashboardSection;
  onChange: (s: DashboardSection) => void;
}

export default function DashboardSidebar({ active, onChange }: Props) {
  return (
    <aside className="md:w-60 shrink-0">
      <div className="md:sticky md:top-28">
        <div className="hidden md:block font-oswald text-lg font-bold text-emerald-950 mb-3 px-2">Личный кабинет</div>
        <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
          {ITEMS.map((it) => {
            const on = it.key === active;
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => onChange(it.key)}
                className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-colors text-left ${on ? "btn-neon text-white" : "glass text-emerald-950/70 hover:text-emerald-950"}`}
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
