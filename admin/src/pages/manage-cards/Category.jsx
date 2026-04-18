import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import CustomInput from "components/CustomInput";
import PrimaryBtn from "components/PrimaryBtn";
import SubmitBtn from "components/SubmitBtn";
import RedBtn from "components/RedBtn";
import axiosClient from "utils/AxiosClient";
import { useDialog } from "components/dialog/DialogContext";
import { useBreadcrumb } from "components/breadcrumb/BreadcrumbContext";

import TrashIcon from "assets/icons/trash-basket.svg?react";
import ToggleSwitch from "components/ToggleSwitch";
import ImageUpload from "components/ImageUpload";

const Category = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get("categoryId");
  const [categoryName, setCategoryName] = useState("");
  const [cardTypes, setCardTypes] = useState([]);
  const [draftCardTypes, setDraftCardTypes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { openDialog, closeDialog } = useDialog();
  const { setLevels } = useBreadcrumb();

  const fetchCardTypes = useCallback(
    async (options = {}) => {
      const { skipDraft = false } = options;
      if (!categoryId) {
        setError("تعذر تحديد التصنيف.");
        setCardTypes([]);
        setDraftCardTypes([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError("");
      try {
        const response = await axiosClient.get("/card-types/by-category", {
          params: { categoryId },
        });
        const payload = response.data ?? {};
        const nextCardTypes = Array.isArray(payload.cardTypes)
          ? payload.cardTypes
          : [];
        setCardTypes(nextCardTypes);
        setCategoryName(payload.name ?? "");
        setLevels([
          { key: "categories", label: "التصنيفات" },
          { key: "category", label: payload.name ?? "تصنيف" },
        ]);
        if (!isEditing && !skipDraft) {
          setDraftCardTypes(nextCardTypes);
        }
      } catch (err) {
        setError("تعذر تحميل أنواع البطاقات. حاول مرة أخرى.");
        setCardTypes([]);
        setDraftCardTypes([]);
      } finally {
        setIsLoading(false);
      }
    },
    [categoryId, isEditing],
  );

  useEffect(() => {
    fetchCardTypes();
  }, [fetchCardTypes]);

  useEffect(() => {
    if (!isEditing) {
      setDraftCardTypes(cardTypes);
    }
  }, [cardTypes, isEditing]);

  const totalCardTypes = cardTypes.length;
  const activeList = isEditing ? draftCardTypes : cardTypes;

  const handleEditStart = () => {
    setDraftCardTypes(cardTypes);
    setIsEditing(true);
    setError("");
    setSuccessMessage("");
  };

  const handleCancel = () => {
    setDraftCardTypes(cardTypes);
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
    setDraftCardTypes((prev) => reorderList(prev, dragIndex, index));
    setDragIndex(null);
  };

  const handleSave = async () => {
    if (draftCardTypes.length === 0) return;
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload = {
        types: draftCardTypes.map((type, index) => ({
          id: type._id,
          order: index + 1,
        })),
      };
      const response = await axiosClient.patch("/card-types/order", payload);
      const updatedTypes = Array.isArray(response.data)
        ? response.data
        : draftCardTypes;
      setCardTypes(updatedTypes);
      setIsEditing(false);
      setSuccessMessage("تم حفظ ترتيب أنواع البطاقات بنجاح.");
    } catch (err) {
      setError("تعذر حفظ التغييرات. حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteType = useCallback(
    async (typeId) => {
      if (!typeId) {
        return { ok: false, error: "تعذر تحديد نوع البطاقة." };
      }
      setError("");
      setSuccessMessage("");
      try {
        await axiosClient.delete("/card-types", {
          params: { id: typeId },
        });
        await fetchCardTypes({ skipDraft: true });
        setSuccessMessage("تم حذف نوع البطاقة بنجاح.");
        return { ok: true };
      } catch (err) {
        const code = err?.response?.data?.code;
        if (code === "CARD_TYPE_HAS_TIERS") {
          return {
            ok: false,
            error: "لا يمكن حذف النوع طالما يحتوي على فئات بطاقات.",
          };
        }
        return { ok: false, error: "تعذر حذف نوع البطاقة. حاول مرة أخرى." };
      }
    },
    [fetchCardTypes],
  );

  const handleCreateType = useCallback(
    async ({
      name,
      image,
      printImage,
      redeemFormat,
      isActive,
      fulfillmentSource,
    }) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return { ok: false, error: "اسم نوع البطاقة مطلوب." };
      }
      if (!categoryId) {
        return { ok: false, error: "تعذر تحديد التصنيف." };
      }
      try {
        const formData = new FormData();
        formData.append("name", trimmed);
        formData.append("categoryId", categoryId);
        formData.append("order", String(cardTypes.length + 1));
        formData.append("isActive", String(isActive));
        formData.append("fulfillmentSource", fulfillmentSource);
        if (image) {
          formData.append("media", image);
        }
        if (printImage) {
          formData.append("printImage", printImage);
        }
        if (redeemFormat) {
          formData.append("redeemFormat", redeemFormat?.trim() ?? "");
        }
        await axiosClient.post("/card-types", formData);
        await fetchCardTypes({ skipDraft: true });
        setSuccessMessage("تم إنشاء نوع البطاقة بنجاح.");
        return { ok: true };
      } catch (err) {
        return { ok: false, error: "تعذر إنشاء نوع البطاقة. حاول مرة أخرى." };
      }
    },
    [cardTypes.length, categoryId, fetchCardTypes],
  );

  const CreateTypeDialog = ({ onCreate, onCancel }) => {
    const [name, setName] = useState("");
    const [image, setImage] = useState(null);
    const [printImage, setPrintImage] = useState(null);
    const [redeemFormat, setRedeemFormat] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [fulfillmentSource, setFulfillmentSource] = useState("local");
    const [dialogError, setDialogError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
      <div className="min-w-70 p-2 pe-4">
        <h2 className="text-base font-semibold text-slate-800">
          إنشاء نوع بطاقة جديد
        </h2>
        <div className="mt-4 space-y-3">
          <CustomInput
            autoFocus
            label="اسم النوع"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="flex gap-2">
            <ImageUpload
              label="الصورة (اختياري)"
              value={image}
              onChange={setImage}
            />
            <ImageUpload
              label="صورة الطباعة (اختياري)"
              value={printImage}
              onChange={setPrintImage}
            />
          </div>
          <CustomInput
            label="نموذج التعبئة (اختياري)"
            value={redeemFormat}
            onChange={(e) => setRedeemFormat(e.target.value)}
            placeholder="مثال: استخدم الكود {code}"
          />
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span>المصدر</span>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              value={fulfillmentSource}
              onChange={(event) => {
                setFulfillmentSource(event.target.value);
              }}
            >
              <option value="local">محلي</option>
              <option value="bamboo">Bamboo</option>
            </select>
          </label>
          <ToggleSwitch
            label="مفعّل"
            checked={isActive}
            onChange={setIsActive}
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
              setIsSubmitting(true);
              setDialogError("");
              const result = await onCreate({
                name,
                image,
                printImage,
                redeemFormat,
                isActive,
                fulfillmentSource,
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

  const DeleteTypeDialog = ({ typeName, onDelete, onCancel }) => {
    const [dialogError, setDialogError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          تأكيد حذف نوع البطاقة
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          سيتم حذف جميع البطاقات المرتبطة بنوع
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

  const handleOpenCreateDialog = () => {
    openDialog(
      <CreateTypeDialog onCreate={handleCreateType} onCancel={closeDialog} />,
    );
  };

  return (
    <div className="px-4 py-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            أنواع البطاقات
          </h1>
          {categoryName && <p className="my-3">التصنيف: {categoryName}</p>}
          <p className="mt-1 text-sm text-slate-500">
            إجمالي الأنواع: {totalCardTypes}
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
              إنشاء نوع بطاقة جديد
            </PrimaryBtn>
            <PrimaryBtn onClick={handleEditStart}>تعديل</PrimaryBtn>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-12 gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <div className="col-span-1">الترتيب</div>
          <div className="col-span-9">اسم النوع</div>
          <div className="col-span-2 text-left">
            {isEditing ? "سحب" : "إجراءات"}
          </div>
        </div>
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            جاري تحميل أنواع البطاقات...
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-center text-sm text-red-500">
            {error}
          </div>
        ) : activeList.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            لا توجد أنواع بطاقات للعرض
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeList.map((type, index) => (
              <div
                key={type._id}
                className={`grid grid-cols-12 gap-3 p-3  transition ${
                  isEditing ? "bg-white" : "hover:bg-slate-50"
                }`}
                role={isEditing ? undefined : "button"}
                tabIndex={isEditing ? undefined : 0}
                onClick={() =>
                  !isEditing &&
                  setSearchParams((prev) => {
                    prev.set("cardTypeId", type._id);
                    return prev;
                  })
                }
                onKeyDown={(event) => {
                  if (isEditing) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSearchParams((prev) => {
                      prev.set("cardTypeId", type._id);
                      return prev;
                    });
                  }
                }}
                draggable={isEditing}
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
              >
                <div className="col-span-1 text-sm text-slate-600">
                  {index + 1}
                </div>
                <div className="col-span-9">
                  <div className="font-medium text-slate-800">{type.name}</div>
                </div>
                <div className="col-span-2 flex items-center justify-end text-sm text-slate-400">
                  {isEditing ? (
                    <span className="cursor-move select-none">⋮⋮</span>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDialog(
                          <DeleteTypeDialog
                            typeName={type.name}
                            onDelete={() => handleDeleteType(type._id)}
                            onCancel={closeDialog}
                          />,
                        );
                      }}
                      title={
                        (type.tiersCount ?? 0) > 0
                          ? "لا يمكن حذف النوع طالما يحتوي على فئات بطاقات"
                          : undefined
                      }
                    >
                      <TrashIcon className="h-4 w-4" />
                      حذف
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Category;
