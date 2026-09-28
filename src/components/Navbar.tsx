import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const NAV_LINKS = [
  { label: "Главная", href: "#home" },
  { label: "О компании", href: "#about" },
  { label: "Услуги", href: "#services" },
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
        <div className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="Русфинанс 24" className="w-9 h-9 rounded-xl" />
          <span className="font-oswald text-xl font-bold tracking-wide text-emerald-950">
            <span className="gradient-text">РУСФИНАНС24</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="text-sm text-emerald-950/70 hover:text-emerald-600 transition-colors"
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => navigate("/card")}
            className="text-sm font-semibold gradient-text hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            <Icon name="CreditCard" size={14} />
            Карта
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate(localStorage.getItem("token") ? "/dashboard" : "/login")}
            className="flex items-center gap-2 text-sm text-emerald-950/70 hover:text-emerald-950 border border-emerald-900/15 hover:border-emerald-500 px-4 py-2.5 rounded-xl transition-all"
          >
            <Icon name="User" size={15} />
            {localStorage.getItem("token") ? "Кабинет" : "Войти"}
          </button>
          <button
            onClick={() => navigate("/apply")}
            className="btn-neon text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            Получить займ
          </button>
        </div>

        <button
          className="md:hidden text-emerald-950 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Icon name={mobileOpen ? "X" : "Menu"} size={24} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden glass border-t border-emerald-900/10 px-4 py-4 flex flex-col gap-3">
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
            className="text-left text-emerald-950/80 hover:text-emerald-600 py-2 flex items-center gap-2 transition-colors"
          >
            <Icon name="User" size={16} />
            {localStorage.getItem("token") ? "Личный кабинет" : "Войти в кабинет"}
          </button>
          <button
            onClick={() => { setMobileOpen(false); navigate("/apply"); }}
            className="btn-neon text-white font-semibold py-3 rounded-xl mt-2"
          >
            Получить займ
          </button>
        </div>
      )}
    </nav>
  );
}
