import { useState } from "react";
import Icon from "@/components/ui/icon";

const CONTRACT_URL = "https://functions.poehali.dev/9cdc3bea-1348-49df-a7a3-4aeef6088ff3";

interface Props { token: string; }

export default function AdminContractsRepair({ token }: Props) {
  const [running, setRunning] = useState(false);
  const [created, setCreated] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [failed, setFailed] = useState(0);
  const [done, setDone] = useState(false);

  async function run() {
    setRunning(true); setDone(false); setCreated(0); setFailed(0);
    let guard = 0;
    let totalCreated = 0;
    let totalFailed = 0;
    while (guard++ < 60) {
      const r = await fetch(CONTRACT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ backfill: true }),
      }).catch(() => null);
      if (!r || !r.ok) break;
      const d = await r.json();
      totalCreated += d.created || 0;
      totalFailed += d.failed || 0;
      setCreated(totalCreated); setFailed(totalFailed); setRemaining(d.remaining - (d.created || 0));
      if (!d.created || d.remaining - d.created <= 0) break;
    }
    setRunning(false); setDone(true);
  }

  return (
    <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 14, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 240, color: "#78350f", fontSize: 14 }}>
        <b>Договоры, которые не сформировались</b>
        <div style={{ fontSize: 13, marginTop: 2 }}>
          {running && `Создаём договоры... готово ${created}${remaining !== null ? `, осталось ${Math.max(0, remaining)}` : ""}`}
          {!running && done && `Создано договоров: ${created}${failed ? `, с ошибкой: ${failed}` : ""}${remaining ? `, осталось: ${Math.max(0, remaining)}` : ""}`}
          {!running && !done && "Нажмите, чтобы пересоздать договоры у клиентов, которые ждут подписания."}
        </div>
      </div>
      <button onClick={run} disabled={running}
        style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", color: "white", border: "none", borderRadius: 10, padding: "10px 18px", cursor: running ? "default" : "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, opacity: running ? 0.7 : 1 }}>
        <Icon name={running ? "Loader2" : "FileText"} size={16} className={running ? "animate-spin" : ""} />
        {running ? "Создаём..." : "Пересоздать договоры"}
      </button>
    </div>
  );
}
