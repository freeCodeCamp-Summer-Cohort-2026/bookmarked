"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  children: ReactNode;
  title: string;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
}

export function Modal({ children, title, onClose, onConfirm }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      const target = event.target as HTMLElement | null;
      const isInteractive = target?.closest(
        "button, input, textarea, select, a[href]",
      );

      if (
        event.key === "Enter" &&
        !event.repeat &&
        !isInteractive &&
        onConfirm
      ) {
        event.preventDefault();
        void onConfirm();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onConfirm]);

  return (
    <div
      className="modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
