import { useCallback, useEffect, useMemo, useState } from "react";

import axiosClient from "utils/AxiosClient";
import CustomInput from "components/CustomInput";
import PrimaryBtn from "components/PrimaryBtn";
import SubmitBtn from "components/SubmitBtn";
import RedBtn from "components/RedBtn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "components/Table";
import { useDialog } from "components/dialog/DialogContext";
import { formatAmount, formatArabicDateTime, safeValue } from "../utils";

// Map backend error codes to user-friendly Arabic messages
const translateCustomPricingError = (code, fallback) => {
  const map = {
    CUSTOM_PRICING_USER_ID_INVALID: "تعذر تحديد المستخدم.",
    CUSTOM_PRICING_TIER_ID_INVALID: "تعذر تحديد الفئة.",
    CUSTOM_PRICING_BUY_PRICE_INVALID: "سعر الشراء غير صالح.",
    USER_NOT_FOUND: "المستخدم غير موجود.",
    CARD_TIER_NOT_FOUND: "الفئة غير موجودة.",
    CUSTOM_PRICING_EXISTS: "يوجد تسعير مخصص لهذه الفئة بالفعل.",
    CUSTOM_PRICING_ID_INVALID: "تعذر تحديد التسعير المطلوب.",
    CUSTOM_PRICING_NOT_FOUND: "التسعير المخصص غير موجود.",
  };
  return map[code] || fallback || code || "حدث خطأ. حاول مرة أخرى.";
};

const CreatePricingDialog = ({ userId, onCreate, onCancel }) => {
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [tierId, setTierId] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingTiers, setIsLoadingTiers] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      setDialogError("");
      try {
        const response = await axiosClient.get("/card-categories");
        if (!isMounted) return;
        setCategories(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (!isMounted) return;
        setDialogError("تعذر تحميل التصنيفات. حاول مرة أخرى.");
        setCategories([]);
      } finally {
        if (isMounted) setIsLoadingCategories(false);
      }
    };
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchTypes = async () => {
      if (!categoryId) {
        setTypes([]);
        setTypeId("");
        setTiers([]);
        setTierId("");
        return;
      }
      setIsLoadingTypes(true);
      setDialogError("");
      try {
        const response = await axiosClient.get("/card-types/by-category", {
          params: { categoryId },
        });
        if (!isMounted) return;
        const payload = response.data ?? {};
        setTypes(Array.isArray(payload.cardTypes) ? payload.cardTypes : []);
        setTypeId("");
        setTiers([]);
        setTierId("");
      } catch (err) {
        if (!isMounted) return;
        setDialogError("تعذر تحميل أنواع البطاقات. حاول مرة أخرى.");
        setTypes([]);
        setTypeId("");
        setTiers([]);
        setTierId("");
      } finally {
        if (isMounted) setIsLoadingTypes(false);
      }
    };
    fetchTypes();
    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  useEffect(() => {
    let isMounted = true;
    const fetchTiers = async () => {
      if (!typeId) {
        setTiers([]);
        setTierId("");
        return;
      }
      setIsLoadingTiers(true);
      setDialogError("");
      try {
        const response = await axiosClient.get("/card-tiers", {
          params: { typeId },
        });
        if (!isMounted) return;
        const payload = response.data ?? {};
        setTiers(Array.isArray(payload.tiers) ? payload.tiers : []);
        setTierId("");
      } catch (err) {
        if (!isMounted) return;
        setDialogError("تعذر تحميل فئات البطاقات. حاول مرة أخرى.");
        setTiers([]);
        setTierId("");
      } finally {
        if (isMounted) setIsLoadingTiers(false);
      }
    };
    fetchTiers();
    return () => {
      isMounted = false;
    };
  }, [typeId]);

  return (
    <div className="min-w-70 p-2">
      <h2 className="text-base font-semibold text-slate-800">
        إنشاء تسعير مخصص
      </h2>
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs text-slate-500">التصنيف</label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={isLoadingCategories || isSubmitting}
          >
            <option value="">
              {isLoadingCategories ? "جاري التحميل..." : "اختر التصنيف"}
            </option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">نوع البطاقة</label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
            disabled={!categoryId || isLoadingTypes || isSubmitting}
          >
            <option value="">
              {isLoadingTypes ? "جاري التحميل..." : "اختر النوع"}
            </option>
            {types.map((type) => (
              <option key={type._id} value={type._id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">الفئة</label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            value={tierId}
            onChange={(event) => setTierId(event.target.value)}
            disabled={!typeId || isLoadingTiers || isSubmitting}
          >
            <option value="">
              {isLoadingTiers ? "جاري التحميل..." : "اختر الفئة"}
            </option>
            {tiers.map((tier) => (
              <option key={tier._id} value={tier._id}>
                {tier.title || "—"}
              </option>
            ))}
          </select>
        </div>
        <CustomInput
          label="سعر الشراء"
          type="number"
          value={buyPrice}
          onChange={(event) => setBuyPrice(event.target.value)}
        />
      </div>
      {dialogError && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {dialogError}
        </div>
      )}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          إلغاء
        </button>
        <SubmitBtn
          onClick={async () => {
            if (!userId) {
              setDialogError("تعذر تحديد المستخدم.");
              return;
            }
            if (!categoryId || !typeId || !tierId) {
              setDialogError("التصنيف والنوع والفئة مطلوبة.");
              return;
            }
            if (buyPrice === "") {
              setDialogError("سعر الشراء مطلوب.");
              return;
            }
            setIsSubmitting(true);
            setDialogError("");
            const result = await onCreate({ tierId, buyPrice });
            if (result?.ok) {
              onCancel();
            } else if (result?.error) {
              setDialogError(result.error);
            }
            setIsSubmitting(false);
          }}
          disabled={isSubmitting}
        >
          إنشاء
        </SubmitBtn>
      </div>
    </div>
  );
};

const pricingColumns = [
  { key: "category", label: "التصنيف" },
  { key: "type", label: "النوع" },
  { key: "tier", label: "الفئة" },
  { key: "buyPrice", label: "سعر الشراء" },
  { key: "createdAt", label: "التاريخ" },
  { key: "actions", label: "إجراءات", className: "text-left" },
];

const CustomPricingSection = ({ userId }) => {
  const { openDialog, closeDialog } = useDialog();
  const [pricingRules, setPricingRules] = useState([]);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState("");
  const [pricingSuccess, setPricingSuccess] = useState("");
  const [pricingDeleteId, setPricingDeleteId] = useState(null);

  const fetchPricingRules = useCallback(async () => {
    if (!userId) return;
    setIsPricingLoading(true);
    setPricingError("");
    try {
      const response = await axiosClient.get("/admin/custom-pricing", {
        params: { userId },
      });
      const list = Array.isArray(response.data) ? response.data : [];
      setPricingRules(list);
    } catch (err) {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;
      setPricingError(
        translateCustomPricingError(
          code,
          message || "تعذر تحميل التسعير المخصص. حاول مرة أخرى.",
        ),
      );
      setPricingRules([]);
    } finally {
      setIsPricingLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPricingRules();
  }, [fetchPricingRules]);

  const handleCreatePricing = async ({ tierId, buyPrice }) => {
    if (!userId) {
      return { ok: false, error: "تعذر تحديد المستخدم." };
    }
    if (!tierId) {
      return { ok: false, error: "تعذر تحديد الفئة." };
    }
    if (buyPrice === "") {
      return { ok: false, error: "سعر الشراء مطلوب." };
    }
    setPricingError("");
    setPricingSuccess("");
    try {
      await axiosClient.post("/admin/custom-pricing", {
        userId,
        tierId,
        buyPrice: Number(buyPrice),
      });
      await fetchPricingRules();
      setPricingSuccess("تم إضافة تسعير مخصص بنجاح.");
      return { ok: true };
    } catch (err) {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;
      return {
        ok: false,
        error: translateCustomPricingError(
          code,
          message || "تعذر إنشاء التسعير المخصص. حاول مرة أخرى.",
        ),
      };
    }
  };

  const handleDeletePricing = async (pricingId) => {
    if (!pricingId || !userId) {
      return { ok: false, error: "تعذر تحديد التسعير المطلوب." };
    }
    setPricingDeleteId(pricingId);
    setPricingError("");
    setPricingSuccess("");
    try {
      await axiosClient.delete("/admin/custom-pricing", {
        params: { id: pricingId },
      });
      await fetchPricingRules();
      setPricingSuccess("تم حذف التسعير المخصص بنجاح.");
      return { ok: true };
    } catch (err) {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;
      const translated = translateCustomPricingError(
        code,
        message || "تعذر حذف التسعير المخصص. حاول مرة أخرى.",
      );
      setPricingError(translated);
      return { ok: false, error: translated };
    } finally {
      setPricingDeleteId(null);
    }
  };

  const handleDeletePricingRequest = (rule) => {
    openDialog(
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          تأكيد حذف التسعير
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          هل أنت متأكد أنك تريد حذف هذا التسعير؟ لا يمكن التراجع عن ذلك.
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
              await handleDeletePricing(rule._id);
            }}
            disabled={pricingDeleteId === rule?._id}
          >
            حذف
          </RedBtn>
        </div>
      </div>,
    );
  };

  const sortedPricingRules = useMemo(() => {
    return [...pricingRules].sort((a, b) => {
      const dateA = new Date(a?.createdAt ?? 0).getTime();
      const dateB = new Date(b?.createdAt ?? 0).getTime();
      return dateB - dateA;
    });
  }, [pricingRules]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">
            التسعير المخصص
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            أسعار خاصة لهذا المستخدم حسب الفئة
          </p>
        </div>
        <PrimaryBtn
          onClick={() =>
            openDialog(
              <CreatePricingDialog
                userId={userId}
                onCreate={handleCreatePricing}
                onCancel={closeDialog}
              />,
            )
          }
        >
          إضافة تسعير
        </PrimaryBtn>
      </div>

      {pricingSuccess && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          {pricingSuccess}
        </div>
      )}

      {isPricingLoading ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
          جاري تحميل التسعير المخصص...
        </div>
      ) : pricingError ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-600">
          {pricingError}
        </div>
      ) : sortedPricingRules.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
          لا توجد تسعيرات مخصصة لهذا المستخدم حتى الآن.
        </div>
      ) : (
        <div className="mt-4">
          <Table columns={pricingColumns}>
            <TableHead columns={pricingColumns} />
            <TableBody>
              {sortedPricingRules.map((rule) => (
                <TableRow key={rule._id}>
                  <TableCell>{safeValue(rule.categoryName)}</TableCell>
                  <TableCell>{safeValue(rule.typeName)}</TableCell>
                  <TableCell>{safeValue(rule.tierTitle)}</TableCell>
                  <TableCell>{formatAmount(rule.buyPrice)}</TableCell>
                  <TableCell>
                    {rule.createdAt
                      ? formatArabicDateTime(rule.createdAt)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-left">
                    <RedBtn
                      onClick={() => handleDeletePricingRequest(rule)}
                      disabled={pricingDeleteId === rule._id}
                    >
                      حذف
                    </RedBtn>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default CustomPricingSection;
