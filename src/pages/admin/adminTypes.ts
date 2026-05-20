export interface App {
  id: number; fullName: string; phone: string; email: string;
  amount: number; days: number; status: string; createdAt: string;
  passportSeries: string; passportNumber: string; passportDate: string;
  passportCode: string; passportBy: string; birthDate: string; birthPlace: string;
  telegramId: string; rejectReason: string;
  filePassport: string; fileRegistration: string; fileSelfie: string; filePreviousPassports: string;
  workplace: string; position: string; activeLoans: string; salary: number; contactPerson: string; sbScore: string;
  approvedAmount: number | null;
  clientPassword: string;
}
export interface User { id: number; phone: string; fullName: string; email: string; createdAt: string; loanCount: number; debt: number; }
export interface Loan { id: number; amount: number; days: number; ratePercent: number; status: string; createdAt: string; }

export const GLASS = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 };
export const PURPLE = { background: "linear-gradient(135deg,#7c3aed,#a855f7)" };
export const STATUS: Record<string, { label: string; color: string }> = {
  active:  { label: "Активен",   color: "#4ade80" },
  paid:    { label: "Погашен",   color: "#a78bfa" },
  overdue: { label: "Просрочен", color: "#f87171" },
  review:  { label: "На рассм.", color: "#fbbf24" },
};