import Icon from "@/components/ui/icon";

export default function DashboardSupport() {
  return (
    <>
      <div className="mt-8 glass rounded-2xl p-6" style={{ border: "1px solid rgba(124,58,237,0.2)" }}>
        <h3 className="font-oswald text-lg font-bold text-white mb-4">Нужна помощь?</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <a href="tel:+86327085244"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
              <Icon name="Phone" size={16} className="text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Позвонить</div>
              <div className="text-white/50 text-xs">8-632-708-524</div>
            </div>
          </a>
          <a href="mailto:investorparafinans@ya.ru"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
              <Icon name="Mail" size={16} className="text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Написать email</div>
              <div className="text-white/50 text-xs">investorparafinans@ya.ru</div>
            </div>
          </a>
          <a href="https://t.me/PARAFINANS24" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
              <Icon name="Send" size={16} className="text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Telegram</div>
              <div className="text-white/50 text-xs">@PARAFINANS24</div>
            </div>
          </a>
        </div>
      </div>

      <a href="tel:+86327085244"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold text-sm shadow-2xl transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 24px rgba(168,85,247,0.4)" }}>
        <Icon name="Phone" size={18} />
        Связаться с нами
      </a>
    </>
  );
}