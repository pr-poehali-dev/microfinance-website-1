import Icon from "@/components/ui/icon";
import { Investment, fmt, termText } from "./investorTypes";

export default function InvestorDocs({ items, preparing }: { items: Investment[]; preparing: boolean }) {
  return (
    <div className="glass rounded-3xl p-6">
      <div className="font-oswald text-2xl font-bold text-emerald-950 mb-1">Договоры</div>
      <p className="text-emerald-950/55 text-sm mb-5">На каждую инвестицию оформляется отдельный договор.</p>
      {items.filter((i) => i.funded).length === 0 ? (
        <div className="text-emerald-950/40 text-sm">Договоров пока нет</div>
      ) : (
        <div className="space-y-2">
          {items.filter((i) => i.funded).map((i) => (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <div>
                <div className="text-emerald-950 font-semibold">Договор инвестирования № И-{String(i.id).padStart(12, "0")}</div>
                <div className="text-emerald-950/50 text-xs">{fmt(i.amount)} · {termText(i.termMonths)} · {i.rate}% в месяц · от {i.startDate}</div>
              </div>
              {i.contractUrl ? (
                <a href={i.contractUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl"
                  style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "#ffffff" }}>
                  <Icon name="FileDown" size={15} />Открыть договор
                </a>
              ) : (
                <span className="text-sm font-medium" style={{ color: "#b45309" }}>{preparing ? "Формируется..." : "Договор готовится"}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
