import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import PaymentHistory, { ScheduleItem, PaymentItem } from "./PaymentHistory";

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

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: "Займ выдан",      color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  paid:     { label: "Погашен",         color: "#2dd4bf", bg: "rgba(45,212,191,0.15)" },
  overdue:  { label: "Просрочен",       color: "#dc2626", bg: "rgba(248,113,113,0.15)" },
  review:   { label: "На рассмотрении", color: "#dc2626", bg: "rgba(239,68,68,0.15)" },
  signed:   { label: "Ожидает выдачи",  color: "#dc2626", bg: "rgba(239,68,68,0.15)" },
};

interface Props {
  loans: Loan[];
  application: Application | null;
  isRepeatClient?: boolean;
  signingId: number | null;
  signMsg: string;
  onSign: (loan: Loan) => void;
  onPay: (loan: Loan) => void;
}

export default function DashboardLoans({ loans, application, isRepeatClient, signingId, signMsg, onSign, onPay }: Props) {
  const navigate = useNavigate();

  return (
    <>
      <h2 id="my-loans" className="font-oswald text-2xl font-bold text-emerald-950 mb-4 scroll-mt-24">Мои займы</h2>

      {loans.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(16,185,129,0.2)" }}>
            <Icon name="FileText" size={28} className="text-emerald-600" />
          </div>
          {application && application.status === "pending" ? (
            <>
              <h3 className="text-emerald-950 font-semibold text-lg mb-2">Заявка отправлена</h3>
              <p className="text-emerald-950/50 text-sm">Как только заявка будет одобрена — займ появится здесь</p>
            </>
          ) : (
            <>
              <h3 className="text-emerald-950 font-semibold text-lg mb-2">Займов пока нет</h3>
              <p className="text-emerald-950/50 text-sm mb-6">Оформите первый займ прямо сейчас</p>
              <button
                onClick={() => navigate("/")}
                className="btn-neon text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2"
              >
                <Icon name="Plus" size={16} />
                Оформить займ
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const effectiveStatus = loan.status === "review" && loan.signed ? "signed" : loan.status;
            const st = STATUS_MAP[effectiveStatus] || STATUS_MAP.active;
            return (
              <div key={loan.id} className="glass rounded-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-emerald-900/15"
                  style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(20,184,166,0.08))" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 btn-neon rounded-xl flex items-center justify-center shrink-0">
                      <Icon name="CreditCard" size={18} className="text-white" />
                    </div>
                    <div>
                      <div className="text-emerald-950 font-semibold">Займ #{loan.id}</div>
                      <div className="text-emerald-950/40 text-xs">от {loan.createdAt}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>

                <div className="px-6 py-5">
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(16,185,129,0.04)" }}>
                      <div className="text-emerald-950/40 text-xs mb-1">Сумма займа</div>
                      <div className="text-emerald-950 font-bold text-lg">{loan.amount.toLocaleString("ru-RU")} ₽</div>
                    </div>
                    <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(16,185,129,0.04)" }}>
                      <div className="text-emerald-950/40 text-xs mb-1">Срок</div>
                      <div className="text-emerald-950 font-bold text-lg">{loan.days} дн.</div>
                    </div>
                    <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(16,185,129,0.04)" }}>
                      <div className="text-emerald-950/40 text-xs mb-1">Ставка</div>
                      <div className="text-emerald-950 font-bold text-lg">{loan.ratePercent}%/день</div>
                    </div>
                  </div>

                  {!!loan.insuranceAmount && (
                    <div className="rounded-xl p-3 flex items-start gap-3 mb-5"
                      style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}>
                      <Icon name="ShieldCheck" size={16} className="text-green-400 shrink-0 mt-0.5" />
                      <p className="text-emerald-950/50 text-xs leading-relaxed">
                        Страхование жизни и здоровья — <span className="text-green-400 font-semibold">{loan.insuranceAmount.toLocaleString("ru-RU")} ₽</span> (50% от суммы займа) включено в сумму займа.
                      </p>
                    </div>
                  )}

                  {/* Подпись договора для review-займа */}
                  {loan.status === "review" && !loan.signed && !loan.offer && (
                    <div className="mb-4 space-y-3">
                      {application?.contractUrl ? (
                        <a
                          href={application.contractUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                          style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", textDecoration: "none" }}
                        >
                          <Icon name="FileDown" size={18} />
                          Скачать договор займа (PDF)
                        </a>
                      ) : (
                        <div className="rounded-xl px-4 py-3 flex items-center gap-3"
                          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                          <Icon name="Loader2" size={16} className="text-emerald-600 animate-spin shrink-0" />
                          <span className="text-emerald-950/50 text-sm">Договор формируется, появится через минуту...</span>
                        </div>
                      )}
                      {signMsg && (
                        <div className="rounded-xl px-4 py-3 text-sm font-medium"
                          style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                          <Icon name="CheckCircle" size={14} className="inline mr-2" />{signMsg}
                        </div>
                      )}
                      <button onClick={() => onSign(loan)} disabled={signingId === loan.id}
                        className="w-full text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                        style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", boxShadow: "0 4px 20px rgba(16,185,129,0.3)" }}>
                        {signingId === loan.id
                          ? <><Icon name="Loader2" size={16} className="animate-spin" />Подписываем...</>
                          : <><Icon name="PenLine" size={16} />Подписать договор</>
                        }
                      </button>
                    </div>
                  )}

                  {/* Блок: Договор подписан, ожидайте выдачу */}
                  {loan.status === "review" && loan.signed && !loan.disbursedAt && (
                    <div className="mb-4 rounded-xl px-5 py-4 flex items-center gap-3"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                      <Icon name="Clock" size={22} className="text-red-600 shrink-0 animate-pulse" />
                      <div>
                        <div className="text-red-600 font-bold text-sm">Договор подписан! Ожидайте выдачу займа</div>
                        <div className="text-emerald-950/40 text-xs mt-0.5">Деньги скоро поступят на ваши реквизиты</div>
                      </div>
                    </div>
                  )}

                  {/* Блок: Займ выдан */}
                  {loan.status === "active" && loan.disbursedAt && (
                    <div className="mb-4 rounded-xl px-5 py-4 flex items-center gap-3"
                      style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)" }}>
                      <Icon name="BadgeCheck" size={22} className="text-green-400 shrink-0" />
                      <div>
                        <div className="text-green-300 font-bold text-sm">Деньги переведены на ваши реквизиты</div>
                        <div className="text-emerald-950/40 text-xs mt-0.5">Выдан {loan.disbursedAt}</div>
                      </div>
                    </div>
                  )}

                  {/* Блок: Просрочка — растущая пеня */}
                  {loan.status === "overdue" && !!loan.overdueDays && (
                    <div className="mb-4 rounded-xl px-5 py-4 flex items-start gap-3"
                      style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.35)" }}>
                      <Icon name="AlertTriangle" size={22} className="text-red-600 shrink-0" />
                      <div>
                        <div className="text-red-600 font-bold text-sm">Займ просрочен на {loan.overdueDays} {loan.overdueDays === 1 ? "день" : loan.overdueDays < 5 ? "дня" : "дней"}</div>
                        <div className="text-emerald-950/50 text-xs mt-0.5">
                          Начисляется пеня {loan.penaltyRatePercent ?? 7}% в день от суммы основного долга — уже {(loan.penaltyAmount ?? 0).toLocaleString("ru-RU")} ₽. Сумма к возврату увеличивается каждый день.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* График погашения и история платежей */}
                  <PaymentHistory
                    schedule={loan.schedule || []}
                    payments={loan.payments || []}
                    paidTotal={loan.paidTotal || 0}
                    totalDue={loan.total}
                    closed={loan.status === "paid"}
                  />

                  <div className="flex items-center justify-between rounded-xl px-5 py-4"
                    style={{ background: loan.status === "overdue" ? "rgba(248,113,113,0.12)" : "rgba(16,185,129,0.12)", border: loan.status === "overdue" ? "1px solid rgba(248,113,113,0.35)" : "1px solid rgba(16,185,129,0.3)" }}>
                    <div>
                      <div className="text-emerald-950/50 text-sm">{loan.paidTotal ? "Остаток к возврату" : "К возврату"}</div>
                      <div className={`font-bold text-2xl ${loan.status === "overdue" ? "text-red-600" : "gradient-text"}`}>{(loan.remaining ?? loan.total).toLocaleString("ru-RU")} ₽</div>
                      <div className="text-emerald-950/30 text-xs">
                        включая {loan.interest.toLocaleString("ru-RU")} ₽ процентов
                        {!!loan.penaltyAmount && ` и ${loan.penaltyAmount.toLocaleString("ru-RU")} ₽ пени за просрочку`}
                      </div>
                    </div>
                    {loan.status === "active" && (
                      <button
                        onClick={() => onPay(loan)}
                        className="btn-neon text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2"
                      >
                        <Icon name="Banknote" size={16} />
                        Погасить займ
                      </button>
                    )}
                    {loan.status === "overdue" && (
                      <button
                        onClick={() => onPay(loan)}
                        className="text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2"
                        style={{ background: "linear-gradient(135deg,#dc2626,#dc2626)" }}
                      >
                        <Icon name="AlertCircle" size={16} />
                        Погасить займ
                      </button>
                    )}
                    {loan.status === "paid" && (
                      <div className="flex items-center gap-2 text-green-400 font-semibold">
                        <Icon name="CheckCircle" size={20} />
                        Оплачено · займ закрыт
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loans.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => isRepeatClient
              ? window.scrollTo({ top: 0, behavior: "smooth" })
              : navigate("/")}
            className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-2 mx-auto transition-colors"
          >
            <Icon name="Plus" size={16} />
            Оформить ещё один займ
          </button>
        </div>
      )}
    </>
  );
}