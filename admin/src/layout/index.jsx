import { useEffect, useState } from "react";

import Sidebar from "./sidebar";

import { useWindowWidth } from "hooks/useWindowWidth";

import Logo from "assets/icons/logo-full.svg?react";

const Layout = ({ children }) => {
  const windowWidth = useWindowWidth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (windowWidth >= 1024 && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [windowWidth, isMenuOpen]);

  return (
    <>
      {windowWidth < 1024 && (
        <div className="sticky top-0 z-40 bg-[#2c3e50] text-white">
          <div className="flex items-center justify-between px-4 py-3">
            <Logo className="w-28" />
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 transition"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              <span className="sr-only">Toggle menu</span>
              <span className="flex flex-col gap-1">
                <span className="block h-0.5 w-6 bg-white" />
                <span className="block h-0.5 w-6 bg-white" />
                <span className="block h-0.5 w-6 bg-white" />
              </span>
            </button>
          </div>
          <div
            className={`border-t border-white/10 overflow-hidden transition-all duration-200 ease-out ${
              isMenuOpen
                ? "max-h-150 opacity-100"
                : "max-h-0 opacity-0 pointer-events-none"
            }`}
          >
            <Sidebar
              showLogo={false}
              onItemClick={() => setIsMenuOpen(false)}
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-12 pb-28 h-svh">
        {windowWidth >= 1024 && (
          <div className="sidebar flex justify-center col-span-3 2xl:col-span-2 bg-[#2c3e50] text-white">
            <Sidebar />
          </div>
        )}
        <div
          className={`col-span-12 lg:col-span-9 2xl:col-span-10 h-svh overflow-y-scroll ${
            windowWidth < 1024 ? "pt-2" : ""
          }`}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default Layout;
