import Icon from "@/components/ui/icon";

interface Props {
  password: string;
  setPassword: (v: string) => void;
  loginErr: string;
  loginLoad: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export default function AdminLogin({ password, setPassword, loginErr, loginLoad, onSubmit, onBack }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0F0A1E" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 btn-neon rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="ShieldCheck" size={28} className="text-white" />
          </div>
          <h1 className="font-oswald text-3xl font-bold text-white">Панель администратора</h1>
          <p className="text-white/40 text-sm mt-1">Введите пароль для входа</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Пароль</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>
            {loginErr && <p className="text-red-400 text-sm flex items-center gap-2"><Icon name="AlertCircle" size={14} />{loginErr}</p>}
            <button type="submit" disabled={loginLoad} className="btn-neon w-full text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
              {loginLoad ? <><Icon name="Loader2" size={16} className="animate-spin" />Вход...</> : <><Icon name="LogIn" size={16} />Войти</>}
            </button>
          </form>
        </div>
        <button onClick={onBack} className="mt-4 w-full text-white/40 hover:text-white/70 text-sm flex items-center justify-center gap-2 transition-colors">
          <Icon name="ArrowLeft" size={14} />На главную
        </button>
      </div>
    </div>
  );
}
