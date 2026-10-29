import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

export default function PayDonePage() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => window.close(), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#fff" }}>
      <div className="max-w-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(16,185,129,0.15)" }}>
          <Icon name="CheckCircle" size={32} className="text-emerald-600" />
        </div>
        <h1 className="font-oswald text-2xl font-bold text-emerald-950">Спасибо за оплату</h1>
        <p className="text-emerald-950/60 text-sm">Вернитесь на вкладку с заявкой — она продолжится автоматически. Эту вкладку можно закрыть.</p>
        <button onClick={() => navigate("/dashboard")} className="btn-neon text-white font-semibold px-6 py-3 rounded-xl">В личный кабинет</button>
      </div>
    </div>
  );
}
