import { useEffect, useState } from "react";
import { sectionIds } from "../../content/siteContent";
import { CONTACT_INFO } from "../../constants/contact";
import logoLight from "../../assets/logo-full.png";
import logoDark from "../../assets/logo-white.png";
import playStoreLogo from "../../assets/icons/play-store.png";
import GlobeIcon from "../../assets/icons/globe.svg?react";
import CrescentIcon from "../../assets/icons/crescent.svg?react";
import { Link, useNavigate, useLocation } from "react-router-dom";

function SiteHeader({
  nav,
  langLabel,
  onToggleLanguage,
  isDark,
  themeLight,
  themeDark,
  onToggleTheme,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (id, e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof window === "undefined") return;

    const perform = () => {
      const el = document.getElementById(id);
      const headerOffset = 80; // adjust if header height differs
      if (el) {
        const top =
          el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top, behavior: "smooth" });
        try {
          window.history.replaceState(null, "", `#${id}`);
        } catch (err) {}
      } else if (id === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        try {
          window.history.replaceState(null, "", "#home");
        } catch (err) {}
      }
    };

    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(perform, 120);
    } else {
      perform();
    }
  };
  return (
    <header
      className={`sticky top-0 z-20 border-b backdrop-blur-lg transition-all duration-300 ${
        isScrolled
          ? "border-slate-200/80 bg-white/85 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)] dark:border-slate-800/80 dark:bg-slate-950/85"
          : "border-transparent bg-white/40 dark:bg-slate-950/30"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <a
          href="#home"
          onClick={(e) => scrollToSection("home", e)}
          className="flex items-center gap-3 transition hover:opacity-80"
        >
          <img
            src={isDark ? logoDark : logoLight}
            alt="MD Card"
            loading="lazy"
            className="h-9 w-auto sm:h-10"
          />
        </a>

        <nav className="hidden items-center gap-1 rounded-full border border-slate-200/70 bg-white/70 p-1 shadow-sm backdrop-blur-sm md:flex dark:border-slate-800/70 dark:bg-slate-900/60">
          {sectionIds.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => scrollToSection(id, e)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 dark:text-slate-200 dark:hover:bg-brand-900/40 dark:hover:text-brand-300"
            >
              {nav[id]}
            </a>
          ))}
          <Link
            to="/terms"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 dark:text-slate-200 dark:hover:bg-brand-900/40 dark:hover:text-brand-300"
          >
            {nav.terms}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={CONTACT_INFO.playStore}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-400 hover:text-brand-700 sm:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
          >
            <img src={playStoreLogo} alt="" className="h-3.5 w-3.5" />
            <span>Google Play</span>
          </a>
          <button
            type="button"
            onClick={onToggleLanguage}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
          >
            <span className="flex items-center gap-1.5">
              <GlobeIcon
                className="h-3.5 w-3.5 fill-current"
                aria-hidden="true"
              />
              <span>{langLabel}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? themeLight : themeDark}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
          >
            <CrescentIcon
              className="h-4 w-4"
              fill={isDark ? "#FBBF24" : "currentColor"}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
