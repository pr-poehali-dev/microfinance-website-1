import { useState } from "react";
import Icon from "@/components/ui/icon";
import { App } from "./adminTypes";
import CardPaymentSchedule, { CardPaymentRow } from "../dashboard/CardPaymentSchedule";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Props {
  app: App;
  token: string;
  onDone: () => void;
}

export default function AdminCardControl({ app, token, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"issue" | "edit">(app.virtualCardStatus && app.virtualCardStatus !== "none" ? "edit" : "issue");
  const [limit, setLimit] = useState(app.virtualCardLimit ? String(app.virtualCardLimit) : String(app.approvedAmount ?? app.amount ?? ""));
  const [rate, setRate] = useState("");
  const [days, setDays] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [schedule, setSchedule] = useState<{ debt: number; minPaymentPercent: number; minPayment: number; paymentSchedule: CardPaymentRow[] } | null>(null);

  async function toggleSchedule() {
    if (showSchedule) { setShowSchedule(false); return; }
    setShowSchedule(true);
    setScheduleLoading(true);
    try {
      const r = await fetch(`${ADMIN_URL}?sub=card_transactions&appId=${app.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setSchedule(await r.json());
    } finally {
      setScheduleLoading(false);
    }
  }

  const hasCard = !!app.virtualCardStatus && app.virtualCardStatus !== "none";

  async function submit() {
    setSaving(true);
    if (mode === "issue") {
      const l = parseFloat(limit || "0");
      const r = parseFloat(rate || "0");
      const d = parseInt(days || "0");
      if (!l || !r) { setSaving(false); return; }
      await fetch(`${ADMIN_URL}?sub=issue_card&appId=${app.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ limit: l, rate: r, days: d }),
      });
    } else {
      const body: Record<string, number> = {};
      if (limit) body.limit = parseFloat(limit);
      if (rate) body.rate = parseFloat(rate);
      if (days) body.days = parseInt(days);
      await fetch(`${ADMIN_URL}?sub=edit_card&appId=${app.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    }
    setSaving(false);
    setDone(true);
    setOpen(false);
    onDone();
  }

  async function toggleBlock() {
    const newStatus = app.virtualCardStatus === "blocked" ? "active" : "blocked";
    setSaving(true);
    await fetch(`${ADMIN_URL}?sub=card_status&appId=${app.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
    onDone();
  }

  if (done && !hasCard) {
    return (
      <div style={{ padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: "center", background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
        <Icon name="CheckCircle" size={14} style={{ marginRight: 6 }} />Карта выдана!
      </div>
    );
  }

  if (open) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 150 }}>
        <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
          {mode === "issue" ? "Выдать карту РУСФИНАНС 24" : "Изменить условия карты"}
        </div>
        <input
          type="number" placeholder="Лимит, ₽"
          value={limit}
          onChange={e => setLimit(e.target.value)}
          style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
        />
        <input
          type="number" placeholder={mode === "edit" ? "Ставка %/нед. (не менять — оставить пустым)" : "Ставка %/нед."} step="0.1"
          value={rate}
          onChange={e => setRate(e.target.value)}
          style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
        />
        <input
          type="number" placeholder="Срок, дней"
          value={days}
          onChange={e => setDays(e.target.value)}
          style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
        />
        {mode === "issue" && (
          <div style={{ color: "#059669", fontSize: 11, lineHeight: 1.4, background: "rgba(16,185,129,0.08)", borderRadius: 8, padding: "7px 9px" }}>
            График платежей: 1 раз в неделю, минимальный платёж — 40% от общего долга по карте. Даты считаются от дня выдачи.
          </div>
        )}
        <button
          onClick={submit}
          disabled={saving}
          style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "white", border: "none", borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          {saving ? <><Icon name="Loader2" size={14} className="animate-spin" />Сохраняем...</> : <><Icon name="CreditCard" size={14} />{mode === "issue" ? "Выдать" : "Сохранить"}</>}
        </button>
        <button onClick={() => setOpen(false)}
          style={{ background: "rgba(16,185,129,0.07)", color: "rgba(2,44,34,0.5)", border: "none", borderRadius: 8, padding: "7px", cursor: "pointer", fontSize: 12 }}>
          Отмена
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 150 }}>
      {hasCard && (
        <div style={{
          borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 6,
          background: app.virtualCardStatus === "blocked" ? "rgba(239,68,68,0.12)" : "rgba(74,222,128,0.12)",
          border: `1px solid ${app.virtualCardStatus === "blocked" ? "rgba(239,68,68,0.35)" : "rgba(74,222,128,0.35)"}`,
          color: app.virtualCardStatus === "blocked" ? "#f87171" : "#4ade80",
        }}>
          <Icon name="CreditCard" size={13} />
          Карта: {app.virtualCardStatus === "pending" ? "ожидает" : app.virtualCardStatus === "active" ? "активна" : app.virtualCardStatus === "blocked" ? "заблокирована" : app.virtualCardStatus}
          {app.virtualCardLimit ? ` · ${app.virtualCardLimit.toLocaleString("ru-RU")} ₽` : ""}
        </div>
      )}
      {hasCard && app.virtualCardStatus !== "pending" && (
        <div style={{ borderRadius: 10, padding: "8px 12px", fontSize: 12, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#047857", display: "flex", alignItems: "flex-start", gap: 6 }}>
          <Icon name="FileCheck" size={13} />
          <div>
            <div style={{ fontWeight: 700 }}>Договор подписан</div>
            <div style={{ opacity: 0.8 }}>{app.virtualCardSignedAt ? `${app.virtualCardSignedAt} (МСК)` : "дата не зафиксирована"}</div>
          </div>
        </div>
      )}
      {hasCard && app.virtualCardStatus === "pending" && (
        <div style={{ borderRadius: 10, padding: "8px 12px", fontSize: 12, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#b45309", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="Clock" size={13} />Договор не подписан
        </div>
      )}
      <button onClick={() => { setMode(hasCard ? "edit" : "issue"); setOpen(true); }}
        style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "white", border: "none", borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name={hasCard ? "Pencil" : "CreditCard"} size={14} />
        {hasCard ? "Изменить условия" : "Выдать карту РУСФИНАНС 24"}
      </button>
      {hasCard && (
        <button onClick={toggleSchedule}
          style={{ background: "rgba(16,185,129,0.07)", color: "#059669", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icon name="CalendarClock" size={13} />
          {showSchedule ? "Скрыть график платежей" : "График платежей"}
        </button>
      )}
      {hasCard && showSchedule && (
        <div style={{ minWidth: 280 }}>
          {scheduleLoading && <div style={{ textAlign: "center", padding: 12 }}><Icon name="Loader2" size={18} className="animate-spin text-emerald-600" /></div>}
          {!scheduleLoading && schedule && (
            <CardPaymentSchedule debt={schedule.debt} minPaymentPercent={schedule.minPaymentPercent} minPayment={schedule.minPayment} schedule={schedule.paymentSchedule} />
          )}
        </div>
      )}
      {hasCard && (
        <button onClick={toggleBlock} disabled={saving}
          style={{ background: "rgba(16,185,129,0.07)", color: app.virtualCardStatus === "blocked" ? "#4ade80" : "#f87171", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name={app.virtualCardStatus === "blocked" ? "Unlock" : "Lock"} size={13} />
          {app.virtualCardStatus === "blocked" ? "Разблокировать карту" : "Заблокировать карту"}
        </button>
      )}
    </div>
  );
}
