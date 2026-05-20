import Icon from "@/components/ui/icon";
import { GLASS, PURPLE } from "./adminTypes";

interface Props {
  pwd: string;
  setPwd: (v: string) => void;
  err: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const S = { background: "#0F0A1E", minHeight: "100vh" };

export default function AdminLogin({ pwd, setPwd, err, loading, onSubmit }: Props) {
  return (
    <div style={{ ...S, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 360, padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, ...PURPLE, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Icon name="ShieldCheck" size={28} className="text-white" />
          </div>
          <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, margin: 0 }}>Панель администратора</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 8 }}>Введите пароль для входа</p>
        </div>
        <form onSubmit={onSubmit} style={{ ...GLASS, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="password" required placeholder="Пароль" value={pwd} onChange={e => setPwd(e.target.value)}
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "14px 16px", color: "white", fontSize: 16, outline: "none", width: "100%", boxSizing: "border-box" }} />
          {err && <p style={{ color: "#f87171", margin: 0, fontSize: 14 }}>{err}</p>}
          <button type="submit" disabled={loading}
            style={{ ...PURPLE, color: "white", fontWeight: 700, fontSize: 16, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><Icon name="Loader2" size={18} className="animate-spin" />Вход...</> : <><Icon name="LogIn" size={18} />Войти</>}
          </button>
        </form>
      </div>
    </div>
  );
}
