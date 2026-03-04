import { useEffect, useMemo, useState } from "react";

import SiteHeader from "./components/layout/SiteHeader";
import SiteFooter from "./components/layout/SiteFooter";
import AboutSection from "./components/sections/AboutSection";
import ContactSection from "./components/sections/ContactSection";
import HeroSection from "./components/sections/HeroSection";
import ServicesSection from "./components/sections/ServicesSection";
import { content } from "./content/siteContent";

import mdzoneLogo from "./assets/mdzone.png";

function App() {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem("language");
    return savedLanguage === "en" ? "en" : "ar";
  });
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("isDark");
    return savedTheme === "true";
  });

  const t = useMemo(() => content[language], [language]);
  const dir = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    localStorage.setItem("language", language);
  }, [language, dir]);

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
        <HeroSection t={t} language={language} />
        <AboutSection t={t} />
        <ServicesSection t={t} language={language} />
        <ContactSection t={t} />
      </main>

      <SiteFooter mdzoneLogo={mdzoneLogo} footer={t.footer} />
    </div>
  );
}

export default App;
