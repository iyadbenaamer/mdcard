import { CONTACT_INFO } from "../constants/contact";

export const content = {
  ar: {
    langLabel: "English",
    themeLight: "وضع فاتح",
    themeDark: "وضع داكن",
    nav: {
      home: "الرئيسية",
      about: "من نحن",
      services: "خدماتنا",
      contact: "تواصل معنا",
    },
    hero: {
      title: "MD Card",
      subtitle: "الحل الذكي لتوزيع وبيع كروت الدفع المسبق محليًا ودوليًا",
      description:
        "نقدم حلول توزيع متكاملة عبر نقاط البيع (POS) لتمكين المحلات التجارية من بيع كروت الدفع المسبق بسرعة، أمان، وموثوقية عالية.",
    },
    homeAbout: {
      title: "من نحن",
      text: "MD Zone إحدى شركات MD Card، متخصصة في توزيع كروت الدفع المسبق المحلية والدولية عبر شبكة واسعة من نقاط البيع. نعمل على تمكين المحلات التجارية من تقديم خدمات الشحن والبطاقات الرقمية لعملائها بسهولة وكفاءة عالية.",
    },
    homeServices: {
      title: "خدماتنا",
      items: [
        {
          title: "توزيع كروت الدفع المسبق",
          body: "نوفر مجموعة واسعة من كروت الدفع المسبق المحلية والدولية لتلبية احتياجات السوق المتنامي.",
        },
        {
          title: "حلول نقاط البيع (POS)",
          body: "نقوم بتزويد المحلات التجارية بأجهزة نقاط بيع متطورة تتيح تنفيذ عمليات البيع بسرعة ودقة عالية.",
        },
        {
          title: "دعم فني مستمر",
          body: "فريق دعم جاهز لمساعدة شركائنا وضمان استمرارية العمل دون انقطاع.",
        },
      ],
    },
    why: {
      title: "لماذا MD Card؟",
      items: [
        "معاملات آمنة وسريعة",
        "نظام تقني موثوق",
        "شراكات طويلة الأمد مع المحلات",
        "إدارة احترافية وخبرة في السوق",
      ],
    },
    aboutPage: {
      title: "من نحن",
      body: [
        "MD Card هي شركة متخصصة في توزيع كروت الدفع المسبق المحلية والدولية، وتعمل تحت مظلة MD Zone. تأسست الشركة بهدف تطوير قطاع الخدمات الرقمية وتسهيل وصول المحلات التجارية إلى حلول بيع حديثة وآمنة.",
        "نحن لا نقدم مجرد منتج، بل نوفر نظام توزيع متكامل يعتمد على أجهزة نقاط البيع (POS)، مما يمنح شركاءنا القدرة على خدمة عملائهم بكفاءة عالية وسرعة في التنفيذ.",
        "نؤمن بأن التحول الرقمي هو مستقبل التجارة، ولذلك نعمل باستمرار على تطوير أنظمتنا وتوسيع شبكتنا لضمان أفضل تجربة لشركائنا في السوق الليبي.",
      ],
      visionTitle: "رؤيتنا",
      vision:
        "أن نكون الشركة الرائدة في توزيع كروت الدفع المسبق والحلول الرقمية في ليبيا.",
      missionTitle: "رسالتنا",
      mission:
        "تمكين المحلات التجارية من تقديم خدمات رقمية موثوقة وسريعة من خلال أنظمة توزيع احترافية وتقنيات حديثة.",
      valuesTitle: "قيمنا",
      values: [
        "الاحترافية",
        "الموثوقية",
        "السرعة",
        "الشفافية",
        "الشراكة طويلة الأمد",
      ],
    },
    servicesPage: {
      title: "خدماتنا",
      carouselLabel: "عرض تفاعلي للخدمات",
      prev: "السابق",
      next: "التالي",
      slideAriaLabel: "شريحة",
      items: [
        {
          title: "1. توزيع كروت الدفع المسبق",
          body: "نقدم باقة متنوعة من الكروت المحلية والدولية التي تلبي احتياجات الأفراد والمحلات التجارية.",
        },
        {
          title: "2. تزويد أجهزة نقاط البيع (POS)",
          body: "نوفر أجهزة نقاط بيع متطورة للمحلات، مع أنظمة سهلة الاستخدام تضمن سرعة العمليات ودقة التقارير.",
        },
        {
          title: "3. إدارة شبكة التوزيع",
          body: "نقوم بإدارة ومتابعة شبكة واسعة من نقاط البيع لضمان استقرار الخدمة واستمراريتها.",
        },
        {
          title: "4. الدعم الفني والتشغيلي",
          body: "فريق دعم متخصص متاح لتقديم المساعدة الفنية والتشغيلية لضمان أفضل أداء للشركاء.",
        },
      ],
    },
    contact: {
      title: "تواصل معنا",
      intro:
        "نحن سعداء بتواصلكم معنا للإجابة عن استفساراتكم أو لبدء شراكة جديدة.",
      location: "الموقع: بنغازي – ليبيا",
      email: `البريد الإلكتروني: ${CONTACT_INFO.email}`,
      whatsapp: `واتساب: ${CONTACT_INFO.whatsappNumber}`,
      phone: `الهاتف: ${CONTACT_INFO.phoneNumber}`,
      outro:
        "للاستفسارات أو طلب الانضمام إلى شبكة التوزيع الخاصة بنا، يرجى التواصل عبر البريد الإلكتروني أو على رقم الهاتف أو الواتساب وسنقوم بالرد في أقرب وقت ممكن.",
    },
    footer: {
      short:
        "MD Card إحدى شركات MD Zone، متخصصة في توزيع كروت الدفع المسبق المحلية والدولية عبر شبكة نقاط بيع حديثة داخل ليبيا، مع التزام كامل بالسرعة والموثوقية والاحترافية.",
      rights: "جميع الحقوق محفوظة",
    },
  },
  en: {
    langLabel: "العربية",
    themeLight: "Light",
    themeDark: "Dark",
    nav: {
      home: "Home",
      about: "About Us",
      services: "Services",
      contact: "Contact Us",
    },
    hero: {
      title: "MD Card",
      subtitle:
        "The smart solution for local and international prepaid card distribution",
      description:
        "We provide integrated POS-based distribution solutions that help shops sell prepaid cards with speed, security, and high reliability.",
    },
    homeAbout: {
      title: "Who We Are",
      text: "MD Zone, one of MD Card companies, specializes in distributing local and international prepaid cards through a wide POS network. We enable shops to deliver top-up and digital card services with ease and high efficiency.",
    },
    homeServices: {
      title: "Our Services",
      items: [
        {
          title: "Prepaid Card Distribution",
          body: "We provide a wide range of local and international prepaid cards to meet growing market needs.",
        },
        {
          title: "POS Solutions",
          body: "We equip shops with advanced POS devices that enable fast and accurate sales operations.",
        },
        {
          title: "Continuous Technical Support",
          body: "Our support team is ready to assist partners and ensure uninterrupted operations.",
        },
      ],
    },
    why: {
      title: "Why MD Card?",
      items: [
        "Secure and fast transactions",
        "Reliable technical platform",
        "Long-term partnerships with shops",
        "Professional management and market expertise",
      ],
    },
    aboutPage: {
      title: "About Us",
      body: [
        "MD Card is a company specialized in distributing local and international prepaid cards under the umbrella of MD Zone. The company was founded to develop digital services and simplify access to modern, secure retail solutions.",
        "We provide more than just a product. We deliver an integrated distribution system powered by POS devices, enabling our partners to serve customers efficiently and quickly.",
        "We believe digital transformation is the future of commerce, so we continuously improve our systems and expand our network to deliver the best partner experience in the Libyan market.",
      ],
      visionTitle: "Our Vision",
      vision:
        "To be the leading company in prepaid card distribution and digital solutions in Libya.",
      missionTitle: "Our Mission",
      mission:
        "Empower shops to offer reliable and fast digital services through professional distribution systems and modern technology.",
      valuesTitle: "Our Values",
      values: [
        "Professionalism",
        "Reliability",
        "Speed",
        "Transparency",
        "Long-term Partnership",
      ],
    },
    servicesPage: {
      title: "Services",
      carouselLabel: "Interactive Services Carousel",
      prev: "Prev",
      next: "Next",
      slideAriaLabel: "Slide",
      items: [
        {
          title: "1. Prepaid Card Distribution",
          body: "We offer a diverse package of local and international cards that suits individuals and retail businesses.",
        },
        {
          title: "2. POS Device Provision",
          body: "We provide advanced POS devices with user-friendly systems that ensure speed and accurate reporting.",
        },
        {
          title: "3. Distribution Network Management",
          body: "We manage and monitor a wide network of points of sale to ensure stable and continuous service.",
        },
        {
          title: "4. Technical and Operational Support",
          body: "Our specialized team offers technical and operational support to ensure the best performance for partners.",
        },
      ],
    },
    contact: {
      title: "Contact Us",
      intro:
        "We are happy to hear from you to answer your questions or start a new partnership.",
      location: "Location: Benghazi - Libya",
      email: `Email: ${CONTACT_INFO.email}`,
      whatsapp: `WhatsApp: ${CONTACT_INFO.whatsappNumber}`,
      phone: `Phone: ${CONTACT_INFO.phoneNumber}`,
      outro:
        "For inquiries or to join our distribution network, please contact us via email, phone, or WhatsApp and we will reply as soon as possible.",
    },
    footer: {
      short:
        "MD Card, one of MD Zone companies, specializes in distributing local and international prepaid cards through a modern POS network in Libya, with full commitment to speed, reliability, and professionalism.",
      rights: "All rights reserved",
    },
  },
};

export const sectionIds = ["home", "about", "services", "contact"];

export const serviceIcons = ["prepaid", "pos", "network", "support"];
