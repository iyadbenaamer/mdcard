import { createContext, useContext, useEffect, useState } from "react";

import Dialog from ".";

export const DialogContext = createContext();

export const DialogProvider = ({ children }) => {
  const [dialogContent, setDialogContent] = useState(null);
  const [dialogParam, setDialogParam] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      new URLSearchParams(window.location.search).get("dialog") === "custom"
    );
  });

  const syncDialogParamFromUrl = () => {
    if (typeof window === "undefined") return;
    const isOpen =
      new URLSearchParams(window.location.search).get("dialog") === "custom";
    setDialogParam(isOpen);
  };

  const openDialog = (content) => {
    setDialogContent(() => content);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      sp.set("dialog", "custom");
      const newUrl = `${window.location.pathname}?${sp.toString()}`;
      window.history.pushState({}, "", newUrl);
      setDialogParam(true);
    }
  };
  const closeDialog = () => {
    document.body.style = null;
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      sp.delete("dialog");
      const query = sp.toString();
      const newUrl = query
        ? `${window.location.pathname}?${query}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
      setDialogParam(false);
    }
    setDialogContent(null);
  };

  useEffect(() => {
    if (!dialogParam) {
      closeDialog();
    }
  }, [dialogParam]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => syncDialogParamFromUrl();
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    if (!dialogContent && dialogParam) {
      closeDialog();
    }
  }, [dialogContent, dialogParam]);

  return (
    <DialogContext.Provider value={{ openDialog, closeDialog }}>
      {children}
      {dialogContent && (
        <Dialog isOpened setIsOpened={closeDialog}>
          {dialogContent}
        </Dialog>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => useContext(DialogContext);
