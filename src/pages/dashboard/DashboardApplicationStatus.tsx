import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import PaymentHistory from "./PaymentHistory";
import PartnerCardLinks from "./PartnerCardLinks";

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
  disbursedAt?: string | null;
  offer?: LoanOffer;
}

interface VcScheduleItem {
  month: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
}

interface VirtualCard {
  number: string;
  expiry: string;
  cvv: string;
  holder: string;
  limit: number;
  rate: number;
  status: string;
  days?: number | null;
  schedule?: VcScheduleItem[];
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
  isCreditDoctor?: boolean;
  reapplyDaysLeft?: number | null;
  videoCallRequested?: boolean;
}

// Займы приходят отсортированными по дате создания (новые первыми) —
// самый свежий займ соответствует текущей одобренной заявке.
const mainLoan = (loans: Loan[]) => loans[0] || null;

interface Props {
  application: Application | null;
  loans: Loan[];
  timerSec: number;
  timerDone: boolean;
  fmtTimer: (sec: number) => string;
  fmtAppId: (id: number) => string;
  signingId: number | null;
  signMsg: string;
  cardInput: string;
  cardSaving: boolean;
  cardSaved: boolean;
  cardError: string;
  confirming: boolean;
  confirmDone: boolean;
  cardActivating: boolean;
  cardActivated: boolean;
  cvvVisible: boolean;
  setCvvVisible: (v: boolean) => void;
  onSign: (loan: Loan) => void;
  onSaveCard: () => void;
  onConfirm: () => void;
  onActivateCard: () => void;
  setCardInput: (v: string) => void;
  setCardSaved: (v: boolean) => void;
  setCardError: (v: string) => void;
}

export default function DashboardApplicationStatus({
  application, loans, timerSec, timerDone, fmtTimer, fmtAppId,
  signingId, signMsg, cardInput, cardSaving, cardSaved, cardError,
  confirming, confirmDone, cardActivating, cardActivated, cvvVisible, setCvvVisible,
  onSign, onSaveCard, onConfirm, onActivateCard, setCardInput, setCardSaved, setCardError,
}: Props) {
  const navigate = useNavigate();

  return (
    <>
      {/* ОФФЕР ОТ МЕНЕДЖЕРА (займ в статусе review с offer) */}
      {loans.some((l) => l.status === "review" && !l.signed && l.offer) && (
        <div className="mb-6">
          {loans.filter((l) => l.status === "review" && !l.signed && l.offer).map((loan) => (
            <div key={loan.id} className="glass rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(14,165,233,0.4)", background: "rgba(14,165,233,0.04)" }}>
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg,rgba(14,165,233,0.2),rgba(56,189,248,0.08))" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(14,165,233,0.25)" }}>
                  <Icon name="FileSignature" size={18} className="text-sky-400" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold">Вам одобрен займ!</div>
                  <div className="text-sky-300 text-xs mt-0.5">Ознакомьтесь с условиями и подпишите договор</div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-semibold animate-pulse"
                  style={{ background: "rgba(14,165,233,0.2)", color: "#38bdf8" }}>Ожидает подписи</span>
              </div>
              <div className="px-6 py-5">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "Одобренная сумма", value: `${loan.offer!.amount.toLocaleString("ru-RU")} ₽`, big: true },
                    { label: "К возврату",       value: `${loan.offer!.total.toLocaleString("ru-RU")} ₽`, highlight: true },
                    { label: "Срок",             value: `${loan.offer!.days} дней` },
                    { label: "Процентная ставка",value: `${loan.offer!.ratePercent}% в день` },
                  ].map(({ label, value, big, highlight }) => (
                    <div key={label} className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="text-white/40 text-xs mb-1">{label}</div>
                      <div className={`font-bold ${big ? "text-xl text-white" : highlight ? "text-sky-300 text-xl" : "text-white text-base"}`}>{value}</div>
                    </div>
                  ))}
                </div>
                {signMsg && (
                  <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
                    style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                    <Icon name="CheckCircle" size={14} className="inline mr-2" />{signMsg}
                  </div>
                )}
                <button onClick={() => onSign(loan)} disabled={signingId === loan.id}
                  className="w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 text-base transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", boxShadow: "0 4px 20px rgba(14,165,233,0.3)" }}>
                  {signingId === loan.id
                    ? <><Icon name="Loader2" size={18} className="animate-spin" />Подписываем...</>
                    : <><Icon name="PenLine" size={18} />Подписать договор</>
                  }
                </button>
                <p className="text-white/20 text-xs text-center mt-3">Нажимая «Подписать», вы соглашаетесь с условиями займа</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* БЛОК: ОЖИДАЙТЕ ВИДЕОЗВОНКА */}
      {application?.videoCallRequested && (application.status === "pending" || application.status === "approved") && (
        <div className="glass rounded-2xl overflow-hidden mb-6"
          style={{ border: "1px solid rgba(56,189,248,0.4)", background: "rgba(56,189,248,0.04)" }}>
          <div className="px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(56,189,248,0.2)" }}>
              <Icon name="Video" size={22} className="text-sky-400" />
            </div>
            <div className="flex-1">
              <div className="text-white font-bold">Ожидайте видеозвонка</div>
              <div className="text-sky-300 text-sm mt-0.5">Наш специалист свяжется с вами для видеоверификации. Пожалуйста, будьте на связи.</div>
            </div>
          </div>
        </div>
      )}

      {/* БЛОК СТАТУСА ЗАЯВКИ: PENDING — таймер */}
      {application && application.status === "pending" && (
        <div className="glass rounded-2xl overflow-hidden mb-6"
          style={{ border: "1px solid rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.04)" }}>
          <div className="px-6 py-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.2),rgba(251,191,36,0.05))" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(251,191,36,0.2)" }}>
              <Icon name="Clock" size={20} className="text-yellow-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-white font-semibold">Заявка №{fmtAppId(application.id)} принята</div>
                {application.isCreditDoctor && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1"
                    style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(236,72,153,0.25))", color: "#e879f9", border: "1px solid rgba(168,85,247,0.5)" }}>
                    💊 Кредитный Доктор
                  </span>
                )}
              </div>
              <div className="text-white/50 text-xs mt-0.5">
                {application.amount.toLocaleString("ru-RU")} ₽ · {application.days} дн. · подана {application.createdAt}
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>На рассмотрении</span>
          </div>
          <div className="px-6 py-8 flex flex-col items-center text-center">
            {!timerDone ? (
              <>
                <div className="font-oswald text-6xl font-bold mb-3"
                  style={{ color: "#fbbf24", textShadow: "0 0 30px rgba(251,191,36,0.4)" }}>
                  {fmtTimer(timerSec)}
                </div>
                <p className="text-white/50 text-sm">Осталось до завершения рассмотрения</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(251,191,36,0.2)" }}>
                  <Icon name="FileSearch" size={26} className="text-yellow-400" />
                </div>
                <p className="text-white font-semibold text-lg mb-1">Ваша заявка на рассмотрении</p>
                <p className="text-white/50 text-sm">Специалист свяжется с вами в ближайшее время</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* БЛОК СТАТУСА ЗАЯВКИ: PARTNER_CARD — оформление карты партнёра */}
      {application && application.status === "partner_card" && (
        <div className="glass rounded-2xl overflow-hidden mb-6"
          style={{ border: "1px solid rgba(168,85,247,0.4)", background: "rgba(168,85,247,0.03)" }}>
          <div className="px-6 py-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.1))" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(168,85,247,0.2)" }}>
              <Icon name="CheckCircle" size={20} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-white font-bold">Ваша заявка одобрена!</div>
                {application.isCreditDoctor && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1"
                    style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(236,72,153,0.25))", color: "#e879f9", border: "1px solid rgba(168,85,247,0.5)" }}>
                    💊 Кредитный Доктор
                  </span>
                )}
              </div>
              <div className="text-purple-300 text-xs mt-0.5">Подана {application.createdAt}</div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: "rgba(168,85,247,0.2)", color: "#c084fc" }}>Одобрено</span>
          </div>
          <div className="px-6 py-6 space-y-5">
            {application.approvedAmount && (
              <div className="rounded-xl p-4"
                style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}>
                <div className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">Условия вашего займа</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="text-white/40 text-xs mb-1">Сумма</div>
                    <div className="text-white font-bold">{application.approvedAmount.toLocaleString("ru-RU")} ₽</div>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="text-white/40 text-xs mb-1">Срок</div>
                    <div className="text-white font-bold">{application.approvedDays} дн.</div>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="text-white/40 text-xs mb-1">К возврату</div>
                    <div className="text-purple-300 font-bold">{application.approvedTotal.toLocaleString("ru-RU")} ₽</div>
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-xl p-5 space-y-4"
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)" }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(168,85,247,0.2)" }}>
                  <Icon name="CreditCard" size={16} className="text-purple-400" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Для получения займа необходима карта партнёра</div>
                  <div className="text-white/50 text-sm leading-relaxed">
                    Менеджер свяжется с вами в ближайшее время для уточнения деталей.
                  </div>
                </div>
              </div>
              {/* Поле номера карты для partner_card */}
              <div className="space-y-2">
                <div className="text-white/70 text-sm font-medium flex items-center gap-2">
                  <Icon name="Wallet" size={15} className="text-purple-400" />
                  Укажите реквизиты для перевода займа
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cardInput}
                    onChange={(e) => { setCardInput(e.target.value); setCardSaved(false); setCardError(""); }}
                    placeholder="Номер карты или телефон СБП"
                    className="flex-1 px-4 py-3 rounded-xl text-white text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}
                    disabled={cardSaved}
                  />
                  {!cardSaved ? (
                    <button onClick={onSaveCard} disabled={cardSaving}
                      className="px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                      style={{ background: "rgba(124,58,237,0.4)", border: "1px solid rgba(124,58,237,0.5)" }}>
                      {cardSaving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Save" size={15} />}
                      Сохранить
                    </button>
                  ) : (
                    <button onClick={() => setCardSaved(false)}
                      className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80"
                      style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
                      <Icon name="CheckCircle" size={15} />
                      Сохранено
                    </button>
                  )}
                </div>
                {cardError && <p className="text-red-400 text-xs">{cardError}</p>}
                <p className="text-white/30 text-xs">Номер карты или номер телефона (СБП) для получения займа</p>
              </div>

              {/* Ссылка на оформление партнёрской карты — показываем ДО подписания договора */}
              {!(mainLoan(loans)?.signed || confirmDone) && <PartnerCardLinks />}

              {/* Подписать договор → Ожидайте выдачу → Займ выдан */}
              {(() => {
                const loan = mainLoan(loans);
                const isSigned = loan?.signed || confirmDone;
                const isDisbursed = !!loan?.disbursedAt;

                if (isDisbursed) {
                  return (
                    <div className="rounded-xl px-5 py-4 flex items-center gap-3"
                      style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
                      <Icon name="BadgeCheck" size={20} className="text-green-400 shrink-0" />
                      <div>
                        <div className="text-green-300 text-sm font-medium">Займ выдан! Деньги переведены на ваши реквизиты.</div>
                        <div className="text-white/40 text-xs mt-0.5">{loan?.disbursedAt}</div>
                      </div>
                    </div>
                  );
                }

                if (isSigned) {
                  return (
                    <div className="rounded-xl px-5 py-4 flex items-center gap-3"
                      style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>
                      <Icon name="Clock" size={20} className="text-yellow-400 shrink-0 animate-pulse" />
                      <div className="text-yellow-300 text-sm font-medium">Договор подписан! Ожидайте выдачу займа — деньги скоро поступят на ваши реквизиты.</div>
                    </div>
                  );
                }

                return (
                  <button onClick={onConfirm} disabled={confirming}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}>
                    {confirming ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="PenLine" size={18} />}
                    {confirming ? "Подписываем..." : "Подписать договор"}
                  </button>
                );
              })()}

              <div className="grid sm:grid-cols-2 gap-3">
                <a href="tel:+74956635124"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:opacity-90"
                  style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)" }}>
                  <Icon name="Phone" size={18} className="text-purple-400 shrink-0" />
                  <div>
                    <div className="text-white font-medium text-sm">Позвонить менеджеру</div>
                    <div className="text-white/40 text-xs">+7 (495) 663-51-24</div>
                  </div>
                </a>
                <a href="https://t.me/INVESTORFINANS24" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:opacity-90"
                  style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)" }}>
                  <Icon name="Send" size={18} className="text-purple-400 shrink-0" />
                  <div>
                    <div className="text-white font-medium text-sm">Написать в Telegram</div>
                    <div className="text-white/40 text-xs">@INVESTORFINANS24</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* БЛОК СТАТУСА ЗАЯВКИ: APPROVED */}
      {application && application.status === "approved" && (
        <div className="glass rounded-2xl overflow-hidden mb-6"
          style={{ border: "1px solid rgba(74,222,128,0.4)", background: "rgba(74,222,128,0.03)" }}>
          <div className="px-6 py-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg,rgba(22,163,74,0.25),rgba(74,222,128,0.08))" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(74,222,128,0.2)" }}>
              <Icon name="CheckCircle" size={20} className="text-green-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-white font-bold">Заявка №{fmtAppId(application.id)} одобрена!</div>
                {application.isCreditDoctor && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1"
                    style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(236,72,153,0.25))", color: "#e879f9", border: "1px solid rgba(168,85,247,0.5)" }}>
                    💊 Кредитный Доктор
                  </span>
                )}
              </div>
              <div className="text-green-400 text-xs mt-0.5">Подана {application.createdAt}</div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: "rgba(74,222,128,0.2)", color: "#4ade80" }}>Одобрено</span>
          </div>
          <div className="px-6 py-5 space-y-4">
            {/* Условия займа */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Одобренная сумма",  value: `${(application.approvedAmount ?? application.amount).toLocaleString("ru-RU")} ₽`, green: true },
                { label: "К возврату",         value: `${application.approvedTotal.toLocaleString("ru-RU")} ₽`, big: true },
                { label: "Срок займа",         value: `${application.approvedDays} дней` },
                { label: "Процентная ставка",  value: `${application.approvedRatePercent}% в день` },
              ].map(({ label, value, green, big }) => (
                <div key={label} className="rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-white/40 text-xs mb-1">{label}</div>
                  <div className={`font-bold text-lg ${green ? "text-green-400" : big ? "text-sky-300" : "text-white"}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Ввод карты/СБП */}
            <div className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)" }}>
              <div className="text-white/70 text-sm font-medium flex items-center gap-2">
                <Icon name="CreditCard" size={16} className="text-purple-400" />
                Укажите реквизиты для перевода
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cardInput}
                  onChange={(e) => { setCardInput(e.target.value); setCardSaved(false); setCardError(""); }}
                  placeholder="Номер карты или телефон СБП"
                  className="flex-1 px-4 py-3 rounded-xl text-white text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}
                  disabled={cardSaved}
                />
                {!cardSaved ? (
                  <button
                    onClick={onSaveCard}
                    disabled={cardSaving}
                    className="px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                  >
                    {cardSaving
                      ? <Icon name="Loader2" size={16} className="animate-spin" />
                      : <Icon name="Save" size={16} />
                    }
                    Сохранить
                  </button>
                ) : (
                  <button
                    onClick={() => setCardSaved(false)}
                    className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80"
                    style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}
                  >
                    <Icon name="CheckCircle" size={16} />
                    Сохранено
                  </button>
                )}
              </div>
              {cardError && <p className="text-red-400 text-xs">{cardError}</p>}
              <p className="text-white/30 text-xs">Введите номер карты или номер телефона (СБП) для получения займа</p>
            </div>

            {/* Партнёрские ссылки на оформление карты — показываем ДО подписания договора */}
            {!(mainLoan(loans)?.signed || confirmDone) && <PartnerCardLinks />}

            {/* Скачать договор PDF */}
            {application.contractUrl ? (
              <a
                href={application.contractUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 4px 20px rgba(124,58,237,0.35)", textDecoration: "none" }}
              >
                <Icon name="FileDown" size={20} />
                Скачать договор займа (PDF)
              </a>
            ) : (
              <div className="rounded-xl px-5 py-4 flex items-center gap-3"
                style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)" }}>
                <Icon name="Loader2" size={18} className="text-purple-400 animate-spin shrink-0" />
                <div className="text-white/50 text-sm">Договор формируется, появится в течение минуты...</div>
              </div>
            )}

            {/* Подписать договор → Ожидайте выдачу → Займ выдан */}
            {(() => {
              const loan = mainLoan(loans);
              const isSigned = loan?.signed || confirmDone;
              const isDisbursed = !!loan?.disbursedAt;

              if (isDisbursed) {
                return (
                  <div className="rounded-xl px-5 py-4 flex flex-col gap-3"
                    style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
                    <div className="flex items-center gap-3">
                      <Icon name="BadgeCheck" size={20} className="text-green-400 shrink-0" />
                      <div>
                        <div className="text-green-300 text-sm font-medium">Займ выдан! Деньги переведены на ваши реквизиты.</div>
                        <div className="text-white/40 text-xs mt-0.5">{loan?.disbursedAt}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => document.getElementById("my-loans")?.scrollIntoView({ behavior: "smooth" })}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.4)" }}
                    >
                      <Icon name="ArrowDown" size={16} />
                      Смотреть график погашения
                    </button>
                  </div>
                );
              }

              if (isSigned) {
                return (
                  <div className="rounded-xl px-5 py-4 flex items-center gap-3"
                    style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>
                    <Icon name="Clock" size={20} className="text-yellow-400 shrink-0 animate-pulse" />
                    <div className="text-yellow-300 text-sm font-medium">Договор подписан! Ожидайте выдачу займа — деньги скоро поступят на ваши реквизиты.</div>
                  </div>
                );
              }

              return (
                <button onClick={onConfirm} disabled={confirming}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}>
                  {confirming ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="PenLine" size={18} />}
                  {confirming ? "Подписываем..." : "Подписать договор"}
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* БЛОК СТАТУСА ЗАЯВКИ: REJECTED */}
      {application && application.status === "rejected" && (
        <div className="glass rounded-2xl overflow-hidden mb-6"
          style={{ border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.03)" }}>
          <div className="px-6 py-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg,rgba(220,38,38,0.25),rgba(239,68,68,0.08))" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(239,68,68,0.2)" }}>
              <Icon name="XCircle" size={20} className="text-red-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-white font-bold">По заявке #{application.id} отказано</div>
                {application.isCreditDoctor && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1"
                    style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(236,72,153,0.25))", color: "#e879f9", border: "1px solid rgba(168,85,247,0.5)" }}>
                    💊 Кредитный Доктор
                  </span>
                )}
              </div>
              <div className="text-red-400 text-xs mt-0.5">Подана {application.createdAt}</div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>Отказ</span>
          </div>
          <div className="px-6 py-5 space-y-3">
            {application.rejectReason && (
              <div className="rounded-xl px-4 py-3"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div className="text-white/40 text-xs mb-1">Причина отказа</div>
                <div className="text-white/80 text-sm">{application.rejectReason}</div>
              </div>
            )}
            {application.reapplyDaysLeft !== undefined && application.reapplyDaysLeft !== null && application.reapplyDaysLeft > 0 ? (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
                <Icon name="Clock" size={18} className="text-yellow-400 shrink-0" />
                <div className="text-white/70 text-sm">
                  Повторная заявка возможна через <b className="text-yellow-400">{application.reapplyDaysLeft} {application.reapplyDaysLeft === 1 ? "день" : application.reapplyDaysLeft < 5 ? "дня" : "дней"}</b>
                </div>
              </div>
            ) : (
              <>
                <p className="text-white/40 text-sm">Вы можете подать повторную заявку или связаться с нами для уточнения деталей.</p>
                <button
                  onClick={() => navigate("/")}
                  className="btn-neon text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 w-full justify-center"
                >
                  <Icon name="RefreshCw" size={16} />
                  Подать новую заявку
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ВИРТУАЛЬНАЯ КАРТА FINANS 24 */}
      {application?.virtualCard && application.virtualCard.status !== "none" && (
        <div className="mb-6">
          {/* Ожидает подтверждения */}
          {application.virtualCard.status === "pending" && !cardActivated && (
            <div className="glass rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(168,85,247,0.5)", background: "rgba(124,58,237,0.04)" }}>
              <div className="px-6 py-4 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.1))" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(168,85,247,0.25)" }}>
                  <Icon name="CreditCard" size={20} className="text-purple-300" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">Карта FINANS 24 одобрена!</div>
                  <div className="text-purple-300 text-xs mt-0.5">Ознакомьтесь с условиями и подтвердите</div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-semibold animate-pulse"
                  style={{ background: "rgba(168,85,247,0.2)", color: "#c084fc" }}>Одобрено</span>
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Карта-превью */}
                <div className="rounded-2xl p-5 relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg,#4c1d95,#7c3aed,#a855f7)", boxShadow: "0 8px 32px rgba(124,58,237,0.4)" }}>
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
                    style={{ background: "white", transform: "translate(30%,-30%)" }} />
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="text-purple-200 text-xs font-semibold uppercase tracking-wider">FINANS 24</div>
                      <div className="text-white text-xs opacity-60 mt-0.5">Виртуальная карта</div>
                    </div>
                    <Icon name="CreditCard" size={28} className="text-purple-200 opacity-70" />
                  </div>
                  <div className="text-white font-mono text-xl font-bold tracking-widest mb-4">
                    •••• •••• •••• {application.virtualCard.number.slice(-4)}
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-purple-200 text-xs opacity-60 mb-0.5">Держатель</div>
                      <div className="text-white text-sm font-semibold">{application.virtualCard.holder}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-purple-200 text-xs opacity-60 mb-0.5">Действует до</div>
                      <div className="text-white text-sm font-semibold">{application.virtualCard.expiry}</div>
                    </div>
                  </div>
                </div>
                {/* Условия */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Лимит", value: `${application.virtualCard.limit.toLocaleString("ru-RU")} ₽`, color: "#c084fc" },
                    { label: "Ставка", value: `${application.virtualCard.rate}% / день`, color: "white" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl px-4 py-3 text-center"
                      style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }}>
                      <div className="text-white/40 text-xs mb-1">{label}</div>
                      <div className="font-bold text-base" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
                <button onClick={onActivateCard} disabled={cardActivating}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#16a34a,#4ade80)", boxShadow: "0 4px 20px rgba(74,222,128,0.25)" }}>
                  {cardActivating ? <><Icon name="Loader2" size={18} className="animate-spin" />Подтверждаем...</> : <><Icon name="CheckCircle" size={18} />Подтвердить карту</>}
                </button>
              </div>
            </div>
          )}

          {/* Карта активна */}
          {(application.virtualCard.status === "active" || cardActivated) && (
            <div className="glass rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(74,222,128,0.4)", background: "rgba(74,222,128,0.03)" }}>
              <div className="px-6 py-4 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg,rgba(22,163,74,0.25),rgba(74,222,128,0.08))" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(74,222,128,0.2)" }}>
                  <Icon name="CreditCard" size={20} className="text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">Карта FINANS 24 активна</div>
                  <div className="text-green-300 text-xs mt-0.5">Виртуальная карта готова к использованию</div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: "rgba(74,222,128,0.2)", color: "#4ade80" }}>Активна</span>
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Карта с данными */}
                <div className="rounded-2xl p-5 relative overflow-hidden select-none"
                  style={{ background: "linear-gradient(135deg,#14532d,#15803d,#16a34a)", boxShadow: "0 8px 32px rgba(22,163,74,0.35)" }}>
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
                    style={{ background: "white", transform: "translate(30%,-30%)" }} />
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <div className="text-green-200 text-xs font-semibold uppercase tracking-wider">FINANS 24</div>
                      <div className="text-white text-xs opacity-60 mt-0.5">Виртуальная карта</div>
                    </div>
                    <Icon name="Wifi" size={22} className="text-green-200 opacity-70 rotate-90" />
                  </div>
                  <div className="text-white font-mono text-lg font-bold tracking-widest mb-1">
                    {application.virtualCard.number}
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <div className="text-green-200 text-xs opacity-60 mb-0.5">Держатель</div>
                      <div className="text-white text-sm font-semibold">{application.virtualCard.holder}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-200 text-xs opacity-60 mb-0.5">Срок</div>
                      <div className="text-white text-sm font-semibold">{application.virtualCard.expiry}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-200 text-xs opacity-60 mb-0.5">CVV</div>
                      <div className="text-white text-sm font-semibold flex items-center gap-1">
                        {cvvVisible ? application.virtualCard.cvv : "•••"}
                        <button onClick={() => setCvvVisible(!cvvVisible)}
                          className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
                          <Icon name={cvvVisible ? "EyeOff" : "Eye"} size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Лимит, ставка и срок */}
                <div className={`grid ${application.virtualCard.days ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
                  {[
                    { label: "Лимит карты", value: `${application.virtualCard.limit.toLocaleString("ru-RU")} ₽`, color: "#4ade80" },
                    { label: "Ставка", value: `${application.virtualCard.rate}% / день`, color: "white" },
                    ...(application.virtualCard.days ? [{ label: "Срок", value: `${application.virtualCard.days} дн.`, color: "white" }] : []),
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl px-4 py-3 text-center"
                      style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                      <div className="text-white/40 text-xs mb-1">{label}</div>
                      <div className="font-bold text-base" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Помесячный график погашения лимита */}
                {application.virtualCard.schedule && application.virtualCard.schedule.length > 0 && (
                  <PaymentHistory
                    schedule={application.virtualCard.schedule}
                    payments={[]}
                    paidTotal={0}
                    totalDue={application.virtualCard.schedule.reduce((s, i) => s + i.amount, 0)}
                  />
                )}

                {/* Кнопка Оплатить */}
                <button
                  onClick={() => alert(`Оплата картой FINANS 24\nЛимит: ${application.virtualCard!.limit.toLocaleString("ru-RU")} ₽\n\nДля совершения платежа свяжитесь с нами:\n📞 +7 (495) 663-51-24\n📧 investorfinans24@ya.ru`)}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}>
                  <Icon name="Wallet" size={18} />
                  Оплатить
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}