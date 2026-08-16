import { motion as Motion } from "framer-motion";

import appLogo from "assets/logo-white.png";
import heroArabic from "assets/hero-arabic.png";
import heroEnglish from "assets/hero-english.png";
import FacebookIcon from "assets/icons/facebook.svg?react";
import WhatsappIcon from "assets/icons/whatsapp.svg?react";
import InstagramIcon from "assets/icons/instagram.svg?react";
import playStoreLogo from "assets/icons/play-store.png";
import Icon from "../common/Icon";
import { CONTACT_INFO, CONTACT_LINKS } from "../../constants/contact";
import { Link } from "react-router-dom";

function HeroSection({ t, language }) {
  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  };
  const heroBackground = language === "ar" ? heroArabic : heroEnglish;

  const highlights =
    language === "ar"
      ? [
          { icon: "speed", label: "سرعة" },
          { icon: "secure", label: "أمان" },
          { icon: "network", label: "موثوقية" },
        ]
      : [
          { icon: "speed", label: "Speed" },
          { icon: "secure", label: "Security" },
          { icon: "network", label: "Reliability" },
        ];

  const scrollToServices = (e) => {
    e.preventDefault();
    document
      .getElementById("services")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Motion.section
      id="home"
      className="relative isolate flex min-h-[calc(100vh-4rem)] items-center overflow-hidden bg-slate-950 bg-cover bg-center bg-no-repeat py-20"
      style={{ backgroundImage: `url(${heroBackground})` }}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-linear-to-b from-slate-950/80 via-slate-950/65 to-slate-950/92" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,148,234,0.35),transparent_55%)]" />
      <div
        className="aurora-orb h-72 w-72 bg-brand-400 sm:h-96 sm:w-96"
        style={{ top: "-8%", insetInlineStart: "-6%" }}
        aria-hidden="true"
      />
      <div
        className="aurora-orb h-64 w-64 bg-brand-600 sm:h-80 sm:w-80"
        style={{ bottom: "-10%", insetInlineEnd: "-4%", animationDelay: "-6s" }}
        aria-hidden="true"
      />

      <div className="section-shell relative z-10 w-full">
        <div className="flex max-w-3xl flex-col items-center text-center lg:items-start lg:text-start">
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "linear" }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-white/90 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {language === "ar"
              ? "التطبيق متوفر الآن على Google Play"
              : "The app is now live on Google Play"}
          </Motion.div>

          <Motion.img
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "linear" }}
            src={appLogo}
            alt="MD Card"
            loading="lazy"
            className="mx-auto mt-6 h-14 w-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] lg:mx-0 sm:h-16"
          />

          <Motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.42, ease: "linear" }}
            className="gradient-text mt-5 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl"
          >
            {t.hero.subtitle}
          </Motion.p>

          <Motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.54, ease: "linear" }}
            className="mt-5 max-w-2xl text-base leading-8 text-slate-100/90 sm:text-lg"
          >
            {t.hero.description}
          </Motion.p>

          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.66, ease: "linear" }}
            className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            {highlights.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm"
              >
                <Icon name={item.icon} className="h-3.5 w-3.5 text-brand-300" />
                {item.label}
              </span>
            ))}
          </Motion.div>

          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.78, ease: "linear" }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <a
              href={CONTACT_INFO.playStore}
              target="_blank"
              rel="noreferrer"
              className="btn bg-white text-slate-900 shadow-xl shadow-slate-950/40 hover:-translate-y-0.5 hover:bg-slate-100"
            >
              <img src={playStoreLogo} alt="" className="h-5 w-5" />
              {t.hero.playStoreCta}
            </a>
            <a
              href="#services"
              onClick={scrollToServices}
              className="btn-secondary"
            >
              {language === "ar" ? "استكشف خدماتنا" : "Explore Our Services"}
            </a>
          </Motion.div>

          <Motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.95, ease: "linear" }}
            className="mt-8 flex w-full flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-6 lg:justify-start"
          >
            <div className="social flex gap-2">
              <a
                aria-label={"صفحتنا على فيسبوك"}
                href={CONTACT_INFO.facebook}
                target="_blank"
                rel="noreferrer"
                className="w-8 "
              >
                <FacebookIcon
                  style={{ borderRadius: "50%" }}
                  className="transition overflow-hidden hover:fill-[#1877F2] hover:bg-white"
                />
              </a>
              <a
                aria-label={"حسابنا على واتساب"}
                href={CONTACT_LINKS.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="w-8"
              >
                <WhatsappIcon className="transition hover:fill-[#25D366]" />
              </a>
              <a
                aria-label={"صفحتنا على إنستغرام"}
                href={CONTACT_INFO.instagram}
                target="_blank"
                rel="noreferrer"
                className="w-8 relative"
              >
                <InstagramIcon
                  className="absolute transition"
                  fill="url(#colored)"
                />
                <InstagramIcon
                  className="absolute transition hover:opacity-0"
                  fill="white"
                />
              </a>
            </div>
            <Link
              to="/terms"
              className="text-sm text-white/80 underline decoration-white/30 underline-offset-4 transition hover:text-white"
            >
              {language === "ar"
                ? "اقرأ الشروط والأحكام"
                : "Read Terms and Conditions"}
            </Link>
          </Motion.div>
        </div>
      </div>

      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 1.2 },
          y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute inset-x-0 bottom-6 z-10 hidden justify-center sm:flex"
        aria-hidden="true"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14" />
          <path d="M6 13l6 6 6-6" />
        </svg>
      </Motion.div>
    </Motion.section>
  );
}

export default HeroSection;
