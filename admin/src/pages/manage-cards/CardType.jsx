import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import CustomInput from "components/CustomInput";
import PrimaryBtn from "components/PrimaryBtn";
import SubmitBtn from "components/SubmitBtn";
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
  const [cardTypeImage, setCardTypeImage] = useState("");
  const [cardTypePrintImage, setCardTypePrintImage] = useState("");
  const [cardTypeIsActive, setCardTypeIsActive] = useState(true);
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
      // The aggregated query in getOne doesn't join category name directly in the root object
      // but fetchTiers was getting it. Let's see if we can get it from here.
      // Actually get_one controller does NOT seem to return categoryName in the root
      // based on the aggregation pipeline I saw.
      // The previous fetchTiers endpoint (GET /card-tiers) DID return categoryName.
      // So I should keep categoryName coming from fetchTiers for now OR fetch category separately.
      // Wait, let me check the controller again to be sure.
      setCardTypeImage(data.image ?? "");
      setCardTypePrintImage(data.printImage ?? "");
      setRedeemFormat(data.redeemFormat ?? "");
      setCardTypeIsActive(data.isActive ?? true);

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
    fetchTiers();
  }, [fetchCardType, fetchTiers]);

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
    { key: "buy", label: "الشراء", width: "120px" },
    { key: "sell", label: "البيع", width: "120px" },
    {
      key: "actions",
      label: isEditing ? "سحب" : "",
      width: "140px",
      className: "text-left",
    },
  ];

  const handleEditStart = () => {
    setDraftTiers(tiers);
    setDraftImageFile(null);
    setDraftPrintImageFile(null);
    setIsEditing(true);
    setError("");
    setSuccessMessage("");
  };

  const handleCancel = () => {
    setDraftTiers(tiers);
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
      formData.append("isActive", String(cardTypeIsActive));
      formData.append("redeemFormat", (redeemFormat || "").trim());
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
      setSuccessMessage("تم حفظ التغييرات بنجاح.");
      await Promise.all([fetchTiers({ skipDraft: true }), fetchCardType()]);
    } catch (err) {
      setError("تعذر حفظ التغييرات. حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTier = useCallback(
    async ({ title, buyPrice, sellPrice, isActive }) => {
      if (!typeId) {
        return { ok: false, error: "تعذر تحديد نوع البطاقة." };
      }
      if (buyPrice === "" || sellPrice === "") {
        return { ok: false, error: "سعر الشراء والبيع مطلوبان." };
      }
      try {
        await axiosClient.post("/card-tiers", {
          typeId,
          title: title?.trim() ?? "",
          buyPrice: Number(buyPrice),
          sellPrice: Number(sellPrice),
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
    [fetchTiers, tiers.length, typeId],
  );

  const CreateTierDialog = ({ onCreate, onCancel }) => {
    const [title, setTitle] = useState("");
    const [buyPrice, setBuyPrice] = useState("");
    const [sellPrice, setSellPrice] = useState("");
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
            label="سعر البيع"
            type="number"
            value={sellPrice}
            onChange={(event) => setSellPrice(event.target.value)}
          />
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
                sellPrice,
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
                  <CustomInput
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    disabled
                  />
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
