import { useEffect } from "react";

const useCloseWidget = (ref, setIsOpened, preventClickOutside = false) => {
  useEffect(() => {
    if (preventClickOutside) return;

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpened(false);
      }
    };
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, setIsOpened, preventClickOutside]);
};

export default useCloseWidget;
