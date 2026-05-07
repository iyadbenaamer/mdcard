import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import CustomInput from "components/CustomInput";
import PrimaryBtn from "components/PrimaryBtn";
import SubmitBtn from "components/SubmitBtn";
import RedBtn from "components/RedBtn";
import ToggleSwitch from "components/ToggleSwitch";
import ImageUpload from "components/ImageUpload";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "components/Table";
import axiosClient from "utils/AxiosClient";
import { useDialog } from "components/dialog/DialogContext";
import { useBreadcrumb } from "components/breadcrumb/BreadcrumbContext";

const CardType = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeId = searchParams.get("cardTypeId");
  const [cardTypeName, setCardTypeName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [draftCategoryId, setDraftCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [cardTypeImage, setCardTypeImage] = useState("");
  const [cardTypePrintImage, setCardTypePrintImage] = useState("");
  const [cardTypeShowExpiryDateDay, setCardTypeShowExpiryDateDay] =
    useState(true);
  const [cardTypeIsActive, setCardTypeIsActive] = useState(true);
  const [cardTypeFulfillmentSource, setCardTypeFulfillmentSource] =
    useState("local");
  const [cardTypeNotes, setCardTypeNotes] = useState("");
  const [draftImageFile, setDraftImageFile] = useState(null);
  const [draftPrintImageFile, setDraftPrintImageFile] = useState(null);
  const [redeemFormat, setRedeemFormat] = useState("");
  const [tiers, setTiers] = useState([]);
  const [draftTiers, setDraftTiers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteTypeId, setDeleteTypeId] = useState(null);
  const { openDialog, closeDialog } = useDialog();
  const { setLevels } = useBreadcrumb();

  const fetchCardType = useCallback(async () => {
    if (!typeId) return;
    try {
      const response = await axiosClient.get("/card-types/get_one", {
        params: { id: typeId },
      });
      const data = response.data ?? {};
      setCardTypeName(data.name ?? "");
      setCategoryId(data.categoryId ?? "");
      setDraftCategoryId(data.categoryId ?? "");
      setCardTypeImage(data.image ?? "");
      setCardTypePrintImage(data.printImage ?? "");
      setCardTypeShowExpiryDateDay(data.showExpiryDateDay ?? true);
      setRedeemFormat(data.redeemFormat ?? "");
      setCardTypeIsActive(data.isActive ?? true);
      setCardTypeFulfillmentSource(data.fulfillmentSource ?? "local");
      setCardTypeNotes(data.notes ?? "");

      // Update breadcrumb if we have the name
      setLevels((prev) => {
        // Keep existing levels but update the last one
        const newLevels = [...prev];
        if (newLevels.length > 2) {
          newLevels[2].label = data.name ?? "نوع بطاقة";
        }
        return newLevels;
      });
    } catch (err) {
      console.error(err);
      setError("تعذر تحميل تفاصيل نوع البطاقة.");
    }
  }, [typeId, setLevels]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axiosClient.get("/card-categories");
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setCategories([]);
    }
  }, []);

  const fetchTiers = useCallback(
    async (options = {}) => {
      const { skipDraft = false } = options;
      if (!typeId) {
        setError("تعذر تحديد نوع البطاقة.");
        setTiers([]);
        setDraftTiers([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError("");
      try {
        const response = await axiosClient.get("/card-tiers", {
          params: { typeId },
        });
        const payload = response.data ?? {};
        // /card-tiers returns { name, categoryName, tiers: [] }
        // We can still use it for categoryName and breadcrumb init
        if (payload.categoryName) {
          setCategoryName(payload.categoryName);
          setLevels([
            { key: "categories", label: "التصنيفات" },
            { key: "category", label: payload.categoryName ?? "تصنيف" },
            { key: "cardType", label: payload.name ?? "نوع بطاقة" },
          ]);
        }

        const nextTiers = Array.isArray(payload.tiers) ? payload.tiers : [];
        setTiers(nextTiers);

        if (!isEditing && !skipDraft) {
          setDraftTiers(nextTiers);
        }
      } catch (err) {
        setError("تعذر تحميل فئات البطاقة. حاول مرة أخرى.");
        setTiers([]);
        setDraftTiers([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isEditing, typeId, setLevels],
  );

  useEffect(() => {
    fetchCardType();
    fetchCategories();
    fetchTiers();
  }, [fetchCardType, fetchCategories, fetchTiers]);

  useEffect(() => {
    if (!categoryId) {
      setCategoryName("");
      return;
    }
    setCategoryName(
      categories.find((item) => item._id === categoryId)?.name ?? "",
    );
  }, [categoryId, categories]);

  useEffect(() => {
    if (!isEditing) {
      setDraftTiers(tiers);
    }
  }, [tiers, isEditing]);

  const totalTiers = tiers.length;
  const activeList = isEditing ? draftTiers : tiers;
  const tableColumns = [
    { key: "order", label: "الترتيب", width: "80px" },
    { key: "title", label: "العنوان" },
    { key: "buy", label: "الشراء", width: "100px" },
    { key: "buyUsd", label: "الشراء (USD)", width: "110px" },
    { key: "sell", label: "البيع", width: "100px" },
    {
      key: "actions",
      label: isEditing ? "سحب" : "",
      width: "140px",
      className: "text-left",
    },
  ];

  const handleEditStart = () => {
    setDraftTiers(tiers);
    setDraftCategoryId(categoryId);
    setDraftImageFile(null);
    setDraftPrintImageFile(null);
    setIsEditing(true);
    setError("");
    setSuccessMessage("");
  };

  const handleCancel = () => {
    setDraftTiers(tiers);
    setDraftCategoryId(categoryId);
    setDraftImageFile(null);
    setDraftPrintImageFile(null);
    setIsEditing(false);
    setError("");
    setSuccessMessage("");
  };

  const reorderList = (list, fromIndex, toIndex) => {
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    setDraftTiers((prev) => reorderList(prev, dragIndex, index));
    setDragIndex(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      // Update card type fields (name, image, isActive)
      const formData = new FormData();
      formData.append("name", cardTypeName.trim());
      formData.append("categoryId", draftCategoryId || categoryId);
      formData.append("isActive", String(cardTypeIsActive));
      formData.append("redeemFormat", (redeemFormat || "").trim());
      formData.append("fulfillmentSource", cardTypeFulfillmentSource);
      formData.append("showExpiryDateDay", String(cardTypeShowExpiryDateDay));
      formData.append("notes", (cardTypeNotes || "").trim());
      if (draftImageFile) {
        formData.append("media", draftImageFile);
      }
      if (draftPrintImageFile) {
        formData.append("printImage", draftPrintImageFile);
      }
      await axiosClient.patch(`/card-types?id=${typeId}`, formData);

      // Update tier order if there are tiers
      if (draftTiers.length > 0) {
        const payload = {
          tiers: draftTiers.map((tier, index) => ({
            id: tier._id,
            order: index + 1,
          })),
        };
        const response = await axiosClient.patch("/card-tiers/order", payload);
        const updatedTiers = Array.isArray(response.data)
          ? response.data
          : draftTiers;
        setTiers(updatedTiers);
      }

      setDraftImageFile(null);
      setDraftPrintImageFile(null);
      setIsEditing(false);
      setSuccessMessage("تم حفظ التغييرات بنجاح.");
      await Promise.all([fetchTiers({ skipDraft: true }), fetchCardType()]);
    } catch (err) {
      setError("تعذر حفظ التغييرات. حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTier = useCallback(
    async ({
      title,
      buyPrice,
      buyPriceUsd,
      sellPrice,
      bambooProductId,
      value,
      isActive,
    }) => {
      if (!typeId) {
        return { ok: false, error: "تعذر تحديد نوع البطاقة." };
      }
      if ((buyPrice === "" && buyPriceUsd === "") || sellPrice === "") {
        return {
          ok: false,
          error: "سعر الشراء (أو بالدولار) وسعر البيع مطلوبان.",
        };
      }
      const nextBambooProductId = bambooProductId?.trim() ?? "";
      const nextBambooValue =
        value === "" || value === null || value === undefined
          ? ""
          : Number(value);
      if (cardTypeFulfillmentSource === "bamboo") {
        if (!nextBambooProductId) {
          return { ok: false, error: "معرف منتج Bamboo مطلوب." };
        }
        if (
          nextBambooValue === "" ||
          Number.isNaN(nextBambooValue) ||
          nextBambooValue <= 0
        ) {
          return { ok: false, error: "قيمة Bamboo مطلوبة." };
        }
      }
      try {
        await axiosClient.post("/card-tiers", {
          typeId,
          title: title?.trim() ?? "",
          buyPrice:
            buyPrice === "" || buyPrice === null ? null : Number(buyPrice),
          buyPriceUsd:
            buyPriceUsd === "" || buyPriceUsd === null
              ? null
              : Number(buyPriceUsd),
          sellPrice: Number(sellPrice),
          bambooProductId:
            cardTypeFulfillmentSource === "bamboo" ? nextBambooProductId : "",
          value:
            cardTypeFulfillmentSource === "bamboo" ? nextBambooValue : null,
          isActive,
          order: tiers.length + 1,
        });
        await fetchTiers({ skipDraft: true });
        setSuccessMessage("تم إنشاء فئة البطاقة بنجاح.");
        return { ok: true };
      } catch (err) {
        return { ok: false, error: "تعذر إنشاء فئة البطاقة. حاول مرة أخرى." };
      }
    },
    [cardTypeFulfillmentSource, fetchTiers, tiers.length, typeId],
  );

  const CreateTierDialog = ({ onCreate, onCancel }) => {
    const [title, setTitle] = useState("");
    const [buyPrice, setBuyPrice] = useState("");
    const [buyPriceUsd, setBuyPriceUsd] = useState("");
    const [sellPrice, setSellPrice] = useState("");
    const [bambooProductId, setBambooProductId] = useState("");
    const [bambooValue, setBambooValue] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [dialogError, setDialogError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          إنشاء فئة بطاقة جديدة
        </h2>
        <div className="mt-4 space-y-3">
          <CustomInput
            autoFocus
            label="العنوان"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <CustomInput
            label="سعر الشراء"
            type="number"
            value={buyPrice}
            onChange={(event) => setBuyPrice(event.target.value)}
          />
          <CustomInput
            label="سعر الشراء بالدولار (USD)"
            type="number"
            value={buyPriceUsd}
            onChange={(event) => setBuyPriceUsd(event.target.value)}
            placeholder="اتركه فارغًا إذا لم يكن مطلوبًا"
          />
          <CustomInput
            label="سعر البيع"
            type="number"
            value={sellPrice}
            onChange={(event) => setSellPrice(event.target.value)}
          />
          {cardTypeFulfillmentSource === "bamboo" && (
            <>
              <CustomInput
                label="Bamboo Product ID"
                value={bambooProductId}
                onChange={(event) => setBambooProductId(event.target.value)}
                placeholder="معرف المنتج في Bamboo"
              />
              <CustomInput
                label="Bamboo Value"
                type="number"
                value={bambooValue}
                onChange={(event) => setBambooValue(event.target.value)}
                placeholder="قيمة الطلب في Bamboo"
              />
            </>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            مفعًل
          </label>
        </div>
        {dialogError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {dialogError}
          </div>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border cursor-pointer border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            إلغاء
          </button>
          <SubmitBtn
            onClick={async () => {
              setIsSubmitting(true);
              setDialogError("");
              const result = await onCreate({
                title,
                buyPrice,
                buyPriceUsd,
                sellPrice,
                bambooProductId,
                value: bambooValue,
                isActive,
              });
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

  const handleOpenCreateDialog = () => {
    openDialog(
      <CreateTierDialog onCreate={handleCreateTier} onCancel={closeDialog} />,
    );
  };

  const handleDeleteType = useCallback(async () => {
    if (!typeId) {
      return { ok: false, error: "تعذر تحديد نوع البطاقة." };
    }
    setDeleteTypeId(typeId);
    setError("");
    setSuccessMessage("");
    try {
      await axiosClient.delete("/card-types", {
        params: { id: typeId },
      });
      setSearchParams((prev) => {
        prev.delete("cardTypeId");
        return prev;
      });
      return { ok: true };
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "CARD_TYPE_HAS_TIERS") {
        return {
          ok: false,
          error: "لا يمكن حذف نوع البطاقة طالما يحتوي على فئات بطاقات.",
        };
      }
      return { ok: false, error: "تعذر حذف نوع البطاقة. حاول مرة أخرى." };
    } finally {
      setDeleteTypeId(null);
    }
  }, [setSearchParams, typeId]);

  const DeleteTypeDialog = ({ typeName, onDelete, onCancel }) => {
    const [dialogError, setDialogError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          تأكيد حذف نوع البطاقة
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          سيتم حذف نوع البطاقة
          <span className="font-semibold text-slate-800"> {typeName}</span>. هل
          تريد المتابعة؟
        </p>
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
          <RedBtn
            onClick={async () => {
              setIsSubmitting(true);
              setDialogError("");
              const result = await onDelete();
              if (result?.ok) {
                onCancel();
              } else if (result?.error) {
                setDialogError(result.error);
              }
              setIsSubmitting(false);
            }}
            disabled={isSubmitting}
          >
            حذف
          </RedBtn>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 py-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            تفاصيل نوع البطاقة
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            إجمالي الفئات: {totalTiers}
          </p>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
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
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <RedBtn
              onClick={() => {
                openDialog(
                  <DeleteTypeDialog
                    typeName={cardTypeName}
                    onDelete={handleDeleteType}
                    onCancel={closeDialog}
                  />,
                );
              }}
              disabled={deleteTypeId === typeId}
            >
              حذف{" "}
            </RedBtn>
            <PrimaryBtn onClick={handleOpenCreateDialog}>
              إنشاء فئة بطاقة جديدة
            </PrimaryBtn>
            <PrimaryBtn onClick={handleEditStart}>تعديل</PrimaryBtn>
          </div>
        )}
      </div>
      {/* CardType fields display or edit */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-8">
          <div className="flex gap-8">
            {/* Image Column */}
            <div className="order-first md:order-last max-w-3xs">
              {isEditing ? (
                <ImageUpload
                  value={draftImageFile}
                  onChange={setDraftImageFile}
                  existingUrl={cardTypeImage}
                  label="صورة البطاقة"
                  className="aspect-square h-auto w-full"
                />
              ) : (
                <div className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                  {cardTypeImage ? (
                    <img
                      src={cardTypeImage}
                      alt={cardTypeName}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 opacity-50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      <span className="text-xs">لا توجد صورة</span>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3">
                {isEditing ? (
                  <ImageUpload
                    value={draftPrintImageFile}
                    onChange={setDraftPrintImageFile}
                    existingUrl={cardTypePrintImage}
                    label="صورة الطباعة"
                    className="aspect-square h-auto w-full"
                  />
                ) : cardTypePrintImage ? (
                  <div className="mt-3">
                    <img
                      src={cardTypePrintImage}
                      alt={cardTypeName + " print"}
                      loading="lazy"
                      className="h-24 w-full object-contain"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Info Column */}
            <div className="flex flex-col gap-6">
              {/* Category Field */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-500">
                  التصنيف
                </label>
                {isEditing ? (
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    value={draftCategoryId}
                    onChange={(event) => {
                      setDraftCategoryId(event.target.value);
                    }}
                  >
                    <option value="" disabled>
                      اختر التصنيف
                    </option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-lg font-medium text-slate-700">
                    {categoryName || <span className="text-slate-400">-</span>}
                  </div>
                )}
              </div>

              {/* Name Field */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-500">
                  اسم نوع البطاقة
                </label>
                {isEditing ? (
                  <CustomInput
                    value={cardTypeName}
                    onChange={(e) => setCardTypeName(e.target.value)}
                    placeholder="أدخل اسم نوع البطاقة"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                    {cardTypeName}
                  </h1>
                )}
              </div>

              {/* Redeem Format Field */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-500">
                  صيغة التعبئة (اختياري)
                </label>
                {isEditing ? (
                  <CustomInput
                    value={redeemFormat}
                    onChange={(e) => setRedeemFormat(e.target.value)}
                    dir="ltr"
                    placeholder="مثال: *121*{code}#"
                  />
                ) : (
                  <div className="text-sm text-slate-700">
                    {redeemFormat || <span className="text-slate-400">-</span>}
                  </div>
                )}
              </div>

              {/* Notes Field */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-500">
                  ملاحظات (اختياري)
                </label>
                {isEditing ? (
                  <textarea
                    value={cardTypeNotes}
                    onChange={(e) => setCardTypeNotes(e.target.value)}
                    placeholder="أضف ملاحظات عن نوع البطاقة..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    rows="3"
                  />
                ) : (
                  <div className="text-sm text-slate-700">
                    {cardTypeNotes || <span className="text-slate-400">-</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-500">
                  المصدر
                </label>
                {isEditing ? (
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    value={cardTypeFulfillmentSource}
                    onChange={(event) =>
                      setCardTypeFulfillmentSource(event.target.value)
                    }
                  >
                    <option value="local">محلي</option>
                    <option value="bamboo">Bamboo</option>
                  </select>
                ) : (
                  <div className="text-sm text-slate-700">
                    {cardTypeFulfillmentSource === "bamboo" ? "Bamboo" : "محلي"}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-500">
                  تاريخ انتهاء الصلاحية
                </label>
                {isEditing ? (
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={cardTypeShowExpiryDateDay}
                      onChange={(event) =>
                        setCardTypeShowExpiryDateDay(event.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    <span>إظهار اليوم في تاريخ انتهاء الصلاحية</span>
                  </label>
                ) : (
                  <div className="text-sm text-slate-700">
                    {cardTypeShowExpiryDateDay ? "يظهر اليوم" : "شهر/سنة فقط"}
                  </div>
                )}
              </div>

              {/* Status Field */}
              <div className="pt-2">
                {isEditing ? (
                  <div className="flex items-center gap-3">
                    <ToggleSwitch
                      label="الحالة"
                      checked={cardTypeIsActive}
                      onChange={setCardTypeIsActive}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">الحالة:</span>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                        cardTypeIsActive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                          : "bg-slate-50 text-slate-600 ring-slate-500/10"
                      }`}
                    >
                      <span
                        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                          cardTypeIsActive ? "bg-emerald-600" : "bg-slate-400"
                        }`}
                      ></span>
                      {cardTypeIsActive ? "مفعّل" : "غير مفعّل"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {successMessage && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}
      <h1 className="mt-4 text-2xl font-semibold text-slate-800">الفئات</h1>
      <div className="mt-4 mb-0 mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            جاري تحميل فئات البطاقة...
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-center text-sm text-red-500">
            {error}
          </div>
        ) : activeList.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            لا توجد فئات متاحة
          </div>
        ) : (
          <Table columns={tableColumns}>
            <TableHead columns={tableColumns} />
            <TableBody>
              {activeList.map((tier, index) => (
                <TableRow
                  key={tier._id}
                  className={`${isEditing ? "bg-white" : "hover:bg-slate-50"} ${
                    isEditing ? "" : "cursor-pointer"
                  }`}
                  role={isEditing ? undefined : "button"}
                  tabIndex={isEditing ? undefined : 0}
                  onClick={() =>
                    !isEditing &&
                    setSearchParams((prev) => {
                      prev.set("cardTierId", tier._id);
                      return prev;
                    })
                  }
                  onKeyDown={(event) => {
                    if (isEditing) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSearchParams((prev) => {
                        prev.set("cardTierId", tier._id);
                        return prev;
                      });
                    }
                  }}
                  draggable={isEditing}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                >
                  <TableCell className="text-slate-600">{index + 1}</TableCell>
                  <TableCell className="truncate text-slate-600">
                    {tier.title || "-"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {tier.buyPrice}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {tier.buyPriceUsd || "-"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {tier.sellPrice}
                  </TableCell>
                  <TableCell className="text-left text-slate-400">
                    {isEditing && (
                      <span className="cursor-move select-none">⋮⋮</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default CardType;
