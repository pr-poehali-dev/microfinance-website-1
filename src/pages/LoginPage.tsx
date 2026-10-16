import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/81fdd868-863a-42d5-acf7-ab535f8cadae";


export default function LoginPage() {
  const navigate = useNavigate();
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
        body: JSON.stringify({ action: "login", ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка");
        return;
      }
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
    <div className="min-h-screen font-golos hero-bg flex flex-col" style={{ background: "#ffffff" }}>
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ borderBottom: "1px solid rgba(20,184,166,0.2)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="Русфинанс 24" className="w-9 h-9 rounded-xl" />
            <span className="font-oswald text-xl font-bold tracking-wide text-emerald-950">
              <span className="gradient-text">РУСФИНАНС24</span>
            </span>
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-emerald-950/60 hover:text-emerald-950 transition-colors text-sm">
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
            <h1 className="font-oswald text-3xl font-bold text-emerald-950 mb-2">Вход для заёмщиков</h1>
            <p className="text-emerald-950/50 text-sm">Введите номер телефона и пароль</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-emerald-950/70 text-sm mb-2 block">Номер телефона</label>
                <div className="relative">
                  <Icon name="Phone" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-950/40" />
                  <input
                    type="text"
                    placeholder="+7 (999) 000-00-00"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    className="w-full rounded-xl pl-10 pr-4 py-3.5 text-emerald-950 placeholder-emerald-900/30 outline-none border border-emerald-900/15 focus:border-emerald-500 transition-colors"
                    style={{ background: "rgba(16,185,129,0.05)" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-emerald-950/70 text-sm mb-2 block">Пароль</label>
                <div className="relative">
                  <Icon name="Lock" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-950/40" />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Введите пароль"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full rounded-xl pl-10 pr-12 py-3.5 text-emerald-950 placeholder-emerald-900/30 outline-none border border-emerald-900/15 focus:border-emerald-500 transition-colors"
                    style={{ background: "rgba(16,185,129,0.05)" }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-950/40 hover:text-emerald-950/70">
                    <Icon name={showPass ? "EyeOff" : "Eye"} size={16} />
                  </button>
                </div>
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
                  : <><Icon name="LogIn" size={18} /> Войти</>
                }
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}