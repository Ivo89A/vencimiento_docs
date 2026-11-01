"use client";

import { useSyncExternalStore } from "react";

const mobileQuery = "(max-width: 767px)";
function subscribeToViewport(listener: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const getMobileViewport = () => window.matchMedia(mobileQuery).matches;
const getServerViewport = () => false;

/** Only one set of selectable rows is mounted, so CSV never receives hidden duplicates. */
export function useMobileViewport() {
  return useSyncExternalStore(subscribeToViewport, getMobileViewport, getServerViewport);
}
