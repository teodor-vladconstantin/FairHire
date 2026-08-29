"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe "has the user seen this once" flag. Starts `false` on both the
 * server and the client's first render (so they agree and there's no
 * hydration mismatch — same pattern CandidateView.tsx uses for its `now`
 * state), then syncs from localStorage in a mount-only effect.
 */
export function useLocalStorageFlag(key: string): [boolean, () => void] {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(key) === "1");
    } catch {
      // localStorage unavailable (private browsing, etc.) — default to unseen.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markSeen() {
    setSeen(true);
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Nothing to persist to — the in-memory flag above still holds for this session.
    }
  }

  return [seen, markSeen];
}
