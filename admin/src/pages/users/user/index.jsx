import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Layout from "layout";
import axiosClient from "utils/AxiosClient";
import CustomInput from "components/CustomInput";
import PrimaryBtn from "components/PrimaryBtn";
import SubmitBtn from "components/SubmitBtn";
import RedBtn from "components/RedBtn";
import { useDialog } from "components/dialog/DialogContext";
import ArrowRightIcon from "assets/icons/arrow-right.svg?react";
import CustomPricingSection from "./components/CustomPricingSection";
import UserInfoGrid from "./components/UserInfoGrid";
import TransactionsSection from "./components/TransactionsSection";
import DepositDialog from "./components/DepositDialog";
import {
  formatAmount,
  formatArabicDateTime,
  formatTransactionType,
  resolveBoolean,
  safeValue,
} from "./utils";

const buildFormState = (user) => ({
  name: user?.name ?? "",
  phone: user?.phone ?? "",
  balance: user?.balance ?? 0,
  password: "",
  isActive: resolveBoolean(user?.isActive, false),
  canBuy: resolveBoolean(user?.canBuy, false),
  canSendCode: resolveBoolean(user?.canSendCode, false),
  isVerified: resolveBoolean(user?.verificationStatus?.isVerified, false),
});

const User = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { openDialog, closeDialog } = useDialog();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formState, setFormState] = useState(buildFormState(null));
  const [transactions, setTransactions] = useState([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      if (!id) return;
      setIsLoading(true);
      setError("");
      try {
        const response = await axiosClient.get("/user", {
          params: { id },
        });
        if (!isMounted) return;
        setUser(response.data.profile);
      } catch (err) {
        if (!isMounted) return;
        setError("تعذر تحميل بيانات المستخدم. حاول مرة أخرى.");
        setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!user || isEditing) return;
    setFormState(buildFormState(user));
  }, [user, isEditing]);

  const fetchTransactions = useCallback(async () => {
    if (!user?._id) return;
    setIsTransactionsLoading(true);
    setTransactionsError("");
    try {
      const response = await axiosClient.get("/admin/transactions", {
        params: { userId: user._id, page: 1, limit: 20 },
      });
      setTransactions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setTransactionsError("تعذر تحميل سجل المعاملات. حاول مرة أخرى.");
      setTransactions([]);
    } finally {
      setIsTransactionsLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const infoItems = useMemo(() => {
    if (!user) return [];
    return [
      { label: "الاسم", value: safeValue(user.name) },
      { label: "رقم الهاتف", value: safeValue(user.phone) },
      { label: "الرصيد", value: safeValue(user.balance) },
      {
        label: "حالة الحساب",
        value: user.isActive ? "مفعّل" : "معطّل",
        badge: true,
      },
      {
        label: "حالة التحقق من الحساب",
        value: user.verificationStatus?.isVerified
          ? "تم التحقق"
          : "لم يتم التحقق ",
        badge: true,
      },
      {
        label: "يمكنه الشراء",
        value: user.canBuy ? "نعم" : "لا",
        badge: true,
      },
      {
        label: "يمكنه إرسال رموز التحقق",
        value: user.canSendCode ? "نعم" : "لا",
        badge: true,
      },
      {
        label: "تاريخ الإنشاء",
        value: user.createdAt ? formatArabicDateTime(user.createdAt) : "—",
      },
      {
        label: "آخر تحديث",
        value: user.updatedAt ? formatArabicDateTime(user.updatedAt) : "—",
      },
    ];
  }, [user]);

  const transactionColumns = useMemo(
    () => [
      { key: "type", label: "النوع" },
      { key: "amount", label: "المبلغ" },
      { key: "balanceBefore", label: "الرصيد قبل" },
      { key: "balanceAfter", label: "الرصيد بعد" },
      { key: "createdAt", label: "التاريخ" },
    ],
    [],
  );

  const handleEditStart = () => {
    setFormState(buildFormState(user));
    setIsEditing(true);
    setError("");
    setSuccessMessage("");
  };

  const handleCancel = () => {
    setFormState(buildFormState(user));
    setIsEditing(false);
    setError("");
    setSuccessMessage("");
  };

  const handleSave = async () => {
    if (!user?._id) return;
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload = {
        name: formState.name,
        phone: formState.phone,
        balance: formState.balance,
        isActive: formState.isActive,
        canBuy: formState.canBuy,
        canSendCode: formState.canSendCode,
        verificationStatus: { isVerified: formState.isVerified },
        ...(formState.password ? { password: formState.password } : {}),
      };
      const response = await axiosClient.patch("/admin/user", payload, {
        params: { id: user._id },
      });
      setUser(response.data);
      setIsEditing(false);
      setSuccessMessage("تم تحديث بيانات المستخدم بنجاح.");
    } catch (err) {
      setError("تعذر تحديث بيانات المستخدم. حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  };

  const performDelete = async () => {
    if (!user?._id) return;
    setIsDeleting(true);
    setError("");
    setSuccessMessage("");
    try {
      await axiosClient.delete("/admin/user", {
        params: { id: user._id },
      });
      navigate("/users");
    } catch (err) {
      setError("تعذر حذف المستخدم. حاول مرة أخرى.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDepositRequest = () => {
    openDialog(
      <DepositDialog
        userId={user?._id}
        onBalanceUpdate={(newBalance) => {
          setUser((prev) => ({ ...prev, balance: newBalance }));
          setSuccessMessage("تمت عملية الإيداع بنجاح.");
          fetchTransactions();
        }}
        onClose={closeDialog}
      />,
    );
  };

  const handleDeleteRequest = () => {
    openDialog(
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          تأكيد حذف المستخدم
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          هل أنت متأكد أنك تريد حذف هذا المستخدم؟ لا يمكن التراجع عن ذلك.
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            onClick={closeDialog}
          >
            إلغاء
          </button>
          <RedBtn
            onClick={async () => {
              closeDialog();
              await performDelete();
            }}
            disabled={isDeleting}
          >
            حذف
          </RedBtn>
        </div>
      </div>,
    );
  };

  const badgeClass = (value) =>
    value ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700";

  return (
    <Layout>
      <div className="px-4 py-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              aria-label="العودة"
              className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              onClick={() => navigate(-1)}
            >
              <ArrowRightIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">
                تفاصيل المستخدم
              </h1>
              <p className="mt-1 text-sm text-slate-500">{user?.name || "—"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isEditing ? (
              <>
                <SubmitBtn onClick={handleSave} disabled={isSaving}>
                  حفظ
                </SubmitBtn>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  إلغاء
                </button>
              </>
            ) : (
              <>
                <PrimaryBtn onClick={handleDepositRequest}>إيداع</PrimaryBtn>
                <PrimaryBtn onClick={handleEditStart}>تعديل</PrimaryBtn>
                <RedBtn onClick={handleDeleteRequest} disabled={isDeleting}>
                  حذف
                </RedBtn>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
            جاري تحميل بيانات المستخدم...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-600">
            {error}
          </div>
        ) : !user ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
            لا يوجد بيانات لعرضها.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {successMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            {isEditing && (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">
                  تعديل بيانات المستخدم
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <CustomInput
                    label="الاسم"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                  <CustomInput
                    dir="ltr"
                    label="رقم الهاتف"
                    value={formState.phone}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                  />
                  <CustomInput
                    label="الرصيد"
                    type="number"
                    value={formState.balance}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        balance: event.target.value,
                      }))
                    }
                  />
                  <CustomInput
                    label="كلمة المرور الجديدة"
                    type="password"
                    value={formState.password}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                  />
                  <div>
                    <label className="text-xs text-slate-500">
                      حالة التحقق من الحساب
                    </label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      value={formState.isVerified ? "true" : "false"}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          isVerified: event.target.value === "true",
                        }))
                      }
                    >
                      <option value="true">تم التحقق</option>
                      <option value="false">لم يتم التحقق</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">
                      حالة الحساب
                    </label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      value={formState.isActive ? "true" : "false"}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          isActive: event.target.value === "true",
                        }))
                      }
                    >
                      <option value="true">مفعّل</option>
                      <option value="false">معطّل</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">
                      يمكنه الشراء
                    </label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      value={formState.canBuy ? "true" : "false"}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          canBuy: event.target.value === "true",
                        }))
                      }
                    >
                      <option value="true">نعم</option>
                      <option value="false">لا</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">
                      يمكنه إرسال رموز التحقق
                    </label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      value={formState.canSendCode ? "true" : "false"}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          canSendCode: event.target.value === "true",
                        }))
                      }
                    >
                      <option value="true">نعم</option>
                      <option value="false">لا</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <UserInfoGrid infoItems={infoItems} badgeClass={badgeClass} />

            <CustomPricingSection userId={user?._id} />

            <TransactionsSection
              transactionColumns={transactionColumns}
              transactions={transactions}
              isLoading={isTransactionsLoading}
              error={transactionsError}
              formatTransactionType={formatTransactionType}
              formatAmount={formatAmount}
              formatArabicDateTime={formatArabicDateTime}
              safeValue={safeValue}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};
export default User;
