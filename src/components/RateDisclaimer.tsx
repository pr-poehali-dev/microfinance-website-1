import Icon from "@/components/ui/icon";

export default function RateDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-snug ${className}`}
      style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.35)", color: "#78350f" }}>
      <Icon name="Info" size={14} className="shrink-0 mt-0.5" />
      <span>Процентная ставка предварительная. Окончательная ставка будет определена по результатам проверки вашей анкеты.</span>
    </div>
  );
}
