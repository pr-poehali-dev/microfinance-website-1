import { useState, lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroAboutServices from "@/components/HeroAboutServices";
import Testimonials from "@/components/Testimonials";

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
      <Navbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} scrollTo={scrollTo} />
      <HeroAboutServices scrollTo={scrollTo} />
      <Testimonials />
      <Suspense fallback={null}>
        <FaqContactsFooter />
      </Suspense>
    </div>
  );
}
