import { useEffect, useRef } from "react";

import HoverScrollContainer from "components/HoverScrollContainer";

import useCloseWidget from "hooks/useCloseWidget";

import CloseIcon from "assets/icons/cross.svg?react";

const Dialog = (props) => {
  const {
    isOpened,
    setIsOpened,
    children,
    preventClickOutside = false,
    title,
  } = props;
  const prompt = useRef(null);

  useCloseWidget(prompt, setIsOpened, preventClickOutside);

  useEffect(() => {
    if (isOpened) {
      document.body.style.height = "100svh";
      document.body.style.overflow = "hidden";
    } else {
      document.body.style = null;
    }
  }, [isOpened]);

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        setIsOpened(false);
      }
    };

    if (isOpened) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpened, setIsOpened]);

  if (!isOpened) return null;

  return (
    <dialog
      aria-busy={true}
      className=" text-inherit w-full fixed top-0 bg-[#00000063] h-svh flex items-center justify-center z-1150"
    >
      <section
        ref={prompt}
        className="dialog py-2 bg-white max-h-svh w-[calc(100vw-8px)] rounded-xl shadow-lg md:h-auto md:w-auto"
      >
        <div className="flex gap-2">
          <button
            className="ms-3 cursor-pointer w-5"
            onClick={() => setIsOpened(!isOpened)}
          >
            <CloseIcon className="hover:text-white" />
          </button>
          {title && <div className="px-3 py-2 text-xl font-bold">{title}</div>}
        </div>
        <HoverScrollContainer>
          <div className="dialog max-h-[90svh] ps-2 py-2">{children}</div>
        </HoverScrollContainer>
      </section>
    </dialog>
  );
};

export default Dialog;
