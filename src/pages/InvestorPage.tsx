import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import InvestorSidebar, { InvestorSection } from "./investor/InvestorSidebar";
import InvestorOverview from "./investor/InvestorOverview";
import InvestorRequest from "./investor/InvestorRequest";
import InvestorPayouts from "./investor/InvestorPayouts";
import InvestorCards from "./investor/InvestorCards";
import InvestorDocs from "./investor/InvestorDocs";
import InvestorTopup from "./investor/InvestorTopup";
import { INVEST_URL, CONTRACT_URL, YK_URL, InvestorMe, authHeaders, fmt } from "./investor/investorTypes";

export default function InvestorPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<InvestorMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<InvestorSection>("invest");
  const [preparing, setPreparing] = useState(false);
  const [paidToast, setPaidToast] = useState(false);
  const token = localStorage.getItem("investor_token") || "";

  const load = useCallback(async () => {
    if (!token) { navigate("/investor/login"); return; }
    const r = await fetch(`${INVEST_URL}?sub=me`, { headers: authHeaders(token) }).catch(() => null);
    if (!r) { setLoading(false); return; }
    if (r.status === 401) { localStorage.removeItem("investor_token"); navigate("/investor/login"); return; }
    const d: InvestorMe = await r.json();
    setData(d);
    setLoading(false);
    if (d.investments.some((i) => !i.contractUrl)) {
      setPreparing(true);
      const c = await fetch(CONTRACT_URL, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ investorEnsure: true }) }).catch(() => null);
      if (c && c.ok) {
        const r2 = await fetch(`${INVEST_URL}?sub=me`, { headers: authHeaders(token) }).catch(() => null);
        if (r2 && r2.ok) setData(await r2.json());
      }
      setPreparing(false);
    }
  }, [token, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const pid = localStorage.getItem("invest_payment_id");
    if (!pid || !token) return;
    localStorage.removeItem("invest_payment_id");
    fetch(`${YK_URL}?sub=invest_check`, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ paymentId: pid }) })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        if (d.status === "succeeded") { setPaidToast(true); setSection("invest"); setTimeout(() => setPaidToast(false), 7000); }
        load();
      })
      .catch(() => {});
  }, [token, load]);

  const logout = () => { localStorage.removeItem("investor_token"); navigate("/"); };

  const active = (data?.investments || []).filter((i) => i.status === "active" && i.funded);
  const totalInvested = active.reduce((s, i) => s + i.amount, 0);
  const totalMonthly = active.reduce((s, i) => s + i.monthlyIncome, 0);
  const totalPaid = (data?.investments || []).reduce((s, i) => s + i.paidTotal, 0);

  return (
    <div className="min-h-screen font-golos" style={{ background: "#ffffff" }}>
      <nav className="sticky top-0 z-50 glass" style={{ borderBottom: "1px solid rgba(16,185,129,0.15)" }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="Русфинанс 24" className="w-9 h-9 rounded-xl" />
            <span className="font-oswald text-xl font-bold tracking-wide"><span className="gradient-text">РУСФИНАНС24</span></span>
          </button>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-emerald-950/70 hover:text-emerald-950 border border-emerald-900/15 px-4 py-2 rounded-xl">
            <Icon name="LogOut" size={15} />Выйти
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading && <div className="text-center py-20"><Icon name="Loader2" size={32} className="animate-spin text-emerald-600 mx-auto" /></div>}

        {data && (
          <>
            {paidToast && (
              <div className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#065f46" }}>
                <Icon name="CheckCircle" size={18} />Оплата прошла успешно. Средства поступили на баланс.
              </div>
            )}
            <div className="mb-6">
              <div className="text-emerald-950/50 text-sm">Кабинет инвестора</div>
              <h1 className="font-oswald text-3xl md:text-4xl font-bold text-emerald-950">{data.investor.fullName}</h1>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
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

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <InvestorSidebar active={section} onChange={setSection} />
              <div className="flex-1 min-w-0 w-full">
                {section === "invest" && <InvestorOverview items={data.investments} />}
                {section === "request" && <InvestorRequest token={token} requests={data.requests} onSent={load} />}
                {section === "topup" && <InvestorTopup token={token} items={data.investments} balance={data.balance} />}
                {section === "payouts" && <InvestorPayouts items={data.investments} />}
                {section === "cards" && <InvestorCards token={token} cards={data.cards} onChanged={load} />}
                {section === "docs" && <InvestorDocs items={data.investments} preparing={preparing} />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
