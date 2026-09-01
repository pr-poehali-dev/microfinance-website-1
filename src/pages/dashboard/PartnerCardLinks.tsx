import Icon from "@/components/ui/icon";

const LINKS = [
  { href: "https://pxl.leads.su/click/d43f54caff32604b0fc6d561bd35176b", label: "Партнёр №1", color: "#7c3aed" },
  { href: "https://pxl.leads.su/click/7f2581de7fb2fdca76f71fbac99adf14", label: "Партнёр №2", color: "#06b6d4" },
];

export default function PartnerCardLinks() {
  return (
    <div className="rounded-xl p-4 space-y-3"
      style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)" }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "rgba(168,85,247,0.2)" }}>
          <Icon name="Wallet" size={16} className="text-purple-400" />
        </div>
        <div>
          <div className="text-white font-semibold mb-1">Получение дебетовой карты для идентификации</div>
          <div className="text-white/50 text-sm leading-relaxed">
            Для завершения идентификации оформите дебетовую карту одного из наших партнёров — выберите любой вариант ниже
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${l.color},${l.color}cc)`, boxShadow: `0 4px 16px ${l.color}40`, textDecoration: "none" }}
          >
            <span className="flex items-center gap-2">
              <Icon name="CreditCard" size={17} />
              {l.label}
            </span>
            <Icon name="ArrowUpRight" size={16} className="opacity-70" />
          </a>
        ))}
      </div>
      <p className="text-white/30 text-xs">Вы можете выбрать любую из карт — оформление займёт пару минут</p>
    </div>
  );
}
