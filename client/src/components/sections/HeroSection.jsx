import { motion as Motion } from "framer-motion";

import appLogo from "assets/logo-white.png";
import heroArabic from "assets/hero-arabic.png";
import heroEnglish from "assets/hero-english.png";
import FacebookIcon from "assets/icons/facebook.svg?react";
import WhatsappIcon from "assets/icons/whatsapp.svg?react";
import InstagramIcon from "assets/icons/instagram.svg?react";
import { CONTACT_INFO, CONTACT_LINKS } from "../../constants/contact";

function HeroSection({ t, language }) {
  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  };
  const heroBackground = language === "ar" ? heroArabic : heroEnglish;

  return (
    <Motion.section
      id="home"
      className="relative flex items-center isolate scroll-mt-24 min-h-[calc(100vh-4rem)] bg-slate-950 bg-cover bg-center bg-no-repeat py-14"
      style={{ backgroundImage: `url(${heroBackground})` }}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-slate-950/65" />
      <Motion.div
        initial={{ opacity: 0.5, y: -0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "linear" }}
        className="landing flex-1 relative z-10 text-white"
      >
        <div className="flex flex-col gap-4 w-fit mx-4 items-center justify-center lg:items-start lg:justify-start">
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: "linear" }}
          >
            <img
              src={appLogo}
              alt="MD Card"
              className="mx-auto h-14 w-auto lg:mx-0 sm:h-16"
            />
            <p className="mt-4 text-2xl font-extrabold text-brand-300">
              {t.hero.subtitle}
            </p>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-100/95">
              {t.hero.description}
            </p>
          </Motion.div>
          <Motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1, ease: "linear" }}
            className="social flex gap-2 justify-start w-full"
          >
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
          </Motion.div>
        </div>
      </Motion.div>
    </Motion.section>
  );
}

export default HeroSection;
