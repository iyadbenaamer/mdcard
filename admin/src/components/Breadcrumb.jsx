import ArrowLeftIcon from "assets/icons/arrow-left.svg?react";
import ArrowRightIcon from "assets/icons/arrow-right.svg?react";
import { useBreadcrumb } from "components/breadcrumb/BreadcrumbContext";
import { useNavigate, useSearchParams } from "react-router-dom";

const Breadcrumb = () => {
  const { levels } = useBreadcrumb();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  if (!levels?.length) return null;

  const handleAutoClick = (level) => {
    setSearchParams((prev) => {
      if (level.key === "categories") {
        prev.delete("categoryId");
        prev.delete("cardTypeId");
        prev.delete("cardTierId");
      } else if (level.key === "category") {
        prev.delete("cardTypeId");
        prev.delete("cardTierId");
      } else if (level.key === "cardType") {
        prev.delete("cardTierId");
      }
      return prev;
    });
  };

  const items = levels.map((level, index) => {
    const isLast = index === levels.length - 1;
    if (isLast) {
      return { label: level.label };
    }
    return {
      label: level.label,
      onClick: () => handleAutoClick(level),
    };
  });
  return (
    <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:text-primary disabled:opacity-50"
          onClick={() => navigate(-1)}
          aria-label="رجوع"
        >
          <ArrowRightIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:text-primary disabled:opacity-50"
          onClick={() => navigate(1)}
          aria-label="تقدم"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
      </div>
      {items.map((item, index) => (
        <span
          key={`${item.label}-${index}`}
          className="flex items-center gap-2"
        >
          {index > 0 && <span className="text-slate-300">/</span>}
          {item.onClick ? (
            <button
              type="button"
              className="text-slate-600 hover:text-primary"
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ) : (
            <span className="text-slate-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumb;
