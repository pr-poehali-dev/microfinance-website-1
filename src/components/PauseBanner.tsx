import Icon from "@/components/ui/icon";

const DEFAULT_MESSAGE = "Обрабатываются уже поданные заявки. В течение 1 дня все заявки будут рассмотрены. Приносим свои извинения.";

export default function PauseBanner({ message }: { message?: string }) {
  return (
    <div
      role="alert"
      className="relative z-[60] w-full px-4 py-4 sm:py-5 text-center"
      style={{ background: "linear-gradient(90deg,#dc2626,#f97316,#dc2626)", boxShadow: "0 4px 24px rgba(220,38,38,0.45)" }}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <Icon name="TriangleAlert" size={34} className="text-white shrink-0 animate-pulse" />
        <div className="text-white">
          <div className="font-oswald text-lg sm:text-2xl font-bold uppercase tracking-wide leading-tight">
            На данный момент новые заявки на займы не принимаются!
          </div>
          <div className="text-sm sm:text-base font-semibold mt-1 text-white/95">
            {message?.trim() || DEFAULT_MESSAGE}
          </div>
        </div>
      </div>
    </div>
  );
}
