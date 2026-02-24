import { useState } from "react";
import CustomInput from "components/CustomInput";
import SubmitBtn from "components/SubmitBtn";
import axiosClient from "utils/AxiosClient";

const DepositDialog = ({ userId, onBalanceUpdate, onClose }) => {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const handleDeposit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError("يرجى إدخال مبلغ صالح.");
      return;
    }

    try {
      const response = await axiosClient.post("/admin/deposit", {
        userId,
        amount: Number(amount),
      });

      if (onBalanceUpdate) {
        onBalanceUpdate(response.data.balance);
      }
      onClose();
    } catch (err) {
      console.error("Deposit error:", err);
      setError("تعذر إتمام عملية الإيداع. حاول مرة أخرى.");
    }
  };

  return (
    <div className="min-w-80 p-4 text-right" dir="rtl">
      <h2 className="text-lg font-semibold text-slate-800">إيداع رصيد</h2>
      <p className="mt-1 text-sm text-slate-500">
        أدخل المبلغ المراد إضافته إلى رصيد المستخدم.
      </p>

      <div className="mt-6">
        <CustomInput
          label="المبلغ"
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError("");
          }}
          autoFocus
          placeholder="0.00"
        />
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>

      <div className="mt-8 flex items-center justify-end gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50"
          onClick={onClose}
        >
          إلغاء
        </button>
        <SubmitBtn onClick={handleDeposit}>إيداع</SubmitBtn>
      </div>
    </div>
  );
};

export default DepositDialog;
