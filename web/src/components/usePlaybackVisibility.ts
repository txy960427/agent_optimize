import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

const motionQuery = "(prefers-reduced-motion: reduce)";
const readMotionPreference = () => window.matchMedia(motionQuery).matches;
function subscribeMotionPreference(changed: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
}

export function useReducedMotionPreference() {
  return useSyncExternalStore(
    subscribeMotionPreference, readMotionPreference, () => true,
  );
}

/** Pause teaching playback when its surface or the page is not visible. */
export function usePlaybackVisibility<T extends HTMLElement>(
  surface: RefObject<T | null>,
) {
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    );
    if (surface.current) observer.observe(surface.current);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [surface]);

  return pageVisible && inView;
}
