import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import DashboardNavbar from "./dashboard/DashboardNavbar";
import DashboardApplicationStatus from "./dashboard/DashboardApplicationStatus";
import DashboardLoans from "./dashboard/DashboardLoans";
import DashboardSupport from "./dashboard/DashboardSupport";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

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

  // Карта/СБП для approved
  const [cardInput, setCardInput] = useState("");
  const [cardSaving, setCardSaving] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);
  const [cardError, setCardError] = useState("");

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
    alert(`Оплата займа №${fmtAppId(loan.id)} на сумму ${loan.total.toLocaleString("ru-RU")} ₽\n\nДля оплаты свяжитесь с нами:\n📞 +7 (495) 663-51-24\n📧 PARAFINANS24@ya.ru`);
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
              onSign={handleSign}
              onSaveCard={handleSaveCard}
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

        <DashboardSupport />
      </div>
    </div>
  );
}