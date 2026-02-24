import React, { useEffect, useState } from "react";

const PreloadedImage = ({
  src,
  alt = "",
  width = 48,
  height = 48,
  className = "",
}) => {
  const [loadedSrc, setLoadedSrc] = useState(null);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.src = src;

    // Pre-decode image before displaying it
    img
      .decode()
      .then(() => setLoadedSrc(src))
      .catch(() => setLoadedSrc(null)); // fallback if decoding fails
  }, [src]);

  return loadedSrc ? (
    <img
      src={loadedSrc}
      alt={alt}
      width={width}
      height={height}
      className={`object-cover circle transition-opacity duration-200 ease-in ${className}`}
      style={{ opacity: 1 }}
    />
  ) : (
    <div
      style={{ width, height }}
      className={`circle bg-gray-300 animate-pulse ${className}`}
    />
  );
};

export default PreloadedImage;
