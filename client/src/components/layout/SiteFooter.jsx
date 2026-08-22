import { Link, useNavigate, useLocation } from "react-router-dom";

import appLogo from "assets/logo-white.png";
import playStoreLogo from "assets/icons/play-store.png";
import FacebookIcon from "assets/icons/facebook.svg?react";
import WhatsappIcon from "assets/icons/whatsapp.svg?react";
import InstagramIcon from "assets/icons/instagram.svg?react";
import Icon from "../common/Icon";
import { sectionIds } from "../../content/siteContent";
import { CONTACT_INFO, CONTACT_LINKS } from "../../constants/contact";

function SiteFooter({ alamerLogo, t, language = "ar" }) {
  const navigate = useNavigate();
  const location = useLocation();

  const termsLabel =
    language === "ar" ? "الشروط والأحكام" : "Terms and Conditions";
  const privacyLabel =
    language === "ar" ? "سياسة الخصوصية" : "Privacy Policy";
  const quickLinksLabel = language === "ar" ? "روابط سريعة" : "Quick Links";
  const legalLabel = language === "ar" ? "قانوني" : "Legal";
  const contactLabel = language === "ar" ? "تواصل معنا" : "Contact";

  const scrollToSection = (id, e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof window === "undefined") return;

    const perform = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (id === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
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
    <footer className="relative overflow-hidden bg-slate-950">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/60 to-transparent"
        aria-hidden="true"
      />
      <div
        className="aurora-orb h-72 w-72 bg-brand-700"
        style={{ bottom: "-20%", insetInlineStart: "10%" }}
        aria-hidden="true"
      />

      <div className="section-shell relative grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.9fr_0.9fr_1fr]">
        <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-start">
          <img
            src={appLogo}
            alt="MD Card"
            loading="lazy"
            className="h-10 w-auto rounded-md"
          />
          <p className="max-w-xs text-sm leading-7 text-slate-300">
            {t.footer.short}
          </p>
          <a
            href={CONTACT_INFO.playStore}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            <img src={playStoreLogo} alt="" className="h-4 w-4" />
            {t.hero.playStoreCta}
          </a>
          <div className="flex gap-3">
            <a
              aria-label="Facebook"
              href={CONTACT_INFO.facebook}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 p-1.5 text-slate-200 transition hover:bg-white hover:text-slate-900"
            >
              <FacebookIcon className="h-full w-full" />
            </a>
            <a
              aria-label="WhatsApp"
              href={CONTACT_LINKS.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 p-1.5 text-slate-200 transition hover:bg-white hover:text-slate-900"
            >
              <WhatsappIcon className="h-full w-full" />
            </a>
            <a
              aria-label="Instagram"
              href={CONTACT_INFO.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 p-1.5 text-slate-200 transition hover:bg-white hover:text-slate-900"
            >
              <InstagramIcon className="h-full w-full" />
            </a>
          </div>
        </div>

        <nav className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-start">
          <h3 className="text-sm font-bold text-white">{quickLinksLabel}</h3>
          {sectionIds.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => scrollToSection(id, e)}
              className="text-sm text-slate-300 transition hover:text-white"
            >
              {t.nav[id]}
            </a>
          ))}
        </nav>

        <nav className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-start">
          <h3 className="text-sm font-bold text-white">{legalLabel}</h3>
          <Link
            to="/terms"
            className="text-sm text-slate-300 transition hover:text-white"
          >
            {termsLabel}
          </Link>
          <Link
            to="/privacy"
            className="text-sm text-slate-300 transition hover:text-white"
          >
            {privacyLabel}
          </Link>
        </nav>

        <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-start">
          <h3 className="text-sm font-bold text-white">{contactLabel}</h3>
          <a
            href={CONTACT_LINKS.email}
            className="flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
          >
            <Icon name="email" className="h-4 w-4 shrink-0" />
            <span className="break-all">{CONTACT_INFO.email}</span>
          </a>
          <a
            href={CONTACT_LINKS.phone}
            className="flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
          >
            <Icon name="phone" className="h-4 w-4 shrink-0" />
            {CONTACT_INFO.phoneNumber}
          </a>
          <a
            href={CONTACT_INFO.locationURL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
          >
            <Icon name="location" className="h-4 w-4 shrink-0" />
            {language === "ar" ? "ليبيا - بنغازي - الهواري" : "Libya - Benghazi - Al-Hawari"}
          </a>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="section-shell flex flex-col h-40 sm:h-20 items-center gap-3 py-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} MD Card - {t.footer.rights}
          </p>
          <img
            src={alamerLogo}
            alt="Al-Amer LLC"
            loading="lazy"
            className="w-40 rounded-md opacity-90"
          />
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
