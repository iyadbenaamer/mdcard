import appLogo from "assets/logo-white.png";
function SiteFooter({ mdzoneLogo, footer }) {
  return (
    <footer className="relative overflow-hidden bg-slate-950/80">
      <div className="section-shell relative">
        <div className="flex flex-col items-center gap-4 justify-center px-2">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <img
              src={appLogo}
              alt="MD Card"
              className="h-10 w-auto rounded-md"
            />
            <img
              src={mdzoneLogo}
              alt="MD Zone"
              className="h-40 w-auto rounded-md"
            />
            <div></div>
          </div>
          <p className="max-w-3xl text-sm text-center text-slate-100">
            {footer.short}
          </p>
          <p className="mt-6 text-center text-xs text-slate-300">
            © {new Date().getFullYear()} MD Card - {footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
