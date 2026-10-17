import { useState, lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroAboutServices from "@/components/HeroAboutServices";
import Testimonials from "@/components/Testimonials";
import InvestSection from "@/components/InvestSection";
import PauseBanner from "@/components/PauseBanner";
import FortuneWheel from "@/components/FortuneWheel";
import usePaused from "@/hooks/usePaused";

const FaqContactsFooter = lazy(() => import("@/components/FaqContactsFooter"));

export default function Index() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { paused, message } = usePaused();

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen font-golos" style={{ background: "#ffffff" }}>
      {paused === true && <PauseBanner message={message} />}
      {paused === false && <FortuneWheel />}
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