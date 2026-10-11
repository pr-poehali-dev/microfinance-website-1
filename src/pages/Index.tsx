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
      <section style={{ background: "linear-gradient(135deg,#fef2f2,#fff7ed)", borderBottom: "2px solid #fca5a5" }}>
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "#fee2e2" }}>
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="font-oswald text-3xl md:text-4xl font-bold mb-3" style={{ color: "#b91c1c" }}>Сервис временно недоступен</h2>
          <p className="text-base md:text-lg mb-3" style={{ color: "#7f1d1d" }}>
            Из-за технического сбоя сайт и личный кабинет Русфинанс 24 временно не работают. Оформление и выдача займов приостановлены.
          </p>
          <p className="text-base md:text-lg font-semibold" style={{ color: "#7f1d1d" }}>
            Мы работаем над восстановлением. Информацию о возобновлении работы разместим на этой странице.
          </p>
        </div>
      </section>
      <HeroAboutServices scrollTo={scrollTo} />
      <Testimonials />
      <Suspense fallback={null}>
        <FaqContactsFooter />
      </Suspense>
    </div>
  );
}
