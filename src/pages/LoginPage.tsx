import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/81fdd868-863a-42d5-acf7-ab535f8cadae";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ phone: "", password: "", fullName: "", email: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка"); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch {
      setError("Ошибка соединения, попробуйте снова");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-golos hero-bg flex flex-col" style={{ background: "#0F0A1E" }}>
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ borderBottom: "1px solid rgba(168,85,247,0.2)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center">
              <Icon name="Wallet" size={20} className="text-white" />
            </div>
            <span className="font-oswald text-xl font-bold tracking-wide text-white">
              PARA<span className="gradient-text">FINANS24</span>
            </span>
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <Icon name="ArrowLeft" size={16} />
            На главную
          </button>
        </div>
      </nav>

      {/* FORM */}
      <div className="flex-1 flex items-center justify-center px-4 pt-24 pb-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 btn-neon rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icon name="User" size={28} className="text-white" />
            </div>
            <h1 className="font-oswald text-3xl font-bold text-white mb-2">
              {mode === "login" ? "Вход в кабинет" : "Регистрация"}
            </h1>
            <p className="text-white/50 text-sm">
              {mode === "login" ? "Введите номер телефона и пароль" : "Создайте аккаунт для доступа к кабинету"}
            </p>
          </div>

          <div className="glass rounded-2xl p-6">
            {/* TABS */}
            <div className="flex rounded-xl mb-6 p-1" style={{ background: "rgba(255,255,255,0.05)" }}>
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={mode === m ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" } : { color: "rgba(255,255,255,0.5)" }}
                >
                  {m === "login" ? "Войти" : "Регистрация"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="text-white/70 text-sm mb-2 block">ФИО</label>
                  <input
                    type="text"
                    placeholder="Иванов Иван Иванович"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  />
                </div>
              )}

              <div>
                <label className="text-white/70 text-sm mb-2 block">Номер телефона</label>
                <div className="relative">
                  <Icon name="Phone" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="tel"
                    placeholder="+7 (999) 000-00-00"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    className="w-full rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  />
                </div>
              </div>

              {mode === "register" && (
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Email (необязательно)</label>
                  <input
                    type="email"
                    placeholder="example@mail.ru"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  />
                </div>
              )}

              <div>
                <label className="text-white/70 text-sm mb-2 block">Пароль</label>
                <div className="relative">
                  <Icon name="Lock" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Введите пароль"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full rounded-xl pl-10 pr-12 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    <Icon name={showPass ? "EyeOff" : "Eye"} size={16} />
                  </button>
                </div>
                {mode === "register" && <p className="text-white/30 text-xs mt-1">Минимум 6 символов</p>}
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                  <Icon name="AlertCircle" size={16} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-neon w-full text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-base mt-2"
              >
                {loading
                  ? <><Icon name="Loader2" size={18} className="animate-spin" /> Загрузка...</>
                  : <><Icon name={mode === "login" ? "LogIn" : "UserPlus"} size={18} /> {mode === "login" ? "Войти" : "Создать аккаунт"}</>
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
