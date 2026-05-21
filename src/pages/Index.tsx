import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroAboutServices from "@/components/HeroAboutServices";
import CalculatorForm from "@/components/CalculatorForm";
import FaqContactsFooter from "@/components/FaqContactsFooter";

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
      {/* Баннер технических работ */}
      <div id="form" style={{ background: "rgba(124,58,237,0.08)", borderTop: "1px solid rgba(124,58,237,0.3)", borderBottom: "1px solid rgba(124,58,237,0.3)" }}>
        <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center text-center gap-4">
          <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 16, padding: "6px 20px", color: "#f87171", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
            ТЕХНИЧЕСКИЕ РАБОТЫ
          </div>
          <h2 className="font-oswald text-3xl md:text-4xl font-bold text-white">
            Временно новые заявки не принимаются
          </h2>
          <p className="text-white/60 text-lg max-w-xl leading-relaxed">
            В связи с проведением технических работ приём заявок временно приостановлен.<br />Приносим свои извинения!
          </p>
        </div>
      </div>
      <FaqContactsFooter />
    </div>
  );
}