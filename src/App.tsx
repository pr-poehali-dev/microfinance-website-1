
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import CookieBanner from "./components/CookieBanner";

const Index = lazy(() => import("./pages/Index"));
const CardPage = lazy(() => import("./pages/CardPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const CreditDoctorPage = lazy(() => import("./pages/CreditDoctorPage"));
const ApplyPage = lazy(() => import("./pages/ApplyPage"));
const CarLoanPage = lazy(() => import("./pages/CarLoanPage"));
const CarLoanApplyPage = lazy(() => import("./pages/CarLoanApplyPage"));
const ShopLoanPage = lazy(() => import("./pages/ShopLoanPage"));
const ShopLoanApplyPage = lazy(() => import("./pages/ShopLoanApplyPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function MaintenanceBanner() {
  const { pathname } = useLocation();
  if (pathname === "/admin") return null;
  return (
    <div style={{
      background: "#7c3aed",
      color: "white",
      textAlign: "center",
      padding: "12px 16px",
      fontSize: 15,
      fontWeight: 600,
      lineHeight: 1.5,
      zIndex: 9999,
      position: "relative",
    }}>
      Уважаемые заёмщики, наша компания предоставляет займы от частных инвесторов. Перед подписанием договора просим внимательно ознакомиться с его условиями, и только после этого подписывать!
      <div style={{ color: "#4ade80", fontWeight: 700, marginTop: 6 }}>
        🎉 Мы открылись! Добро пожаловать!
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MaintenanceBanner />
        <CookieBanner />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/card" element={<CardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/credit-doctor" element={<CreditDoctorPage />} />
            <Route path="/apply" element={<ApplyPage />} />
            <Route path="/car-loan" element={<CarLoanPage />} />
            <Route path="/car-loan/apply" element={<CarLoanApplyPage />} />
            <Route path="/shop-loan" element={<ShopLoanPage />} />
            <Route path="/shop-loan/apply" element={<ShopLoanApplyPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;