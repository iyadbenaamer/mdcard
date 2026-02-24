import { useState, useRef, useEffect } from "react";
import ReactPlayer from "react-player";

const VideoPlayer = ({ url, active }) => {
  const [ready, setReady] = useState(false);
  const [poster, setPoster] = useState(null);
  const playerRef = useRef(null);

  // Pause when not active to save resources
  useEffect(() => {
    if (!active && playerRef.current) {
      try {
        playerRef.current.getInternalPlayer()?.pause?.();
      } catch {}
    }
  }, [active]);

  // Try to capture a poster (first video frame) so users see a preview
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = url;
    video.muted = true;
    // Some hosts require a small seek to get a frame
    const timeout = setTimeout(() => {
      video.currentTime = 0.1;
    }, 200);

    const clean = () => {
      clearTimeout(timeout);
      video.removeAttribute("src");
      video.load?.();
    };

    const handleLoadedData = async () => {
      try {
        video.currentTime = Math.min(0.1, video.duration || 0);
      } catch {}
    };

    const handleSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg");
        if (!cancelled) setPoster(data);
      } catch {}
      clean();
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("seeked", handleSeeked);
    // Fallback: if nothing after 1500ms, abort
    const abortTimer = setTimeout(() => {
      cancelled = true;
      clean();
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(abortTimer);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("seeked", handleSeeked);
      clean();
    };
  }, [url]);

  return (
    <div className="w-full  flex items-center justify-center relative">
      {/* Poster preview (captured frame) */}
      {poster && !ready && (
        <img
          src={poster}
          alt="video preview"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-alt animate-pulse pointer-events-none" />
      )}
      <video
        ref={playerRef}
        className="relative z-10 w-full h-full object-cover"
        src={url}
        autoPlay={!!active}
        muted={!!active}
        playsInline
        controls
        preload="metadata"
        poster={poster || undefined}
        onLoadedMetadata={() => setReady(true)}
        onCanPlay={() => setReady(true)}
        onError={(e) => {
          setReady(true);
          if (process.env.NODE_ENV === "development") console.warn("Video error", e);
        }}
      />
    </div>
  );
};

export default VideoPlayer;
