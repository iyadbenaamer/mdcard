import { useDispatch } from "react-redux";

import SidebarItem from "./SidebarItem";

import { logout } from "state";
import axiosClient from "utils/AxiosClient";

import Logo from "assets/icons/logo-full.svg?react";
import HomeIcon from "assets/icons/home.svg?react";
import CategoriesIcon from "assets/icons/categories.svg?react";
import UsersIcon from "assets/icons/users.svg?react";
import CardIcon from "assets/icons/card.svg?react";
import OrdersIcon from "assets/icons/orders.svg?react";
import TransactionsIcon from "assets/icons/transactions.svg?react";
import SettingsIcon from "assets/icons/settings.svg?react";
import LogoutIcon from "assets/icons/logout.svg?react";

const Sidebar = ({ showLogo = true, onItemClick }) => {
  const dispatch = useDispatch();

  return (
    <aside className="w-full flex flex-col justify-between">
      <div>
        {showLogo && <Logo className="w-40 mx-auto my-5" />}
        <ul className="flex flex-col gap-3 px-4 w-full py-5">
          <SidebarItem to="/" name="الرئيسية" onClick={onItemClick}>
            <HomeIcon />
          </SidebarItem>
          <SidebarItem
            to="/users"
            name="إدارة المستخدمين"
            onClick={onItemClick}
          >
            <UsersIcon />
          </SidebarItem>
          <SidebarItem
            to="/manage-cards"
            name="إدارة البطاقات"
            onClick={onItemClick}
          >
            <CategoriesIcon />
          </SidebarItem>
          <SidebarItem to="/cards" name="جميع البطاقات" onClick={onItemClick}>
            <CardIcon />
          </SidebarItem>
          <SidebarItem to="/orders" name="كافة الطلبات" onClick={onItemClick}>
            <OrdersIcon />
          </SidebarItem>
          <SidebarItem
            to="/transactions"
            name="كافة المعاملات"
            onClick={onItemClick}
          >
            <TransactionsIcon fill="transparent" />
          </SidebarItem>
          <SidebarItem to="/settings" name="الإعدادات" onClick={onItemClick}>
            <SettingsIcon />
          </SidebarItem>
        </ul>
      </div>
      <div className="p-4">
        <div
          className="flex gap-3 text-[#cb3f46] p-2 items-center cursor-pointer rounded-xl hover:bg-[#4c5b69] transition"
          onClick={async () => {
            try {
              await axiosClient.post("/admin/logout");
            } finally {
              dispatch(logout());
              onItemClick?.();
            }
          }}
        >
          <LogoutIcon className="w-9 inline mr-2 -ml-1" />
          <div>تسجيل الخروج</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
