const ToggleSwitch = ({ checked, onChange, label }) => {
  return (
    <div className="flex items-center justify-between">
      {label && <span className="text-sm text-slate-600">{label}</span>}
      <button
        type="button"
        role="switch"
        dir="ltr"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          checked
            ? "bg-emerald-500 focus:ring-emerald-400"
            : "bg-slate-200 focus:ring-slate-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;
