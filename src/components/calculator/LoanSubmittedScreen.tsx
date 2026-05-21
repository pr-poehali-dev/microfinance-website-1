import Icon from "@/components/ui/icon";

interface LoanSubmittedScreenProps {
  timerSec: number;
  timerDone: boolean;
  fmtTime: (sec: number) => string;
}

export default function LoanSubmittedScreen({ timerSec, timerDone, fmtTime }: LoanSubmittedScreenProps) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
        <Icon name="CheckCircle" size={40} className="text-green-400" />
      </div>
      <h3 className="font-oswald text-2xl font-bold text-white mb-3">Заявка отправлена!</h3>

      {!timerDone ? (
        <>
          <p className="text-white/60 text-sm mb-6">Специалист свяжется с вами в течение:</p>
          <div
            className="mx-auto w-40 h-40 rounded-full flex flex-col items-center justify-center mb-6"
            style={{
              background: "conic-gradient(#7c3aed " + ((timerSec - 5 * 60) / (10 * 60) * 360) + "deg, rgba(255,255,255,0.07) 0deg)",
              boxShadow: "0 0 40px rgba(124,58,237,0.4)",
            }}
          >
            <div
              className="w-32 h-32 rounded-full flex flex-col items-center justify-center"
              style={{ background: "#0F0A1E" }}
            >
              <span className="font-oswald text-4xl font-bold gradient-text leading-none">{fmtTime(timerSec)}</span>
              <span className="text-white/40 text-xs mt-1">осталось</span>
            </div>
          </div>
          <p className="text-white/40 text-xs">Пожалуйста, оставайтесь на связи</p>
        </>
      ) : (
        <>
          <div
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ background: "rgba(124,58,237,0.2)", boxShadow: "0 0 30px rgba(124,58,237,0.4)" }}
          >
            <Icon name="Phone" size={32} className="text-purple-400" />
          </div>
          <p className="text-white font-semibold text-lg mb-2">Ожидайте звонка специалиста</p>
          <p className="text-white/50 text-sm">Мы скоро с вами свяжемся</p>
        </>
      )}
    </div>
  );
}
