import React from "react";

const renderPagination = (pagination) => {
  if (!pagination) return null;

  const {
    page,
    totalPages,
    onPageChange,
    onPrev,
    onNext,
    label = "الصفحة",
    prevLabel = "السابق",
    nextLabel = "التالي",
    maxPageButtons = 7,
  } = pagination;

  if (!totalPages || totalPages <= 1) return null;

  const safePage = Math.min(Math.max(1, page || 1), totalPages);
  const handlePrev =
    onPrev || (() => onPageChange?.(Math.max(1, safePage - 1)));
  const handleNext =
    onNext || (() => onPageChange?.(Math.min(totalPages, safePage + 1)));

  const buildPageItems = () => {
    const items = [];
    if (totalPages <= maxPageButtons) {
      for (let i = 1; i <= totalPages; i += 1) items.push(i);
      return items;
    }

    const windowSize = Math.max(3, maxPageButtons - 2);
    const half = Math.floor(windowSize / 2);
    let start = Math.max(2, safePage - half);
    let end = Math.min(totalPages - 1, safePage + half);

    const currentWindow = end - start + 1;
    if (currentWindow < windowSize) {
      if (start === 2) {
        end = Math.min(totalPages - 1, end + (windowSize - currentWindow));
      } else if (end === totalPages - 1) {
        start = Math.max(2, start - (windowSize - currentWindow));
      }
    }

    items.push(1);
    if (start > 2) items.push("...");
    for (let i = start; i <= end; i += 1) items.push(i);
    if (end < totalPages - 1) items.push("...");
    items.push(totalPages);
    return items;
  };

  const pageItems = buildPageItems();

  return (
    <tfoot>
      <tr className="border-t border-slate-100">
        <td className="px-4 py-3 align-middle" colSpan={999}>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <div>
              {label} {safePage} من {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:opacity-50"
                onClick={handlePrev}
                disabled={safePage === 1}
              >
                {prevLabel}
              </button>
              {pageItems.map((item, index) =>
                item === "..." ? (
                  <span
                    key={`table-page-ellipsis-${index}`}
                    className="px-2 text-sm text-slate-400"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={`table-page-${item}`}
                    type="button"
                    className={`h-9 w-9 rounded-lg text-sm transition ${item === safePage
                      ? "bg-primary text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    onClick={() => onPageChange?.(item)}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:opacity-50"
                onClick={handleNext}
                disabled={safePage === totalPages}
              >
                {nextLabel}
              </button>
            </div>
          </div>
        </td>
      </tr>
    </tfoot>
  );
};

const Table = ({
  columns = [],
  className = "",
  children,
  footer,
  pagination,
}) => (
  <div className={`w-full overflow-x-auto ${className} text-center`}>
    <table className="w-full min-w-180 border-collapse border border-slate-200 ">
      {columns.length > 0 && (
        <colgroup>
          {columns.map((column) => (
            <col
              key={column.key}
              style={column.width ? { width: column.width } : undefined}
            />
          ))}
        </colgroup>
      )}
      {children}
      {footer ? <tfoot>{footer}</tfoot> : renderPagination(pagination)}
    </table>
  </div>
);

const TableHead = ({ columns = [] }) => (
  <thead className="bg-slate-50 text-sm text-slate-500">
    <tr>
      {columns.map((column) => (
        <th
          key={column.key}
          className={`border-b border-slate-200 px-4 py-3 font-medium ${column.className || ""
            }`}
        >
          {column.label}
        </th>
      ))}
    </tr>
  </thead>
);

const TableBody = ({ children }) => (
  <tbody className="text-sm text-slate-700">{children}</tbody>
);

const TableRow = ({ className = "", ...rest }) => (
  <tr className={`border-b border-slate-100 ${className}`} {...rest} />
);

const TableCell = ({ className = "", children, ...rest }) => (
  <td className={`px-4 py-3 align-middle ${className}`} {...rest}>
    {children}
  </td>
);

export { Table, TableHead, TableBody, TableRow, TableCell };
