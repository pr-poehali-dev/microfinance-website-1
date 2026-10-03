import Icon from "@/components/ui/icon";

export default function DashboardSupport() {
  return (
    <>
      <div className="mt-8 glass rounded-2xl p-6" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
        <h3 className="font-oswald text-lg font-bold text-emerald-950 mb-4">Нужна помощь?</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <a href="tel:+79962019500"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
              <Icon name="Phone" size={16} className="text-white" />
            </div>
            <div>
              <div className="text-emerald-950 font-semibold text-sm">Позвонить</div>
              <div className="text-emerald-950/50 text-xs">+7-996-201-95-00</div>
            </div>
          </a>
          <a href="mailto:support@rusfinans24.ru"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
              <Icon name="Mail" size={16} className="text-white" />
            </div>
            <div>
              <div className="text-emerald-950 font-semibold text-sm">Написать email</div>
              <div className="text-emerald-950/50 text-xs">support@rusfinans24.ru</div>
            </div>
          </a>
          <a href="https://t.me/INVESTORFINANS24" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
              <Icon name="Send" size={16} className="text-white" />
            </div>
            <div>
              <div className="text-emerald-950 font-semibold text-sm">Telegram</div>
              <div className="text-emerald-950/50 text-xs">@INVESTORFINANS24</div>
            </div>
          </a>
        </div>
      </div>

      <a href="tel:+79962019500"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold text-sm shadow-2xl transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", boxShadow: "0 0 24px rgba(20,184,166,0.4)" }}>
        <Icon name="Phone" size={18} />
        Связаться с нами
      </a>
    </>
  );
}