import type { CSSProperties } from "react";

export const WAITING_STYLE: CSSProperties = {
  background: "rgba(239,68,68,0.08)",
  border: "1px solid rgba(239,68,68,0.7)",
  animation: "admin-waiting-pulse 1.6s ease-in-out infinite",
};

export function waitingStyle(waiting: boolean): CSSProperties {
  return waiting ? WAITING_STYLE : {};
}

export const WAITING_BADGE_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "3px 10px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  background: "#dc2626",
  color: "#ffffff",
};
