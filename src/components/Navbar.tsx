import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const NAV_LINKS = [
  { label: "Главная", href: "#home" },
  { label: "Услуги", href: "#services" },
  { label: "Инвестиции", href: "#invest" },
  { label: "Отзывы", href: "#reviews" },
  { label: "Контакты", href: "#contacts" },
  { label: "FAQ", href: "#faq" },
];

interface NavbarProps {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  scrollTo: (href: string) => void;
}

export default function Navbar({ mobileOpen, setMobileOpen, scrollTo }: NavbarProps) {
  const navigate = useNavigate();
  return (
    <nav className="sticky top-0 left-0 right-0 z-50 w-full glass" style={{ borderBottom: "1px solid rgba(16,185,129,0.15)" }}>
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 shrink-0">
          <img src="/logo-icon.png" alt="Русфинанс 24" className="w-9 h-9 rounded-xl" />
          <span className="font-oswald text-xl font-bold tracking-wide text-emerald-950">
            <span className="gradient-text">РУСФИНАНС24</span>
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="text-sm whitespace-nowrap text-emerald-950/70 hover:text-emerald-600 transition-colors"
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => navigate("/card")}
            className="text-sm font-semibold whitespace-nowrap gradient-text hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            <Icon name="CreditCard" size={14} />
            Карта
          </button>
        </div>

        <div className="hidden xl:flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate(localStorage.getItem("token") ? "/dashboard" : "/login")}
            className="btn-neon flex items-center gap-2 whitespace-nowrap text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            <Icon name="User" size={15} />
            {localStorage.getItem("token") ? "Кабинет" : "Войти для заёмщиков"}
          </button>
          <button
            onClick={() => navigate(localStorage.getItem("investor_token") ? "/investor" : "/investor/login")}
            className="flex items-center gap-2 whitespace-nowrap text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90"
            style={{ background: "#064e3b", boxShadow: "0 4px 14px rgba(6,78,59,0.25)" }}
          >
            <Icon name="Briefcase" size={15} />
            Войти для инвесторов
          </button>
        </div>

        <button
          className="xl:hidden text-emerald-950 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Icon name={mobileOpen ? "X" : "Menu"} size={24} />
        </button>
      </div>

      {mobileOpen && (
        <div className="xl:hidden glass border-t border-emerald-900/10 px-4 py-4 flex flex-col gap-3">
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="text-left text-emerald-950/80 hover:text-emerald-600 py-2 transition-colors"
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => { setMobileOpen(false); navigate("/card"); }}
            className="text-left gradient-text font-semibold py-2 flex items-center gap-2"
          >
            <Icon name="CreditCard" size={16} />
            Карта РУСФИНАНС 24
          </button>
          <button
            onClick={() => { setMobileOpen(false); navigate(localStorage.getItem("token") ? "/dashboard" : "/login"); }}
            className="btn-neon text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
          >
            <Icon name="User" size={16} />
            {localStorage.getItem("token") ? "Личный кабинет" : "Войти для заёмщиков"}
          </button>
          <button
            onClick={() => { setMobileOpen(false); navigate(localStorage.getItem("investor_token") ? "/investor" : "/investor/login"); }}
            className="text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
            style={{ background: "#064e3b" }}
          >
            <Icon name="Briefcase" size={16} />
            Войти для инвесторов
          </button>
        </div>
      )}
    </nav>
  );
}
