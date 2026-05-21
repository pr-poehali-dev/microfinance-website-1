
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import CardPage from "./pages/CardPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

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
      ⚠️ На данный момент проводятся технические работы до 2.05.2026 года. Заявки не принимаются и займы не выдаются. Приносим свои извинения за доставленные неудобства!
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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/card" element={<CardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;