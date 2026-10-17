export const INVEST_URL = "https://functions.poehali.dev/1244293e-9832-493e-bbb5-de820fbe56c6";
export const YK_URL = "https://functions.poehali.dev/64ba6f22-6243-4b3f-ab24-f5bb294d5bfe";
export const CONTRACT_URL = "https://functions.poehali.dev/9cdc3bea-1348-49df-a7a3-4aeef6088ff3";

export interface Payout { id: number; amount: number; kind: string; note: string; paidAt: string }
export interface Investment {
  id: number; amount: number; termMonths: number; payout: string; rate: number; startDate: string; endDate: string;
  status: string; monthlyIncome: number; totalIncome: number; accrued: number; paidInterest: number; paidTotal: number;
  toPay: number; nextDate: string | null; payouts: Payout[]; contractUrl: string; funded: boolean;
}
export interface InvestorCard { id: number; last4: string; holder: string; isDefault: boolean }
export interface InvestRequest { id: number; amount: number; termMonths: number; payout: string; status: string; createdAt: string }
export interface InvestorMe {
  investor: { fullName: string; phone: string; email: string };
  investments: Investment[];
  cards: InvestorCard[];
  requests: InvestRequest[];
  balance: number;
}

export const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
export const termText = (m: number) => (m % 12 === 0 ? `${m / 12} ${m / 12 === 1 ? "год" : m / 12 < 5 ? "года" : "лет"}` : `${m} мес.`);

export const authHeaders = (token: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` });
