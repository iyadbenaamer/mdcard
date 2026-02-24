import { createContext, useContext, useMemo, useState } from "react";

const BreadcrumbContext = createContext(null);

export const BreadcrumbProvider = ({ children }) => {
  const [levels, setLevels] = useState([]);

  const value = useMemo(() => ({ levels, setLevels }), [levels]);

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error("useBreadcrumb must be used within BreadcrumbProvider");
  }
  return context;
};
