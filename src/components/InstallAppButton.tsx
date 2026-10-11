import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const HIDE_KEY = "install_app_hidden";

export default function InstallAppButton() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDE_KEY) === "1");
  const [iosHelp, setIosHelp] = useState(false);

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => null);
    }
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as InstallEvent); };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || hidden || !isMobile) return null;
  if (!deferred && !isIos) return null;

  const close = () => { localStorage.setItem(HIDE_KEY, "1"); setHidden(true); };
  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      setDeferred(null);
    } else {
      setIosHelp(true);
    }
  };

  return (
    <div className="fixed left-3 right-3 bottom-24 z-40 max-w-md mx-auto rounded-2xl p-3 flex items-center gap-3"
      style={{ background: "#ffffff", border: "1px solid rgba(16,185,129,0.35)", boxShadow: "0 8px 30px rgba(2,44,34,0.18)" }}>
      <img src="/favicon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-emerald-950 font-bold text-sm">Приложение РУСФИНАНС 24</div>
        {iosHelp ? (
          <div className="text-emerald-950/60 text-xs leading-snug">
            Нажмите «Поделиться» в Safari, затем «На экран Домой»
          </div>
        ) : (
          <div className="text-emerald-950/50 text-xs">Быстрый вход в личный кабинет с экрана телефона</div>
        )}
      </div>
      {!iosHelp && (
        <button onClick={install} className="btn-neon text-white font-bold text-sm px-4 py-2 rounded-xl shrink-0">
          Установить
        </button>
      )}
      <button onClick={close} aria-label="Закрыть" className="text-emerald-950/40 shrink-0 p-1">
        <Icon name="X" size={16} />
      </button>
    </div>
  );
}
