import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import Layout from "layout";
import axiosClient from "utils/AxiosClient";

const Home = () => {
  const admin = useSelector((state) => state.admin);
  const [statsResponse, setStatsResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const adminName =
    admin?.username || localStorage.getItem("adminName") || "المدير";

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const response = await axiosClient.get("/admin/stats");
        if (isMounted) {
          setStatsResponse(response.data);
        }
      } catch (error) {
        if (isMounted) {
          setStatsResponse(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = statsResponse?.stats || null;
  const serverTime = statsResponse?.serverTime || null;

  const formatNumber = (value) => {
    if (typeof value !== "number") return "—";
    return value.toLocaleString("ar-LY");
  };

  const percentOfTotal = (part, total) => {
    if (!total || typeof part !== "number") return 0;
    return Math.round((part / total) * 100);
  };

  const availablePercent = percentOfTotal(
    stats?.availableCards,
    stats?.totalCards,
  );
  const soldPercent = percentOfTotal(stats?.soldCards, stats?.totalCards);
  const weeklySales = stats?.purchasesLast7Days ?? 0;
  const weeklyProgress = percentOfTotal(weeklySales, stats?.totalCards || 0);

  const statCards = useMemo(
    () => [
      {
        title: "البطاقات المتاحة",
        value: formatNumber(stats?.availableCards),
        badge: stats ? `${availablePercent}%` : "—",
        note: "من إجمالي البطاقات",
        tone: "sky",
        icon: (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            strokeWidth="2"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="3"
              stroke="currentColor"
            />
            <path d="M3 10h18" stroke="currentColor" />
          </svg>
        ),
      },
      {
        title: "البطاقات المباعة",
        value: formatNumber(stats?.soldCards),
        badge: stats ? `${soldPercent}%` : "—",
        note: "من إجمالي البطاقات",
        tone: "emerald",
        icon: (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            strokeWidth="2"
          >
            <path d="M6 4h12l-1 14H7L6 4z" stroke="currentColor" />
            <path d="M9 8h6" stroke="currentColor" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: "إجمالي البطاقات",
        value: formatNumber(stats?.totalCards),
        badge: formatNumber(stats?.soldCards),
        note: "بطاقات مباعة",
        tone: "amber",
        icon: (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            strokeWidth="2"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="3"
              stroke="currentColor"
            />
            <path d="M3 10h18" stroke="currentColor" />
          </svg>
        ),
      },
      {
        title: "إجمالي الأنواع",
        value: formatNumber(stats?.totalCardTypes),
        badge: formatNumber(stats?.activeCardTypes),
        note: "أنواع مفعلة",
        tone: "violet",
        icon: (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            strokeWidth="2"
          >
            <path d="M4 7h16" stroke="currentColor" strokeLinecap="round" />
            <path d="M4 12h16" stroke="currentColor" strokeLinecap="round" />
            <path d="M4 17h16" stroke="currentColor" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: "النوع الأكثر مبيعا",
        value: stats?.topSoldType?.name || "—",
        badge: formatNumber(stats?.topSoldType?.soldCount),
        note: "بطاقات مباعة",
        tone: "rose",
        icon: (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            strokeWidth="2"
          >
            <path
              d="M12 2l3 6 6 .8-4.4 4.3 1 6-5.6-3-5.6 3 1-6L3 8.8 9 8z"
              stroke="currentColor"
            />
          </svg>
        ),
      },
      {
        title: "إجمالي المستخدمين",
        value: formatNumber(stats?.totalUsers),
        badge: formatNumber(stats?.newUsersLast7Days),
        note: "مستخدم جديد آخر 7 أيام",
        tone: "sky",
        icon: (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            strokeWidth="2"
          >
            <path
              d="M16 11a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
              stroke="currentColor"
            />
            <path
              d="M4 20c1.8-3 4.6-4 8-4s6.2 1 8 4"
              stroke="currentColor"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
    ],
    [
      availablePercent,
      soldPercent,
      stats?.availableCards,
      stats?.totalCards,
      stats?.soldCards,
      stats?.totalCardTypes,
      stats?.activeCardTypes,
      stats?.topSoldType?.name,
      stats?.topSoldType?.soldCount,
      stats?.totalUsers,
      stats?.newUsersLast7Days,
    ],
  );

  const badgeToneClasses = {
    sky: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
    rose: "bg-rose-100 text-rose-700",
  };

  const formattedServerTime = serverTime
    ? new Date(serverTime).toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <Layout>
      <section
        dir="rtl"
        className="relative overflow-hidden px-4 py-8  sm:px-6 lg:px-10 min-h-svh"
      >
        <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-linear-to-br from-sky-200/70 to-blue-200/30 blur-3xl" />
        <div className="absolute -bottom-28 left-0 h-72 w-72 rounded-full bg-linear-to-tr from-blue-100/70 to-sky-200/30 blur-3xl" />

        <div className="relative mx-auto w-full max-w-6xl">
          <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  لوحة التحكم
                </p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                  مرحبا بعودتك، {adminName}
                </h1>
                <p className="mt-2 text-sm text-slate-600 sm:text-base">
                  لمحة سريعة عن الأداء والمخزون ونشاط المستخدمين.
                </p>
              </div>
            </div>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="grid gap-6 sm:grid-cols-2">
              {statCards.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        {item.title}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold text-slate-900">
                        {item.value}
                      </h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      {item.icon}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        badgeToneClasses[item.tone] || badgeToneClasses.sky
                      }`}
                    >
                      {item.badge}
                    </span>
                    <span className="text-slate-500">{item.note}</span>
                  </div>
                </article>
              ))}
            </div>

            <aside className="flex flex-col gap-6">
              <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-blue-600 via-sky-500 to-blue-400 p-6 text-white shadow-[0_18px_40px_rgba(14,116,144,0.35)]">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                  مبيعات آخر 7 أيام
                </p>
                <h2 className="mt-3 text-3xl font-bold">
                  {isLoading ? "—" : `${weeklyProgress}%`}
                </h2>
                <p className="mt-2 text-sm text-white/80">
                  {isLoading
                    ? "جارٍ تحميل البيانات من قاعدة البيانات."
                    : `${weeklySales} من أصل ${
                        stats?.totalCards ?? 0
                      } بطاقة مباعة خلال 7 أيام.`}
                </p>
                <div className="mt-5 h-2 w-full rounded-full bg-white/30">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${weeklyProgress}%` }}
                  />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Home;
