import React from "react";

const UserInfoGrid = ({ infoItems, badgeClass }) => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    {infoItems.map((item) => (
      <div
        key={item.label}
        className="rounded-2xl border border-slate-200 bg-white/80 p-4"
      >
        <div className="text-xs text-slate-500">{item.label}</div>
        <div
          className={`mt-2 text-sm text-slate-800 ${
            item.subtle ? "break-all text-xs text-slate-500" : ""
          }`}
        >
          {item.badge ? (
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs ${badgeClass(
                item.value === "نعم" || item.value === "مفعّل",
              )}`}
            >
              {item.value}
            </span>
          ) : (
            item.value
          )}
        </div>
      </div>
    ))}
  </div>
);

export default UserInfoGrid;
