import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Lottie from "react-lottie";

import ShowPasswordIcon from "assets/icons/eye.svg?react";
import HidePasswordIcon from "assets/icons/hide.svg?react";
import tickAnimationData from "assets/icons/tick.json";
import crossAnimationData from "assets/icons/cross.json";

const PasswordInput = (props) => {
  const { setData, fieldValue, setIsValid, data, name, placeholder } = props;
  const regex =
    /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}/g;

  const [inputType, setInputType] = useState("password");
  const [focused, setFocused] = useState(false);
  const [changed, setChanged] = useState(false);
  const [check, setCheck] = useState({ state: "", message: "" });

  const input = useRef(null);

  const verifyValue = () => {
    // Get the actual input value, which might be different from fieldValue
    const currentValue = input.current ? input.current.value : fieldValue;

    if (name === "password") {
      if (!currentValue) {
        if (input.current) input.current.style.border = "solid 2px red";
        setData((prev) => ({ ...prev, password: currentValue }));
        setCheck({ state: "fail", message: "مطلوب" });
        return;
      }
      const isValid = regex.test(currentValue);
      if (isValid) {
        setData((prev) => ({
          ...prev,
          [name]: currentValue,
        }));
        if (input.current) input.current.style.border = "solid 2px green";
        setCheck({ state: "success" });
        return;
      }
      if (!isValid) {
        if (input.current) input.current.style.border = "solid 2px red";
        setData((prev) => ({ ...prev, [name]: currentValue }));
        setCheck({
          state: "fail",
          message: "Invalid password",
        });
      }
      return;
    }
    if (name === "confirmPassword") {
      if (!currentValue) {
        if (input.current) input.current.style.border = "solid 2px red";
        setCheck({ state: "fail", message: "مطلوب" });
        return;
      }
      if (currentValue === data.password) {
        if (input.current) input.current.style.border = "solid 2px green";
        setCheck({ state: "success" });
      } else {
        if (input.current) input.current.style.border = "solid 2px red";
        setCheck({ state: "fail", message: "Passwords don't match" });
      }
    }
  };

  useEffect(
    () => setIsValid(check.state === "success" ? true : false),
    [check],
  );

  useEffect(() => {
    // Only validate if we have a fieldValue and the input is not focused
    // This ensures validation runs when fieldValue is restored from session storage
    if (!focused && fieldValue && input.current) {
      verifyValue();
    }
  }, [fieldValue, focused]); // Add fieldValue and focused as dependencies

  return (
    <>
      <label htmlFor={name}>{placeholder}</label>
      <div className="flex gap-2 items-center">
        <div className="relative w-full">
          {/* Hidden dummy field to trick browser autofill */}
          <input
            type="text"
            style={{ display: "none" }}
            autoComplete="username"
          />
          <input
            tabIndex={1}
            ref={input}
            style={{
              border: "2px solid transparent",
              borderRadius: "8px",
              boxShadow: "0px 1px 3px 0px #00000026",
            }}
            className={`pe-7 p-1`}
            type={inputType}
            name={name}
            autoComplete="new-password"
            defaultValue={name === "password" ? data.password : ""}
            onFocus={(e) => {
              e.target.style.border = "solid 2px transparent";
              if (!changed) {
                setChanged(true);
              }
              setFocused(true);
            }}
            onChange={(e) => {
              const value = e.target.value;
              setData((prev) => ({ ...prev, [name]: value }));
              window.sessionStorage.setItem([e.target.name], value);
              if (!focused && changed) {
                verifyValue(e.target);
              }
            }}
            onBlur={(e) => {
              verifyValue(e.target);
              setFocused(false);
            }}
          />
          <button
            tabIndex={-1}
            className="absolute w-5 right-1.25 top-2"
            onClick={() =>
              setInputType(inputType === "password" ? "text" : "password")
            }
          >
            {inputType === "password" ? (
              <ShowPasswordIcon />
            ) : (
              "text" && <HidePasswordIcon />
            )}
          </button>
        </div>
        <div className="w-10">
          {!focused && (
            <>
              {check.state === "fail" ? (
                <Lottie
                  width={36}
                  height={36}
                  options={{
                    loop: false,
                    autoplay: true,
                    animationData: crossAnimationData,
                    rendererSettings: {
                      preserveAspectRatio: "xMidYMid slice",
                    },
                  }}
                />
              ) : check.state === "success" ? (
                <Lottie
                  width={24}
                  height={24}
                  options={{
                    loop: false,
                    autoplay: true,
                    animationData: tickAnimationData,
                    rendererSettings: {
                      preserveAspectRatio: "xMidYMid slice",
                    },
                  }}
                />
              ) : (
                ""
              )}
            </>
          )}
        </div>
      </div>

      <div className="text-[red] h-6 text-xs">
        {!focused ? check.message : ""}
      </div>
    </>
  );
};

export default PasswordInput;
