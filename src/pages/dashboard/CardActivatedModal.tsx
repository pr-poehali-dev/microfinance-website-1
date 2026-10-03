import Icon from "@/components/ui/icon";

interface Props {
  limit: number;
  rate: number;
  days?: number | null;
  onClose: () => void;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export default function CardActivatedModal({ limit, rate, days, onClose }: Props) {
  const rows = [
    { label: "Лимит карты", value: fmt(limit) },
    { label: "Ставка", value: `${rate || 24}% в неделю` },
    { label: "Срок", value: days ? `${days} дн.` : "—" },
    { label: "Платежи", value: "раз в неделю, от 30% долга" },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 300, background: "rgba(2,44,34,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl p-7 text-center"
        style={{ background: "#ffffff", border: "1px solid rgba(16,185,129,0.3)", boxShadow: "0 20px 60px rgba(16,185,129,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)" }}
        >
          <Icon name="Check" size={32} className="text-white" />
        </div>
        <h3 className="font-oswald text-2xl font-bold text-emerald-950 mb-1">Карта активирована!</h3>
        <p className="text-emerald-950/60 text-sm mb-5">
          Кредитный договор подписан. Теперь вы можете переводить деньги из лимита на свою карту.
        </p>

        <div className="rounded-2xl p-4 mb-5 space-y-2 text-left" style={{ background: "rgba(16,185,129,0.06)" }}>
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-3 text-sm">
              <span className="text-emerald-950/50">{r.label}</span>
              <span className="text-emerald-950 font-semibold text-right">{r.value}</span>
            </div>
          ))}
          <div className="text-emerald-950/50 text-xs pt-2" style={{ borderTop: "1px solid rgba(16,185,129,0.15)" }}>
            График платежей с датами появится, как только вы переведёте деньги из лимита на свою карту.
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn-neon w-full text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
        >
          <Icon name="Wallet" size={18} />
          Перейти к карте
        </button>
      </div>
    </div>
  );
}
