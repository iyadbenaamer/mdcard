import { useState, useEffect, useCallback, useRef } from "react";
import { useMediaViewer } from "components/media-viewer/MediaViewerContext";
import ToggleButtons from "./ToggleButtons";
import VideoPlayer from "./VideoPlayer";
import "./index.css";
import { useWindowWidth } from "hooks/useWindowWidth";

const Slider = (props) => {
  const { files } = props;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadingStates, setLoadingStates] = useState({});
  const [dimensions, setDimensions] = useState({}); // { index: {w,h,ratio} }
  const containerRef = useRef(null);
  const touchStart = useRef(null);

  const file = files[currentSlide];
  const { openMediaViewer } = useMediaViewer() || {};
  const windowWidth = useWindowWidth();
  // Set up loading state for all images on files change
  useEffect(() => {
    if (!files || files.length === 0) return;
    const initialLoadingStates = {};
    files.forEach((file, index) => {
      if (file.fileType === "photo") {
        initialLoadingStates[index] = true;
      }
    });
    setLoadingStates(initialLoadingStates);
  }, [files]);

  // Load current, previous, and next images when currentSlide changes
  useEffect(() => {
    if (!files || files.length === 0) return;
    const indicesToLoad = [currentSlide];
    if (currentSlide > 0) indicesToLoad.push(currentSlide - 1);
    if (currentSlide < files.length - 1) indicesToLoad.push(currentSlide + 1);

    indicesToLoad.forEach((index) => {
      const file = files[index];
      if (file && file.fileType === "photo") {
        setLoadingStates((prev) => ({ ...prev, [index]: true }));
        const img = new Image();
        img.onload = () => {
          setDimensions((prev) => ({
            ...prev,
            [index]: {
              w: img.naturalWidth,
              h: img.naturalHeight,
              ratio: img.naturalWidth / img.naturalHeight || 1,
            },
          }));
          setLoadingStates((prev) => ({ ...prev, [index]: false }));
        };
        img.onerror = () => {
          setLoadingStates((prev) => ({ ...prev, [index]: false }));
        };
        img.src = file.path;
      }
    });
  }, [currentSlide, files]);

  // Keyboard navigation
  const handleKey = useCallback(
    (e) => {
      if (!files || files.length === 0) return;
      if (e.key === "ArrowRight") {
        setCurrentSlide((s) => Math.min(files.length - 1, s + 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((s) => Math.max(0, s - 1));
      }
    },
    [files],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Touch / swipe navigation
  const onTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStart.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStart.current;
    const threshold = 40; // px
    if (delta < -threshold)
      setCurrentSlide((s) => Math.min(files.length - 1, s + 1));
    else if (delta > threshold) setCurrentSlide((s) => Math.max(0, s - 1));
    touchStart.current = null;
  };

  // Determine aspect ratio for current slide (fallback 1)
  const currentAspect = dimensions[currentSlide]?.ratio || 1; // width / height
  // Clamp aspect to avoid extreme tall/skinny containers; optional
  const clampedAspect = Math.min(Math.max(currentAspect, 0.55), 1.9);
  const aspectStyle = {
    aspectRatio: clampedAspect, // modern browsers
    // Fallback height logic if aspect-ratio unsupported (optional)
    maxHeight: "80vh",
    width: "100%",
  };
  // For very tall images (ratio < 0.8) we zoom/crop (object-cover). Otherwise also cover for uniform fill.
  const objectFitClass = "object-cover";

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full sm:rounded-xl overflow-hidden mb-1 flex items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="group"
        aria-roledescription="carousel"
        aria-label="Post media"
      >
        <div
          className="relative w-full flex items-center justify-center"
          style={aspectStyle}
        >
          {/* Loading overlay */}
          {loadingStates[currentSlide] && file.fileType === "photo" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800">
              <div className="loading-shimmer w-full h-full" />
            </div>
          )}
          {/* Image */}
          {!loadingStates[currentSlide] && file.fileType === "photo" && (
            <img
              className={`w-full h-full ${objectFitClass} select-none transition-opacity duration-300 cursor-pointer`}
              loading="lazy"
              src={file.path}
              alt={`media ${currentSlide + 1}`}
              draggable={false}
              onClick={() =>
                openMediaViewer && openMediaViewer(files, currentSlide)
              }
            />
          )}
          {/* Video */}
          {file.fileType === "video" && (
            <div
              className="w-full h-full flex items-center justify-center cursor-pointer"
              onClick={() =>
                openMediaViewer && openMediaViewer(files, currentSlide)
              }
            >
              <VideoPlayer url={file.path} active={true} />
            </div>
          )}
        </div>
        {windowWidth > 768 && (
          <ToggleButtons
            slidesCount={files?.length}
            currentSlide={currentSlide}
            setCurrentSlide={setCurrentSlide}
          />
        )}
        {/* Preload neighbor images (hidden) */}
        {files.map((f, i) => {
          if (f.fileType !== "photo") return null;
          if (Math.abs(i - currentSlide) === 1) {
            return <link rel="prefetch" as="image" href={f.path} key={i} />;
          }
          return null;
        })}
      </div>
      {files?.length > 1 && (
        <div
          className="bullets w-fit flex gap-1 mt-1 mb-0 mx-auto"
          aria-label="Slide indicators"
        >
          {files.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSlide(i)}
              className={`bg-inverse w-[5px] aspect-square transition-opacity ${
                i !== currentSlide ? "opacity-30" : "opacity-100"
              } ${loadingStates[i] ? "animate-pulse" : ""}`}
              style={{ borderRadius: "50%" }}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === currentSlide}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default Slider;
