"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { exportResources } from "@/lib/api";

type Format = "csv" | "json";

const FORMATS: ReadonlyArray<{
  value: Format;
  label: string;
  icon: typeof FileJson;
}> = [
  { value: "csv", label: "CSV", icon: FileSpreadsheet },
  { value: "json", label: "JSON", icon: FileJson },
];

interface DownloadMenuProps {
  token?: string;
}

export default function DownloadMenu({ token }: DownloadMenuProps) {
  const [format, setFormat] = useState<Format>("csv");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const canDownload = Boolean(token);

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

  async function handleDownload() {
    if (!token || busy) return;

    setBusy(true);
    setError(null);
    try {
      const { blob, filename } = await exportResources(format, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download Failed");
    } finally {
      setBusy(false);
    }
  }

  function selectFormat(next: Format) {
    setFormat(next);
    setOpen(false);
  }

  return (
    <div className="download-menu" ref={rootRef}>
      <div className="download-menu__group">
        <button
          type="button"
          className="download-menu__main"
          onClick={handleDownload}
          disabled={!canDownload || busy}
          title={
            canDownload
              ? `Download as ${format.toUpperCase()}`
              : "Log in to export your resources"
          }
        >
          <Download size={16} strokeWidth={2} aria-hidden="true" />
          <span>
            {busy ? "Preparing..." : `Download ${format.toUpperCase()}`}
          </span>
        </button>
        <button
          type="button"
          className="download-menu__toggle"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Choose export format"
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
          aria-label="Export format"
        >
          {FORMATS.map((option) => {
            const selected = option.value === format;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                ref={selected ? activeItemRef : undefined}
                role="menuitemradio"
                aria-checked={selected}
                className="download-menu__item"
                onClick={() => selectFormat(option.value)}
              >
                <Icon size={15} strokeWidth={2} aria-hidden="true" />
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

      {error && (
        <p className="download-menu__error" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
