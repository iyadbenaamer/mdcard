import React, { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const savedLanguage =
      typeof window !== "undefined" && localStorage.getItem("language");
    return savedLanguage === "en" ? "en" : "ar";
  });

  useEffect(() => {
    const dir = language === "ar" ? "rtl" : "ltr";
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = dir;
      localStorage.setItem("language", language);
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export default LanguageContext;
