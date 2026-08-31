import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import DashboardNavbar from "./dashboard/DashboardNavbar";
import DashboardApplicationStatus from "./dashboard/DashboardApplicationStatus";
import DashboardLoans from "./dashboard/DashboardLoans";
import DashboardSupport from "./dashboard/DashboardSupport";
import PaymentHistory from "./dashboard/PaymentHistory";
import ClientProfileCard from "./dashboard/ClientProfileCard";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";
const CAR_URL  = "https://functions.poehali.dev/651adde1-4432-4e5a-8086-3cda9898b7ac";
const SHOP_URL = "https://functions.poehali.dev/f0312370-20d7-488e-b072-dc4c0b2af2aa";

const fmtAppId = (id: number) => String(id).padStart(12, "0");

interface LoanOffer {
  amount: number;
  days: number;
  rate: number;
  ratePercent: number;
  total: number;
}

interface ScheduleItem {
  dueDate: string | null;
  amount: number;
  label?: string;
  month?: number;
  principal?: number;
  interest?: number;
}

interface PaymentItem {
  amount: number;
  paidAt: string;
  note?: string;
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
  disbursedAt?: string | null;
  offer?: LoanOffer;
  schedule?: ScheduleItem[];
  payments?: PaymentItem[];
  paidTotal?: number;
  remaining?: number;
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

interface ClientProfile {
  fullName: string;
  email: string;
  birthDate: string;
  birthPlace: string;
  passportSeries: string;
  passportNumber: string;
  passportDate: string;
  passportCode: string;
  passportBy: string;
  workplace: string;
  position: string;
  workPhone: string;
  salary: number | null;
  contactPerson: string;
  snils: string;
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
  profile?: ClientProfile;
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
    disbursed_at?: string | null;
    full_name?: string; email?: string; birth_date?: string; address?: string;
    passport_serial?: string; passport_num?: string; passport_issued?: string;
    car_mileage?: number; contact_person?: string; card_number?: string;
    payments?: PaymentItem[]; paidTotal?: number; schedule?: ScheduleItem[];
  } | null>(null);

  const [shopLoan, setShopLoan] = useState<{
    id: number; loan_amount: number; loan_months: number; status: string;
    reject_reason: string | null; approved_amount: number | null;
    approved_months: number | null; approved_rate: number | null;
    notes: string | null; shop_name: string; item_name: string; item_price: number;
    contract_signed: boolean; created_at: string;
    disbursed_at?: string | null;
    full_name?: string; email?: string; birth_date?: string; address?: string;
    passport_series?: string; passport_number?: string; passport_date?: string;
    passport_by?: string; snils?: string; contact_person?: string; card_number?: string;
    payments?: PaymentItem[]; paidTotal?: number; schedule?: ScheduleItem[];
  } | null>(null);
  const [shopSigning, setShopSigning] = useState(false);
  const [shopSignMsg, setShopSignMsg] = useState("");

  // Таймеры для авто и товарных заявок
  const [carTimer, setCarTimer] = useState(5 * 60);
  const [carTimerDone, setCarTimerDone] = useState(false);
  const [shopTimer, setShopTimer] = useState(5 * 60);
  const [shopTimerDone, setShopTimerDone] = useState(false);
  const carTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shopTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        // Загружаем авто-займ и товарный займ по номеру телефона
        if (data.user?.phone) {
          const ph = encodeURIComponent(data.user.phone);
          fetch(`${CAR_URL}?sub=get&phone=${ph}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.item) setCarLoan(d.item); })
            .catch(() => {});
          fetch(`${SHOP_URL}?sub=get&phone=${ph}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.item) setShopLoan(d.item); })
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

    // Автообновление каждые 60 секунд — чтобы статус одобрения появлялся без перезагрузки
    const interval = setInterval(() => {
      const t = localStorage.getItem("token");
      if (t) loadData(t, false);
    }, 60000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Таймер для авто-займа (pending)
  useEffect(() => {
    if (!carLoan || carLoan.status !== "pending") return;
    setCarTimer(5 * 60); setCarTimerDone(false);
    carTimerRef.current = setInterval(() => {
      setCarTimer(prev => {
        if (prev <= 1) { clearInterval(carTimerRef.current!); setCarTimerDone(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (carTimerRef.current) clearInterval(carTimerRef.current); };
  }, [carLoan?.id, carLoan?.status]);

  // Таймер для товарного займа (pending)
  useEffect(() => {
    if (!shopLoan || shopLoan.status !== "pending") return;
    setShopTimer(5 * 60); setShopTimerDone(false);
    shopTimerRef.current = setInterval(() => {
      setShopTimer(prev => {
        if (prev <= 1) { clearInterval(shopTimerRef.current!); setShopTimerDone(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (shopTimerRef.current) clearInterval(shopTimerRef.current); };
  }, [shopLoan?.id, shopLoan?.status]);

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
    alert(`Оплата займа №${fmtAppId(loan.id)} на сумму ${loan.total.toLocaleString("ru-RU")} ₽\n\nДля оплаты свяжитесь с нами:\n📞 +7-863-270-85-24\n📧 investorfinans24@ya.ru`);
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

  const handleShopSign = async () => {
    if (!shopLoan) return;
    setShopSigning(true); setShopSignMsg("");
    const r = await fetch(`${SHOP_URL}?sub=sign&id=${shopLoan.id}`, { method: "PUT", headers: { "Content-Type": "application/json" } });
    setShopSigning(false);
    if (r.ok) {
      setShopSignMsg("Договор подписан! Ожидайте перевода средств в магазин.");
      setShopLoan(prev => prev ? { ...prev, contract_signed: true } : prev);
    } else {
      setShopSignMsg("Ошибка подписания. Попробуйте позже.");
    }
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
    // Сразу подгружаем свежие данные — чтобы график погашения и кнопка "Погасить" появились без ожидания
    loadData(token, false);
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

        {/* АНКЕТА КЛИЕНТА */}
        {!loading && !error && user && application?.profile && (
          <ClientProfileCard profile={application.profile} phone={user.phone} />
        )}
        {!loading && !error && user && !application?.profile && carLoan?.full_name && (
          <ClientProfileCard
            phone={user.phone}
            profile={{
              fullName: carLoan.full_name || "",
              email: carLoan.email || "",
              birthDate: carLoan.birth_date || "",
              birthPlace: "",
              passportSeries: carLoan.passport_serial || "",
              passportNumber: carLoan.passport_num || "",
              passportDate: "",
              passportCode: "",
              passportBy: carLoan.passport_issued || "",
              workplace: "",
              position: "",
              workPhone: "",
              salary: null,
              contactPerson: carLoan.contact_person || "",
              snils: "",
            }}
          />
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

        {/* БЛОК ТОВАРНОГО ЗАЙМА */}
        {shopLoan && (
          <div className="mb-6">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-5 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.15),rgba(6,182,212,0.1))", borderBottom: "1px solid rgba(168,85,247,0.2)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)" }}>
                  <Icon name="ShoppingBag" size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">Займ на покупку товара</div>
                  <div className="text-white/40 text-xs">{shopLoan.item_name || "Товар"} · #{shopLoan.id}</div>
                </div>
                {shopLoan.status === "pending" && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(168,85,247,0.2)", color: "#d8b4fe", border: "1px solid rgba(168,85,247,0.3)" }}>На рассмотрении</span>
                )}
                {shopLoan.status === "approved" && !shopLoan.contract_signed && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>Одобрено ✓</span>
                )}
                {shopLoan.status === "approved" && shopLoan.contract_signed && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>✍️ Договор подписан</span>
                )}
                {shopLoan.status === "rejected" && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>Отказ</span>
                )}
              </div>

              <div className="p-5">
                {shopLoan.status === "pending" && (
                  <div>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(168,85,247,0.15)" }}>
                        <Icon name="Clock" size={16} className="text-purple-400" />
                      </div>
                      <div>
                        <div className="text-white font-semibold mb-1">Заявка рассматривается</div>
                        <div className="text-white/50 text-sm">Запрошено: <b className="text-white">{shopLoan.loan_amount.toLocaleString("ru-RU")} ₽</b> на <b className="text-white">{shopLoan.loan_months} мес.</b></div>
                      </div>
                    </div>
                    <div className="rounded-2xl p-5 text-center"
                      style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)" }}>
                      {!shopTimerDone ? (
                        <>
                          <div className="font-oswald text-5xl font-bold mb-2"
                            style={{ color: "#d8b4fe", textShadow: "0 0 24px rgba(168,85,247,0.5)" }}>
                            {`${Math.floor(shopTimer/60).toString().padStart(2,"0")}:${(shopTimer%60).toString().padStart(2,"0")}`}
                          </div>
                          <div className="text-white/40 text-sm">Примерное время до ответа</div>
                        </>
                      ) : (
                        <>
                          <Icon name="FileSearch" size={28} className="text-purple-400 mx-auto mb-2" />
                          <div className="text-white font-semibold mb-1">Заявка на рассмотрении</div>
                          <div className="text-white/40 text-sm">Специалист свяжется с вами в ближайшее время</div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {shopLoan.status === "approved" && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Icon name="CheckCircle" size={18} className="text-green-400" />
                      <span className="text-green-400 font-semibold">Займ одобрен! Осталось подписать договор.</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { l: "Одобренная сумма", v: `${(shopLoan.approved_amount || shopLoan.loan_amount).toLocaleString("ru-RU")} ₽`, c: "#4ade80" },
                        { l: "Срок", v: `${shopLoan.approved_months || shopLoan.loan_months} мес.`, c: "#4ade80" },
                        { l: "Ставка", v: `${shopLoan.approved_rate || 9}% / мес.`, c: "#fbbf24" },
                        { l: "К возврату", v: (() => {
                          const a = shopLoan.approved_amount || shopLoan.loan_amount;
                          const m = shopLoan.approved_months || shopLoan.loan_months;
                          const r = (shopLoan.approved_rate || 9) / 100;
                          return `${Math.round(a * (1 + r * m)).toLocaleString("ru-RU")} ₽`;
                        })(), c: "#c084fc" },
                      ].map(({ l, v, c }) => (
                        <div key={l} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="text-white/40 text-xs mb-1">{l}</div>
                          <div className="font-bold" style={{ color: c }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {shopLoan.notes && (
                      <div className="rounded-xl p-3 mb-4 text-white/50 text-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        📝 {shopLoan.notes}
                      </div>
                    )}

                    {shopLoan.contract_signed && (
                      <PaymentHistory
                        schedule={shopLoan.schedule || []}
                        payments={shopLoan.payments || []}
                        paidTotal={shopLoan.paidTotal || 0}
                        totalDue={(() => {
                          const a = shopLoan.approved_amount || shopLoan.loan_amount;
                          const m = shopLoan.approved_months || shopLoan.loan_months;
                          const r = (shopLoan.approved_rate || 9) / 100;
                          return Math.round(a * (1 + r * m));
                        })()}
                      />
                    )}

                    {!shopLoan.contract_signed ? (
                      <div>
                        <div className="rounded-xl p-4 mb-4 flex items-start gap-3"
                          style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                          <Icon name="FileText" size={16} className="text-purple-400 shrink-0 mt-0.5" />
                          <div className="text-white/60 text-sm">
                            Нажмите кнопку ниже для подписания договора. Деньги будут переведены в магазин сразу после подписания.
                          </div>
                        </div>
                        {shopSignMsg && (
                          <div className="rounded-xl p-3 mb-3 text-sm text-center" style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}>{shopSignMsg}</div>
                        )}
                        <button onClick={handleShopSign} disabled={shopSigning}
                          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                          style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)", opacity: shopSigning ? 0.7 : 1 }}>
                          {shopSigning
                            ? <><Icon name="Loader" size={18} className="animate-spin" /> Подписываем...</>
                            : <><Icon name="PenLine" size={18} /> Подписать договор</>
                          }
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                        <Icon name="CheckCircle" size={18} className="text-green-400" />
                        <div className="text-green-300 text-sm font-semibold">Договор подписан! Деньги переводятся в магазин.</div>
                      </div>
                    )}
                  </div>
                )}

                {shopLoan.status === "rejected" && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(239,68,68,0.15)" }}>
                      <Icon name="XCircle" size={16} className="text-red-400" />
                    </div>
                    <div>
                      <div className="text-white font-semibold mb-1">По заявке принято отрицательное решение</div>
                      {shopLoan.reject_reason && <div className="text-white/50 text-sm mb-1">Причина: {shopLoan.reject_reason}</div>}
                      <div className="text-white/40 text-xs">Вы можете подать новую заявку или обратиться к нашим специалистам.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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
                  <div>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(245,158,11,0.15)" }}>
                        <Icon name="Clock" size={16} className="text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-white font-semibold mb-1">Заявка рассматривается</div>
                        <div className="text-white/50 text-sm">Запрошено: <b className="text-white">{carLoan.loan_amount.toLocaleString("ru-RU")} ₽</b> на <b className="text-white">{carLoan.loan_months} мес.</b></div>
                      </div>
                    </div>
                    <div className="rounded-2xl p-5 text-center"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
                      {!carTimerDone ? (
                        <>
                          <div className="font-oswald text-5xl font-bold mb-2"
                            style={{ color: "#fbbf24", textShadow: "0 0 24px rgba(245,158,11,0.5)" }}>
                            {`${Math.floor(carTimer/60).toString().padStart(2,"0")}:${(carTimer%60).toString().padStart(2,"0")}`}
                          </div>
                          <div className="text-white/40 text-sm">Примерное время до ответа</div>
                        </>
                      ) : (
                        <>
                          <Icon name="FileSearch" size={28} className="text-yellow-400 mx-auto mb-2" />
                          <div className="text-white font-semibold mb-1">Заявка на рассмотрении</div>
                          <div className="text-white/40 text-sm">Специалист свяжется с вами в ближайшее время</div>
                        </>
                      )}
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
                    {carLoan.disbursed_at ? (
                      <PaymentHistory
                        schedule={carLoan.schedule || []}
                        payments={carLoan.payments || []}
                        paidTotal={carLoan.paidTotal || 0}
                        totalDue={(() => {
                          const a = carLoan.approved_amount || carLoan.loan_amount;
                          const m = carLoan.approved_months || carLoan.loan_months;
                          const r = (carLoan.approved_rate || 12) / 100;
                          return Math.round(a * (1 + r * m));
                        })()}
                      />
                    ) : (
                      <div className="rounded-xl p-4 flex items-start gap-3"
                        style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                        <Icon name="Phone" size={16} className="text-green-400 shrink-0 mt-0.5" />
                        <div className="text-white/60 text-sm">
                          Для подписания договора и получения денег свяжитесь с нашим специалистом:<br />
                          <span className="text-white font-semibold">+7 (495) 663-51-24</span>
                        </div>
                      </div>
                    )}
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