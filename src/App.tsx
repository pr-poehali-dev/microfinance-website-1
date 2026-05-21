
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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function MaintenanceBanner() {
  const { pathname } = useLocation();
  if (pathname === "/admin") return null;
  return (
    <div style={{
      background: "#b91c1c",
      color: "white",
      textAlign: "center",
      padding: "12px 16px",
      fontSize: 15,
      fontWeight: 600,
      lineHeight: 1.5,
      zIndex: 9999,
      position: "relative",
    }}>
      ⚠️ На данный момент проводятся технические работы до 23.05.2026 года. Заявки не принимаются и займы не выдаются. Приносим свои извинения за доставленные неудобства!
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;