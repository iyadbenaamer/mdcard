import Form from "./Form";

import LandingPic from "assets/login.png";

const Login = () => {
  return (
    <div className="h-svh flex">
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">MD Card</h1>
            <h2 className="text-2xl font-semibold">لوحة التحكم</h2>
          </div>
          <div className="rounded-2xl shadow-xl py-8 px-4">
            <Form />
          </div>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 items-center justify-center ">
        <img src={LandingPic} alt="Landing" loading="lazy" />
      </div>
    </div>
  );
};

export default Login;
