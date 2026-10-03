export default function WaitBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span style={{ background: "#dc2626", color: "#ffffff", borderRadius: 20, padding: "1px 8px", fontSize: 12, fontWeight: 700, animation: "admin-waiting-pulse 1.6s ease-in-out infinite" }}>
      {n}
    </span>
  );
}
