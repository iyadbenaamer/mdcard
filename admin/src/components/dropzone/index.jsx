import { useState, useRef } from "react";

import File from "./File";

import AddIcon from "assets/icons/add.svg?react";

const DropZone = (props) => {
  const { files, setFiles } = props;
  const [isDragging, setIsDragging] = useState(false);
  const [filesPreview, setFilesPreview] = useState([]);
  const input = useRef(null);

  const MAX_FILES = 100;
  const addFile = (file) => {
    if (!file) return;
    if (!(file.type.startsWith("image") || file.type.startsWith("video")))
      return;
    setFiles((prev) => {
      if (prev.length >= MAX_FILES) return prev; // already at limit
      const next = [...prev, file];
      return next.slice(0, MAX_FILES);
    });
    // Only create preview if not exceeding limit
    if (files.length < MAX_FILES) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (ev) => {
        setFilesPreview((prev) => {
          if (prev.length >= MAX_FILES) return prev;
          return [...prev, ev.currentTarget.result];
        });
      };
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      Array.from(droppedFiles).forEach(addFile);
    }
  };

  return (
    <>
      <input
        type="file"
        name="media"
        ref={input}
        accept="video/*, video/x-m4v, video/webm, video/x-ms-wmv, video/x-msvideo, video/3gpp, video/flv, video/x-flv, video/mp4, video/quicktime, video/mpeg, video/ogv, .ts, .mkv, image/*, image/heic, image/heif"
        style={{ display: "none" }}
        onChange={(e) => {
          const list = Array.from(e.target.files || []);
          for (const f of list) {
            if (files.length >= MAX_FILES) break;
            addFile(f);
          }
          e.target.value = "";
        }}
      />
      <div
        dir="rtl"
        className="w-full min-h-40"
        onDragEnterCapture={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-start gap-3">
          {isDragging ? (
            <div
              style={{ borderRadius: 8 }}
              className="flex justify-center items-center w-full
            p-5 border-dashed border-2 bg-300 cursor-pointer min-h-40"
            >
              Drag files here
            </div>
          ) : (
            <div
              style={{ borderRadius: 8 }}
              className="grid gap-2 w-full grid-cols-6
            p-5 border-solid border-2 bg-300 min-h-40"
            >
              {filesPreview &&
                filesPreview.map((filePreview, i) => (
                  <File
                    key={i}
                    filePreview={filePreview}
                    file={files[i]}
                    setFiles={setFiles}
                    setFilesPreview={setFilesPreview}
                  />
                ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => input.current.click()}
              disabled={files.length >= MAX_FILES}
              className={`h-10 w-10 rounded-3xl flex items-center justify-center transition-colors ${
                files.length >= MAX_FILES
                  ? "bg-gray-400 cursor-not-allowed"
                  : "hover:brightness-110"
              }`}
              title={
                files.length >= MAX_FILES
                  ? "Maximum files reached"
                  : `Add media (${MAX_FILES - files.length} left)`
              }
            >
              <AddIcon className="text-white" />
            </button>
            <span className="text-xs opacity-70">
              {files.length}/{MAX_FILES}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
export default DropZone;
