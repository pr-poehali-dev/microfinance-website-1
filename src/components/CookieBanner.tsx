import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_accepted")) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_accepted", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10000,
      background: "rgba(26, 16, 53, 0.97)",
      borderTop: "1px solid rgba(168, 85, 247, 0.3)",
      backdropFilter: "blur(20px)",
      padding: "16px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    }}>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0, maxWidth: 700, lineHeight: 1.5 }}>
        Мы используем файлы cookie для улучшения работы сайта и персонализации контента.
        Продолжая использовать сайт, вы соглашаетесь с нашей{" "}
        <a href="#" style={{ color: "#a855f7", textDecoration: "underline" }}>
          политикой конфиденциальности
        </a>.
      </p>
      <button
        onClick={accept}
        className="btn-neon"
        style={{
          padding: "10px 28px",
          borderRadius: 12,
          border: "none",
          cursor: "pointer",
          color: "white",
          fontWeight: 600,
          fontSize: 14,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Принять
      </button>
    </div>
  );
}
