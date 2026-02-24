import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for infinite scroll functionality
 * @param {Function} fetchNextPage - Function to fetch the next page of data
 * @param {boolean} hasMore - Whether there are more items to load
 * @param {boolean} isLoading - Whether a request is currently in progress
 * @param {Object} options - Configuration options
 * @param {number} options.rootMargin - Margin around the root element (default: "100px")
 * @param {number} options.threshold - Threshold for intersection (default: 0.1)
 * @returns {Object} - Object containing the loading ref and observer ref
 */
const useInfiniteScroll = (fetchNextPage, hasMore, isLoading, options = {}) => {
  const { rootMargin = "100px", threshold = 0.1 } = options;
  const loadingRef = useRef(null);
  const observerRef = useRef(null);

  const handleIntersection = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasMore, isLoading]
  );

  useEffect(() => {
    if (!loadingRef.current || !hasMore) return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, hasMore, rootMargin, threshold]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { loadingRef, observerRef };
};

export default useInfiniteScroll;
