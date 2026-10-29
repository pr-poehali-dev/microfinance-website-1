
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import CookieBanner from "./components/CookieBanner";
import InstallAppButton from "./components/InstallAppButton";
import ChatWidget from "./components/ChatWidget";

const Index = lazy(() => import("./pages/Index"));
const CardPage = lazy(() => import("./pages/CardPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const CreditDoctorPage = lazy(() => import("./pages/CreditDoctorPage"));
const ApplyPage = lazy(() => import("./pages/ApplyPage"));
const CarLoanPage = lazy(() => import("./pages/CarLoanPage"));
const ShopLoanPage = lazy(() => import("./pages/ShopLoanPage"));
const GiftsPage = lazy(() => import("./pages/GiftsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function MaintenanceBanner() {
  const { pathname } = useLocation();
  if (pathname === "/admin") return null;
  return (
    <div style={{
      background: "#f3f4f6",
      color: "#4b5563",
      borderTop: "1px solid #e5e7eb",
      textAlign: "center",
      padding: "16px 20px",
      fontSize: 13,
      fontWeight: 400,
      lineHeight: 1.6,
      zIndex: 9999,
      position: "relative",
    }}>
      Уважаемые заёмщики, наша компания предоставляет займы от частных инвесторов. Перед подписанием договора просим внимательно ознакомиться с его условиями, и только после этого подписывать!
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CookieBanner />
        <InstallAppButton />
        <Suspense fallback={null}>
          <ChatWidget />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/card" element={<CardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/investor/login" element={<Navigate to="/" replace />} />
            <Route path="/investor" element={<Navigate to="/" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/credit-doctor" element={<CreditDoctorPage />} />
            <Route path="/apply" element={<ApplyPage />} />
            <Route path="/card/apply" element={<ApplyPage cardMode />} />
            <Route path="/car-loan" element={<CarLoanPage />} />
            <Route path="/car-loan/apply" element={<ApplyPage product="car" />} />
            <Route path="/shop-loan" element={<ShopLoanPage />} />
            <Route path="/shop-loan/apply" element={<ApplyPage product="shop" />} />
            <Route path="/gifts" element={<GiftsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MaintenanceBanner />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;