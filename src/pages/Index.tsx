import { useState, lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroAboutServices from "@/components/HeroAboutServices";

const CalculatorForm = lazy(() => import("@/components/CalculatorForm"));
const FaqContactsFooter = lazy(() => import("@/components/FaqContactsFooter"));

export default function Index() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen font-golos" style={{ background: "#0F0A1E" }}>
      <Navbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} scrollTo={scrollTo} />
      <HeroAboutServices scrollTo={scrollTo} />
      <Suspense fallback={null}>
        <CalculatorForm />
        <FaqContactsFooter />
      </Suspense>
    </div>
  );
}
