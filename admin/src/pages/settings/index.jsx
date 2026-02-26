import { useEffect, useState, useMemo } from "react";
import axiosClient from "utils/AxiosClient";
import Layout from "layout";
import LoadingIcon from "assets/icons/loading-circle.svg?react";
import { useDialog } from "components/dialog/DialogContext";
import AddSettingDialog from "./components/AddSettingDialog";

const Settings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState({});
  const [editingAll, setEditingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const { openDialog, closeDialog } = useDialog();

  /* ---------------------------------- */
  /* Feedback auto clear */
  /* ---------------------------------- */
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  /* ---------------------------------- */
  /* Fetch Settings */
  /* ---------------------------------- */
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/settings/all");
      let list = res.data || [];
      // always display support entry client‑side even if missing from backend
      if (!list.find((it) => it.key === "support")) {
        list.unshift({
          key: "support",
          value: null,
          description: "",
          _id: null,
        });
      }
      setSettings(list);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "فشل تحميل الإعدادات" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  /* ---------------------------------- */
  /* Handlers */
  /* ---------------------------------- */

  const handleOpenAdd = () => {
    openDialog(
      <AddSettingDialog
        onAdded={(newSetting) => {
          setSettings((s) => [newSetting, ...s]);
          setMessage({ type: "success", text: "تمت الإضافة بنجاح" });
        }}
        onClose={closeDialog}
      />,
    );
  };

  const handleDelete = async (setting) => {
    if (setting.key === "support") {
      // support is static and cannot be removed
      setMessage({ type: "error", text: "لا يمكن حذف الإعداد الثابت" });
      return;
    }
    try {
      await axiosClient.delete(`/settings/${setting._id}`);
      setSettings((s) => s.filter((it) => it._id !== setting._id));
      setMessage({ type: "success", text: "تم حذف الإعداد" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "فشل حذف الإعداد",
      });
    }
  };

  const handleStartEditAll = () => {
    const all = {};
    settings.forEach((s) => {
      // coerce to string so inputs show correctly (e.g. numbers)
      all[s.key] = String(s.value ?? "");
    });
    setEdits(all);
    setEditingAll(true);
  };

  const handleBulkSave = async () => {
    if (!Object.keys(edits).length) return;

    setSaving(true);
    try {
      const payload = settings.map((s) => ({
        id: s._id,
        key: s.key,
        value: edits[s.key] !== undefined ? edits[s.key] : "",
        description: s.description,
      }));

      const res = await axiosClient.patch("/settings", payload);
      const updated = res.data || [];
      // merge updated into current settings, preserving untouched entries
      const nextSettings = [...settings];
      for (const item of updated) {
        const idx = nextSettings.findIndex(
          (it) => it._id === item._id || it.key === item.key,
        );
        if (idx !== -1) nextSettings[idx] = item;
        else nextSettings.unshift(item);
      }
      setSettings(nextSettings);
      setEditingAll(false);
      setEdits({});
      setMessage({ type: "success", text: "تم حفظ جميع التغييرات" });
    } catch (err) {
      setMessage({ type: "error", text: "فشل الحفظ الجماعي" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAll = () => {
    setEditingAll(false);
    setEdits({});
  };

  const hasChanges = useMemo(() => Object.keys(edits).length > 0, [edits]);

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800"> الإعدادات</h1>

          <div className="flex gap-3">
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition"
            >
              + إضافة
            </button>

            {!editingAll && (
              <button
                onClick={handleStartEditAll}
                className="px-5 py-2.5 bg-amber-500 text-white rounded-xl shadow hover:bg-amber-600 transition"
              >
                تعديل
              </button>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium shadow ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Bulk Actions */}
        {editingAll && (
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleBulkSave}
              disabled={!hasChanges || saving}
              className={`px-6 py-2.5 rounded-xl transition shadow ${
                hasChanges
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>

            <button
              onClick={handleCancelAll}
              className="px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            >
              إلغاء
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4 text-gray-500">
            <LoadingIcon className="animate-spin" height={50} />
            جاري تحميل الإعدادات...
          </div>
        ) : settings.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            لا توجد إعدادات حالياً
          </div>
        ) : (
          <div className="grid gap-5">
            {settings.map((s) => (
              <div
                key={s._id || s.key}
                className="bg-white rounded-2xl p-6 shadow-sm  hover:shadow-md transition"
              >
                <div className="flex justify-between items-start gap-6">
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-800">
                      {s.key}
                    </div>

                    {editingAll ? (
                      <input
                        value={edits[s.key] ?? ""}
                        onChange={(e) =>
                          setEdits((ex) => ({
                            ...ex,
                            [s.key]: e.target.value,
                          }))
                        }
                        className="mt-3 w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    ) : (
                      <div className="mt-3 text-gray-600">
                        {s.value === undefined || s.value === null
                          ? "-"
                          : String(s.value)}
                      </div>
                    )}

                    {s.description && (
                      <div className="mt-2 text-xs text-gray-400">
                        {s.description}
                      </div>
                    )}
                  </div>

                  {!editingAll && s._id && s.key !== "support" && (
                    <button
                      onClick={() => handleDelete(s)}
                      className="text-sm px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Settings;
