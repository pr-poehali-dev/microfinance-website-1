import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { GIFTS_URL, Gift } from "@/lib/giftsApi";

interface Order { id: number; giftName: string; points: number; address: string; status: string; adminComment: string; createdAt: string }
interface HistoryItem { amount: number; reason: string; createdAt: string }
interface Me { balance: number; earned: number; spent: number; pointsPerLoan: number; history: HistoryItem[]; orders: Order[]; gifts: Gift[] }

const STATUS: Record<string, { t: string; c: string; bg: string }> = {
  pending: { t: "На рассмотрении", c: "#b45309", bg: "rgba(245,158,11,0.15)" },
  approved: { t: "Подтверждён", c: "#047857", bg: "rgba(16,185,129,0.15)" },
  shipped: { t: "Отправлен", c: "#0369a1", bg: "rgba(14,165,233,0.15)" },
  rejected: { t: "Отклонён, баллы возвращены", c: "#b91c1c", bg: "rgba(239,68,68,0.12)" },
};

export default function GiftsSection({ defaultName, defaultPhone }: { defaultName: string; defaultPhone: string }) {
  const token = localStorage.getItem("token") || "";
  const hdrs = { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` };
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<Gift | null>(null);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [address, setAddress] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(() => {
    fetch(`${GIFTS_URL}?sub=me`, { headers: hdrs }).then((r) => r.json()).then((d) => { if (d.gifts) setMe(d); }).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function order() {
    if (!pick) return;
    setSending(true); setErr("");
    const r = await fetch(`${GIFTS_URL}?sub=order`, { method: "POST", headers: hdrs, body: JSON.stringify({ giftId: pick.id, recipientName: name, phone, address }) });
    const d = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) { setErr(d.error || "Не удалось оформить заказ"); return; }
    setOk(`Заказ «${pick.name}» отправлен. Мы подтвердим его и свяжемся с вами.`);
    setPick(null); setAddress("");
    load();
  }

  if (loading) return <div className="text-emerald-950/50 py-10 text-center">Загрузка...</div>;
  if (!me) return <div className="text-red-600 py-10 text-center">Не удалось загрузить подарки</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-6 sm:p-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#047857,#14b8a6)" }}>
        <div className="absolute -right-6 -top-6 opacity-20"><Icon name="Gift" size={150} className="text-white" /></div>
        <div className="relative">
          <div className="text-white/90 text-sm font-semibold mb-1">Программа лояльности</div>
          <h2 className="font-oswald text-2xl sm:text-4xl font-bold text-white leading-tight mb-2">Погаси займ без просрочек и получай наши ценные подарки</h2>
          <p className="text-white/85 text-sm max-w-xl">За каждый погашенный займ вам автоматически начисляется {me.pointsPerLoan} баллов. Обменивайте баллы на фирменные подарки РУСФИНАНС 24.</p>
          <div className="mt-5 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white">
            <Icon name="Coins" size={26} className="text-amber-500" />
            <div>
              <div className="text-emerald-950/50 text-xs">Ваши баллы</div>
              <div className="font-oswald text-3xl font-bold text-emerald-700 leading-none">{me.balance}</div>
            </div>
          </div>
        </div>
      </div>

      {ok && <div className="rounded-xl px-4 py-3 text-sm font-semibold text-emerald-800" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>{ok}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {me.gifts.map((g) => {
          const can = me.balance >= g.pointsCost;
          return (
            <div key={g.id} className="rounded-2xl overflow-hidden bg-white flex flex-col" style={{ border: "1px solid rgba(16,185,129,0.2)", boxShadow: "0 4px 20px rgba(16,185,129,0.08)" }}>
              <img src={g.imageUrl} alt={g.name} className="w-full aspect-square object-cover" loading="lazy" />
              <div className="p-3 sm:p-4 flex flex-col flex-1">
                <div className="font-bold text-emerald-950 text-sm sm:text-base leading-tight">{g.name}</div>
                <div className="text-emerald-950/50 text-xs mt-1 line-clamp-2">{g.description}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full text-sm font-bold text-emerald-800" style={{ background: "rgba(16,185,129,0.14)" }}>
                  <Icon name="Coins" size={14} /> {g.pointsCost} баллов
                </div>
                <button onClick={() => { setPick(g); setErr(""); setOk(""); }} disabled={!can}
                  className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-100 disabled:cursor-not-allowed"
                  style={{ background: can ? "linear-gradient(135deg,#10b981,#14b8a6)" : "#9ca3af" }}>
                  {can ? "Получить подарок" : `Нужно ещё ${g.pointsCost - me.balance}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {me.orders.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-2">
          <div className="font-bold text-emerald-950 mb-1">Мои заказы подарков</div>
          {me.orders.map((o) => {
            const s = STATUS[o.status] || STATUS.pending;
            return (
              <div key={o.id} className="rounded-lg px-3 py-3 flex items-start justify-between gap-3" style={{ background: "rgba(16,185,129,0.05)" }}>
                <div className="min-w-0">
                  <div className="text-emerald-950 text-sm font-semibold">{o.giftName} · {o.points} баллов</div>
                  <div className="text-emerald-950/50 text-xs break-words">{o.createdAt} · {o.address}</div>
                  {o.adminComment && <div className="text-emerald-950/70 text-xs mt-1">Комментарий: {o.adminComment}</div>}
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: s.bg, color: s.c }}>{s.t}</span>
              </div>
            );
          })}
        </div>
      )}

      {me.history.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-2">
          <div className="font-bold text-emerald-950 mb-1">История баллов</div>
          {me.history.map((h, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.05)" }}>
              <div>
                <div className="text-emerald-950 text-sm">{h.reason}</div>
                <div className="text-emerald-950/50 text-xs">{h.createdAt}</div>
              </div>
              <div className={`font-bold ${h.amount >= 0 ? "text-emerald-700" : "text-red-600"}`}>{h.amount > 0 ? "+" : ""}{h.amount}</div>
            </div>
          ))}
        </div>
      )}

      {pick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => !sending && setPick(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="font-oswald text-xl font-bold text-emerald-950">{pick.name}</div>
            <div className="text-emerald-950/60 text-sm">Спишется {pick.pointsCost} баллов. Укажите, куда отправить подарок.</div>
            {[
              { l: "ФИО получателя", v: name, s: setName, p: "Иванов Иван Иванович" },
              { l: "Телефон", v: phone, s: setPhone, p: "+7 900 000-00-00" },
            ].map((f) => (
              <div key={f.l}>
                <label className="text-emerald-950/70 text-sm block mb-1 font-medium">{f.l}</label>
                <input value={f.v} onChange={(e) => f.s(e.target.value)} placeholder={f.p}
                  className="w-full px-4 py-3 rounded-xl text-emerald-950 text-sm outline-none" style={{ border: "1px solid rgba(16,185,129,0.3)" }} />
              </div>
            ))}
            <div>
              <label className="text-emerald-950/70 text-sm block mb-1 font-medium">Адрес доставки <span className="text-red-500">*</span></label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Индекс, город, улица, дом, квартира"
                className="w-full px-4 py-3 rounded-xl text-emerald-950 text-sm outline-none" style={{ border: "1px solid rgba(16,185,129,0.3)" }} />
            </div>
            {err && <p className="text-red-600 text-xs font-medium">{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => setPick(null)} disabled={sending} className="flex-1 py-3 rounded-xl text-sm font-semibold text-emerald-800" style={{ background: "rgba(16,185,129,0.12)" }}>Отмена</button>
              <button onClick={order} disabled={sending} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)" }}>
                {sending ? "Отправляем..." : "Заказать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
