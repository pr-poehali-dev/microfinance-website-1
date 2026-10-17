import { useState, lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroAboutServices from "@/components/HeroAboutServices";
import Testimonials from "@/components/Testimonials";
import InvestSection from "@/components/InvestSection";
import FortuneWheel from "@/components/FortuneWheel";
import PauseBanner from "@/components/PauseBanner";

const FaqContactsFooter = lazy(() => import("@/components/FaqContactsFooter"));

export default function Index() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen font-golos" style={{ background: "#ffffff" }}>
      <FortuneWheel />
      <PauseBanner />
      <Navbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} scrollTo={scrollTo} />
      <HeroAboutServices scrollTo={scrollTo} />
      <InvestSection />
      <Testimonials />
      <Suspense fallback={null}>
        <FaqContactsFooter />
      </Suspense>
    </div>
  );
}