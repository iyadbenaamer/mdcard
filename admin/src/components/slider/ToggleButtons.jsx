import { useEffect, useState } from "react";
import NextIcon from "assets/icons/arrow-right.svg?react";
import PrevIcon from "assets/icons/arrow-left.svg?react";

const ToggleButtons = (props) => {
  const { currentSlide, setCurrentSlide, slidesCount } = props;
  const [isTouchSession, setIsTouchSession] = useState(() => {
    if (typeof window === "undefined") return false;
    // Pure touch if (hover:none & pointer:coarse) and no device with hover exists
    const pureTouch =
      window.matchMedia?.("(hover: none) and (pointer: coarse)").matches &&
      !window.matchMedia?.("(any-hover: hover)").matches; // exclude hybrids
    return pureTouch;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePointerDown = (e) => {
      if (e.pointerType === "touch") setIsTouchSession(true);
    };
    const handleTouchStart = () => setIsTouchSession(true);
    window.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  const btnBase =
    "transition w-9 h-9 circle bg-200 flex items-center justify-center";
  const visibility = isTouchSession
    ? "opacity-100"
    : "opacity-0 group-hover:opacity-100 focus:opacity-100"; // show on hover or keyboard focus on non-touch

  return (
    <>
      {slidesCount > 1 && (
        <>
          {currentSlide > 0 && (
            <div className="absolute left-0 top-0 h-full w-12 flex items-center justify-center group z-10">
              <button
                aria-label="previous"
                onClick={() => setCurrentSlide(currentSlide - 1)}
                className={`${btnBase} ${visibility}`}
                type="button"
              >
                <PrevIcon fill="currentColor" />
              </button>
            </div>
          )}
          {currentSlide !== slidesCount - 1 && (
            <div className="absolute right-0 top-0 h-full w-12 flex items-center justify-center group z-10">
              <button
                aria-label="next"
                onClick={() => setCurrentSlide(currentSlide + 1)}
                className={`${btnBase} ${visibility}`}
                type="button"
              >
                <NextIcon fill="currentColor" />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default ToggleButtons;
