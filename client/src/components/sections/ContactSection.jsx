import { CONTACT_INFO, CONTACT_LINKS } from "../../constants/contact";

import Icon from "../common/Icon";
import appLogo from "../../assets/logo-white.png";

function ContactSection({ t }) {
  return (
    <section
      id="contact"
      className="scroll-mt-24 bg-white py-14 dark:bg-slate-900"
    >
      <div className="section-shell grid min-h-[70vh] items-start gap-6 lg:grid-cols-2">
        <div
          initial="hidden"
          className="card-soft bg-linear-to-br from-white via-brand-50/70 to-brand-100/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900"
        >
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-50">
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
        </div>

        <div className="card-soft bg-linear-to-br from-brand-600 to-brand-800 text-white dark:from-brand-700 dark:to-brand-950">
          <img
            src={appLogo}
            alt="MD Card"
            loading="lazy"
            className="h-12 w-auto"
          />
          <p className="mt-3 text-brand-50/95">{t.footer.short}</p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center"></div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
