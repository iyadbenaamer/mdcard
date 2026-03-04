import { useState } from "react";
import SubmitBtn from "components/SubmitBtn";
import CustomInput from "components/CustomInput";
import axiosClient from "utils/AxiosClient";

const AddSettingDialog = ({ onAdded, onClose }) => {
  const [form, setForm] = useState({ key: "", value: "", description: "" });
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if ((form.key || "").toString().trim() === "") {
      setError("المفتاح مطلوب.");
      return;
    }
    if ((form.key || "").toString().trim() === "support") {
      setError("لا يمكن إنشاء إعداد باسم 'support'.");
      return;
    }
    try {
      const res = await axiosClient.post("/settings", form);
      if (onAdded) onAdded(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "خطأ أثناء إنشاء الإعداد");
    }
  };

  return (
    <div className="min-w-80 p-4 text-right" dir="rtl">
      <h2 className="text-lg font-semibold text-slate-800">إضافة إعداد جديد</h2>
      <p className="mt-1 text-sm text-slate-500">
        أضف مفتاح، قيمة ووصفًا(اختياري).
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <CustomInput
          label="المفتاح"
          value={form.key}
          onChange={(e) => setForm({ ...form, key: e.target.value })}
          autoFocus
        />
        <CustomInput
          label="القيمة"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
        />
        <CustomInput
          label="الوصف (اختياري)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-8 flex items-center justify-end gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50"
          onClick={onClose}
        >
          إلغاء
        </button>
        <SubmitBtn onClick={handleSubmit}>إضافة</SubmitBtn>
      </div>
    </div>
  );
};

export default AddSettingDialog;
