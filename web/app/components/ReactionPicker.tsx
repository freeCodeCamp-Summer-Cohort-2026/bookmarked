"use client";

export const REACTION_OPTIONS = ["⭐", "🔖", "👍", "❤️", "😂", "🔥", "🚀", "✅"];
export const DEFAULT_REACTIONS = ["⭐", "🔖", "👍"];

export function getQuickReactions(history: string[]): string[] {
  const uniqueHistory = [...new Set(history)];
  const unusedDefaults = DEFAULT_REACTIONS.filter(
    (emoji) => !uniqueHistory.includes(emoji),
  );
  return [...uniqueHistory, ...unusedDefaults].slice(0, 3);
}