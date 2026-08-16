import { motion as Motion } from "framer-motion";

import Icon from "../common/Icon";

function AboutSection({ t, language }) {
  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  };

  const whyIcons = ["secure", "speed", "support", "network"];

  return (
    <section
      id="about"
      className="scroll-mt-24 bg-white py-14 dark:bg-slate-900"
    >
      <div className="mx-auto grid min-h-[80vh] w-full items-start gap-6 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Motion.article
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="card-soft flex flex-col items-start gap-6 rounded-2xl border border-brand-200/30 p-6 shadow-lg dark:border-brand-900/60 dark:bg-slate-900/30"
        >
          <div className="w-full self-center sm:self-start">
            <span className="eyebrow">
              {language === "ar" ? "نبذة عنا" : "About the company"}
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-50">
              {t.aboutPage.title}
            </h2>
          </div>
          <div className="mt-4 space-y-4 leading-8 text-slate-700 dark:text-slate-300">
            {t.aboutPage.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="card-hover rounded-xl bg-brand-50/80 p-5 ring-1 ring-brand-100 dark:bg-brand-900/20 dark:ring-brand-900/60">
              <div className="inline-flex rounded-xl bg-brand-100 p-2.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <Icon name="network" className="w-6" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-brand-700 dark:text-brand-300">
                {t.aboutPage.visionTitle}
              </h3>
              <p className="mt-2 text-slate-700 dark:text-slate-300">
                {t.aboutPage.vision}
              </p>
            </article>
            <article className="card-hover rounded-xl bg-brand-50/80 p-5 ring-1 ring-brand-100 dark:bg-brand-900/20 dark:ring-brand-900/60">
              <div className="inline-flex rounded-xl bg-brand-100 p-2.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <Icon name="support" className="w-6" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-brand-700 dark:text-brand-300">
                {t.aboutPage.missionTitle}
              </h3>
              <p className="mt-2 text-slate-700 dark:text-slate-300">
                {t.aboutPage.mission}
              </p>
            </article>
          </div>
        </Motion.article>

        <div className="space-y-4">
          <Motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.6 }}
            className="card-soft flex flex-col items-start gap-6 rounded-2xl border border-brand-200/30 p-6 shadow-lg dark:border-brand-900/60 dark:bg-slate-900/30"
          >
            <div className="w-fit self-center sm:self-start">
              <span className="eyebrow">
                {language === "ar" ? "مميزاتنا" : "Our strengths"}
              </span>
              <h3 className="mt-3 text-2xl font-extrabold text-brand-700 dark:text-brand-300">
                {t.why.title}
              </h3>
            </div>
            <div className="grid w-full gap-4 sm:grid-cols-2">
              {t.why.items.slice(0, 4).map((item, index) => (
                <Motion.article
                  key={item}
                  whileHover={{ y: -4 }}
                  className="card-hover flex flex-col items-start gap-3 rounded-2xl border border-brand-200/30 bg-white p-5 shadow-lg dark:border-brand-900/60 dark:bg-slate-900/40"
                >
                  <div className="inline-flex rounded-xl bg-brand-100 p-2.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    <Icon name={whyIcons[index]} className="w-6" />
                  </div>
                  <p className="font-semibold leading-7 text-slate-800 dark:text-slate-100">
                    {item}
                  </p>
                </Motion.article>
              ))}
            </div>
          </Motion.div>
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
