import { useEffect, useRef, useState } from "react";

/**
 * ImageUpload
 *
 * Props:
 *  - value       {File | null}             controlled File object (for new uploads)
 *  - onChange    {(file: File|null)=>void}  called with the selected File or null on clear
 *  - existingUrl {string}                  current image URL from the server (for edit mode preview)
 *  - label       {string}                  optional label (default "الصورة")
 */
const ImageUpload = ({ value, onChange, existingUrl = "", label = "الصورة", className = "h-36" }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null);

  // Create / revoke object URL when a new File is selected
  useEffect(() => {
    if (!value) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  // The URL to show in the preview:
  //   - objectUrl  → newly selected file
  //   - existingUrl → server image (edit mode, no new file yet)
  const previewSrc = objectUrl || existingUrl || null;

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    onChange(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ""; // allow re-selecting same file
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleClear = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {label && (
        <span className="block text-sm font-medium text-slate-600">{label}</span>
      )}

      {/* Drop zone / preview */}
      <div
        onClick={() => !previewSrc && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${className} ${dragging
            ? "border-emerald-400 bg-emerald-50"
            : previewSrc
              ? "cursor-default border-slate-200 bg-slate-50"
              : "cursor-pointer border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50"
          }`}
      >
        {previewSrc ? (
          <>
            <img
              src={previewSrc}
              alt="preview"
              loading="lazy"
              className="h-full w-full object-contain"
            />
            {/* Clear new file (only when a new file is staged) */}
            {value && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-600"
                title="إزالة الصورة الجديدة"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            )}
            {/* Change button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/50 px-2 py-0.5 text-xs text-white hover:bg-black/70"
            >
              تغيير
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-xs">اسحب صورة أو اضغط للاختيار</p>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
};

export default ImageUpload;
