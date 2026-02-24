import NotFoundPicture from "assets/not-found.svg?react";

const NotFound = () => {
  return (
    <div className="container flex flex-col items-center p-3 text-2xl text-center justify-center h-svh">
      <div className="w-full min-[425px]:w-100 sm:w-125 text-transparent">
        <NotFoundPicture />
      </div>
      <div className="py-14 font-semibold">
        هذه الصفحة غير موجودة، تأكد من كتابة الرابط بشكل صحيح أو ارجع إلى الصفحة
        الرئيسية
      </div>
    </div>
  );
};

export default NotFound;
