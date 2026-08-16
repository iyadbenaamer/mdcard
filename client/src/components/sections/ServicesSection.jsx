import { useEffect, useState } from "react";
import { motion as Motion } from "framer-motion";

import Icon from "../common/Icon";
import { serviceIcons } from "../../content/siteContent";
import cardsImage from "assets/cards.png";
import distributionImage from "assets/distribution.png";
import posImage from "assets/pos.png";
import supportImage from "assets/support.png";
import ArrowRight from "assets/icons/arrow-right.svg?react";
import ArrowLeft from "assets/icons/arrow-left.svg?react";

const AUTOPLAY_MS = 5500;

function ServicesSection({ t, language }) {
  const [activeServiceSlide, setActiveServiceSlide] = useState(0);
  const serviceImages = [cardsImage, posImage, distributionImage, supportImage];

  const serviceSlides = t.servicesPage.items.map((item, index) => ({
    ...item,
    icon: serviceIcons[index % serviceIcons.length],
    image: serviceImages[index % serviceImages.length],
  }));

  useEffect(() => {
    if (!serviceSlides.length) return undefined;

    const intervalId = setInterval(() => {
      setActiveServiceSlide((prev) => (prev + 1) % serviceSlides.length);
    }, AUTOPLAY_MS);

    return () => clearInterval(intervalId);
  }, [language, serviceSlides.length, activeServiceSlide]);

  const goToPrevSlide = () => {
    setActiveServiceSlide(
      (prev) => (prev - 1 + serviceSlides.length) % serviceSlides.length,
    );
  };

  const goToNextSlide = () => {
    setActiveServiceSlide((prev) => (prev + 1) % serviceSlides.length);
  };

  const formatSlideNumber = (value) =>
    new Intl.NumberFormat(language === "ar" ? "ar" : "en").format(value);

  const slideOffset = `${(language === "ar" ? 1 : -1) * activeServiceSlide * 100}%`;

  return (
    <section
      id="services"
      className="relative scroll-mt-24 overflow-hidden bg-linear-to-br from-brand-50 via-white to-brand-100/70 py-14 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900"
    >
      <div
        className="bg-dot-grid pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      <div className="section-shell relative min-h-[84vh]">
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55 }}
          className="mb-10 flex flex-col items-center gap-3 text-center"
        >
          <span className="eyebrow">
            {language === "ar" ? "ماذا نقدّم" : "What we offer"}
          </span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-50">
            {t.servicesPage.title}
          </h2>
        </Motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6 }}
            className="card-soft h-fit overflow-hidden"
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={goToPrevSlide}
                aria-label={language === "ar" ? "الشريحة السابقة" : "Previous slide"}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-md dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/30"
              >
                {language === "ar" ? (
                  <ArrowRight className="h-5 w-5" />
                ) : (
                  <ArrowLeft className="h-5 w-5" />
                )}
              </button>
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {formatSlideNumber(activeServiceSlide + 1)} /{" "}
                {formatSlideNumber(serviceSlides.length)}
              </div>
              <button
                type="button"
                onClick={goToNextSlide}
                aria-label={language === "ar" ? "الشريحة التالية" : "Next slide"}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-md dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/30"
              >
                {language === "ar" ? (
                  <ArrowLeft className="h-5 w-5" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-brand-100/70 dark:border-brand-900/40">
              <Motion.div
                className="flex"
                animate={{ x: slideOffset }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
              >
                {serviceSlides.map((slide) => (
                  <article
                    key={slide.title}
                    className="min-w-full rounded-2xl bg-white p-4 dark:bg-slate-900"
                  >
                    <div className="grid items-center gap-5 md:grid-cols-2">
                      <div className="service-slide-image border border-brand-100/80 dark:border-slate-700">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          loading="lazy"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <div className="mb-2 inline-flex rounded-xl bg-brand-100 p-2 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                          <Icon name={slide.icon} />
                        </div>
                        <h3 className="text-2xl font-extrabold text-brand-700 dark:text-brand-300">
                          {slide.title}
                        </h3>
                        <p className="mt-3 leading-8 text-slate-700 dark:text-slate-300">
                          {slide.body}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </Motion.div>
            </div>

            <div className="mt-4 flex justify-center gap-2">
              {serviceSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => setActiveServiceSlide(index)}
                  aria-label={`${t.servicesPage.slideAriaLabel} ${formatSlideNumber(index + 1)}`}
                  className="group relative h-2.5 w-8 overflow-hidden rounded-full bg-brand-200 dark:bg-brand-800"
                >
                  {index === activeServiceSlide && (
                    <Motion.span
                      key={activeServiceSlide}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
                      className="absolute inset-y-0 inset-s-0 rounded-full bg-brand-600 dark:bg-brand-400"
                    />
                  )}
                </button>
              ))}
            </div>
          </Motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {t.homeServices.items.map((item, index) => (
              <Motion.article
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="card-soft card-hover flex flex-col items-center justify-around rounded-2xl border border-brand-200/30 p-4 shadow-lg transition hover:bg-brand-50 dark:border-brand-900/60 dark:bg-slate-900/30 dark:hover:bg-brand-950/45"
              >
                <div className="mb-2 inline-flex rounded-xl bg-brand-100 p-2.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  <Icon
                    name={["prepaid", "pos", "support", "mobile"][index]}
                    className="w-8"
                  />
                </div>
                <h4 className="text-lg font-bold text-brand-700 dark:text-brand-300">
                  {item.title}
                </h4>
                <p className="mt-2 text-sm leading-7 text-center text-slate-700 dark:text-white">
                  {item.body}
                </p>
              </Motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ServicesSection;
