import { useCallback, useEffect, useMemo, useState } from "react";

import Layout from "layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "components/Table";
import CustomInput from "components/CustomInput";
import SubmitBtn from "components/SubmitBtn";
import RedBtn from "components/RedBtn";

import axiosClient from "utils/AxiosClient";
import { useDialog } from "components/dialog/DialogContext";

import EyeIcon from "assets/icons/eye.svg?react";
import SearchIcon from "assets/icons/search.svg?react";

const Cards = () => {
  const CARDS_PER_PAGE = 10;
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [cards, setCards] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [error, setError] = useState("");
  const [visibleCodes, setVisibleCodes] = useState({});
  const [sortBy, setSortBy] = useState("serialNumber");
  const [sortOrder, setSortOrder] = useState("asc");
  const [cardsPage, setCardsPage] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [serialFilter, setSerialFilter] = useState("");
  const [cardActionId, setCardActionId] = useState(null);
  const { openDialog, closeDialog } = useDialog();

  const statusStyles = {
    available: "bg-emerald-100 text-emerald-700",
    sold: "bg-rose-100 text-rose-700",
  };
  const statusLabels = {
    available: "متاح",
    sold: "مباع",
  };

  const tableColumns = useMemo(
    () => [
      { key: "order", label: "ت", width: "70px", className: "text-center" },
      {
        key: "serial",
        label: "الرقم التسلسلي",
        width: "200px",
        className: "",
      },
      { key: "code", label: "الكود", className: "" },
      { key: "type", label: "نوع البطاقة" },
      {
        key: "status",
        label: "الحالة",
        width: "140px",
        className: "text-center",
      },
      { key: "tier", label: "الفئة", width: "180px" },
      {
        key: "actions",
        label: "إجراءات",
        width: "160px",
        className: "text-left",
      },
    ],
    [],
  );

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setError("");
    try {
      const response = await axiosClient.get("/card-categories");
      const list = Array.isArray(response.data) ? response.data : [];
      setCategories(list);
    } catch (err) {
      setError("تعذر تحميل التصنيفات. حاول مرة أخرى.");
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  const fetchCardsByCategory = useCallback(async () => {
    if (!activeCategoryId) {
      setCards([]);
      return;
    }
    setIsLoadingCards(true);
    setError("");
    try {
      if (serialFilter) {
        const response = await axiosClient.get("/search/cards", {
          params: {
            query: serialFilter,
            categoryId: activeCategoryId,
            page: cardsPage,
            limit: CARDS_PER_PAGE,
            sortBy,
            sortOrder,
          },
        });
        const payload = response.data ?? {};
        setCards(Array.isArray(payload.cards) ? payload.cards : []);
        setTotalCards(payload.total ?? 0);
        setTotalPages(payload.totalPages ?? 1);
      } else {
        const response = await axiosClient.get("/cards/by-category", {
          params: {
            categoryId: activeCategoryId,
            page: cardsPage,
            limit: CARDS_PER_PAGE,
            sortBy,
            sortOrder,
          },
        });
        const payload = response.data ?? {};
        setCards(Array.isArray(payload.cards) ? payload.cards : []);
        setTotalCards(payload.total ?? 0);
        setTotalPages(payload.totalPages ?? 1);
      }
    } catch (err) {
      setError("تعذر تحميل البطاقات. حاول مرة أخرى.");
      setCards([]);
      setTotalCards(0);
      setTotalPages(1);
    } finally {
      setIsLoadingCards(false);
    }
  }, [activeCategoryId, cardsPage, sortBy, sortOrder, serialFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!categories.length) return;
    const stillExists = categories.some(
      (category) => category._id === activeCategoryId,
    );
    if (!activeCategoryId || !stillExists) {
      setActiveCategoryId(categories[0]._id);
    }
  }, [activeCategoryId, categories]);

  useEffect(() => {
    fetchCardsByCategory();
  }, [fetchCardsByCategory]);

  useEffect(() => {
    if (cardsPage > totalPages) {
      setCardsPage(totalPages);
    }
  }, [cardsPage, totalPages]);

  const handleCategorySelect = (categoryId) => {
    setActiveCategoryId(categoryId);
    setVisibleCodes({});
    setCardsPage(1);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSerialFilter(searchQuery.trim());
    setCardsPage(1);
  };

  const handleSearchChange = (event) => {
    const nextValue = event.target.value;
    setSearchQuery(nextValue);
    if (!nextValue.trim()) {
      setSerialFilter("");
      setCardsPage(1);
    }
  };

  const toggleCodeVisibility = (cardId) => {
    setVisibleCodes((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const maskCode = (value) => {
    if (!value) return "-";
    const length = Math.max(6, Math.min(value.length, 12));
    return "*".repeat(length);
  };

  const renderSerialNumber = (value) => {
    if (!value) return "-";
    const groups = String(value)
      .replace(/\s+/g, "")
      .match(/.{1,4}/g);
    if (!groups) return "-";
    return (
      <span className="inline-flex gap-1">
        {groups.map((group, index) => (
          <span key={`${group}-${index}`}>{group}</span>
        ))}
      </span>
    );
  };

  const getCardErrorMessage = (code) => {
    switch (code) {
      case "CARD_REQUIRED_FIELDS_MISSING":
        return "الرجاء إدخال البيانات المطلوبة.";
      case "CARD_SERIAL_NUMBER_REQUIRED":
        return "الرقم التسلسلي مطلوب.";
      case "CARD_TIER_ID_INVALID":
      case "CARD_TIER_NOT_FOUND":
        return "تعذر العثور على فئة البطاقة.";
      case "CARD_SERIAL_NUMBER_INVALID":
        return "الرقم التسلسلي يجب أن يكون 15 رقما.";
      case "CARD_SERIAL_NUMBER_TAKEN":
        return "الرقم التسلسلي مستخدم بالفعل.";
      case "CARD_CODE_REQUIRED":
        return "الكود مطلوب.";
      case "CARD_CODE_DUPLICATE":
        return "لا يمكن تكرار الكود لنفس النوع.";
      case "CARD_EXPIRY_DATE_INVALID":
        return "تاريخ انتهاء الصلاحية غير صالح.";
      case "CARD_STATUS_INVALID":
        return "حالة البطاقة غير صالحة.";
      default:
        return "تعذر تنفيذ العملية. حاول مرة أخرى.";
    }
  };

  const getCardUpdateErrorMessage = (code) => {
    if (!code) {
      return "تعذر تعديل البطاقة. حاول مرة أخرى.";
    }
    if (code === "CARD_NOT_FOUND") {
      return "تعذر العثور على البطاقة المطلوبة.";
    }
    return getCardErrorMessage(code);
  };

  const EditCardDialog = ({ card, onSave, onCancel }) => {
    const [serialNumber, setSerialNumber] = useState(card?.serialNumber ?? "");
    const [code, setCode] = useState(card?.code ?? "");
    const [pin, setPin] = useState(card?.pin ?? "");
    const [expiryDate, setExpiryDate] = useState(
      card?.expiryDate ? String(card.expiryDate).slice(0, 10) : "",
    );
    const [status, setStatus] = useState(card?.status ?? "available");
    const [dialogError, setDialogError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          تعديل بيانات البطاقة
        </h2>
        <div className="mt-4 space-y-3">
          <CustomInput
            label="الرقم التسلسلي"
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
          />
          <CustomInput
            label="الكود"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <CustomInput
            label="PIN (اختياري)"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
          <CustomInput
            label="تاريخ انتهاء الصلاحية (اختياري)"
            type="date"
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
            dir="ltr"
          />
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span>الحالة</span>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="available">متاح</option>
              <option value="sold">مباع</option>
            </select>
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
              const result = await onSave({
                serialNumber,
                code,
                pin,
                expiryDate,
                status,
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
            حفظ
          </SubmitBtn>
        </div>
      </div>
    );
  };

  const DeleteCardDialog = ({ cardCode, onDelete, onCancel }) => {
    const [dialogError, setDialogError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          تأكيد حذف البطاقة
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          سيتم حذف البطاقة
          <span className="font-semibold text-slate-800"> {cardCode}</span>. هل
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

  const handleEditCard = useCallback(
    async (cardId, payload) => {
      if (!cardId) {
        return { ok: false, error: "تعذر تحديد البطاقة." };
      }
      setCardActionId(cardId);
      try {
        const body = {
          serialNumber: payload.serialNumber?.trim(),
          code: payload.code?.trim(),
          pin: payload.pin?.trim() || null,
          expiryDate: payload.expiryDate || null,
          status: payload.status,
        };

        if (!body.serialNumber || !/^[0-9]{15}$/.test(body.serialNumber)) {
          return { ok: false, error: "الرقم التسلسلي يجب أن يكون 15 رقما." };
        }
        if (!body.code) {
          return { ok: false, error: "الكود مطلوب." };
        }

        if (body.status === "available") {
          body.soldTo = null;
          body.soldAt = null;
        }

        await axiosClient.patch("/cards", body, {
          params: { id: cardId },
        });
        await fetchCardsByCategory();
        return { ok: true };
      } catch (err) {
        const code = err?.response?.data?.code;
        return { ok: false, error: getCardUpdateErrorMessage(code) };
      } finally {
        setCardActionId(null);
      }
    },
    [fetchCardsByCategory],
  );

  const handleDeleteCard = useCallback(
    async (cardId) => {
      if (!cardId) {
        return { ok: false, error: "تعذر تحديد البطاقة." };
      }
      setCardActionId(cardId);
      try {
        await axiosClient.delete("/cards", {
          params: { id: cardId },
        });
        await fetchCardsByCategory();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: "تعذر حذف البطاقة. حاول مرة أخرى." };
      } finally {
        setCardActionId(null);
      }
    },
    [fetchCardsByCategory],
  );

  return (
    <Layout>
      <div className="px-4 py-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">البطاقات</h1>
            <p className="mt-1 text-sm text-slate-500">
              جميع البطاقات المتاحة حسب التصنيف
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
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
                  onChange={handleSearchChange}
                  placeholder="ابحث بالرقم التسلسلي"
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40 outline-1 ring-[#2c3e50]/40 ring-1"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                disabled={isLoadingCards}
              >
                بحث
              </button>
            </form>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">الفرز حسب</span>
              <select
                className="rounded-xl border border-slate-200 px-2 py-1 text-xs"
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  setCardsPage(1);
                }}
              >
                <option value="serialNumber">الرقم التسلسلي</option>
                <option value="status">الحالة</option>
                <option value="typeName">نوع البطاقة</option>
                <option value="tierTitle">الفئة</option>
                <option value="createdAt">تاريخ الإنشاء</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">الترتيب</span>
              <select
                className="rounded-xl border border-slate-200 px-2 py-1 text-xs"
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value);
                  setCardsPage(1);
                }}
              >
                <option value="asc">تصاعدي</option>
                <option value="desc">تنازلي</option>
              </select>
            </div>
            <div className="text-sm text-slate-500">
              إجمالي البطاقات: {totalCards}
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50 px-4 py-3">
            {isLoadingCategories ? (
              <span className="text-sm text-slate-500">
                جاري تحميل التصنيفات...
              </span>
            ) : categories.length === 0 ? (
              <span className="text-sm text-slate-500">لا توجد تصنيفات</span>
            ) : (
              categories.map((category) => (
                <button
                  key={category._id}
                  type="button"
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                    activeCategoryId === category._id
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() => handleCategorySelect(category._id)}
                >
                  {category.name}
                </button>
              ))
            )}
          </div>

          {error ? (
            <div className="px-4 py-10 text-center text-sm text-red-500">
              {error}
            </div>
          ) : isLoadingCards ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              جاري تحميل البطاقات...
            </div>
          ) : cards.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              لا توجد بطاقات للعرض
            </div>
          ) : (
            <>
              <Table
                columns={tableColumns}
                pagination={{
                  page: cardsPage,
                  totalPages,
                  onPageChange: setCardsPage,
                }}
              >
                <TableHead columns={tableColumns} />
                <TableBody>
                  {cards.map((card, index) => (
                    <TableRow key={card._id}>
                      <TableCell className="text-center text-slate-600">
                        {(cardsPage - 1) * CARDS_PER_PAGE + index + 1}
                      </TableCell>
                      <TableCell className=" text-slate-600" dir="ltr">
                        {renderSerialNumber(card.serialNumber)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-between w-fit gap-2">
                          <span
                            className="font-mono text-sm min-w-60 text-slate-700"
                            dir="ltr"
                          >
                            {visibleCodes[card._id]
                              ? renderSerialNumber(card.code) || "-"
                              : maskCode(card.code)}
                          </span>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
                            onClick={() => toggleCodeVisibility(card._id)}
                            aria-label={
                              visibleCodes[card._id]
                                ? "إخفاء الكود"
                                : "إظهار الكود"
                            }
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {card.typeName || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs ${
                            statusStyles[card.status] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {statusLabels[card.status] ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {card.tierTitle || "-"}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                            onClick={() =>
                              openDialog(
                                <EditCardDialog
                                  card={card}
                                  onSave={(payload) =>
                                    handleEditCard(card._id, payload)
                                  }
                                  onCancel={closeDialog}
                                />,
                              )
                            }
                            disabled={cardActionId === card._id}
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() =>
                              openDialog(
                                <DeleteCardDialog
                                  cardCode={card.serialNumber || card.code}
                                  onDelete={() => handleDeleteCard(card._id)}
                                  onCancel={closeDialog}
                                />,
                              )
                            }
                            disabled={cardActionId === card._id}
                          >
                            حذف
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Cards;
