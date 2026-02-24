import { Link, useLocation } from "react-router-dom";

const SidebarItem = (props) => {
  const { to, name, children, onClick } = props;
  const location = useLocation();

  const className =
    (location.pathname.startsWith(to) && to !== "/") ||
    (location.pathname === to && to === "/")
      ? "bg-[#4c5b69] text-secondary"
      : "";

  return (
    <li className="w-full transition">
      <Link
        onClick={() => {
          onClick?.();
          window.scrollTo({ top: 0 });
        }}
        to={to}
      >
        <div
          className={`flex gap-3 items-center px-3 py-2 rounded-xl max-w-70 transition hover:bg-[#4c5b69] ${className}`}
        >
          <span className="w-9">{children}</span>
          <div className={`flex-1 min-w-0 `}>
            <span className="block truncate" title={name}>
              {name}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
};

export default SidebarItem;
