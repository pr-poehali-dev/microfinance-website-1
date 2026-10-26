import { useCallback, useEffect, useState } from "react";
import { GIFTS_URL, Gift } from "@/lib/giftsApi";

interface Order {
  id: number; giftName: string; points: number; recipientName: string; phone: string; address: string; status: string;
  adminComment: string; createdAt: string; decidedAt: string | null; clientPhone: string; clientName: string;
}
interface ClientPts { userId: number; phone: string; fullName: string; balance: number; history: { amount: number; reason: string; createdAt: string }[] }

const ST: Record<string, string> = { pending: "Ожидает", approved: "Подтверждён", shipped: "Отправлен", rejected: "Отклонён" };
const BTN = { padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 } as const;
const INP = { background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "9px 12px", color: "#022c22", fontSize: 14, boxSizing: "border-box" as const };

export default function AdminGifts({ token }: { token: string }) {
  const hdrs = { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` };
  const [view, setView] = useState<"orders" | "catalog" | "points">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [edit, setEdit] = useState<Partial<Gift> | null>(null);
  const [comment, setComment] = useState<Record<number, string>>({});
  const [phone, setPhone] = useState("");
  const [client, setClient] = useState<ClientPts | null>(null);
  const [pts, setPts] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");

  const call = useCallback(async (sub: string, method = "GET", body?: object, extra = "") => {
    const r = await fetch(`${GIFTS_URL}?sub=${sub}${extra}`, { method, headers: hdrs, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, d };
  }, [token]);

  const load = useCallback(async () => {
    const o = await call("admin_orders"); if (o.ok) setOrders(o.d.orders);
    const g = await call("admin_gifts"); if (g.ok) setGifts(g.d.gifts);
  }, [call]);

  useEffect(() => { load(); }, [load]);

  const decide = async (orderId: number, decision: string) => {
    const r = await call("admin_decide", "POST", { orderId, decision, comment: comment[orderId] || "" });
    setMsg(r.ok ? "Готово" : r.d.error || "Ошибка");
    load();
  };

  const saveGift = async () => {
    if (!edit) return;
    const r = await call("admin_gift_save", "POST", edit);
    setMsg(r.ok ? "Подарок сохранён" : r.d.error || "Ошибка");
    if (r.ok) { setEdit(null); load(); }
  };

  const findClient = async () => {
    setMsg(""); setClient(null);
    const r = await call("admin_client", "GET", undefined, `&phone=${encodeURIComponent(phone)}`);
    if (r.ok) setClient(r.d); else setMsg(r.d.error || "Клиент не найден");
  };

  const addPoints = async (sign: 1 | -1) => {
    if (!client) return;
    const n = parseInt(pts, 10);
    if (!n) { setMsg("Введите количество баллов"); return; }
    const r = await call("admin_points", "POST", { userId: client.userId, amount: sign * Math.abs(n), reason });
    setMsg(r.ok ? `Готово. Баланс: ${r.d.balance}` : r.d.error || "Ошибка");
    setPts(""); setReason("");
    findClient();
  };

  const pending = orders.filter((o) => o.status === "pending").length;
  const tabs = [["orders", `Заказы${pending ? ` (${pending})` : ""}`], ["catalog", "Каталог подарков"], ["points", "Баллы клиентов"]] as const;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(([k, t]) => (
          <button key={k} onClick={() => { setView(k); setMsg(""); }} style={{ ...BTN, background: view === k ? "linear-gradient(135deg,#10b981,#14b8a6)" : "rgba(16,185,129,0.1)", color: view === k ? "#fff" : "#047857" }}>{t}</button>
        ))}
      </div>
      {msg && <div style={{ marginBottom: 12, color: "#047857", fontWeight: 600, fontSize: 14 }}>{msg}</div>}

      {view === "orders" && (
        <div style={{ display: "grid", gap: 10 }}>
          {orders.length === 0 && <div style={{ color: "rgba(2,44,34,0.5)" }}>Заказов пока нет</div>}
          {orders.map((o) => (
            <div key={o.id} style={{ background: "#fff", border: `1px solid ${o.status === "pending" ? "rgba(245,158,11,0.5)" : "rgba(16,185,129,0.2)"}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700, color: "#022c22" }}>{o.giftName} · {o.points} баллов</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: o.status === "rejected" ? "#b91c1c" : o.status === "pending" ? "#b45309" : "#047857" }}>{ST[o.status] || o.status}</div>
              </div>
              <div style={{ fontSize: 13, color: "rgba(2,44,34,0.7)", marginTop: 6, lineHeight: 1.6 }}>
                Клиент: {o.clientName || "—"} · {o.clientPhone}<br />
                Получатель: {o.recipientName} · {o.phone}<br />
                Адрес: {o.address}<br />
                Создан: {o.createdAt}{o.decidedAt ? ` · решение: ${o.decidedAt}` : ""}
                {o.adminComment ? <><br />Комментарий: {o.adminComment}</> : null}
              </div>
              {(o.status === "pending" || o.status === "approved") && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <input style={{ ...INP, flex: 1, minWidth: 160 }} placeholder="Комментарий клиенту (необязательно)" value={comment[o.id] || ""} onChange={(e) => setComment({ ...comment, [o.id]: e.target.value })} />
                  {o.status === "pending" && <button style={{ ...BTN, background: "#10b981", color: "#fff" }} onClick={() => decide(o.id, "approve")}>Подтвердить</button>}
                  {o.status === "approved" && <button style={{ ...BTN, background: "#0284c7", color: "#fff" }} onClick={() => decide(o.id, "shipped")}>Отправлен</button>}
                  <button style={{ ...BTN, background: "#ef4444", color: "#fff" }} onClick={() => decide(o.id, "reject")}>Отклонить</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {view === "catalog" && (
        <div>
          <button style={{ ...BTN, background: "#10b981", color: "#fff", marginBottom: 12 }} onClick={() => setEdit({ active: true, pointsCost: 100, sortOrder: gifts.length + 1 })}>+ Добавить подарок</button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
            {gifts.map((g) => (
              <div key={g.id} style={{ background: "#fff", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, overflow: "hidden", opacity: g.active ? 1 : 0.5 }}>
                <img src={g.imageUrl} alt={g.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#022c22" }}>{g.name}</div>
                  <div style={{ fontSize: 13, color: "#047857", fontWeight: 700 }}>{g.pointsCost} баллов{g.active ? "" : " · скрыт"}</div>
                  <button style={{ ...BTN, marginTop: 8, background: "rgba(16,185,129,0.12)", color: "#047857", width: "100%" }} onClick={() => setEdit(g)}>Изменить</button>
                </div>
              </div>
            ))}
          </div>
          {edit && (
            <div style={{ marginTop: 16, background: "#fff", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: 14, display: "grid", gap: 8, maxWidth: 480 }}>
              <input style={INP} placeholder="Название" value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <input style={INP} placeholder="Описание" value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              <input style={INP} placeholder="Ссылка на картинку" value={edit.imageUrl || ""} onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })} />
              <input style={INP} type="number" placeholder="Стоимость в баллах" value={edit.pointsCost ?? ""} onChange={(e) => setEdit({ ...edit, pointsCost: Number(e.target.value) })} />
              <label style={{ fontSize: 14, color: "#022c22" }}><input type="checkbox" checked={edit.active !== false} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Показывать клиентам</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...BTN, background: "#10b981", color: "#fff" }} onClick={saveGift}>Сохранить</button>
                <button style={{ ...BTN, background: "rgba(16,185,129,0.12)", color: "#047857" }} onClick={() => setEdit(null)}>Отмена</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === "points" && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input style={{ ...INP, flex: 1 }} placeholder="Телефон клиента" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button style={{ ...BTN, background: "#10b981", color: "#fff" }} onClick={findClient}>Найти</button>
          </div>
          {client && (
            <div style={{ background: "#fff", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700, color: "#022c22" }}>{client.fullName || client.phone}</div>
              <div style={{ color: "#047857", fontWeight: 700, marginBottom: 10 }}>Баланс: {client.balance} баллов</div>
              <div style={{ display: "grid", gap: 8 }}>
                <input style={INP} type="number" placeholder="Сколько баллов" value={pts} onChange={(e) => setPts(e.target.value)} />
                <input style={INP} placeholder="Причина (например, за погашенный займ)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...BTN, background: "#10b981", color: "#fff" }} onClick={() => addPoints(1)}>Начислить</button>
                  <button style={{ ...BTN, background: "#ef4444", color: "#fff" }} onClick={() => addPoints(-1)}>Списать</button>
                </div>
              </div>
              {client.history.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 13, color: "rgba(2,44,34,0.7)" }}>
                  {client.history.map((h, i) => <div key={i}>{h.createdAt} · {h.amount > 0 ? "+" : ""}{h.amount} · {h.reason}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
