"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

interface TagFilterProps {
  tags: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function TagFilter({ tags, value, onChange }: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const options = [
    { value: "", label: "All tags" },
    ...tags.map((tag) => ({ value: tag, label: tag })),
  ];
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) activeItemRef.current?.focus();
  }, [open]);

  function selectOption(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className="download-menu" ref={rootRef}>
      <div className="download-menu__group">
        <button
          type="button"
          className="download-menu__main"
          onClick={() => setOpen((openValue) => !openValue)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {selectedLabel}
        </button>
        <button
          type="button"
          className="download-menu__toggle"
          onClick={() => setOpen((openValue) => !openValue)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Choose tag filter"
        >
          {open ? (
            <ChevronUp size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>

      {open && (
        <div
          className="download-menu__menu"
          role="menu"
          aria-label="Filter by tag"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                ref={selected ? activeItemRef : undefined}
                role="menuitemradio"
                aria-checked={selected}
                className="download-menu__item"
                onClick={() => selectOption(option.value)}
              >
                <span>{option.label}</span>
                <Check
                  size={15}
                  strokeWidth={2.5}
                  className="download-menu__check"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
