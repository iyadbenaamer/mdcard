import { useEffect, useState } from "react";

export const useWindowWidth = () => {
  let [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const resize = () => {
      setWindowWidth(window.innerWidth);
    };
    // Bind the event listener
    window.addEventListener("resize", resize);
    // Unbind the event listener on clean up
    return () => window.removeEventListener("resize", resize);
  }, []);

  return windowWidth;
};
