import { useState } from "react";

import LoadingIcon from "assets/icons/loading-circle.svg?react";

const RedBtn = (props) => {
  const { onClick, disabled, children } = props;
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      disabled={disabled}
      className="w-20 flex justify-center py-1 px-4 border-solid bg-red-600 rounded-xl text-white disabled:opacity-70"
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
};

export default RedBtn;
