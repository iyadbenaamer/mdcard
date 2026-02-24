import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/*
MediaViewer context handles opening a fullscreen overlay to view post media.
openMediaViewer(files, startIndex)
files: [{ fileType: 'photo' | 'video', path: string }]
startIndex: number
*/

const MediaViewerContext = createContext();

export const MediaViewerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [index, setIndex] = useState(0);

  const openMediaViewer = useCallback((list, startIndex = 0) => {
    if (!Array.isArray(list) || list.length === 0) return;
    setFiles(list);
    setIndex(Math.min(Math.max(startIndex, 0), list.length - 1));
    setIsOpen(true);
  }, []);

  const closeMediaViewer = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      setFiles([]);
      setIndex(0);
    }, 250);
  }, []);

  // lock body scroll
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.cssText;
      document.body.dataset._prev = prev;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.cssText = document.body.dataset._prev || "";
        delete document.body.dataset._prev;
      };
    }
  }, [isOpen]);

  // keyboard handlers
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") closeMediaViewer();
      else if (e.key === "ArrowRight")
        setIndex((i) => Math.min(files.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, files.length, closeMediaViewer]);

  const value = {
    isOpen,
    files,
    index,
    setIndex,
    openMediaViewer,
    closeMediaViewer,
  };

  return (
    <MediaViewerContext.Provider value={value}>
      {children}
      {isOpen && <MediaViewerOverlay />}
    </MediaViewerContext.Provider>
  );
};

export const useMediaViewer = () => useContext(MediaViewerContext);

// Separate component to avoid re-creating in provider body
const MediaViewerOverlay = () => {
  const { files, index, setIndex, closeMediaViewer } = useMediaViewer();
  const file = files[index];
  if (!file) return null;

  const goPrev = (e) => {
    e.stopPropagation();
    setIndex((i) => Math.max(0, i - 1));
  };
  const goNext = (e) => {
    e.stopPropagation();
    setIndex((i) => Math.min(files.length - 1, i + 1));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      className="fixed inset-0 z-1200 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm select-none"
      onClick={closeMediaViewer}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute top-4 right-4 text-white/80 hover:text-white transition text-2xl font-bold"
        onClick={(e) => {
          e.stopPropagation();
          closeMediaViewer();
        }}
      >
        ×
      </button>
      {/* Media container */}
      <div
        className="relative max-w-[95vw] max-h-[85vh] w-auto h-auto flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {file.fileType === "photo" && (
          <img
            src={file.path}
            alt={"media " + (index + 1)}
            className="max-w-full max-h-[85vh] object-contain rounded shadow-lg"
            draggable={false}
          />
        )}
        {file.fileType === "video" && (
          <video
            src={file.path}
            className="max-w-full max-h-[85vh] rounded shadow-lg"
            controls
            autoPlay
          />
        )}
        {files.length > 1 && index > 0 && (
          <button
            aria-label="Previous"
            onClick={goPrev}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg"
            type="button"
          >
            ‹
          </button>
        )}
        {files.length > 1 && index < files.length - 1 && (
          <button
            aria-label="Next"
            onClick={goNext}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg"
            type="button"
          >
            ›
          </button>
        )}
      </div>
      {files.length > 1 && (
        <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {files.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to media ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition ${
                i === index ? "bg-white" : "bg-white/40 hover:bg-white/70"
              }`}
              type="button"
            />
          ))}
        </div>
      )}
      <div
        className="absolute bottom-3 right-4 text-white/60 text-xs"
        aria-hidden
      >
        {index + 1}/{files.length}
      </div>
    </div>
  );
};

export default MediaViewerContext;
