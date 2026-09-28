import Icon from "@/components/ui/icon";

const DEFAULT_LINKS = [
  { href: "https://pxl.leads.su/click/7f2581de7fb2fdca76f71fbac99adf14", label: "Оформить карту партнёра", color: "#10b981" },
];

interface Props {
  customUrl?: string;
}

export default function PartnerCardLinks({ customUrl }: Props) {
  const LINKS = customUrl
    ? [{ href: customUrl, label: "Оформить карту партнёра", color: "#10b981" }]
    : DEFAULT_LINKS;

  return (
    <div className="rounded-xl p-4 space-y-3"
      style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "rgba(16,185,129,0.2)" }}>
          <Icon name="Wallet" size={16} className="text-emerald-600" />
        </div>
        <div>
          <div className="text-emerald-950 font-semibold mb-1">Получение дебетовой карты для идентификации</div>
          <div className="text-emerald-950/50 text-sm leading-relaxed">
            Для завершения идентификации оформите дебетовую карту нашего партнёра по ссылке ниже
          </div>
        </div>
      </div>
      <div className="grid gap-3">
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
      <p className="text-emerald-950/30 text-xs">Оформление займёт пару минут</p>
    </div>
  );
}