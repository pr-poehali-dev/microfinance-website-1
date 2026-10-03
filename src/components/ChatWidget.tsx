import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SRC = "https://widget.divechat.ru/dive-widget.iife.js?apiKey=64917de7c5572b16141df648cffc5c8c99acd64f";
const ID = "dive-chat-script";

export default function ChatWidget() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    const loaded = !!document.getElementById(ID);
    if (isAdmin) {
      if (loaded) window.location.reload();
      return;
    }
    if (loaded) return;
    const s = document.createElement("script");
    s.id = ID;
    s.src = SRC;
    s.async = true;
    document.body.appendChild(s);
  }, [isAdmin]);

  return null;
}
