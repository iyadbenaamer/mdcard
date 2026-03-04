import { motion as Motion } from "framer-motion";

import Icon from "../common/Icon";

function AboutSection({ t }) {
  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  };

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
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-50 w-fit self-center sm:self-start">
            {t.aboutPage.title}
          </h2>
          <div className="mt-4 space-y-4 leading-8 text-slate-700 dark:text-slate-300">
            {t.aboutPage.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="rounded-xl bg-brand-50/80 p-4 ring-1 ring-brand-100 dark:bg-brand-900/20 dark:ring-brand-900/60">
              <h3 className="text-lg font-bold text-brand-700 dark:text-brand-300">
                {t.aboutPage.visionTitle}
              </h3>
              <p className="mt-2 text-slate-700 dark:text-slate-300">
                {t.aboutPage.vision}
              </p>
            </article>
            <article className="rounded-xl bg-brand-50/80 p-4 ring-1 ring-brand-100 dark:bg-brand-900/20 dark:ring-brand-900/60">
              <h3 className="text-lg font-bold text-brand-700 dark:text-brand-300">
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
            <h3 className="mb-4 text-2xl font-extrabold text-brand-700 dark:text-brand-300  w-fit self-center sm:self-start">
              {t.why.title}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 mx-auto">
              {t.why.items.slice(0, 4).map((item, index) => (
                <Motion.article
                  key={item}
                  whileHover={{ scale: 1.01 }}
                  className="flex card-hover aspect-square flex-col justify-around items-center rounded-2xl border border-brand-200/30 shadow-lg"
                >
                  <div className="inline-flex w-40 items-center justify-center rounded-xl">
                    <Icon
                      name={["secure", "speed", "support", "network"][index]}
                      className="w-30 text-slate-700 dark:text-slate-300"
                    />
                  </div>
                  <p className="text-brand-700 dark:text-brand-300 font-semibold leading-8 px-4">
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
