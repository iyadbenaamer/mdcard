import { motion as Motion } from "framer-motion";

function LegalPage({ title, updated, sections, language = "ar" }) {
  const isRtl = language === "ar";

  return (
    <div className="relative overflow-hidden bg-slate-50 py-14 dark:bg-slate-950">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-linear-to-b from-brand-100/60 via-brand-50/20 to-transparent dark:from-brand-900/20 dark:via-brand-900/5"
        aria-hidden="true"
      />
      <div className="section-shell max-w-4xl">
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col items-center gap-3 text-center sm:items-start sm:text-start"
        >
          <span className="eyebrow">{updated}</span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 sm:text-4xl">
            {title}
          </h1>
        </Motion.div>

        <article
          dir={isRtl ? "rtl" : "ltr"}
          lang={language}
          className={`space-y-4 ${isRtl ? "text-right" : "text-left"}`}
        >
          {sections.map((sec, idx) => (
            <Motion.section
              key={sec.h}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: Math.min(idx * 0.03, 0.3) }}
              className="card-soft"
            >
              <h2 className="mb-3 text-lg font-bold text-brand-700 dark:text-brand-300">
                {sec.h}
              </h2>
              <div className="space-y-2 leading-relaxed text-slate-700 dark:text-slate-300">
                {sec.b.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Motion.section>
          ))}
        </article>
      </div>
    </div>
  );
}

export default LegalPage;
