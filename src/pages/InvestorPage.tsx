import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const INVEST_URL = "https://functions.poehali.dev/1244293e-9832-493e-bbb5-de820fbe56c6";

interface Payout { id: number; amount: number; kind: string; note: string; paidAt: string }
interface Investment {
  id: number; amount: number; termMonths: number; payout: string; rate: number; startDate: string; endDate: string;
  status: string; monthlyIncome: number; totalIncome: number; accrued: number; paidInterest: number; paidTotal: number;
  toPay: number; nextDate: string | null; payouts: Payout[];
}
interface Me { investor: { fullName: string; phone: string; email: string }; investments: Investment[] }

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const termText = (m: number) => (m % 12 === 0 ? `${m / 12} ${m / 12 === 1 ? "год" : m / 12 < 5 ? "года" : "лет"}` : `${m} мес.`);

export default function InvestorPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("investor_token");
    if (!token) { navigate("/investor/login"); return; }
    fetch(`${INVEST_URL}?sub=me`, { headers: { Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401) { localStorage.removeItem("investor_token"); navigate("/investor/login"); return; }
        setData(await r.json());
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const logout = () => { localStorage.removeItem("investor_token"); navigate("/"); };

  const active = (data?.investments || []).filter((i) => i.status === "active");
  const totalInvested = active.reduce((s, i) => s + i.amount, 0);
  const totalMonthly = active.reduce((s, i) => s + i.monthlyIncome, 0);
  const totalPaid = (data?.investments || []).reduce((s, i) => s + i.paidTotal, 0);

  return (
    <div className="min-h-screen font-golos" style={{ background: "#ffffff" }}>
      <nav className="sticky top-0 z-50 glass" style={{ borderBottom: "1px solid rgba(16,185,129,0.15)" }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="Русфинанс 24" className="w-9 h-9 rounded-xl" />
            <span className="font-oswald text-xl font-bold tracking-wide"><span className="gradient-text">РУСФИНАНС24</span></span>
          </button>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-emerald-950/70 hover:text-emerald-950 border border-emerald-900/15 px-4 py-2 rounded-xl">
            <Icon name="LogOut" size={15} />Выйти
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading && <div className="text-center py-20"><Icon name="Loader2" size={32} className="animate-spin text-emerald-600 mx-auto" /></div>}

        {data && (
          <>
            <div className="mb-8">
              <div className="text-emerald-950/50 text-sm">Кабинет инвестора</div>
              <h1 className="font-oswald text-3xl md:text-4xl font-bold text-emerald-950">{data.investor.fullName}</h1>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-10">
              {[
                ["Вложено сейчас", fmt(totalInvested), "Wallet"],
                ["Доход в месяц", fmt(totalMonthly), "TrendingUp"],
                ["Выплачено всего", fmt(totalPaid), "BadgeCheck"],
              ].map(([l, v, ic]) => (
                <div key={l} className="glass rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)" }}>
                    <Icon name={ic} size={20} className="text-white" />
                  </div>
                  <div className="text-emerald-950/50 text-xs">{l}</div>
                  <div className="text-emerald-950 font-bold text-2xl">{v}</div>
                </div>
              ))}
            </div>

            {data.investments.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center text-emerald-950/60">Инвестиций пока нет</div>
            )}

            <div className="space-y-6">
              {data.investments.map((i) => (
                <div key={i.id} className="glass rounded-3xl p-6" style={{ opacity: i.status === "closed" ? 0.75 : 1 }}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="font-oswald text-2xl font-bold text-emerald-950">{fmt(i.amount)}</div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={i.status === "active" ? { background: "rgba(16,185,129,0.15)", color: "#047857" } : { background: "rgba(100,116,139,0.15)", color: "#475569" }}>
                      {i.status === "active" ? "Действует" : "Завершена"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {[
                      ["Ставка", `${i.rate}% в месяц`],
                      ["Срок", termText(i.termMonths)],
                      ["Выплата процентов", i.payout === "monthly" ? "каждый месяц" : "в конце срока"],
                      ["Доход в месяц", fmt(i.monthlyIncome)],
                      ["Начало", i.startDate],
                      ["Окончание", i.endDate],
                      ["Начислено", fmt(i.accrued)],
                      ["Выплачено процентов", fmt(i.paidInterest)],
                    ].map(([l, v]) => (
                      <div key={l} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(16,185,129,0.07)" }}>
                        <div className="text-emerald-950/50 text-xs">{l}</div>
                        <div className="text-emerald-950 font-semibold text-sm">{v}</div>
                      </div>
                    ))}
                  </div>

                  {i.status === "active" && (
                    <div className="rounded-xl px-4 py-3 mb-5 flex flex-wrap items-center justify-between gap-2" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
                      <div className="text-emerald-950 text-sm">
                        К выплате по начисленным процентам: <b>{fmt(i.toPay)}</b>
                      </div>
                      {i.nextDate && <div className="text-emerald-950/60 text-sm">Ближайшая дата: <b>{i.nextDate}</b></div>}
                    </div>
                  )}

                  <div className="text-emerald-950 font-semibold text-sm mb-2">История выплат</div>
                  {i.payouts.length === 0 ? (
                    <div className="text-emerald-950/40 text-sm">Выплат пока не было</div>
                  ) : (
                    <div className="space-y-2">
                      {i.payouts.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                          <div>
                            <div className="text-emerald-950 font-medium">{p.kind === "principal" ? "Возврат вложения" : "Выплата процентов"}</div>
                            <div className="text-emerald-950/45 text-xs">{p.paidAt}{p.note ? ` · ${p.note}` : ""}</div>
                          </div>
                          <div className="font-bold" style={{ color: "#059669" }}>+ {fmt(p.amount)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
