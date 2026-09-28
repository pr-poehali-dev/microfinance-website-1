import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

interface User {
  id: number;
  phone: string;
  fullName: string;
  email: string;
}

interface Props {
  user: User | null;
  onLogout: () => void;
}

export default function DashboardNavbar({ user, onLogout }: Props) {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ borderBottom: "1px solid rgba(20,184,166,0.2)" }}>
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="Русфинанс 24" className="w-9 h-9 rounded-xl" />
          <span className="font-oswald text-xl font-bold tracking-wide text-emerald-950">
            <span className="gradient-text">РУСФИНАНС24</span>
          </span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-emerald-950/50 text-sm hidden md:block">{user?.phone}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-emerald-950/60 hover:text-emerald-950 transition-colors text-sm px-3 py-2 rounded-xl border border-emerald-900/15 hover:border-emerald-900/30"
          >
            <Icon name="LogOut" size={16} />
            Выйти
          </button>
        </div>
      </div>
    </nav>
  );
}