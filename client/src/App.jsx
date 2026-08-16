import { useEffect, useMemo, useState } from "react";

import SiteHeader from "./components/layout/SiteHeader";
import SiteFooter from "./components/layout/SiteFooter";
import AboutSection from "./components/sections/AboutSection";
import ContactSection from "./components/sections/ContactSection";
import HeroSection from "./components/sections/HeroSection";
import ServicesSection from "./components/sections/ServicesSection";
import { content } from "./content/siteContent";

import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import { useLanguage } from "./contexts/LanguageContext";
import { Routes, Route } from "react-router-dom";

import alamerLogo from "./assets/alamer.png";

function App() {
  const { language, setLanguage } = useLanguage();
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("isDark");
    return savedTheme === "true";
  });

  const t = useMemo(() => content[language], [language]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("isDark", String(isDark));
  }, [isDark]);

  return (
    <div className="relative overflow-x-hidden bg-slate-50 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-152 bg-linear-to-b from-brand-300/20 via-brand-100/5 to-transparent dark:from-brand-900/20 dark:via-brand-800/10" />

      <SiteHeader
        nav={t.nav}
        langLabel={t.langLabel}
        themeLight={t.themeLight}
        themeDark={t.themeDark}
        isDark={isDark}
        onToggleLanguage={() =>
          setLanguage((prev) => (prev === "ar" ? "en" : "ar"))
        }
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />

      <main>
        <Routes>
          <Route path="/terms" element={<Terms language={language} />} />
          <Route path="/privacy" element={<Privacy language={language} />} />
          <Route
            path="/*"
            element={
              <>
                <HeroSection t={t} language={language} />
                <AboutSection t={t} language={language} />
                <ServicesSection t={t} language={language} />
                <ContactSection t={t} language={language} />
              </>
            }
          />
        </Routes>
      </main>

      <SiteFooter alamerLogo={alamerLogo} t={t} language={language} />
    </div>
  );
}

export default App;
