import { useCallback, useEffect, useState } from "react";
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
import EyeIcon from "assets/icons/eye.svg?react";

const CardTier = () => {
  const CARDS_PER_PAGE = 10;
  const [searchParams, setSearchParams] = useSearchParams();
  const cardTierId = searchParams.get("cardTierId");
  const cardTypeId = searchParams.get("cardTypeId");
  const [cardTierTitle, setCardTierTitle] = useState("");
  const [cardTypeName, setCardTypeName] = useState("");
  const [cardTypeFulfillmentSource, setCardTypeFulfillmentSource] =
    useState("local");
  const [tier, setTier] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState([]);
  const [cardsTotal, setCardsTotal] = useState(0);
  const [cardsTotalPages, setCardsTotalPages] = useState(1);
  const [isCardsLoading, setIsCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState("");
  const [cardsPage, setCardsPage] = useState(1);
  const [visibleCodes, setVisibleCodes] = useState({});
  const [cardActionId, setCardActionId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBuyPrice, setDraftBuyPrice] = useState("");
  const [draftBuyPriceUsd, setDraftBuyPriceUsd] = useState("");
  const [draftSellPrice, setDraftSellPrice] = useState("");
  const [draftBambooProductId, setDraftBambooProductId] = useState("");
  const [draftBambooValue, setDraftBambooValue] = useState("");
  const [draftIsActive, setDraftIsActive] = useState(true);
  const { openDialog, closeDialog } = useDialog();
  const { setLevels } = useBreadcrumb();
  const tableColumns = [
    { key: "field", label: "الحقل", width: "220px" },
    { key: "value", label: "القيمة" },
  ];
  const cardsTableColumns = [
    { key: "order", label: "ت", width: "70px", className: "text-center" },
    {
      key: "serial",
      label: "الرقم التسلسلي",
      width: "200px",
      className: "",
    },
    { key: "code", label: "الكود", className: "" },
    {
      key: "status",
      label: "الحالة",
      width: "140px",
      className: "text-center",
    },
    {
      key: "actions",
      label: "إجراءات",
      width: "170px",
      className: "text-left",
    },
  ];
  const statusLabels = {
    available: "متاح",
    sold: "مباع",
  };
  const statusStyles = {
    available: "bg-emerald-100 text-emerald-700",
    sold: "bg-rose-100 text-rose-700",
  };

  const toggleCodeVisibility = (cardId) => {
    setVisibleCodes((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const maskCode = (value) => {
    if (!value) return "-";
    const length = Math.max(6, Math.min(value.length, 16));
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
      case "CARD_STATUS_INVALID":
        return "حالة البطاقة غير صالحة.";
      default:
        return "تعذر إنشاء البطاقة. حاول مرة أخرى.";
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

  const fetchTier = useCallback(async () => {
    if (!cardTypeId) {
      setError("تعذر تحديد نوع البطاقة.");
      setTier(null);
      return;
    }
    if (!cardTierId) {
      setError("تعذر تحديد فئة البطاقة.");
      setTier(null);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const [tiersResponse, typeResponse] = await Promise.all([
        axiosClient.get("/card-tiers", {
          params: { typeId: cardTypeId },
        }),
        axiosClient.get("/card-types/get_one", {
          params: { id: cardTypeId },
        }),
      ]);
      const payload = tiersResponse.data ?? {};
      const typePayload = typeResponse.data ?? {};
      const list = Array.isArray(payload.tiers) ? payload.tiers : [];
      const found = list.find((item) => item._id === cardTierId);
      if (!found) {
        setError("تعذر العثور على فئة البطاقة المطلوبة.");
        setTier(null);
      } else {
        setTier(found);
        setCardTierTitle(found.title ?? "");
        setCardTypeName(typePayload.name ?? payload.name ?? "");
        setCardTypeFulfillmentSource(typePayload.fulfillmentSource ?? "local");
        setLevels([
          { key: "categories", label: "التصنيفات" },
          { key: "category", label: payload.categoryName ?? "تصنيف" },
          { key: "cardType", label: payload.name ?? "نوع بطاقة" },
          { key: "cardTier", label: found.title || "فئة بطاقة" },
        ]);
        if (!isEditing) {
          setDraftTitle(found.title ?? "");
          setDraftBuyPrice(found.buyPrice ?? "");
          setDraftBuyPriceUsd(found.buyPriceUsd ?? "");
          setDraftSellPrice(found.sellPrice ?? "");
          setDraftBambooProductId(found.bambooProductId ?? "");
          setDraftBambooValue(found.value ?? "");
          setDraftIsActive(found.isActive ?? true);
        }
      }
    } catch (err) {
      setError("تعذر تحميل تفاصيل فئة البطاقة. حاول مرة أخرى.");
      setTier(null);
    } finally {
      setIsLoading(false);
    }
  }, [cardTierId, cardTypeId, isEditing]);

  useEffect(() => {
    fetchTier();
  }, [fetchTier]);

  const fetchCards = useCallback(async () => {
    if (!cardTierId) {
      setCards([]);
      setCardsTotal(0);
      setCardsTotalPages(1);
      return;
    }
    setIsCardsLoading(true);
    setCardsError("");
    try {
      const response = await axiosClient.get("/cards", {
        params: { tierId: cardTierId, page: cardsPage, limit: CARDS_PER_PAGE },
      });
      const payload = response.data;
      if (Array.isArray(payload)) {
        setCards(payload);
        setCardsTotal(payload.length);
        setCardsTotalPages(
          Math.max(1, Math.ceil(payload.length / CARDS_PER_PAGE)),
        );
      } else {
        const list = Array.isArray(payload?.cards) ? payload.cards : [];
        setCards(list);
        const total = Number(payload?.total) || 0;
        const totalPages = Number(payload?.totalPages) || 1;
        setCardsTotal(total);
        setCardsTotalPages(Math.max(1, totalPages));
      }
    } catch (err) {
      setCardsError("تعذر تحميل البطاقات. حاول مرة أخرى.");
      setCards([]);
      setCardsTotal(0);
      setCardsTotalPages(1);
    } finally {
      setIsCardsLoading(false);
    }
  }, [cardTierId, cardsPage]);

  useEffect(() => {
    setCardsPage(1);
  }, [cardTierId]);

  useEffect(() => {
    if (cardsPage > cardsTotalPages) {
      setCardsPage(cardsTotalPages);
    }
  }, [cardsPage, cardsTotalPages]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleDeleteTier = useCallback(async () => {
    if (!cardTierId) {
      return { ok: false, error: "تعذر تحديد فئة البطاقة." };
    }
    try {
      await axiosClient.delete("/card-tiers", {
        params: { id: cardTierId },
      });
      setSearchParams((prev) => {
        prev.delete("cardTierId");
        return prev;
      });
      return { ok: true };
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "CARD_TIER_HAS_CARDS") {
        return {
          ok: false,
          error: "لا يمكن حذف الفئة طالما تحتوي على بطاقات.",
        };
      }
      return { ok: false, error: "تعذر حذف فئة البطاقة. حاول مرة أخرى." };
    }
  }, [cardTierId, setSearchParams]);

  const handleEditTier = useCallback(
    async ({
      title,
      buyPrice,
      buyPriceUsd,
      sellPrice,
      bambooProductId,
      value,
      isActive,
    }) => {
      if (!cardTierId) {
        return { ok: false, error: "تعذر تحديد فئة البطاقة." };
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
        await axiosClient.patch(
          "/card-tiers",
          {
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
          },
          { params: { id: cardTierId } },
        );
        await fetchTier();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: "تعذر تعديل فئة البطاقة. حاول مرة أخرى." };
      }
    },
    [cardTierId, cardTypeFulfillmentSource, fetchTier],
  );

  const DeleteTierDialog = ({ tierTitle, onDelete, onCancel }) => {
    const [dialogError, setDialogError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          تأكيد حذف فئة البطاقة
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          سيتم حذف جميع البطاقات المرتبطة بفئة
          <span className="font-semibold text-slate-800"> {tierTitle}</span>. هل
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

  const CreateCardDialog = ({ onCreate, onCancel }) => {
    const [serialNumber, setSerialNumber] = useState("");
    const [code, setCode] = useState("");
    const [dialogError, setDialogError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          إنشاء بطاقة جديدة
        </h2>
        <div className="mt-4 space-y-3">
          <CustomInput
            autoFocus
            label="الرقم التسلسلي (اختياري)"
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
          />
          <CustomInput
            label="الكود"
            value={code}
            onChange={(event) => setCode(event.target.value)}
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
                serialNumber,
                code,
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

  const EditCardDialog = ({ card, onSave, onCancel }) => {
    const [serialNumber, setSerialNumber] = useState(card?.serialNumber ?? "");
    const [code, setCode] = useState(card?.code ?? "");
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

  const ImportCardsDialog = ({ onImport, onCancel }) => {
    const [file, setFile] = useState(null);
    const [dialogError, setDialogError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
      <div className="min-w-70 p-2">
        <h2 className="text-base font-semibold text-slate-800">
          استيراد بطاقات من Excel
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          يجب أن يحتوي الملف على عمود واحد للأكواد فقط.
        </p>
        <div className="mt-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-2 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-2 file:text-sm file:text-slate-600 hover:file:bg-slate-100"
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
              const result = await onImport(file);
              if (result?.ok) {
                onCancel();
              } else if (result?.error) {
                setDialogError(result.error);
              }
              setIsSubmitting(false);
            }}
            disabled={isSubmitting}
          >
            استيراد
          </SubmitBtn>
        </div>
      </div>
    );
  };

  const handleEditStart = () => {
    if (!tier) return;
    setSuccessMessage("");
    setImportMessage("");
    setDraftTitle(tier.title ?? "");
    setDraftBuyPrice(tier.buyPrice ?? "");
    setDraftSellPrice(tier.sellPrice ?? "");
    setDraftBambooProductId(tier.bambooProductId ?? "");
    setDraftBambooValue(tier.value ?? "");
    setDraftIsActive(tier.isActive ?? true);
    setEditError("");
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    if (tier) {
      setDraftTitle(tier.title ?? "");
      setDraftBuyPrice(tier.buyPrice ?? "");
      setDraftSellPrice(tier.sellPrice ?? "");
      setDraftBambooProductId(tier.bambooProductId ?? "");
      setDraftBambooValue(tier.value ?? "");
      setDraftIsActive(tier.isActive ?? true);
    }
    setSuccessMessage("");
    setImportMessage("");
    setEditError("");
    setIsEditing(false);
  };

  const handleEditSave = async () => {
    setIsSaving(true);
    setEditError("");
    const result = await handleEditTier({
      title: draftTitle,
      buyPrice: draftBuyPrice,
      buyPriceUsd: draftBuyPriceUsd,
      sellPrice: draftSellPrice,
      bambooProductId: draftBambooProductId,
      value: draftBambooValue,
      isActive: draftIsActive,
    });
    if (result?.ok) {
      setIsEditing(false);
    } else if (result?.error) {
      setEditError(result.error);
    }
    setIsSaving(false);
  };

  const handleOpenDeleteDialog = () => {
    openDialog(
      <DeleteTierDialog
        tierTitle={tier?.title || "-"}
        onDelete={handleDeleteTier}
        onCancel={closeDialog}
      />,
    );
  };

  const handleOpenCreateCardDialog = () => {
    setSuccessMessage("");
    setImportMessage("");
    openDialog(
      <CreateCardDialog onCreate={handleCreateCard} onCancel={closeDialog} />,
    );
  };

  const handleOpenImportDialog = () => {
    setSuccessMessage("");
    setImportMessage("");
    openDialog(
      <ImportCardsDialog onImport={handleImportCards} onCancel={closeDialog} />,
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
        await fetchCards();
        return { ok: true };
      } catch (err) {
        const code = err?.response?.data?.code;
        return { ok: false, error: getCardUpdateErrorMessage(code) };
      } finally {
        setCardActionId(null);
      }
    },
    [fetchCards],
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
        await fetchCards();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: "تعذر حذف البطاقة. حاول مرة أخرى." };
      } finally {
        setCardActionId(null);
      }
    },
    [fetchCards],
  );

  const handleCreateCard = useCallback(
    async ({ serialNumber, code }) => {
      if (!cardTierId) {
        return { ok: false, error: "تعذر تحديد فئة البطاقة." };
      }
      if (!code?.trim()) {
        return { ok: false, error: "الكود مطلوب." };
      }
      if (serialNumber?.trim() && !/^\d{15}$/.test(serialNumber.trim())) {
        return { ok: false, error: "الرقم التسلسلي يجب أن يكون 15 رقما." };
      }

      const payload = {
        tierId: cardTierId,
        code: code.trim(),
      };

      if (serialNumber?.trim()) {
        payload.serialNumber = serialNumber.trim();
      }

      try {
        await axiosClient.post("/cards", payload);
        setSuccessMessage("تم إنشاء البطاقة بنجاح.");
        await fetchCards();
        return { ok: true };
      } catch (err) {
        const errorCode = err?.response?.data?.code;
        return { ok: false, error: getCardErrorMessage(errorCode) };
      }
    },
    [cardTierId, fetchCards],
  );

  const handleImportCards = useCallback(
    async (file) => {
      if (!cardTierId) {
        return { ok: false, error: "تعذر تحديد فئة البطاقة." };
      }
      if (!file) {
        return { ok: false, error: "الرجاء اختيار ملف Excel." };
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("tierId", cardTierId);

      try {
        const response = await axiosClient.post("/cards/import", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const payload = response.data ?? {};
        setImportMessage(`تم استيراد ${payload.created ?? 0} بطاقة بنجاح.`);
        await fetchCards();
        return { ok: true };
      } catch (err) {
        const code = err?.response?.data?.code;
        if (code === "CARD_IMPORT_FILE_REQUIRED") {
          return { ok: false, error: "الرجاء اختيار ملف Excel." };
        }
        if (code === "CARD_IMPORT_EMPTY") {
          return { ok: false, error: "الملف لا يحتوي على أكواد صالحة." };
        }
        if (code === "CARD_TIER_ID_INVALID" || code === "CARD_TIER_NOT_FOUND") {
          return { ok: false, error: "تعذر العثور على فئة البطاقة." };
        }
        return { ok: false, error: "تعذر استيراد البطاقات. حاول مرة أخرى." };
      }
    },
    [cardTierId, fetchCards],
  );

  return (
    <div className="px-4 py-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            تفاصيل فئة البطاقة
          </h1>

          {cardTypeName && (
            <p className="my-2 text">
              {cardTypeName} - {cardTierTitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <SubmitBtn onClick={handleEditSave} disabled={isSaving}>
                حفظ
              </SubmitBtn>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                onClick={handleEditCancel}
                disabled={isSaving}
              >
                إلغاء
              </button>
            </>
          ) : (
            <>
              <PrimaryBtn onClick={handleOpenCreateCardDialog}>
                إنشاء بطاقة جديدة
              </PrimaryBtn>
              <PrimaryBtn onClick={handleOpenImportDialog}>
                استيراد من Excel
              </PrimaryBtn>
              <PrimaryBtn onClick={handleEditStart} disabled={!tier}>
                تعديل
              </PrimaryBtn>
              <RedBtn
                onClick={handleOpenDeleteDialog}
                title={
                  cardsTotal > 0
                    ? "لا يمكن حذف الفئة طالما تحتوي على بطاقات"
                    : undefined
                }
              >
                حذف
              </RedBtn>
            </>
          )}
        </div>
      </div>

      {editError && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {editError}
        </div>
      )}
      {successMessage && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}
      {importMessage && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {importMessage}
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          جاري تحميل التفاصيل...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-600">
          {error}
        </div>
      ) : !tier ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          لا توجد تفاصيل للعرض
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Table columns={tableColumns}>
              <TableHead columns={tableColumns} />
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-slate-600">
                    العنوان
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <CustomInput
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                      />
                    ) : (
                      tier.title || "-"
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-600">
                    سعر الشراء
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <CustomInput
                        type="number"
                        value={draftBuyPrice}
                        onChange={(event) =>
                          setDraftBuyPrice(event.target.value)
                        }
                      />
                    ) : (
                      tier.buyPrice
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-600">
                    سعر الشراء بالدولار
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <CustomInput
                        type="number"
                        value={draftBuyPriceUsd}
                        onChange={(event) =>
                          setDraftBuyPriceUsd(event.target.value)
                        }
                        placeholder="اتركه فارغًا إذا لم يكن مطلوبًا"
                      />
                    ) : (
                      tier.buyPriceUsd || "-"
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-600">
                    سعر البيع
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <CustomInput
                        type="number"
                        value={draftSellPrice}
                        onChange={(event) =>
                          setDraftSellPrice(event.target.value)
                        }
                      />
                    ) : (
                      tier.sellPrice
                    )}
                  </TableCell>
                </TableRow>
                {cardTypeFulfillmentSource === "bamboo" && (
                  <>
                    <TableRow>
                      <TableCell className="font-medium text-slate-600">
                        Bamboo Product ID
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <CustomInput
                            value={draftBambooProductId}
                            onChange={(event) =>
                              setDraftBambooProductId(event.target.value)
                            }
                          />
                        ) : (
                          tier.bambooProductId || "-"
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-slate-600">
                        Bamboo Value
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <CustomInput
                            type="number"
                            value={draftBambooValue}
                            onChange={(event) =>
                              setDraftBambooValue(event.target.value)
                            }
                          />
                        ) : (
                          tier.value ?? "-"
                        )}
                      </TableCell>
                    </TableRow>
                  </>
                )}
                <TableRow>
                  <TableCell className="font-medium text-slate-600">
                    الحالة
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={draftIsActive}
                          onChange={(event) =>
                            setDraftIsActive(event.target.checked)
                          }
                        />
                        مفعّل
                      </label>
                    ) : tier.isActive ? (
                      "مفعّل"
                    ) : (
                      "غير مفعّل"
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span>بطاقات الفئة</span>
              <span>الإجمالي: {cardsTotal}</span>
            </div>
            {isCardsLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                جاري تحميل البطاقات...
              </div>
            ) : cardsError ? (
              <div className="px-4 py-8 text-center text-sm text-rose-600">
                {cardsError}
              </div>
            ) : cards.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                لا توجد بطاقات للعرض
              </div>
            ) : (
              <>
                <Table
                  columns={cardsTableColumns}
                  pagination={{
                    page: cardsPage,
                    totalPages: cardsTotalPages,
                    onPageChange: setCardsPage,
                  }}
                >
                  <TableHead columns={cardsTableColumns} />
                  <TableBody>
                    {cards.map((card, index) => (
                      <TableRow key={card._id}>
                        <TableCell className="text-center text-slate-600">
                          {(cardsPage - 1) * CARDS_PER_PAGE + index + 1}
                        </TableCell>
                        <TableCell className=" text-slate-700" dir="ltr">
                          {renderSerialNumber(card.serialNumber)}
                        </TableCell>
                        <TableCell className="flex justify-center">
                          <div className="flex items-center justify-between w-fit gap-2">
                            <span className="font-mono text-sm min-w-60 text-slate-700">
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
        </>
      )}
    </div>
  );
};

export default CardTier;
