import Icon from "@/components/ui/icon";

type MainTab = "applications" | "clients";

interface Props {
  mainTab: MainTab;
  setMainTab: (t: MainTab) => void;
  appsFilter: string;
  applicationsCount: number;
  onRefresh: () => void;
  onLogout: () => void;
}

export default function AdminNavbar({ mainTab, setMainTab, appsFilter, applicationsCount, onRefresh, onLogout }: Props) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ borderBottom: "1px solid rgba(168,85,247,0.2)" }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 btn-neon rounded-lg flex items-center justify-center">
            <Icon name="ShieldCheck" size={16} className="text-white" />
          </div>
          <span className="font-oswald text-lg font-bold text-white hidden sm:block">Администратор</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setMainTab("applications")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all relative"
              style={mainTab === "applications"
                ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
              <Icon name="FileText" size={14} />Заявки
              {applicationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                  {applicationsCount}
                </span>
              )}
            </button>
            <button onClick={() => setMainTab("clients")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={mainTab === "clients"
                ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
              <Icon name="Users" size={14} />Клиенты
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Icon name="RefreshCw" size={16} />
          </button>
          <button onClick={onLogout} className="flex items-center gap-2 text-white/60 hover:text-white text-sm px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-all">
            <Icon name="LogOut" size={14} />Выйти
          </button>
        </div>
      </div>
    </nav>
  );
}