import { motion as Motion } from "framer-motion";

import { CONTACT_INFO, CONTACT_LINKS } from "../../constants/contact";

import Icon from "../common/Icon";
import appLogo from "../../assets/logo-white.png";

function ContactSection({ t, language }) {
  const quickActions = [
    {
      icon: "whatsapp",
      label: language === "ar" ? "واتساب" : "WhatsApp",
      href: CONTACT_LINKS.whatsapp,
      external: true,
    },
    {
      icon: "phone",
      label: language === "ar" ? "اتصال" : "Call",
      href: CONTACT_LINKS.phone,
      external: false,
    },
    {
      icon: "email",
      label: language === "ar" ? "بريد إلكتروني" : "Email",
      href: CONTACT_LINKS.email,
      external: false,
    },
  ];

  return (
    <section
      id="contact"
      className="scroll-mt-24 bg-white py-14 dark:bg-slate-900"
    >
      <div className="section-shell grid min-h-[70vh] items-start gap-6 lg:grid-cols-2">
        <Motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="card-soft bg-linear-to-br from-white via-brand-50/70 to-brand-100/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900"
        >
          <span className="eyebrow">
            {language === "ar" ? "تواصل معنا" : "Get in touch"}
          </span>
          <h2 className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-50">
            {t.contact.title}
          </h2>
          <p className="mt-4 text-slate-700 dark:text-slate-300">
            {t.contact.intro}
          </p>
          <div className="mt-6 space-y-3 text-base text-slate-800 dark:text-slate-200">
            <p className="flex items-center gap-2">
              <span className="text-brand-700 dark:text-brand-300">
                <Icon name="location" className="h-5 w-5" />
              </span>
              <a href={CONTACT_INFO.locationURL}>
                <span>{t.contact.location}</span>
              </a>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-brand-700 dark:text-brand-300">
                <Icon name="email" className="h-5 w-5" />
              </span>
              <a href={CONTACT_LINKS.email} className="hover:underline">
                {t.contact.email}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-brand-700 dark:text-brand-300">
                <Icon name="whatsapp" className="h-5 w-5" />
              </span>
              <a
                href={CONTACT_LINKS.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {t.contact.whatsapp}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-brand-700 dark:text-brand-300">
                <Icon name="phone" className="h-5 w-5" />
              </span>
              <a href={CONTACT_LINKS.phone} className="hover:underline">
                {t.contact.phone}
              </a>
            </p>
          </div>
          <p className="mt-5 leading-7 text-slate-700 dark:text-slate-300">
            {t.contact.outro}
          </p>
        </Motion.div>

        <div className="card-soft bg-linear-to-br from-brand-600 to-brand-800 text-white dark:from-brand-700 dark:to-brand-950">
          <img
            src={appLogo}
            alt="MD Card"
            loading="lazy"
            className="h-12 w-auto"
          />
          <p className="relative mt-3 text-brand-50/95">{t.footer.short}</p>

          <div className="relative mt-auto grid gap-3 pt-8 sm:grid-cols-3">
            {quickActions.map((action) => (
              <a
                key={action.label}
                href={action.href}
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noreferrer" : undefined}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-4 text-center text-sm font-semibold backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/20"
              >
                <Icon name={action.icon} className="h-5 w-5" />
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
