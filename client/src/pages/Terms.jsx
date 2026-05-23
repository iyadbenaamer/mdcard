import React from "react";

export default function Terms({ language = "ar" }) {
  const lang = language;

  const arabic = {
    title: "الشروط والأحكام",
    updated: "آخر تحديث: 23 مايو 2026",
    sections: [
      {
        h: "1. التعريفات",
        b: [
          "التطبيق: منصة بيع البطاقات والخدمات الرقمية.",
          "المستخدم: أي شخص يقوم باستخدام التطبيق أو إنشاء حساب داخله.",
          "الرصيد: القيمة المالية المضافة إلى حساب المستخدم داخل التطبيق.",
          "الطلب: عملية شراء أو طلب بطاقة أو خدمة رقمية من خلال التطبيق.",
        ],
      },
      {
        h: "2. قبول الشروط",
        b: [
          "باستخدام التطبيق أو إنشاء حساب، فإنك تقر بموافقتك الكاملة على هذه الشروط والأحكام وسياسة الخصوصية الخاصة بالتطبيق.",
          "إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى التوقف عن استخدام التطبيق.",
        ],
      },
      {
        h: "3. إنشاء الحساب",
        b: [
          "يلتزم المستخدم بتقديم معلومات صحيحة ودقيقة عند التسجيل.",
          "يتحمل المستخدم مسؤولية الحفاظ على سرية بيانات تسجيل الدخول الخاصة به، كما يتحمل كامل المسؤولية عن أي نشاط يتم من خلال حسابه.",
          "يحق لإدارة التطبيق تعليق أو حذف أي حساب في حال الاشتباه بأي استخدام مخالف أو احتيالي.",
        ],
      },
      {
        h: "4. استخدام التطبيق",
        b: [
          "يوافق المستخدم على استخدام التطبيق بشكل قانوني وعدم:",
          "• محاولة اختراق أو تعطيل التطبيق.",
          "• استخدام التطبيق في أي نشاط غير قانوني.",
          "• إساءة استخدام الخدمات أو محاولة التلاعب بالأسعار أو الأنظمة.",
          "• إعادة بيع الخدمات بطريقة تضر بالتطبيق أو المستخدمين الآخرين.",
        ],
      },
      {
        h: "5. الطلبات والمدفوعات",
        b: [
          "يتم تنفيذ الطلبات حسب توفر الخدمة أو البطاقات.",
          "قد تختلف مدة تنفيذ الطلبات حسب نوع الخدمة.",
          "يتحمل المستخدم مسؤولية التأكد من صحة البيانات المدخلة قبل تأكيد الطلب.",
          "لا يمكن التراجع عن الطلبات المكتملة أو استرجاع قيمتها بعد تسليم البطاقة أو تنفيذ الخدمة، إلا في الحالات التي تحددها إدارة التطبيق.",
        ],
      },
      {
        h: "6. الرصيد والمحفظة",
        b: [
          "يمكن للمستخدم شحن رصيده داخل التطبيق بالطرق المتاحة.",
          "الرصيد داخل التطبيق غير قابل للتحويل النقدي إلا إذا تم النص على ذلك.",
          "يحق لإدارة التطبيق مراجعة أو إيقاف أي عملية شحن مشبوهة.",
        ],
      },
      {
        h: "7. الأسعار والتعديلات",
        b: [
          "يحق لإدارة التطبيق تعديل الأسعار أو إضافة أو إزالة الخدمات في أي وقت دون إشعار مسبق.",
        ],
      },
      {
        h: "8. الإشعارات والتحديثات",
        b: [
          "قد يرسل التطبيق إشعارات متعلقة بالطلبات أو التحديثات أو العروض أو التنبيهات الأمنية.",
          "باستخدام التطبيق فإنك توافق على استقبال الإشعارات المرتبطة بالخدمة.",
        ],
      },
      {
        h: "9. التحديثات والصيانة",
        b: [
          "قد يتم إيقاف التطبيق مؤقتًا لأغراض الصيانة أو التحديث دون إشعار مسبق.",
          "قد يتطلب استخدام بعض الميزات تحديث التطبيق إلى أحدث إصدار.",
        ],
      },
      {
        h: "10. الملكية الفكرية",
        b: [
          "جميع الحقوق المتعلقة بالتطبيق، بما في ذلك التصميمات والشعارات والمحتوى والبرمجيات، مملوكة لإدارة التطبيق ولا يجوز نسخها أو إعادة استخدامها دون إذن مسبق.",
        ],
      },
      {
        h: "11. إخلاء المسؤولية",
        b: [
          'يتم توفير التطبيق "كما هو" دون أي ضمانات صريحة أو ضمنية.',
          "لا تتحمل إدارة التطبيق أي مسؤولية عن:",
          "• انقطاع الخدمة الناتج عن مشاكل تقنية أو خارجية.",
          "• خسائر ناتجة عن إدخال بيانات خاطئة من قبل المستخدم.",
          "• أي استخدام غير مصرح به لحساب المستخدم بسبب إهمال حماية بيانات الدخول.",
        ],
      },
      {
        h: "12. إنهاء الخدمة",
        b: [
          "يحق لإدارة التطبيق تعليق أو إنهاء حساب أي مستخدم يخالف هذه الشروط أو يسيء استخدام المنصة.",
        ],
      },
      {
        h: "13. التعديلات على الشروط",
        b: [
          "يجوز تعديل هذه الشروط والأحكام في أي وقت، ويعتبر استمرار استخدام التطبيق بعد التعديل موافقة ضمنية على النسخة المحدثة.",
        ],
      },
      {
        h: "14. التواصل",
        b: [
          "في حال وجود أي استفسارات أو مشاكل، يمكن التواصل مع إدارة التطبيق عبر وسائل التواصل أو البريد الإلكتروني المخصص للدعم.",
        ],
      },
      {
        h: "15. القانون المعمول به",
        b: [
          "تخضع هذه الشروط والأحكام للقوانين المعمول بها في الدولة التي تعمل منها إدارة التطبيق.",
        ],
      },
    ],
  };

  const english = {
    title: "Terms and Conditions",
    updated: "Last updated: 23 May 2026",
    sections: [
      {
        h: "1. Definitions",
        b: [
          "App: The platform for selling digital cards and services.",
          "User: Any person who uses the app or creates an account.",
          "Balance: The monetary value added to a user's account within the app.",
          "Order: The purchase or request of a digital card or service through the app.",
        ],
      },
      {
        h: "2. Acceptance of Terms",
        b: [
          "By using the app or creating an account, you agree to these Terms and Conditions and the app's Privacy Policy.",
          "If you do not agree with any part of these terms, please stop using the app.",
        ],
      },
      {
        h: "3. Account Creation",
        b: [
          "Users must provide accurate and truthful information when registering.",
          "Users are responsible for keeping their login details confidential and are liable for all activity under their account.",
          "The app management may suspend or delete any account suspected of fraudulent or violating activity.",
        ],
      },
      {
        h: "4. Use of the App",
        b: [
          "Users agree to use the app lawfully and not to:",
          "• attempt to hack or disrupt the app.",
          "• use the app for any illegal activity.",
          "• abuse services or attempt to manipulate prices or systems.",
          "• resell services in a way that harms the app or other users.",
        ],
      },
      {
        h: "5. Orders and Payments",
        b: [
          "Orders are fulfilled according to service or card availability.",
          "Fulfillment time may vary depending on the type of service.",
          "Users are responsible for verifying entered information before confirming an order.",
          "Completed orders cannot be canceled or refunded after delivery of the card or service, except as determined by app management.",
        ],
      },
      {
        h: "6. Balance and Wallet",
        b: [
          "Users can top up their in-app balance using available methods.",
          "In-app balance is not convertible to cash unless explicitly stated.",
          "The app management may review or halt any suspicious top-up transactions.",
        ],
      },
      {
        h: "7. Prices and Changes",
        b: [
          "The app management may modify prices or add/remove services at any time without prior notice.",
        ],
      },
      {
        h: "8. Notifications and Updates",
        b: [
          "The app may send notifications related to orders, updates, offers, or security alerts.",
          "By using the app you agree to receive service-related notifications.",
        ],
      },
      {
        h: "9. Updates and Maintenance",
        b: [
          "The app may be temporarily unavailable for maintenance or updates without prior notice.",
          "Some features may require updating the app to the latest version.",
        ],
      },
      {
        h: "10. Intellectual Property",
        b: [
          "All rights related to the app, including designs, logos, content, and software, are owned by the app management and may not be copied or reused without permission.",
        ],
      },
      {
        h: "11. Disclaimer",
        b: [
          'The app is provided "as is" without any express or implied warranties.',
          "The app management is not liable for:",
          "• service interruptions due to technical or external issues.",
          "• losses resulting from incorrect data entered by the user.",
          "• any unauthorized use of a user's account due to negligence in protecting login details.",
        ],
      },
      {
        h: "12. Termination",
        b: [
          "The app management may suspend or terminate any user's account that violates these terms or abuses the platform.",
        ],
      },
      {
        h: "13. Changes to Terms",
        b: [
          "These terms may be modified at any time; continued use of the app after changes constitutes implicit acceptance of the updated version.",
        ],
      },
      {
        h: "14. Contact",
        b: [
          "For inquiries or issues, contact app management via social channels or the dedicated support email.",
        ],
      },
      {
        h: "15. Governing Law",
        b: [
          "These terms are governed by the laws applicable in the country where the app management operates.",
        ],
      },
    ],
  };

  const data = lang === "ar" ? arabic : english;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <p className="text-sm text-gray-500">{data.updated}</p>
        </div>
      </div>

      <article
        dir={lang === "ar" ? "rtl" : "ltr"}
        lang={lang}
        className={lang === "ar" ? "text-right" : "text-left"}
      >
        {data.sections.map((sec, idx) => (
          <section key={idx} className="mb-4">
            <h2 className="text-lg font-semibold mb-2">{sec.h}</h2>
            {sec.b.map((p, i) => (
              <p key={i} className="mb-1 leading-relaxed">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
