import { useRef, useState } from "react";
import { useDispatch } from "react-redux";

import SubmitBtn from "components/SubmitBtn";

import axiosClient from "utils/AxiosClient";
import { setAdmin } from "state";

import ShowPasswordIcon from "assets/icons/eye.svg?react";
import HidePasswordIcon from "assets/icons/hide.svg?react";

const Form = () => {
  const [data, setData] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const dispatch = useDispatch();
  const submitButton = useRef(null);
  const [passwordInputType, setPasswordInputType] = useState("password");
  const [inputError, setInputError] = useState({ username: "", password: "" });
  const handleEnterSubmit = (e) => {
    if (e.key === "Enter") {
      submitButton.current.click();
    }
  };

  const submit = async () => {
    await axiosClient
      .post(`/admin/login`, data)
      .then((response) => {
        const { admin } = response.data;
        dispatch(setAdmin(admin));
        if (admin?.username) {
          localStorage.setItem("adminName", admin.username);
        }
      })
      .catch((error) => {
        const { code } = error.response?.data;
        switch (code) {
          case "ADMIN_CREDENTIALS_REQUIRED":
            setMessage("يرجى إدخال اسم المستخدم وكلمة المرور");
            break;
          case "ADMIN_NOT_FOUND":
            setMessage("اسم المستخدم غير موجود");
            break;
          case "ADMIN_INCORRECT_PASSWORD":
            setMessage("كلمة المرور غير صحيحة");
            break;
          default:
            setMessage("حدث خطأ غير متوقع، يرجى المحاولة لاحقًا");
        }
      });
  };

  return (
    <section className="flex flex-col gap-4 w-fit center">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="col-span-1">
          <label htmlFor="username" className="text-sm font-semibold m-2 block">
            اسم المستخدم
          </label>
          <input
            style={{
              border: "2px solid transparent",
              borderRadius: "8px",
              boxShadow: "0px 1px 3px 0px #00000026",
            }}
            className="flex p-1"
            type="text"
            name="username"
            autoFocus
            value={data.username}
            onChange={(e) => {
              if (e.target.value) {
                e.target.style.border = "2px solid transparent";
                setInputError({ ...inputError, username: "" });
              } else {
                e.target.style.border = "2px solid red";
                setInputError({ ...inputError, username: "مطلوب" });
              }
              setData({ ...data, username: e.target.value });
            }}
            onKeyDown={handleEnterSubmit}
          />
          <div className="text-[red] text-xs h-3 p-1">
            {inputError.username}
          </div>
        </div>
        <div className="col-span-1">
          <label htmlFor="password" className="text-sm font-semibold m-2 block">
            كلمة المرور
          </label>
          <div className="relative w-full">
            <input
              style={{
                border: "2px solid transparent",
                borderRadius: "8px",
                boxShadow: "0px 1px 3px 0px #00000026",
              }}
              className={`pe-7 p-1`}
              autoComplete="false"
              type={passwordInputType}
              name="password"
              value={data.password}
              onChange={(e) => {
                if (e.target.value) {
                  e.target.style.border = "2px solid transparent";
                  setInputError({ ...inputError, password: "" });
                } else {
                  e.target.style.border = "2px solid red";
                  setInputError({ ...inputError, password: "مطلوب" });
                }
                setData({ ...data, password: e.target.value });
              }}
              onKeyDown={handleEnterSubmit}
            />
            <button
              className="absolute w-5 left-1.25 top-2"
              onClick={() =>
                setPasswordInputType(
                  passwordInputType === "password" ? "text" : "password",
                )
              }
            >
              {passwordInputType === "password" ? (
                <ShowPasswordIcon />
              ) : (
                "text" && <HidePasswordIcon />
              )}
            </button>
          </div>
          <div className="text-[red] text-xs h-3 p-1">
            {inputError.password}
          </div>
        </div>
      </div>
      {message && <div className="text-[red]">{message}</div>}
      <div className="self-center ">
        <SubmitBtn
          disabled={!data.username || !data.password}
          ref={submitButton}
          onClick={async () => {
            await submit();
          }}
        >
          تسجيل الدخول
        </SubmitBtn>
      </div>
    </section>
  );
};
export default Form;
