import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import Layout from "layout";
import PrimaryBtn from "components/PrimaryBtn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "components/Table";
import { useDialog } from "components/dialog/DialogContext";
import AddUserDialog from "./components/AddUserDialog";
import axiosClient from "utils/AxiosClient";
import formatArabicDate from "utils/formatArabicDate";
import SearchIcon from "assets/icons/search.svg?react";

const USERS_PER_PAGE = 8;

const Users = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [reloadFlag, setReloadFlag] = useState(0); // used to trigger refetch when user added

  const { openDialog, closeDialog } = useDialog();
  const location = useLocation();

  const fetchUsers = useCallback(async () => {
    // do not trigger when searching; searches handled separately
    if (searchQuery.trim()) return;

    setIsLoading(true);
    setError("");
    try {
      const response = await axiosClient.get("/user/all", {
        params: {
          page,
          limit: USERS_PER_PAGE,
          sortBy,
          sortOrder,
        },
      });
      setUsers(response.data?.users ?? []);
      setTotalUsers(response.data?.total ?? 0);
      setTotalPages(response.data?.totalPages ?? 1);
    } catch (err) {
      setError("تعذر تحميل المستخدمين. حاول مرة أخرى.");
      setUsers([]);
      setTotalUsers(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, sortBy, sortOrder, searchQuery]);

  // fetch initially and whenever relevant state changes or reloadFlag increments
  useEffect(() => {
    let isMounted = true;
    if (isMounted) fetchUsers();
    return () => {
      isMounted = false;
    };
  }, [fetchUsers, reloadFlag]);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await axiosClient.get("/search", {
        params: { query: trimmedQuery },
      });
      setUsers(response.data ?? []);
      setTotalUsers(response.data?.length ?? 0);
      setTotalPages(1);
      setPage(1);
    } catch (err) {
      setError("تعذر تنفيذ البحث. حاول مرة أخرى.");
      setUsers([]);
      setTotalUsers(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchClear = () => {
    if (!searchQuery) return;
    setSearchQuery("");
    setPage(1);
  };

  const handleUserAdded = () => {
    // after a new user is created refresh list and reset paging
    setPage(1);
    setReloadFlag((f) => f + 1);
  };

  const openCreateDialog = () => {
    openDialog(
      <AddUserDialog
        onAdded={handleUserAdded}
        onClose={() => {
          closeDialog();
          navigate("/users", { replace: true });
        }}
      />,
    );
  };

  // open dialog if query param present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("create") === "true") {
      openCreateDialog();
    }
  }, [location.search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const statusStyles = {
    true: "bg-green-100 text-green-700",
    false: "bg-red-100 text-red-700",
  };
  const statusLabels = {
    true: "مفعّل",
    false: "معطّل",
  };
  const tableColumns = [
    { key: "name", label: "الاسم", width: "220px" },
    { key: "phone", label: "رقم الهاتف", width: "180px" },
    { key: "created", label: "تاريخ الإنشاء", width: "170px" },
    { key: "status", label: "الحالة", width: "130px" },
  ];

  return (
    <Layout>
      <div className="px-4 py-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              إدارة المستخدمين
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              إجمالي المستخدمين: {totalUsers}
            </p>
          </div>
          <PrimaryBtn onClick={openCreateDialog}>إنشاء مستخدم جديد</PrimaryBtn>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-1 flex-wrap items-center gap-3"
            >
              <div className="relative flex-1 min-w-55">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="ابحث بالاسم أو اسم المستخدم أو رقم الهاتف"
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40 outline-1 ring-[#2c3e50]/40 ring-1"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                disabled={isLoading}
              >
                بحث
              </button>
            </form>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">الترتيب حسب</span>
              <select
                className="rounded-xl border border-slate-200 px-2 py-1 text-xs"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="name">الاسم</option>
                <option value="status">الحالة</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">الترتيب</span>
              <select
                className="rounded-xl border border-slate-200 px-2 py-1 text-xs"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              >
                <option value="asc">تصاعدي</option>
                <option value="desc">تنازلي</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              جاري تحميل المستخدمين...
            </div>
          ) : error ? (
            <div className="px-4 py-10 text-center text-sm text-red-500">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              لا يوجد مستخدمون للعرض
            </div>
          ) : (
            <Table
              columns={tableColumns}
              pagination={{
                page,
                totalPages,
                onPageChange: setPage,
              }}
            >
              <TableHead columns={tableColumns} />
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user._id}
                    className="cursor-pointer transition hover:bg-slate-50"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/users/${user._id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/users/${user._id}`);
                      }
                    }}
                  >
                    <TableCell>
                      <div className="font-medium text-slate-800">
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600" dir="ltr">
                      {user.phone}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {user.createdAt ? formatArabicDate(user.createdAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs ${
                          statusStyles[String(user.isActive)]
                        }`}
                      >
                        {statusLabels[String(user.isActive)]}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Users;
