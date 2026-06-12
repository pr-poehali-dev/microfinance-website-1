import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import DashboardNavbar from "./dashboard/DashboardNavbar";
import DashboardApplicationStatus from "./dashboard/DashboardApplicationStatus";
import DashboardLoans from "./dashboard/DashboardLoans";
import DashboardSupport from "./dashboard/DashboardSupport";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";
const CAR_URL = "https://functions.poehali.dev/651adde1-4432-4e5a-8086-3cda9898b7ac";

const fmtAppId = (id: number) => String(id).padStart(12, "0");

interface LoanOffer {
  amount: number;
  days: number;
  rate: number;
  ratePercent: number;
  total: number;
}

interface Loan {
  id: number;
  amount: number;
  days: number;
  rate: number;
  ratePercent: number;
  interest: number;
  total: number;
  status: string;
  createdAt: string;
  signed: boolean;
  offer?: LoanOffer;
}

interface User {
  id: number;
  phone: string;
  fullName: string;
  email: string;
}

interface VirtualCard {
  number: string;
  expiry: string;
  cvv: string;
  holder: string;
  limit: number;
  rate: number;
  status: string;
}

interface Application {
  id: number;
  amount: number;
  days: number;
  status: string;
  createdAt: string;
  approvedAmount: number | null;
  approvedRate: number;
  approvedRatePercent: number;
  approvedDays: number;
  approvedTotal: number;
  rejectReason: string;
  cardNumber: string;
  contractUrl: string;
  virtualCard: VirtualCard | null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingId, setSigningId] = useState<number | null>(null);
  const [signMsg, setSignMsg] = useState("");

  // Таймер 5:00 для pending-статуса
  const [timerSec, setTimerSec] = useState(5 * 60);
  const [timerDone, setTimerDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Карта/СБП для approved и partner_card
  const [cardInput, setCardInput] = useState("");
  const [cardSaving, setCardSaving] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);
  const [cardError, setCardError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmDone, setConfirmDone] = useState(false);
  const [cardActivating, setCardActivating] = useState(false);
  const [cardActivated, setCardActivated] = useState(false);
  const [cvvVisible, setCvvVisible] = useState(false);

  const [carLoan, setCarLoan] = useState<{
    id: number; loan_amount: number; loan_months: number; status: string;
    reject_reason: string | null; approved_amount: number | null;
    approved_months: number | null; approved_rate: number | null;
    car_brand: string; car_model: string; car_year: number; created_at: string;
  } | null>(null);

  const loadData = (token: string, isInitial = false) => {
    if (isInitial) setLoading(true);
    fetch(LOANS_URL, {
      headers: { "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          if (isInitial) { localStorage.removeItem("token"); navigate("/login"); }
          return;
        }
        setUser(data.user);
        setLoans(data.loans || []);
        const app = data.application || null;
        setApplication(app);
        if (app?.cardNumber) {
          setCardInput(app.cardNumber);
          setCardSaved(true);
        }
        setError("");
        // Загружаем авто-займ по номеру телефона
        if (data.user?.phone) {
          const ph = encodeURIComponent(data.user.phone);
          fetch(`${CAR_URL}?sub=get&phone=${ph}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.item) setCarLoan(d.item); })
            .catch(() => {});
        }
      })
      .catch(() => { if (isInitial) setError("Ошибка загрузки данных"); })
      .finally(() => { if (isInitial) setLoading(false); });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    loadData(token, true);

    // Автообновление каждые 30 секунд — чтобы статус одобрения появлялся без перезагрузки
    const interval = setInterval(() => {
      const t = localStorage.getItem("token");
      if (t) loadData(t, false);
    }, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Запускаем таймер только когда заявка pending
  useEffect(() => {
    if (!application || application.status !== "pending") return;
    setTimerSec(5 * 60);
    setTimerDone(false);
    timerRef.current = setInterval(() => {
      setTimerSec((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [application?.id, application?.status]);

  const fmtTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handlePay = (loan: Loan) => {
    alert(`Оплата займа №${fmtAppId(loan.id)} на сумму ${loan.total.toLocaleString("ru-RU")} ₽\n\nДля оплаты свяжитесь с нами:\n📞 +7 (495) 663-51-24\n📧 investorparafinans@ya.ru`);
  };

  const handleSign = async (loan: Loan) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSigningId(loan.id);
    setSignMsg("");
    const res = await fetch(`${LOANS_URL}?loanId=${loan.id}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const data = await res.json();
    setSigningId(null);
    if (!res.ok) { setSignMsg(data.error || "Ошибка"); return; }
    setSignMsg("Договор подписан! Ожидайте перевода средств.");
    setLoans((prev) => prev.map((l) => l.id === loan.id ? { ...l, signed: true, status: "active", offer: undefined } : l));
  };

  const handleSaveCard = async () => {
    if (!cardInput.trim()) { setCardError("Введите номер карты или телефон СБП"); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    setCardSaving(true);
    setCardError("");
    const res = await fetch(LOANS_URL, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber: cardInput.trim() }),
    });
    const data = await res.json();
    setCardSaving(false);
    if (!res.ok) { setCardError(data.error || "Ошибка сохранения"); return; }
    setCardSaved(true);
  };

  const handleActivateCard = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setCardActivating(true);
    const res = await fetch(LOANS_URL, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber: "", confirm_card: true }),
    });
    setCardActivating(false);
    if (res.ok) { setCardActivated(true); const t = localStorage.getItem("token"); if (t) loadData(t, false); }
  };

  const handleConfirm = async () => {
    if (!cardInput.trim()) { setCardError("Введите номер карты или телефон СБП для подтверждения займа"); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    setConfirming(true);
    setCardError("");
    const res = await fetch(LOANS_URL, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber: cardInput.trim(), confirm: true }),
    });
    const data = await res.json();
    setConfirming(false);
    if (!res.ok) { setCardError(data.error || "Ошибка"); return; }
    setCardSaved(true);
    setConfirmDone(true);
  };

  return (
    <div className="min-h-screen font-golos" style={{ background: "#0F0A1E" }}>
      <DashboardNavbar user={user} onLogout={handleLogout} />

      <div className="max-w-4xl mx-auto px-4 pt-28 pb-16">

        {/* ПРИВЕТСТВИЕ */}
        {user && (
          <div className="glass rounded-2xl p-6 mb-6 flex items-center gap-4">
            <div className="w-14 h-14 btn-neon rounded-2xl flex items-center justify-center shrink-0">
              <Icon name="User" size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-oswald text-2xl font-bold text-white">
                {user.fullName ? `Здравствуйте, ${user.fullName.split(" ")[0]}!` : "Личный кабинет"}
              </h1>
              <p className="text-white/50 text-sm">{user.phone}{user.email ? ` · ${user.email}` : ""}</p>
            </div>
          </div>
        )}

        {/* СОСТОЯНИЕ ЗАГРУЗКИ */}
        {loading && (
          <div className="text-center py-20">
            <Icon name="Loader2" size={40} className="animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-white/50">Загружаем ваши данные...</p>
          </div>
        )}

        {error && (
          <div className="glass rounded-2xl p-5 flex items-center gap-3 mb-6" style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
            <Icon name="AlertCircle" size={20} className="text-red-400 shrink-0" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <DashboardApplicationStatus
              application={application}
              loans={loans}
              timerSec={timerSec}
              timerDone={timerDone}
              fmtTimer={fmtTimer}
              fmtAppId={fmtAppId}
              signingId={signingId}
              signMsg={signMsg}
              cardInput={cardInput}
              cardSaving={cardSaving}
              cardSaved={cardSaved}
              cardError={cardError}
              confirming={confirming}
              confirmDone={confirmDone}
              cardActivating={cardActivating}
              cardActivated={cardActivated}
              cvvVisible={cvvVisible}
              setCvvVisible={setCvvVisible}
              onSign={handleSign}
              onSaveCard={handleSaveCard}
              onConfirm={handleConfirm}
              onActivateCard={handleActivateCard}
              setCardInput={setCardInput}
              setCardSaved={setCardSaved}
              setCardError={setCardError}
            />

            <DashboardLoans
              loans={loans}
              application={application}
              signingId={signingId}
              signMsg={signMsg}
              onSign={handleSign}
              onPay={handlePay}
            />
          </>
        )}

        {/* БЛОК АВТО-ЗАЙМА */}
        {carLoan && (
          <div className="mb-6">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-5 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))", borderBottom: "1px solid rgba(245,158,11,0.2)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
                  <Icon name="Car" size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">Займ под залог автомобиля</div>
                  <div className="text-white/40 text-xs">{carLoan.car_brand} {carLoan.car_model} {carLoan.car_year} · #{carLoan.id}</div>
                </div>
                {carLoan.status === "pending" && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}>
                    На рассмотрении
                  </span>
                )}
                {carLoan.status === "approved" && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                    Одобрено ✓
                  </span>
                )}
                {carLoan.status === "rejected" && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                    Отказ
                  </span>
                )}
              </div>

              <div className="p-5">
                {carLoan.status === "pending" && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(245,158,11,0.15)" }}>
                      <Icon name="Clock" size={16} className="text-yellow-400" />
                    </div>
                    <div>
                      <div className="text-white font-semibold mb-1">Заявка рассматривается</div>
                      <div className="text-white/50 text-sm">Запрошено: <b className="text-white">{carLoan.loan_amount.toLocaleString("ru-RU")} ₽</b> на <b className="text-white">{carLoan.loan_months} мес.</b></div>
                      <div className="text-white/40 text-xs mt-1">Решение принимается в течение 2 часов. Ожидайте звонка специалиста.</div>
                    </div>
                  </div>
                )}

                {carLoan.status === "approved" && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Icon name="CheckCircle" size={18} className="text-green-400" />
                      <span className="text-green-400 font-semibold">Ваша заявка одобрена!</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { l: "Одобренная сумма", v: carLoan.approved_amount ? `${carLoan.approved_amount.toLocaleString("ru-RU")} ₽` : `${carLoan.loan_amount.toLocaleString("ru-RU")} ₽`, c: "#4ade80" },
                        { l: "Срок", v: `${carLoan.approved_months || carLoan.loan_months} мес.`, c: "#4ade80" },
                        { l: "Ставка", v: `${carLoan.approved_rate || 12}% / мес.`, c: "#fbbf24" },
                        { l: "К возврату",
                          v: (() => {
                            const a = carLoan.approved_amount || carLoan.loan_amount;
                            const m = carLoan.approved_months || carLoan.loan_months;
                            const r = (carLoan.approved_rate || 12) / 100;
                            return `${Math.round(a * (1 + r * m)).toLocaleString("ru-RU")} ₽`;
                          })(),
                          c: "#c084fc" },
                      ].map(({ l, v, c }) => (
                        <div key={l} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="text-white/40 text-xs mb-1">{l}</div>
                          <div className="font-bold" style={{ color: c }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl p-4 flex items-start gap-3"
                      style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <Icon name="Phone" size={16} className="text-green-400 shrink-0 mt-0.5" />
                      <div className="text-white/60 text-sm">
                        Для подписания договора и получения денег свяжитесь с нашим специалистом:<br />
                        <span className="text-white font-semibold">+7 (495) 663-51-24</span>
                      </div>
                    </div>
                  </div>
                )}

                {carLoan.status === "rejected" && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(239,68,68,0.15)" }}>
                      <Icon name="XCircle" size={16} className="text-red-400" />
                    </div>
                    <div>
                      <div className="text-white font-semibold mb-1">По заявке принято отрицательное решение</div>
                      {carLoan.reject_reason && (
                        <div className="text-white/50 text-sm mb-2">Причина: {carLoan.reject_reason}</div>
                      )}
                      <div className="text-white/40 text-xs">Вы можете подать новую заявку или обратиться к нашим специалистам.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DashboardSupport />
      </div>
    </div>
  );
}