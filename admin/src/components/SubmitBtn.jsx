import { forwardRef, useState } from "react";

import LoadingIcon from "assets/icons/loading-circle.svg?react";

const SubmitBtn = forwardRef((props, ref) => {
  const { onClick, disabled, children, tabIndex, className = "" } = props;
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      ref={ref}
      tabIndex={tabIndex}
      className={`flex justify-center cursor-pointer disabled:cursor-auto py-1 px-4 border-solid bg-primary rounded-xl text-white disabled:opacity-70 ${className}`}
      disabled={disabled || isLoading}
      onClick={async () => {
        // this will trigger the loading effect
        setIsLoading(true);
        await onClick();
        // this will remove the loading effect after the request completes
        setIsLoading(false);
      }}
    >
      {isLoading ? <LoadingIcon height={24} stroke="white" /> : children}
    </button>
  );
});

export default SubmitBtn;
