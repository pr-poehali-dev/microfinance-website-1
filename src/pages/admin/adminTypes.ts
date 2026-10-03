export interface App {
  id: number; fullName: string; phone: string; email: string;
  amount: number; days: number; status: string; createdAt: string;
  passportSeries: string; passportNumber: string; passportDate: string;
  passportCode: string; passportBy: string; birthDate: string; birthPlace: string;
  telegramId: string; rejectReason: string;
  filePassport: string; fileRegistration: string; fileSelfie: string; filePreviousPassports: string;
  workplace: string; position: string; activeLoans: string; salary: number; contactPerson: string; sbScore: string; cardNumber: string;
  snils: string; workPhone: string; cardNumberTransfer: string;
  approvedAmount: number | null;
  approvedRate: number | null;
  approvedDays: number | null;
  clientPassword: string;
  loanId: number | null;
  loanSigned: boolean;
  loanSignedAt: string | null;
  loanStatus: string | null;
  loanDisbursedAt: string | null;
  isCreditDoctor: boolean;
  videoCallRequested: boolean;
  virtualCardDays: number | null;
  blockedUntil: string | null;
  reviewedAt: string | null;
  loanCreatedAt: string | null;
  prevLoansCount: number;
  prevPaidCount: number;
  prevOverdueCount: number;
  totalBorrowed: number;
  isRepeatClient: boolean;
  partnerCardUrl: string;
  virtualCardStatus?: string;
  virtualCardLimit?: number | null;
  virtualCardSignedAt?: string | null;
}
export interface CardRequestItem {
  id: number;
  phone: string;
  fullName: string;
  status: string;
  rejectReason: string;
  createdAt: string;
  reviewedAt: string | null;
  appId: number | null;
  cardStatus: string;
  cardLimit: number | null;
}
export interface User { id: number; phone: string; fullName: string; email: string; createdAt: string; loanCount: number; debt: number; }
export interface Loan { id: number; amount: number; days: number; ratePercent: number; status: string; createdAt: string; totalDue?: number; isOverdue?: boolean; overdueDays?: number; penaltyAmount?: number; penaltyWaived?: number; }

export const GLASS = { background: "rgba(255,255,255,0.9)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 16, boxShadow: "0 4px 20px rgba(16,185,129,0.06)" };
export const PURPLE = { background: "linear-gradient(135deg,#10b981,#14b8a6)" };
export const STATUS: Record<string, { label: string; color: string }> = {
  active:  { label: "Активен",   color: "#4ade80" },
  paid:    { label: "Погашен",   color: "#14b8a6" },
  overdue: { label: "Просрочен", color: "#f87171" },
  review:  { label: "На рассм.", color: "#fbbf24" },
};