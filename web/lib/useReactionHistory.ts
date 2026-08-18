"use client";

import { useCallback, useEffect, useState } from "react";

const REACTION_HISTORY_KEY_PREFIX = "bookmarked.reactionHistory";

export function getReactionHistoryKey(userId: string): string {
  return `${REACTION_HISTORY_KEY_PREFIX}.${userId}`;
}

export function useReactionHistory(userId: string | null) {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) {
      setHistory([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(getReactionHistoryKey(userId));

      if (!raw) {
        setHistory([]);
        return;
      }

      const parsed = JSON.parse(raw);

      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "string")
      ) {
        setHistory(parsed);
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    }
  }, [userId]);

  const recordReaction = useCallback(
    (emoji: string) => {
      if (!userId) return;

      setHistory((current) => {
        const next = [
          emoji,
          ...current.filter((existingEmoji) => existingEmoji !== emoji),
        ];
        try {
          window.localStorage.setItem(
            getReactionHistoryKey(userId),
            JSON.stringify(next),
          );
        } catch {
          // Keep the in-memory update if storage is unavailable.
        }
        return next;
      });
    },
    [userId],
  );

  return { history, recordReaction };
}
