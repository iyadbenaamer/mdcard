import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
import axiosClient from "utils/AxiosClient";
import { useDialog } from "components/dialog/DialogContext";
import { useBreadcrumb } from "components/breadcrumb/BreadcrumbContext";

import TrashIcon from "assets/icons/trash-basket.svg?react";

const Categories = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [draftCategories, setDraftCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
  const { openDialog, closeDialog } = useDialog();
  const { setLevels } = useBreadcrumb();

  const fetchCategories = useCallback(
    async (options = {}) => {
      const { skipDraft = false } = options;
      setIsLoading(true);
      setError("");
      try {
        const response = await axiosClient.get("/card-categories");
        const nextCategories = Array.isArray(response.data)
          ? response.data
          : [];
        setCategories(nextCategories);
        if (!isEditing && !skipDraft) {
          setDraftCategories(nextCategories);
        }
      } catch (err) {
        setError("تعذر تحميل التصنيفات. حاول مرة أخرى.");
        setCategories([]);
        setDraftCategories([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isEditing],
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    setLevels([{ key: "categories", label: "التصنيفات" }]);
  }, [setLevels]);

  useEffect(() => {
    if (!isEditing) {
      setDraftCategories(categories);
    }
  }, [categories, isEditing]);

  const totalCategories = categories.length;
  const activeList = isEditing ? draftCategories : categories;
  const tableColumns = [
    { key: "order", label: "الترتيب", width: "80px" },
    { key: "name", label: "اسم التصنيف" },
    { key: "count", label: "عدد الأنواع", width: "140px" },
    {
      key: "actions",
      label: isEditing ? "سحب" : "إجراءات",
      width: "140px",
      className: "text-left",
    },
  ];

  const handleEditStart = () => {
    setDraftCategories(categories);
    setIsEditing(true);
    setError("");
    setSuccessMessage("");
  };

  const handleCancel = () => {
    setDraftCategories(categories);
    setIsEditing(false);
    setError("");
    setSuccessMessage("");
  };

  const handleNameChange = (index, value) => {
    setDraftCategories((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, name: value } : item,
      ),
    );
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
    setDraftCategories((prev) => reorderList(prev, dragIndex, index));
    setDragIndex(null);
  };

  const handleSave = async () => {
    if (draftCategories.length === 0) return;
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload = {
        categories: draftCategories.map((category, index) => ({
          id: category._id,
          name: category.name,
          order: index + 1,
        })),
      };
      const response = await axiosClient.patch("/card-categories", payload);
      const updatedCategories = Array.isArray(response.data)
        ? response.data
        : draftCategories;
      setCategories(updatedCategories);
      setIsEditing(false);
      setSuccessMessage("تم حفظ ترتيب وأسماء التصنيفات بنجاح.");
    } catch (err) {
      setError("تعذر حفظ التغييرات. حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCategory = useCallback(
    async (name) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return { ok: false, error: "اسم التصنيف مطلوب." };
      }
      try {
        const order = categories.length + 1;
        await axiosClient.post("/card-categories", {
          name: trimmed,
          order,
        });
        await fetchCategories({ skipDraft: true });
        setSuccessMessage("تم إنشاء التصنيف بنجاح.");
        return { ok: true };
      } catch (err) {
        return { ok: false, error: "تعذر إنشاء التصنيف. حاول مرة أخرى." };
      }
    },
    [categories.length, fetchCategories],
  );

  const handleDeleteCategory = useCallback(
    async (categoryId) => {
      if (!categoryId) {
        return { ok: false, error: "تعذر تحديد التصنيف." };
      }
      setDeleteCategoryId(categoryId);
      setError("");
      setSuccessMessage("");
      try {
        await axiosClient.delete("/card-categories", {
          params: { id: categoryId },
        });
        await fetchCategories({ skipDraft: true });
        setSuccessMessage("تم حذف التصنيف بنجاح.");
        return { ok: true };
      } catch (err) {
        const code = err?.response?.data?.code;
        if (code === "CARD_CATEGORY_HAS_TYPES") {
          return {
            ok: false,
            error: "لا يمكن حذف التصنيف طالما يحتوي على أنواع بطاقات.",
          };
        }
        return { ok: false, error: "تعذر حذف التصنيف. حاول مرة أخرى." };
      } finally {
        setDeleteCategoryId(null);
      }
    },
    [fetchCategories],
  );

  const CreateCategoryDialog = ({ onCreate, onCancel }) => {
    const [name, setName] = useState("");
    const [dialogError, setDialogError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    return (
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          إنشاء تصنيف جديد
        </h2>
        <div className="mt-4">
          <CustomInput
            autoFocus
            label="اسم التصنيف"
            value={name}
            onChange={(event) => setName(event.target.value)}
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
              const result = await onCreate(name);
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

  const DeleteCategoryDialog = ({ categoryName, onDelete, onCancel }) => {
    const [dialogError, setDialogError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          تأكيد حذف التصنيف
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          سيتم حذف التصنيف
          <span className="font-semibold text-slate-800"> {categoryName}</span>.
          هل تريد المتابعة؟
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
      <CreateCategoryDialog
        onCreate={handleCreateCategory}
        onCancel={closeDialog}
      />,
    );
  };

  return (
    <div className="px-4 py-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">التصنيفات</h1>
          <p className="mt-1 text-sm text-slate-500">
            إجمالي التصنيفات: {totalCategories}
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
              إنشاء تصنيف جديد
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
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            جاري تحميل التصنيفات...
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-center text-sm text-red-500">
            {error}
          </div>
        ) : activeList.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            لا توجد تصنيفات للعرض
          </div>
        ) : (
          <Table columns={tableColumns}>
            <TableHead columns={tableColumns} />
            <TableBody>
              {activeList.map((category, index) => (
                <TableRow
                  key={category._id}
                  className={`${isEditing ? "bg-white" : "hover:bg-slate-50"} ${
                    isEditing ? "" : "cursor-pointer"
                  }`}
                  role={isEditing ? undefined : "button"}
                  tabIndex={isEditing ? undefined : 0}
                  onClick={() =>
                    !isEditing &&
                    setSearchParams((prev) => {
                      prev.set("categoryId", category._id);
                      return prev;
                    })
                  }
                  onKeyDown={(event) => {
                    if (isEditing) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSearchParams((prev) => {
                        prev.set("categoryId", category._id);
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
                  <TableCell>
                    {isEditing ? (
                      <input
                        type="text"
                        value={category.name ?? ""}
                        onChange={(event) =>
                          handleNameChange(index, event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      />
                    ) : (
                      <div className="font-medium text-slate-800">
                        {category.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {category.count ?? 0}
                  </TableCell>
                  <TableCell className="text-left text-slate-400">
                    {isEditing ? (
                      <span className="cursor-move select-none">⋮⋮</span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDialog(
                            <DeleteCategoryDialog
                              categoryName={category.name}
                              onDelete={() =>
                                handleDeleteCategory(category._id)
                              }
                              onCancel={closeDialog}
                            />,
                          );
                        }}
                        disabled={
                          deleteCategoryId === category._id ||
                          (category.count ?? 0) > 0
                        }
                        title={
                          (category.count ?? 0) > 0
                            ? "لا يمكن حذف التصنيف طالما يحتوي على أنواع بطاقات"
                            : undefined
                        }
                      >
                        <TrashIcon className="h-4 w-4" />
                        حذف
                      </button>
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

export default Categories;
