import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const INVEST_URL = "https://functions.poehali.dev/1244293e-9832-493e-bbb5-de820fbe56c6";
const INPUT = "w-full rounded-xl px-4 py-3.5 text-emerald-950 placeholder-emerald-900/30 outline-none border border-emerald-900/15 focus:border-emerald-500";

export default function InvestorLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const r = await fetch(`${INVEST_URL}?sub=login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setLoading(false);
    if (r && r.ok) {
      localStorage.setItem("investor_token", d.token);
      navigate("/investor");
    } else {
      setError(d.error || "Ошибка соединения, попробуйте снова");
    }
  };

  return (
    <div className="min-h-screen font-golos flex flex-col" style={{ background: "#ffffff" }}>
      <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ borderBottom: "1px solid rgba(20,184,166,0.2)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="Русфинанс 24" className="w-9 h-9 rounded-xl" />
            <span className="font-oswald text-xl font-bold tracking-wide"><span className="gradient-text">РУСФИНАНС24</span></span>
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-emerald-950/60 hover:text-emerald-950 text-sm">
            <Icon name="ArrowLeft" size={16} />На главную
          </button>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 pt-24 pb-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 btn-neon rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icon name="Briefcase" size={28} className="text-white" />
            </div>
            <h1 className="font-oswald text-3xl font-bold text-emerald-950 mb-2">Вход для инвесторов</h1>
            <p className="text-emerald-950/50 text-sm">Введите номер телефона и пароль</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-emerald-950/70 text-sm mb-2 block">Номер телефона</label>
                <input className={INPUT} style={{ background: "rgba(16,185,129,0.05)" }} type="tel" placeholder="+7 (999) 000-00-00" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div>
                <label className="text-emerald-950/70 text-sm mb-2 block">Пароль</label>
                <div className="relative">
                  <input className={`${INPUT} pr-12`} style={{ background: "rgba(16,185,129,0.05)" }} type={showPass ? "text" : "password"} placeholder="Введите пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-950/40">
                    <Icon name={showPass ? "EyeOff" : "Eye"} size={16} />
                  </button>
                </div>
              </div>
              {error && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#b91c1c" }}>
                  <Icon name="AlertCircle" size={16} />{error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-neon w-full text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-base mt-2 disabled:opacity-60">
                {loading ? <><Icon name="Loader2" size={18} className="animate-spin" />Загрузка...</> : <><Icon name="LogIn" size={18} />Войти</>}
              </button>
            </form>
            <p className="text-center text-emerald-950/40 text-xs mt-5">
              Доступ к кабинету выдаётся после оформления инвестиции. Данные для входа вам сообщит менеджер.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
