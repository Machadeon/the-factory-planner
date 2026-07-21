"use client";

import { useEffect, useState } from "react";
import {
  TOAST_AUTO_DISMISS_MS,
  type Toast,
  type ToastVariant,
} from "./ToastProvider";

interface VariantMeta {
  glyph: string;
  label: string;
  classes: string;
  sticky: boolean;
}

// Non-color signaling (R4.S2): each variant carries a distinct glyph + a
// screen-reader label prefix in addition to its color.
const VARIANT_META: Record<ToastVariant, VariantMeta> = {
  error: {
    glyph: "⚠",
    label: "Error",
    classes: "border-red-500 bg-red-950 text-red-100",
    sticky: true,
  },
  success: {
    glyph: "✓",
    label: "Success",
    classes: "border-green-500 bg-green-950 text-green-100",
    sticky: false,
  },
  info: {
    glyph: "ℹ",
    label: "Info",
    classes: "border-sky-500 bg-sky-950 text-sky-100",
    sticky: false,
  },
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: number) => void;
}

export default function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const meta = VARIANT_META[toast.variant];
  const isError = toast.variant === "error";
  const [entered, setEntered] = useState(false);

  // Trigger the enter transition on the paint after mount so it animates from
  // the initial state rather than snapping (D9). Skipped visually under
  // prefers-reduced-motion via the motion-reduce classes.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Sticky errors never auto-dismiss; info/success time out. Per-item timer so
  // its lifecycle is tied to this element and cleaned up on unmount (idempotent
  // under StrictMode double-invoke via the cleanup).
  useEffect(() => {
    if (meta.sticky) return;
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [meta.sticky, onDismiss, toast.id]);

  return (
    <div
      data-testid="toast"
      data-variant={toast.variant}
      className={`flex items-start gap-2 rounded border p-3 shadow-lg transition-all duration-200 motion-reduce:transition-none ${meta.classes} ${
        entered
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0 motion-reduce:translate-y-0"
      }`}
    >
      <span
        aria-hidden="true"
        data-testid="toast-icon"
        className="select-none leading-6"
      >
        {meta.glyph}
      </span>
      {/* Announced node holds only the message text; the close button is a
          sibling outside it so AT reliably exposes both (D5). */}
      <p
        data-testid="toast-message"
        role={isError ? "alert" : "status"}
        aria-live={isError ? undefined : "polite"}
        className="flex-1 text-sm leading-6"
      >
        <span className="sr-only">{meta.label}: </span>
        {toast.message}
      </p>
      <button
        type="button"
        aria-label="Dismiss notification"
        data-testid="toast-close"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-1 leading-none hover:bg-white/10"
      >
        ✕
      </button>
    </div>
  );
}
