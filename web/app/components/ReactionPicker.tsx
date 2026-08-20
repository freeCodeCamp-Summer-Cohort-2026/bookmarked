"use client";

import { useState } from "react";

export const REACTION_OPTIONS = [
  "⭐",
  "🔖",
  "👍",
  "❤️",
  "😂",
  "🔥",
  "🚀",
  "✅",
];
export const DEFAULT_REACTIONS = ["⭐", "🔖", "👍"];

interface ReactionPickerProps {
  history: string[];
  onSelect: (emoji: string) => void;
}

export function getQuickReactions(history: string[]): string[] {
  const uniqueHistory = [...new Set(history)];
  const unusedDefaults = DEFAULT_REACTIONS.filter(
    (emoji) => !uniqueHistory.includes(emoji),
  );
  return [...uniqueHistory, ...unusedDefaults].slice(0, 3);
}

export default function ReactionPicker({
  history,
  onSelect,
}: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const quickReactions = getQuickReactions(history);
  const handleDropdownSelection = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className="reaction-picker">
      {quickReactions.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="reaction-button"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
      <button
        type="button"
        className="reaction-dropdown-toggle"
        aria-expanded={isOpen}
        aria-label="Toggle reaction menu"
        onClick={() => setIsOpen((current) => !current)}
      >
        ▼
      </button>
      {isOpen && (
        <div className="reaction-dropdown">
          {REACTION_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="reaction-button"
              onClick={() => handleDropdownSelection(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
