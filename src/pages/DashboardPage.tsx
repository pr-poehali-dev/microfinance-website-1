import { validatePayout } from "@/data/banks";
import SignCodeDialog from "@/components/SignCodeDialog";
import AddendumDialog from "./dashboard/AddendumDialog";
import DashboardSidebar, { DashboardSection } from "./dashboard/DashboardSidebar";
import ClientDocsSection from "./dashboard/ClientDocsSection";
import DebtCertificatesSection from "./dashboard/DebtCertificatesSection";
import HolidayDecisionModal from "./dashboard/HolidayDecisionModal";
import CreditHolidaysSection, { HolidaySource } from "./dashboard/CreditHolidaysSection";
import { HolidayRequest, holidayRowsFor, activeHoliday } from "./dashboard/creditHolidays";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import DashboardNavbar from "./dashboard/DashboardNavbar";
import DashboardApplicationStatus from "./dashboard/DashboardApplicationStatus";
import DashboardLoans from "./dashboard/DashboardLoans";
import DashboardSupport from "./dashboard/DashboardSupport";
import SupportChat from "./dashboard/SupportChat";
import PaymentHistory from "./dashboard/PaymentHistory";
import ClientProfileCard from "./dashboard/ClientProfileCard";
import RepeatLoanForm from "./dashboard/RepeatLoanForm";
import PromoCodeCard from "./dashboard/PromoCodeCard";
import PayLoanModal from "./dashboard/PayLoanModal";
import CardPayModal from "./dashboard/CardPayModal";
import RateReducedModal, { RateNews } from "./dashboard/RateReducedModal";
import GiftsSection from "./dashboard/GiftsSection";
import PaymentsList, { DueItem } from "./dashboard/PaymentsList";
import { nextPayment, isPastDue } from "./dashboard/nextPayment";
import TermLoanHistoryCard from "./dashboard/TermLoanHistoryCard";
import NewRequestHub from "./dashboard/NewRequestHub";
import CardActivatedModal from "./dashboard/CardActivatedModal";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";
const CAR_URL  = "https://functions.poehali.dev/651adde1-4432-4e5a-8086-3cda9898b7ac";
const SHOP_URL = "https://functions.poehali.dev/f0312370-20d7-488e-b072-dc4c0b2af2aa";
const CONTRACT_URL = "https://functions.poehali.dev/9cdc3bea-1348-49df-a7a3-4aeef6088ff3";

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
  insuranceAmount?: number;
  days: number;
  rate: number;
  ratePercent: number;
  interest: number;
  total: number;
  status: string;
  overdueDays?: number;
  penaltyAmount?: number;
  penaltyRatePercent?: number;
  createdAt: string;
  signed: boolean;
  disbursedAt?: string | null;
  offer?: LoanOffer;
  schedule?: ScheduleItem[];
  payments?: PaymentItem[];
  paidTotal?: number;
  remaining?: number;
  earlyPayoff?: { days: number; interest: number; remaining: number; saving: number };
}

interface User {
  id: number;
  phone: string;
  fullName: string;
  email: string;
}

interface CardTxSchedule {
  week: number;
  dueDate: string;
  amount: number;
}

interface CardTransaction {
  id: number;
  amount: number;
  weeks: number;
  rate: number;
  status: string;
  createdAt: string;
  total: number;
  schedule: CardTxSchedule[];
}

interface VirtualCard {
  debt?: number;
  minPayment?: number;
  paymentSchedule?: { week: number; dueDate: string; amount: number; isNext?: boolean }[];
  appId?: number;
  holidayUntil?: string | null;
  contractUrl?: string;
  number: string;
  expiry: string;
  cvv: string;
  holder: string;
  limit: number;
  available: number;
  rate: number;
  status: string;
  days?: number | null;
  transactions: CardTransaction[];
  repayments?: { amount: number; note: string; createdAt: string; principal?: number; interest?: number }[];
}

interface CardRequest {
  status: string;
  rejectReason: string;
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
  insuranceAmount?: number;
  rejectReason: string;
  cardNumber: string;
  contractUrl: string;
  virtualCard: VirtualCard | null;
  profile?: ClientProfile;
  isCreditDoctor?: boolean;
  reapplyDaysLeft?: number | null;
  videoCallRequested?: boolean;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [holidays, setHolidays] = useState<HolidayRequest[]>([]);
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const [reapplyBlock, setReapplyBlock] = useState<{ until: string; reason: string } | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [cardRequest, setCardRequest] = useState<CardRequest | null>(null);
  const [isRepeatClient, setIsRepeatClient] = useState(false);
  const [payLoan, setPayLoan] = useState<Loan | null>(null);
  const [payEarly, setPayEarly] = useState(false);
  const [rateNews, setRateNews] = useState<RateNews[]>([]);
  const isTermPaid = (l: { approved_amount: number | null; loan_amount: number; approved_months: number | null; loan_months: number; approved_rate: number | null; paidTotal?: number; disbursed_at?: string | null } | null, defRate: number) => {
    if (!l || !l.disbursed_at) return false;
    const a = l.approved_amount || l.loan_amount;
    const m = l.approved_months || l.loan_months;
    const total = Math.round(a * (1 + ((l.approved_rate || defRate) / 100) * m));
    return (l.paidTotal || 0) >= total - 0.5;
  };
  const [payCard, setPayCard] = useState<{ amount: number; dueDate: string } | null>(null);
  const [payOther, setPayOther] = useState<{ contractNumber: string; amount: number; loanType: "loan" | "carloan" | "shoploan"; loanId: number; early?: boolean } | null>(null);
  const [loanNotices, setLoanNotices] = useState<string[]>([]);
  const [profileEditable, setProfileEditable] = useState(false);
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingId, setSigningId] = useState<number | null>(null);
  const [signMsg, setSignMsg] = useState("");

  // Таймер 5:00 для pending-статуса
  const [timerSec, setTimerSec] = useState(5 * 60);
  const [timerDone, setTimerDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ensuringRef = useRef(false);
  const contractsPendingRef = useRef(false);
  const termEnsuredRef = useRef(false);

  // Карта/СБП для approved и partner_card
  const [cardInput, setCardInput] = useState("");
  const [cardSaving, setCardSaving] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);
  const [cardError, setCardError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmDone, setConfirmDone] = useState(false);
  const [cardActivating, setCardActivating] = useState(false);
  const [cardActivated, setCardActivated] = useState(false);
  const [showCardCongrats, setShowCardCongrats] = useState(false);
  const [cvvVisible, setCvvVisible] = useState(false);

  const [carLoan, setCarLoan] = useState<{
    id: number; loan_amount: number; loan_months: number; status: string;
    reject_reason: string | null; approved_amount: number | null;
    approved_months: number | null; approved_rate: number | null;
    car_brand: string; car_model: string; car_year: number; created_at: string;
    contract_signed: boolean;
    contract_url?: string | null;
    disbursed_at?: string | null;
    full_name?: string; email?: string; birth_date?: string; address?: string;
    passport_serial?: string; passport_num?: string; passport_issued?: string;
    car_mileage?: number; contact_person?: string; card_number?: string;
    payments?: PaymentItem[]; paidTotal?: number; earlyPayoff?: { months: number; remaining: number; saving: number } | null; schedule?: ScheduleItem[];
  } | null>(null);
  const [carSigning, setCarSigning] = useState(false);
  const [carSignMsg, setCarSignMsg] = useState("");

  const [shopLoan, setShopLoan] = useState<{
    id: number; loan_amount: number; loan_months: number; status: string;
    reject_reason: string | null; approved_amount: number | null;
    approved_months: number | null; approved_rate: number | null;
    notes: string | null; shop_name: string; item_name: string; item_price: number;
    contract_signed: boolean; created_at: string;
    contract_url?: string | null;
    disbursed_at?: string | null;
    full_name?: string; email?: string; birth_date?: string; address?: string;
    passport_series?: string; passport_number?: string; passport_date?: string;
    passport_by?: string; snils?: string; contact_person?: string; card_number?: string;
    payments?: PaymentItem[]; paidTotal?: number; earlyPayoff?: { months: number; remaining: number; saving: number } | null; schedule?: ScheduleItem[];
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
  const [paidToast, setPaidToast] = useState(false);
  const [addendumPending, setAddendumPending] = useState(false);
  const [section, setSection] = useState<DashboardSection>(new URLSearchParams(window.location.search).get("section") === "gifts" ? "gifts" : "apps");

  const loadTermLoans = (phone?: string) => {
    if (!phone) return;
    const ph = encodeURIComponent(phone);
    fetch(`${CAR_URL}?sub=get&phone=${ph}`).then(r => r.ok ? r.json() : null).then(d => { if (d?.item) setCarLoan(d.item); }).catch(() => {});
    fetch(`${SHOP_URL}?sub=get&phone=${ph}`).then(r => r.ok ? r.json() : null).then(d => { if (d?.item) setShopLoan(d.item); }).catch(() => {});
  };

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
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        setLoans(data.loans || []);
        setHolidays(data.holidays || []);
        setBlockedUntil(data.blockedUntil || null);
        setReapplyBlock(data.reapplyBlock || null);
        setRateNews(data.rateNews || []);
        setAddendumPending(!!data.addendumPending);
        setLoanNotices(data.loanNotices || []);
        setPromo(data.promo || null);
        setProfileEditable(!!data.profileEditable);
        setIsRepeatClient(!!data.isRepeatClient);
        const app = data.application || null;
        setApplication(app);
        contractsPendingRef.current = (!!app && (app.status === "approved" || app.status === "partner_card") && !app.contractUrl) || (!!app?.virtualCard && !app.virtualCard.contractUrl);
        const needLoanContract = !!app && (app.status === "approved" || app.status === "partner_card") && !app.contractUrl;
        const needCardContract = !!app?.virtualCard && !app.virtualCard.contractUrl;
        if ((needLoanContract || needCardContract || !termEnsuredRef.current) && !ensuringRef.current) {
          termEnsuredRef.current = true;
          ensuringRef.current = true;
          fetch(CONTRACT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
            body: JSON.stringify({ ensure: true }),
          })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.created?.loan || d?.created?.card) loadData(token, false); else if (d?.created?.car || d?.created?.shop) loadTermLoans(data.user?.phone); })
            .catch(() => {})
            .finally(() => { ensuringRef.current = false; });
        }
        setCardRequest(data.cardRequest || null);
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

    const ykId = localStorage.getItem("yk_payment_id");
    if (ykId) {
      localStorage.removeItem("yk_payment_id");
      let tries = 0;
      const check = () => {
        tries += 1;
        fetch("https://functions.poehali.dev/64ba6f22-6243-4b3f-ab24-f5bb294d5bfe?sub=check", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
          body: JSON.stringify({ paymentId: ykId }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.status === "succeeded") { setPaidToast(true); setTimeout(() => setPaidToast(false), 6000); loadData(token, false); }
            else if (tries < 5) setTimeout(check, 4000);
            else loadData(token, false);
          })
          .catch(() => {});
      };
      check();
    }

    // Автообновление каждые 2 минуты, только пока вкладка открыта — чтобы статус одобрения появлялся без перезагрузки
    const interval = setInterval(() => {
      if (document.hidden) return;
      const t = localStorage.getItem("token");
      if (t) loadData(t, false);
    }, 120000);
    const fast = setInterval(() => {
      if (document.hidden) return;
      const t = localStorage.getItem("token");
      if (t && contractsPendingRef.current) loadData(t, false);
    }, 6000);
    const onVisible = () => {
      if (document.hidden) return;
      const t = localStorage.getItem("token");
      if (t) loadData(t, false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); clearInterval(fast); document.removeEventListener("visibilitychange", onVisible); };
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

  const [signAction, setSignAction] = useState<null | (() => void)>(null);
  const askCode = (fn: () => void) => setSignAction(() => fn);
  const handleSign = (loan: Loan) => askCode(() => doSign(loan));
  const handleActivateCard = () => askCode(() => doActivateCard());
  const handleShopSign = () => askCode(() => doShopSign());
  const handleCarSign = () => askCode(() => doCarSign());
  const handleConfirm = () => {
    const payoutErr = validatePayout(cardInput, true);
    if (payoutErr) { setCardError(payoutErr); return; }
    askCode(() => doConfirm());
  };

  const handlePay = (loan: Loan, early = false) => {
    setPayEarly(early);
    setPayLoan(loan);
  };

  const doSign = async (loan: Loan) => {
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
    setSignMsg("Договор подписан! Ожидайте выдачу займа.");
    setLoans((prev) => prev.map((l) => l.id === loan.id ? { ...l, signed: true, offer: undefined } : l));
    // Подгружаем свежие данные, чтобы карточка одобренной заявки сразу увидела signed=true
    loadData(token, false);
  };

  const handleSaveCard = async () => {
    const payoutErr = validatePayout(cardInput, true);
    if (payoutErr) { setCardError(payoutErr); return; }
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

  const doActivateCard = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setCardActivating(true);
    try {
      const res = await fetch(LOANS_URL, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_card: true }),
      });
      if (res.ok) {
        setCardActivated(true);
        setShowCardCongrats(true);
        await loadData(token, false);
      } else {
        const d = await res.json().catch(() => ({}));
        window.alert(d.error || "Не удалось подписать договор. Попробуйте ещё раз.");
      }
    } catch {
      window.alert("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setCardActivating(false);
    }
  };

  const doShopSign = async () => {
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

  const doCarSign = async () => {
    if (!carLoan) return;
    setCarSigning(true); setCarSignMsg("");
    const r = await fetch(`${CAR_URL}?sub=sign&id=${carLoan.id}`, { method: "PUT", headers: { "Content-Type": "application/json" } });
    setCarSigning(false);
    if (r.ok) {
      setCarSignMsg("Договор подписан! Ожидайте выдачу займа.");
      setCarLoan(prev => prev ? { ...prev, contract_signed: true } : prev);
    } else {
      setCarSignMsg("Ошибка подписания. Попробуйте позже.");
    }
  };

  const doConfirm = async () => {
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
    <div className="min-h-screen font-golos" style={{ background: "#ffffff" }}>
      <DashboardNavbar user={user} onLogout={handleLogout} />
      {holidays.some((h) => !h.seen && h.status !== "pending") && rateNews.length === 0 && !showCardCongrats && (
        <HolidayDecisionModal
          items={holidays.filter((h) => !h.seen && h.status !== "pending")}
          onClose={() => setHolidays((prev) => prev.map((h) => ({ ...h, seen: true })))}
        />
      )}
      {rateNews.length > 0 && !showCardCongrats && (
        <RateReducedModal news={rateNews} onClose={() => setRateNews([])} />
      )}
      {showCardCongrats && application?.virtualCard && (
        <CardActivatedModal
          limit={application.virtualCard.limit}
          rate={application.virtualCard.rate}
          days={application.virtualCard.days}
          onClose={() => setShowCardCongrats(false)}
        />
      )}

      <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-20 sm:pt-28 pb-16">

        {/* ПРИВЕТСТВИЕ */}
        {user && (
          <div className="glass rounded-2xl p-4 sm:p-6 mb-6 flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 btn-neon rounded-2xl flex items-center justify-center shrink-0">
              <Icon name="User" size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-oswald text-2xl font-bold text-emerald-950">
                {user.fullName ? `Здравствуйте, ${user.fullName.split(" ")[0]}!` : "Личный кабинет"}
              </h1>
              <p className="text-emerald-950/50 text-sm">{user.phone}{user.email ? ` · ${user.email}` : ""}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6 items-start">
        <SupportChat />
        <DashboardSidebar active={section} onChange={setSection} />
        <div className="flex-1 min-w-0 w-full">

        {/* СОСТОЯНИЕ ЗАГРУЗКИ */}
        {loading && (
          <div className="text-center py-20">
            <Icon name="Loader2" size={40} className="animate-spin text-emerald-600 mx-auto mb-4" />
            <p className="text-emerald-950/50">Загружаем ваши данные...</p>
          </div>
        )}

        {error && (
          <div className="glass rounded-2xl p-5 flex items-center gap-3 mb-6" style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
            <Icon name="AlertCircle" size={20} className="text-red-600 shrink-0" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {blockedUntil && !loading && !error && (
          <div className="mb-4 rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.4)" }}>
            <Icon name="Ban" size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-red-700 font-bold text-sm">Подача новых заявок недоступна до {blockedUntil} (МСК)</div>
              <div className="text-emerald-950/60 text-xs mt-0.5">Личный кабинет, оплата и поддержка работают в обычном режиме.</div>
            </div>
          </div>
        )}

        {reapplyBlock && !blockedUntil && !loading && !error && (
          <div className="mb-4 rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.4)" }}>
            <Icon name="Ban" size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-red-700 font-bold text-sm">По вашей заявке принят отказ. Новую заявку можно подать с {reapplyBlock.until}</div>
              {reapplyBlock.reason && <div className="text-emerald-950/60 text-xs mt-0.5">Причина: {reapplyBlock.reason}</div>}
            </div>
          </div>
        )}

        {section === "profile" && (<>
        {/* АНКЕТА КЛИЕНТА */}
        {!loading && !error && user && application?.profile && (
          <ClientProfileCard profile={application.profile} phone={user.phone} editable={profileEditable} onSaved={() => { const t = localStorage.getItem("token"); if (t) loadData(t, false); }} />
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

        </>)}

        {section === "new" && (<>
        {/* ПОВТОРНАЯ ЗАЯВКА: клиент уже брал займ раньше и сейчас свободен от активной заявки
            (нет заявки, отказ, либо предыдущий займ уже полностью погашен) */}
        {!loading && !error && user && (
          <PromoCodeCard promo={promo} onApplied={() => { const t = localStorage.getItem("token"); if (t) loadData(t, false); }} />
        )}

        </>)}

        {!loading && !error && (section === "apps" || section === "cards") && (
          <>
            <DashboardApplicationStatus
              phone={user?.phone}
              holidays={holidays}
              profileEditable={profileEditable}
              part={section}
              application={application}
              cardRequest={cardRequest}
              loans={loans}
              isRepeatClient={isRepeatClient}
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
              onRefresh={() => { const t = localStorage.getItem("token"); if (t) loadData(t, false); }}
              setCardInput={setCardInput}
              setCardSaved={setCardSaved}
              setCardError={setCardError}
            />

            </>
        )}

        {!loading && !error && section === "repay" && (() => {
          const dues: DueItem[] = [];
          const addTerm = (
            l: { id: number; status: string; disbursed_at?: string | null; schedule?: { amount: number; dueDate: string | null; month?: number }[]; paidTotal?: number; approved_amount: number | null; loan_amount: number; approved_months: number | null; loan_months: number; approved_rate: number | null } | null,
            kind: "carloan" | "shoploan", title: string, pref: string, defRate: number,
          ) => {
            if (!l || l.status !== "approved" || !l.disbursed_at) return;
            const a = l.approved_amount || l.loan_amount;
            const m = l.approved_months || l.loan_months;
            const total = Math.round(a * (1 + ((l.approved_rate || defRate) / 100) * m));
            const np = nextPayment(l.schedule || [], l.paidTotal || 0, total);
            if (!np) return;
            dues.push({
              key: `${kind}${l.id}`,
              title,
              subtitle: `${np.month ? `${np.month}-й платёж` : "Платёж"}${np.dueDate ? ` · до ${np.dueDate}` : ""}`,
              amount: np.amount,
              overdue: isPastDue(np.dueDate),
              onPay: () => setPayOther({ contractNumber: `${pref}-${String(l.id).padStart(12, "0")}`, amount: np.amount, loanType: kind, loanId: l.id }),
            });
          };
          loans.filter((l) => l.status === "active" || l.status === "overdue").forEach((l) => {
            const left = Math.round(l.remaining ?? l.total);
            if (left <= 0) return;
            const due = l.schedule?.[0]?.dueDate;
            const weekly = (l.schedule?.length ?? 0) > 1 ? nextPayment(l.schedule || [], l.paidTotal || 0, l.total) : null;
            dues.push({
              key: `loan${l.id}`,
              title: `Долгосрочный займ ${fmtAppId(l.id)}`,
              subtitle: l.status === "overdue" ? `Просрочка ${l.overdueDays ?? 0} дн.` : activeHoliday(holidays, "loan", l.id) ? `Кредитные каникулы до ${activeHoliday(holidays, "loan", l.id)}` : weekly ? `Еженедельный платёж · до ${weekly.dueDate}` : due ? `Погашение до ${due}` : "Погашение займа",
              amount: weekly ? Math.min(left, weekly.amount) : left,
              overdue: l.status === "overdue" || (!!weekly && isPastDue(weekly.dueDate)),
              onPay: () => weekly && l.status !== "overdue"
                ? setPayOther({ contractNumber: fmtAppId(l.id), amount: Math.min(left, weekly.amount), loanType: "loan", loanId: l.id })
                : handlePay(l),
            });
          });
          const vc = application?.virtualCard;
          if (vc && vc.status === "active" && (vc.debt ?? 0) > 0) {
            const next = (vc.paymentSchedule ?? []).find((r) => r.isNext) ?? (vc.paymentSchedule ?? [])[0];
            const amt = Math.min(Math.round(vc.minPayment ?? vc.debt ?? 0), Math.round(vc.debt ?? 0));
            if (next && amt > 0) {
              dues.push({
                key: "card",
                title: "Карта РУСФИНАНС 24",
                subtitle: vc.holidayUntil ? `Кредитные каникулы до ${vc.holidayUntil}` : `Минимальный платёж · до ${next.dueDate}`,
                amount: amt,
                overdue: isPastDue(next.dueDate) && !vc.holidayUntil,
                onPay: () => setPayCard({ amount: amt, dueDate: next.dueDate }),
              });
            }
          }
          addTerm(carLoan, "carloan", "Займ под залог авто", "А", 12);
          addTerm(shopLoan, "shoploan", "Займ на покупки", "Т", 9);
          return <PaymentsList loans={loans} cardRepayments={application?.virtualCard?.repayments ?? []} dues={dues} />;
        })()}

        {!loading && !error && (section === "history" || (section === "apps" && loans.some((l) => l.status !== "paid"))) && (
          <>
            <DashboardLoans
              loans={section === "history" ? loans.filter((l) => l.status === "paid") : loans.filter((l) => l.status !== "paid")}
              application={application}
              isRepeatClient={isRepeatClient}
              signingId={signingId}
              signMsg={signMsg}
              onSign={handleSign}
              onPay={handlePay}
              hideNewLoan={section === "apps"}
              holidays={holidays}
            />
          </>
        )}

        {section === "history" && !loading && !error && carLoan && isTermPaid(carLoan, 12) && (
          <TermLoanHistoryCard
            title="Займ под залог авто" icon="Car" number={`А-${String(carLoan.id).padStart(12, "0")}`}
            amount={carLoan.approved_amount || carLoan.loan_amount} months={carLoan.approved_months || carLoan.loan_months}
            total={carLoan.paidTotal || 0} payments={carLoan.payments || []} contractUrl={carLoan.contract_url}
          />
        )}
        {section === "history" && !loading && !error && shopLoan && isTermPaid(shopLoan, 9) && (
          <TermLoanHistoryCard
            title="Займ на покупки" icon="ShoppingCart" number={`Т-${String(shopLoan.id).padStart(12, "0")}`}
            amount={shopLoan.approved_amount || shopLoan.loan_amount} months={shopLoan.approved_months || shopLoan.loan_months}
            total={shopLoan.paidTotal || 0} payments={shopLoan.payments || []} contractUrl={shopLoan.contract_url}
          />
        )}

        {/* БЛОК ТОВАРНОГО ЗАЙМА */}
        {section === "apps" && shopLoan && !isTermPaid(shopLoan, 9) && (
          <div className="mb-6">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-5 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg,rgba(20,184,166,0.15),rgba(6,182,212,0.1))", borderBottom: "1px solid rgba(20,184,166,0.2)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg,#14b8a6,#06b6d4)" }}>
                  <Icon name="ShoppingBag" size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-emerald-950 font-bold">Займ на покупку товара</div>
                  <div className="text-emerald-950/40 text-xs">{shopLoan.item_name || "Товар"} · #{shopLoan.id}</div>
                </div>
                {shopLoan.status === "pending" && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(20,184,166,0.2)", color: "#6ee7b7", border: "1px solid rgba(20,184,166,0.3)" }}>На рассмотрении</span>
                )}
                {shopLoan.status === "approved" && !shopLoan.contract_signed && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>Одобрено ✓</span>
                )}
                {shopLoan.status === "approved" && shopLoan.contract_signed && !shopLoan.disbursed_at && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.3)" }}>Ожидает выдачи</span>
                )}
                {shopLoan.status === "approved" && shopLoan.disbursed_at && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(14,165,233,0.2)", color: "#38bdf8", border: "1px solid rgba(14,165,233,0.3)" }}>Займ выдан</span>
                )}
                {shopLoan.status === "rejected" && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.3)" }}>Отказ</span>
                )}
              </div>

              <div className="p-5">
                {shopLoan.status === "pending" && (
                  <div>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(20,184,166,0.15)" }}>
                        <Icon name="Clock" size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-emerald-950 font-semibold mb-1">Заявка рассматривается</div>
                        <div className="text-emerald-950/50 text-sm">Запрошено: <b className="text-emerald-950">{shopLoan.loan_amount.toLocaleString("ru-RU")} ₽</b> на <b className="text-emerald-950">{shopLoan.loan_months} мес.</b></div>
                      </div>
                    </div>
                    <div className="rounded-2xl p-5 text-center"
                      style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.25)" }}>
                      {!shopTimerDone ? (
                        <>
                          <div className="font-oswald text-4xl sm:text-5xl font-bold mb-2"
                            style={{ color: "#0d9488", textShadow: "0 0 24px rgba(20,184,166,0.5)" }}>
                            {`${Math.floor(shopTimer/60).toString().padStart(2,"0")}:${(shopTimer%60).toString().padStart(2,"0")}`}
                          </div>
                          <div className="text-emerald-950/40 text-sm">Примерное время до ответа</div>
                        </>
                      ) : (
                        <>
                          <Icon name="FileSearch" size={28} className="text-emerald-600 mx-auto mb-2" />
                          <div className="text-emerald-950 font-semibold mb-1">Заявка на рассмотрении</div>
                          <div className="text-emerald-950/40 text-sm">Специалист свяжется с вами в ближайшее время</div>
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
                        { l: "Ставка", v: `${shopLoan.approved_rate || 9}% / мес.`, c: "#ef4444" },
                        { l: "К возврату", v: (() => {
                          const a = shopLoan.approved_amount || shopLoan.loan_amount;
                          const m = shopLoan.approved_months || shopLoan.loan_months;
                          const r = (shopLoan.approved_rate || 9) / 100;
                          return `${Math.round(a * (1 + r * m)).toLocaleString("ru-RU")} ₽`;
                        })(), c: "#6ee7b7" },
                      ].map(({ l, v, c }) => (
                        <div key={l} className="rounded-xl p-3" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.07)" }}>
                          <div className="text-emerald-950/40 text-xs mb-1">{l}</div>
                          <div className="font-bold" style={{ color: c }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {shopLoan.notes && (
                      <div className="rounded-xl p-3 mb-4 text-emerald-950/50 text-sm" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.07)" }}>
                        📝 {shopLoan.notes}
                      </div>
                    )}

                    {shopLoan.contract_signed && (
                      <PaymentHistory
                        holiday={holidayRowsFor(holidays, "shoploan", shopLoan.id)}
                        schedule={shopLoan.schedule || []}
                        payments={shopLoan.payments || []}
                        paidTotal={shopLoan.paidTotal || 0}
                        totalDue={(() => {
                          const a = shopLoan.approved_amount || shopLoan.loan_amount;
                          const m = shopLoan.approved_months || shopLoan.loan_months;
                          const r = (shopLoan.approved_rate || 9) / 100;
                          return Math.round(a * (1 + r * m));
                        })()}
                        onPay={shopLoan.disbursed_at && shopLoan.status === "approved" ? (amt) => setPayOther({ contractNumber: `Т-${String(shopLoan.id).padStart(12, "0")}`, amount: amt, loanType: "shoploan", loanId: shopLoan.id }) : undefined}
                      />
                    )}

                    {!shopLoan.contract_signed ? (
                      <div>
                        <div className="rounded-xl p-4 mb-4 flex items-start gap-3"
                          style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)" }}>
                          <Icon name="FileText" size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div className="text-emerald-950/60 text-sm">
                            Нажмите кнопку ниже для подписания договора. Деньги будут переведены в магазин сразу после подписания.
                          </div>
                        </div>
                        {shopSignMsg && (
                          <div className="rounded-xl p-3 mb-3 text-sm text-center" style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}>{shopSignMsg}</div>
                        )}
                        <button onClick={handleShopSign} disabled={shopSigning}
                          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                          style={{ background: "linear-gradient(135deg,#14b8a6,#06b6d4)", opacity: shopSigning ? 0.7 : 1 }}>
                          {shopSigning
                            ? <><Icon name="Loader" size={18} className="animate-spin" /> Подписываем...</>
                            : <><Icon name="PenLine" size={18} /> Подписать договор</>
                          }
                        </button>
                      </div>
                    ) : shopLoan.disbursed_at ? (
                      <div className="space-y-3">
                        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.3)" }}>
                          <Icon name="BadgeCheck" size={18} className="text-sky-400" />
                          <div>
                            <div className="text-sky-300 text-sm font-semibold">Займ выдан! Деньги переведены в магазин.</div>
                            <div className="text-emerald-950/40 text-xs mt-0.5">{new Date(shopLoan.disbursed_at).toLocaleString("ru-RU")}</div>
                          </div>
                        </div>
                        {shopLoan.status === "approved" && (
                          <button
                            onClick={() => {
                              const a = shopLoan.approved_amount || shopLoan.loan_amount;
                              const m = shopLoan.approved_months || shopLoan.loan_months;
                              const r = (shopLoan.approved_rate || 9) / 100;
                              const totalDue = Math.round(a * (1 + r * m));
                              const remaining = Math.max(0, totalDue - (shopLoan.paidTotal || 0));
                              setPayOther({ contractNumber: `Т-${String(shopLoan.id).padStart(12, "0")}`, amount: remaining, loanType: "shoploan", loanId: shopLoan.id });
                            }}
                            className="w-full text-white font-semibold px-4 sm:px-6 py-3 rounded-xl flex items-center justify-center gap-2"
                            style={{ background: "linear-gradient(135deg,#14b8a6,#06b6d4)" }}
                          >
                            <Icon name="Banknote" size={16} />
                            Погасить займ
                          </button>
                        )}
                        {shopLoan.status === "approved" && shopLoan.earlyPayoff && (
                          <button
                            onClick={() => setPayOther({ contractNumber: `Т-${String(shopLoan.id).padStart(12, "0")}`, amount: shopLoan.earlyPayoff?.remaining ?? 0, loanType: "shoploan", loanId: shopLoan.id, early: true })}
                            className="w-full font-semibold px-4 sm:px-6 py-3 rounded-xl flex items-center justify-center gap-2"
                            style={{ background: "rgba(16,185,129,0.15)", color: "#047857", border: "1px solid rgba(16,185,129,0.4)" }}
                          >
                            <Icon name="Zap" size={16} />
                            Досрочное погашение · {shopLoan.earlyPayoff.remaining.toLocaleString("ru-RU")} ₽
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                        <Icon name="Clock" size={18} className="text-red-600 animate-pulse" />
                        <div className="text-red-600 text-sm font-semibold">Договор подписан! Ожидайте выдачу — деньги скоро переведутся в магазин.</div>
                      </div>
                    )}
                  </div>
                )}

                {shopLoan.status === "rejected" && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(239,68,68,0.15)" }}>
                      <Icon name="XCircle" size={16} className="text-red-600" />
                    </div>
                    <div>
                      <div className="text-emerald-950 font-semibold mb-1">По заявке принято отрицательное решение</div>
                      {shopLoan.reject_reason && <div className="text-emerald-950/50 text-sm mb-1">Причина: {shopLoan.reject_reason}</div>}
                      <div className="text-emerald-950/40 text-xs">Вы можете подать новую заявку или обратиться к нашим специалистам.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* БЛОК АВТО-ЗАЙМА */}
        {section === "apps" && carLoan && !isTermPaid(carLoan, 12) && (
          <div className="mb-6">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-5 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.1))", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg,#ef4444,#ef4444)" }}>
                  <Icon name="Car" size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-emerald-950 font-bold">Займ под залог автомобиля</div>
                  <div className="text-emerald-950/40 text-xs">{carLoan.car_brand} {carLoan.car_model} {carLoan.car_year} · #{carLoan.id}</div>
                </div>
                {carLoan.status === "pending" && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.3)" }}>
                    На рассмотрении
                  </span>
                )}
                {carLoan.status === "approved" && !carLoan.contract_signed && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                    Одобрено ✓
                  </span>
                )}
                {carLoan.status === "approved" && carLoan.contract_signed && !carLoan.disbursed_at && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.3)" }}>
                    Ожидает выдачи
                  </span>
                )}
                {carLoan.status === "approved" && carLoan.disbursed_at && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(14,165,233,0.2)", color: "#38bdf8", border: "1px solid rgba(14,165,233,0.3)" }}>
                    Займ выдан
                  </span>
                )}
                {carLoan.status === "rejected" && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.3)" }}>
                    Отказ
                  </span>
                )}
              </div>

              <div className="p-5">
                {carLoan.status === "pending" && (
                  <div>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(239,68,68,0.15)" }}>
                        <Icon name="Clock" size={16} className="text-red-600" />
                      </div>
                      <div>
                        <div className="text-emerald-950 font-semibold mb-1">Заявка рассматривается</div>
                        <div className="text-emerald-950/50 text-sm">Запрошено: <b className="text-emerald-950">{carLoan.loan_amount.toLocaleString("ru-RU")} ₽</b> на <b className="text-emerald-950">{carLoan.loan_months} мес.</b></div>
                      </div>
                    </div>
                    <div className="rounded-2xl p-5 text-center"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                      {!carTimerDone ? (
                        <>
                          <div className="font-oswald text-4xl sm:text-5xl font-bold mb-2"
                            style={{ color: "#dc2626", textShadow: "0 0 24px rgba(239,68,68,0.5)" }}>
                            {`${Math.floor(carTimer/60).toString().padStart(2,"0")}:${(carTimer%60).toString().padStart(2,"0")}`}
                          </div>
                          <div className="text-emerald-950/40 text-sm">Примерное время до ответа</div>
                        </>
                      ) : (
                        <>
                          <Icon name="FileSearch" size={28} className="text-red-600 mx-auto mb-2" />
                          <div className="text-emerald-950 font-semibold mb-1">Заявка на рассмотрении</div>
                          <div className="text-emerald-950/40 text-sm">Специалист свяжется с вами в ближайшее время</div>
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
                        { l: "Ставка", v: `${carLoan.approved_rate || 12}% / мес.`, c: "#ef4444" },
                        { l: "К возврату",
                          v: (() => {
                            const a = carLoan.approved_amount || carLoan.loan_amount;
                            const m = carLoan.approved_months || carLoan.loan_months;
                            const r = (carLoan.approved_rate || 12) / 100;
                            return `${Math.round(a * (1 + r * m)).toLocaleString("ru-RU")} ₽`;
                          })(),
                          c: "#6ee7b7" },
                      ].map(({ l, v, c }) => (
                        <div key={l} className="rounded-xl p-3" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.07)" }}>
                          <div className="text-emerald-950/40 text-xs mb-1">{l}</div>
                          <div className="font-bold" style={{ color: c }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {carLoan.disbursed_at ? (
                      <div className="space-y-3">
                        <PaymentHistory
                          holiday={holidayRowsFor(holidays, "carloan", carLoan.id)}
                          schedule={carLoan.schedule || []}
                          payments={carLoan.payments || []}
                          paidTotal={carLoan.paidTotal || 0}
                          totalDue={(() => {
                            const a = carLoan.approved_amount || carLoan.loan_amount;
                            const m = carLoan.approved_months || carLoan.loan_months;
                            const r = (carLoan.approved_rate || 12) / 100;
                            return Math.round(a * (1 + r * m));
                          })()}
                        onPay={carLoan.disbursed_at && carLoan.status === "approved" ? (amt) => setPayOther({ contractNumber: `А-${String(carLoan.id).padStart(12, "0")}`, amount: amt, loanType: "carloan", loanId: carLoan.id }) : undefined}
                        />
                        {carLoan.status === "approved" && (
                          <button
                            onClick={() => {
                              const a = carLoan.approved_amount || carLoan.loan_amount;
                              const m = carLoan.approved_months || carLoan.loan_months;
                              const r = (carLoan.approved_rate || 12) / 100;
                              const totalDue = Math.round(a * (1 + r * m));
                              const remaining = Math.max(0, totalDue - (carLoan.paidTotal || 0));
                              setPayOther({ contractNumber: `А-${String(carLoan.id).padStart(12, "0")}`, amount: remaining, loanType: "carloan", loanId: carLoan.id });
                            }}
                            className="w-full text-white font-semibold px-4 sm:px-6 py-3 rounded-xl flex items-center justify-center gap-2"
                            style={{ background: "linear-gradient(135deg,#ef4444,#ef4444)" }}
                          >
                            <Icon name="Banknote" size={16} />
                            Погасить займ
                          </button>
                        )}
                        {carLoan.status === "approved" && carLoan.earlyPayoff && (
                          <button
                            onClick={() => setPayOther({ contractNumber: `А-${String(carLoan.id).padStart(12, "0")}`, amount: carLoan.earlyPayoff?.remaining ?? 0, loanType: "carloan", loanId: carLoan.id, early: true })}
                            className="w-full font-semibold px-4 sm:px-6 py-3 rounded-xl flex items-center justify-center gap-2"
                            style={{ background: "rgba(16,185,129,0.15)", color: "#047857", border: "1px solid rgba(16,185,129,0.4)" }}
                          >
                            <Icon name="Zap" size={16} />
                            Досрочное погашение · {carLoan.earlyPayoff.remaining.toLocaleString("ru-RU")} ₽
                          </button>
                        )}
                      </div>
                    ) : !carLoan.contract_signed ? (
                      <div>
                        <div className="rounded-xl p-4 mb-4 flex items-start gap-3"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <Icon name="FileText" size={16} className="text-red-600 shrink-0 mt-0.5" />
                          <div className="text-emerald-950/60 text-sm">
                            Нажмите кнопку ниже для подписания договора. Деньги будут переведены на ваши реквизиты сразу после подписания.
                          </div>
                        </div>
                        {carSignMsg && (
                          <div className="rounded-xl p-3 mb-3 text-sm text-center" style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}>{carSignMsg}</div>
                        )}
                        <button onClick={handleCarSign} disabled={carSigning}
                          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                          style={{ background: "linear-gradient(135deg,#ef4444,#ef4444)", opacity: carSigning ? 0.7 : 1 }}>
                          {carSigning
                            ? <><Icon name="Loader" size={18} className="animate-spin" /> Подписываем...</>
                            : <><Icon name="PenLine" size={18} /> Подписать договор</>
                          }
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl p-4 flex items-center gap-3"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                        <Icon name="Clock" size={18} className="text-red-600 animate-pulse" />
                        <div className="text-red-600 text-sm font-semibold">Договор подписан! Ожидайте выдачу — деньги скоро поступят на ваши реквизиты.</div>
                      </div>
                    )}
                  </div>
                )}

                {carLoan.status === "rejected" && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(239,68,68,0.15)" }}>
                      <Icon name="XCircle" size={16} className="text-red-600" />
                    </div>
                    <div>
                      <div className="text-emerald-950 font-semibold mb-1">По заявке принято отрицательное решение</div>
                      {carLoan.reject_reason && (
                        <div className="text-emerald-950/50 text-sm mb-2">Причина: {carLoan.reject_reason}</div>
                      )}
                      <div className="text-emerald-950/40 text-xs">Вы можете подать новую заявку или обратиться к нашим специалистам.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {section === "new" && !loading && !error && user && (
          <NewRequestHub
            phone={user.phone}
            profile={application?.profile ?? null}
            profileEditable={profileEditable}
            hasCard={!!application?.virtualCard && application.virtualCard.status !== "none"}
            cardRequestStatus={cardRequest?.status ?? null}
            cardRequestRejectReason={cardRequest?.rejectReason}
            onRefresh={() => { const t = localStorage.getItem("token"); if (t) loadData(t, false); }}
            cashForm={
              (!application ||
                application.status === "rejected" ||
                ((application.status === "approved" || application.status === "partner_card") && loans[0]?.status === "paid"))
                ? (
                  <RepeatLoanForm
                    promo={promo}
                    profile={application?.profile ?? null}
                    profileEditable={profileEditable}
                    onProfileSaved={() => { const t = localStorage.getItem("token"); if (t) loadData(t, false); }}
                    fullName={user.fullName}
                    phone={user.phone}
                    onSuccess={() => { const t = localStorage.getItem("token"); if (t) loadData(t, false); }}
                  />
                ) : null
            }
            cdForm={
              (!application ||
                application.status === "rejected" ||
                ((application.status === "approved" || application.status === "partner_card") && loans[0]?.status === "paid"))
                ? (
                  <RepeatLoanForm
                    creditDoctor
                    promo={promo}
                    profile={application?.profile ?? null}
                    profileEditable={profileEditable}
                    onProfileSaved={() => { const t = localStorage.getItem("token"); if (t) loadData(t, false); }}
                    fullName={user.fullName}
                    phone={user.phone}
                    onSuccess={() => { const t = localStorage.getItem("token"); if (t) loadData(t, false); }}
                  />
                ) : null
            }
          />
        )}

        {section === "gifts" && !loading && !error && user && <GiftsSection defaultName={user.fullName || ""} defaultPhone={user.phone} />}

        {section === "photos" && !loading && !error && user && <ClientDocsSection phone={user.phone} />}

        {section === "certs" && !loading && !error && <DebtCertificatesSection />}

        {section === "docs" && !loading && !error && (
          <div className="glass rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="font-oswald text-2xl font-bold text-emerald-950 mb-4">Документы</h2>
            {(() => {
              const docs = [
                application?.contractUrl ? { title: "Договор займа", url: application.contractUrl } : null,
                application?.virtualCard?.contractUrl ? { title: "Договор по карте РУСФИНАНС 24", url: application.virtualCard.contractUrl } : null,
                carLoan?.contract_url ? { title: "Договор займа под залог авто", url: carLoan.contract_url } : null,
                shopLoan?.contract_url ? { title: "Договор займа на покупки", url: shopLoan.contract_url } : null,
              ].filter(Boolean) as { title: string; url: string }[];
              if (docs.length === 0) return <p className="text-emerald-950/50 text-sm">Документов пока нет. Они появятся после одобрения заявки.</p>;
              return (
                <div className="space-y-2">
                  {docs.map((d) => (
                    <a key={d.url} href={d.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-emerald-950 font-medium hover:border-emerald-500 transition-colors"
                      style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)" }}>
                      <Icon name="FileText" size={18} className="text-emerald-600" />
                      {d.title}
                      <Icon name="Download" size={16} className="ml-auto text-emerald-600" />
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {section === "holidays" && !loading && !error && (() => {
          const sources: HolidaySource[] = [];
          loans.filter((l) => l.status === "active" || l.status === "overdue").forEach((l) => {
            if (!(l.remaining ?? l.total)) return;
            const sch = l.schedule || [];
            if (!sch.length) return;
            sources.push({
              kind: "loan", id: l.id, label: `Займ ${fmtAppId(l.id)}`,
              payments: sch.map((x, i) => ({ idx: i, label: x.month ? `${x.month}-й платёж` : "Погашение займа", dueDate: x.dueDate || "", amount: x.amount })),
            });
          });
          const addT = (t: { id: number; status: string; disbursed_at?: string | null; schedule?: ScheduleItem[] } | null, kind: "carloan" | "shoploan", title: string, pref: string) => {
            if (!t || t.status !== "approved" || !t.disbursed_at || !(t.schedule || []).length) return;
            sources.push({
              kind, id: t.id, label: `${title} ${pref}-${String(t.id).padStart(12, "0")}`,
              payments: (t.schedule || []).map((x, i) => ({ idx: i, label: x.month ? `${x.month}-й платёж` : "Платёж", dueDate: x.dueDate || "", amount: x.amount })),
            });
          };
          const vcH = application?.virtualCard;
          if (vcH && vcH.status === "active" && (vcH.debt ?? 0) > 0 && vcH.appId && (vcH.paymentSchedule ?? []).length) {
            sources.push({
              kind: "card", id: vcH.appId, label: "Карта РУСФИНАНС 24",
              payments: (vcH.paymentSchedule ?? []).map((x, i) => ({ idx: i, label: `${x.week}-я неделя`, dueDate: x.dueDate, amount: x.amount })),
            });
          }
          addT(carLoan, "carloan", "Займ под залог авто", "А");
          addT(shopLoan, "shoploan", "Займ на покупки", "Т");
          return <CreditHolidaysSection sources={sources} holidays={holidays} onSent={() => { const t = localStorage.getItem("token"); if (t) loadData(t, false); }} />;
        })()}

        {section === "profile" && <DashboardSupport />}
        </div>
        </div>
      </div>

      {paidToast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 400, background: "#047857", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          Оплата прошла, платёж засчитан
        </div>
      )}

      {payLoan && (
        <PayLoanModal
          contractNumber={fmtAppId(payLoan.id)}
          amount={payEarly && payLoan.earlyPayoff ? payLoan.earlyPayoff.remaining : (payLoan.remaining ?? payLoan.total)}
          early={payEarly}
          loanType="loan"
          loanId={payLoan.id}
          alreadyReported={loanNotices.includes(`loan|${payLoan.id}`)}
          onReported={() => { const t = localStorage.getItem("token"); if (t) loadData(t); }}
          onClose={() => setPayLoan(null)}
        />
      )}

      {payCard && application?.virtualCard && (
        <CardPayModal
          amount={payCard.amount}
          dueDate={payCard.dueDate}
          cardLast4={application.virtualCard.number.replace(/\D/g, "").slice(-4)}
          onClose={() => setPayCard(null)}
        />
      )}

      {payOther && (
        <PayLoanModal
          contractNumber={payOther.contractNumber}
          amount={payOther.amount}
          loanType={payOther.loanType}
          loanId={payOther.loanId}
          early={payOther.early}
          alreadyReported={loanNotices.includes(`${payOther.loanType}|${payOther.loanId}`)}
          onReported={() => { const t = localStorage.getItem("token"); if (t) loadData(t); }}
          onClose={() => setPayOther(null)}
        />
      )}
      <AddendumDialog open={addendumPending} onSigned={() => setAddendumPending(false)} />
      <SignCodeDialog
        open={!!signAction}
        title="Подпись договора"
        confirmLabel="Подтвердить"
        onClose={() => setSignAction(null)}
        onConfirm={() => { const fn = signAction; setSignAction(null); fn?.(); }}
      />
    </div>
  );
}