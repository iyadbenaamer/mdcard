import { sectionIds } from "../../content/siteContent";
import logoLight from "../../assets/logo-full.png";
import logoDark from "../../assets/logo-white.png";
import GlobeIcon from "../../assets/icons/globe.svg?react";
import CrescentIcon from "../../assets/icons/crescent.svg?react";

function SiteHeader({
  nav,
  langLabel,
  onToggleLanguage,
  isDark,
  themeLight,
  themeDark,
  onToggleTheme,
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/85">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <a href="#home" className="flex items-center gap-3">
          <img
            src={isDark ? logoDark : logoLight}
            alt="MD Card"
            className="h-9 w-auto sm:h-10"
          />
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {sectionIds.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-sm font-semibold text-slate-700 transition hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-300"
            >
              {nav[id]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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
