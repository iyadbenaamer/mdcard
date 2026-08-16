import React from "react";
import LegalPage from "../components/common/LegalPage";

export default function Privacy({ language = "ar" }) {
  const lang = language;

  const arabic = {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث: 10 أغسطس 2026",
    sections: [
      {
        h: "1. البيانات التي نقوم بجمعها",
        b: [
          "قد نقوم بجمع بعض البيانات الأساسية اللازمة لإنشاء الحساب وإدارته، مثل رقم الهاتف وبيانات الدخول وبعض المعلومات المرتبطة باستخدام الخدمة.",
          "قد يتم أيضًا حفظ بيانات الطلبات والمعاملات وسجل النشاط بهدف تشغيل الخدمة بشكل صحيح ومتابعة العمليات بشكل آمن.",
          "عند إنشاء حساب جديد، قد نجمع بيانات تقنية إضافية مثل عنوان IP وإشارات المتصفح كجزء من عملية تحقق أمني لمنع الاستخدام الآلي المسيء (البوتات).",
        ],
      },
      {
        h: "2. استخدام البيانات",
        b: [
          "تُستخدم البيانات التي يتم جمعها لأغراض التحقق من الحساب، وإدارة الصلاحيات، ومنع الاستخدام غير المصرح به، وتحسين الأمان داخل التطبيق.",
          "كما قد تُستخدم البيانات في دعم المستخدمين، ومعالجة الطلبات، وإرسال التنبيهات المهمة المتعلقة بالحساب أو الأمان.",
        ],
      },
      {
        h: "3. كلمات المرور والحماية",
        b: [
          "لا يتم تخزين كلمات المرور بصيغة نصية قابلة للقراءة، وإنما يتم حفظها بعد تحويلها إلى قيمة hashed آمنة.",
          "هذا يعني أنه لا يمكن استرجاع كلمة المرور الأصلية أو عرضها كنص صريح، حتى من قبل الموظفين أو فريق الدعم.",
          "نطبق إجراءات تقنية وتنظيمية تهدف إلى تقليل مخاطر الوصول غير المصرح به أو تسريب البيانات.",
        ],
      },
      {
        h: "4. مشاركة البيانات",
        b: [
          "لا يتم بيع البيانات الشخصية أو مشاركتها مع أطراف خارجية لأغراض تسويقية.",
          "قد تتم مشاركة بعض البيانات فقط عندما يكون ذلك ضروريًا لتشغيل الخدمة، أو لتنفيذ طلب، أو للالتزام بمتطلبات قانونية أو تنظيمية.",
          "نستخدم خدمة Cloudflare Turnstile للتحقق الأمني عند إنشاء الحساب، وقد تتم مشاركة بيانات تقنية محدودة مثل عنوان IP مع Cloudflare لهذا الغرض فقط، وفقًا لسياسة الخصوصية الخاصة بها.",
        ],
      },
      {
        h: "5. الاحتفاظ بالبيانات",
        b: [
          "يتم الاحتفاظ بالبيانات للفترة اللازمة لتقديم الخدمة، وحماية الحسابات، والالتزام بالمتطلبات التشغيلية والقانونية.",
          "يمكن حذف بعض البيانات أو تعطيلها عند إغلاق الحساب أو عند وجود طلب مشروع بذلك، وفقًا لما تسمح به الأنظمة والسياسات الداخلية.",
        ],
      },
      {
        h: "6. حقوق المستخدم",
        b: [
          "يمكنك طلب مراجعة أو تحديث بعض البيانات المرتبطة بحسابك عند الحاجة، مع مراعاة القيود الأمنية والالتزامات القانونية.",
          "نوصي بالحفاظ على سرية بيانات الدخول وعدم مشاركتها مع أي طرف آخر.",
        ],
      },
      {
        h: "7. التحديثات على السياسة",
        b: [
          "قد يتم تحديث سياسة الخصوصية من وقت لآخر بما يتناسب مع التغييرات التقنية أو التشغيلية أو القانونية.",
        ],
      },
      {
        h: "8. التواصل",
        b: [
          "إذا كانت لديك أي أسئلة بخصوص الخصوصية أو حماية البيانات، يمكنك التواصل مع إدارة التطبيق عبر قنوات الدعم المتاحة.",
        ],
      },
    ],
  };

  const english = {
    title: "Privacy Policy",
    updated: "Last updated: 10 August 2026",
    sections: [
      {
        h: "1. Data We Collect",
        b: [
          "We may collect basic data needed to create and manage an account, such as phone number, login details, and information related to service usage.",
          "We may also store order data, transaction data, and activity logs to keep the service running correctly and securely.",
          "When creating a new account, we may collect additional technical data such as IP address and browser signals as part of a security verification step to prevent automated abuse (bots).",
        ],
      },
      {
        h: "2. How We Use Data",
        b: [
          "Collected data is used for account verification, authorization management, fraud prevention, and improving security inside the app.",
          "It may also be used for user support, order processing, and important account or security notifications.",
        ],
      },
      {
        h: "3. Password Storage and Security",
        b: [
          "Passwords are not stored in plain text. They are saved only after being converted into a secure hashed value.",
          "This means the original password cannot be recovered or displayed as readable text, even by employees or support staff.",
          "We apply technical and organizational safeguards to reduce the risk of unauthorized access or data leakage.",
        ],
      },
      {
        h: "4. Data Sharing",
        b: [
          "We do not sell personal data or share it with third parties for marketing purposes.",
          "Some data may be shared only when necessary to operate the service, complete an order, or comply with legal or regulatory obligations.",
          "We use Cloudflare Turnstile for security verification during account creation. Limited technical data such as IP address may be shared with Cloudflare solely for this purpose, in accordance with its own privacy policy.",
        ],
      },
      {
        h: "5. Data Retention",
        b: [
          "We retain data for as long as needed to provide the service, protect accounts, and meet operational and legal requirements.",
          "Certain data may be deleted or disabled when an account is closed or when a valid request is made, subject to applicable rules and internal policies.",
        ],
      },
      {
        h: "6. User Rights",
        b: [
          "You may request review or updates to certain account-related data when needed, subject to security restrictions and legal obligations.",
          "We recommend keeping your login details confidential and not sharing them with anyone else.",
        ],
      },
      {
        h: "7. Policy Updates",
        b: [
          "This privacy policy may be updated from time to time to reflect technical, operational, or legal changes.",
        ],
      },
      {
        h: "8. Contact",
        b: [
          "If you have any questions about privacy or data protection, you can contact app management through the available support channels.",
        ],
      },
    ],
  };

  const data = lang === "ar" ? arabic : english;

  return (
    <LegalPage
      title={data.title}
      updated={data.updated}
      sections={data.sections}
      language={lang}
    />
  );
}