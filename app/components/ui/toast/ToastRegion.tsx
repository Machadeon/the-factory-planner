"use client";

import { useEffect, useRef } from "react";
import ToastItem from "./ToastItem";
import { TOAST_MAX_VISIBLE, type Toast } from "./ToastProvider";

interface ToastRegionProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

// Renders the visible slice of toasts in a Top-Layer popover so they paint above
// MUI Dialog/Drawer portals (import/restore errors originate from those surfaces).
// Feature-detected: without the Popover API the element degrades to a fixed,
// high-z-index container via the `fixed z-[1500]` classes (MUI modals sit at 1300).
export default function ToastRegion({ toasts, onDismiss }: ToastRegionProps) {
  const ref = useRef<HTMLElement>(null);
  const visible = toasts.slice(0, TOAST_MAX_VISIBLE);
  const hasVisible = visible.length > 0;

  // Promote to the Top Layer via the Popover API when available. The attribute
  // is set imperatively (not in JSX) so environments without popover support
  // (older browsers, jsdom) fall back to the plain `fixed z-[1500]` container
  // and never render a closed — and thus hidden — popover.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.showPopover !== "function") return;
    if (el.popover !== "manual") el.popover = "manual";
    const isOpen = el.matches(":popover-open");
    if (hasVisible && !isOpen) {
      el.showPopover();
    } else if (!hasVisible && isOpen) {
      el.hidePopover();
    }
  }, [hasVisible]);

  return (
    <section
      ref={ref}
      aria-label="Notifications"
      data-testid="toast-region"
      className="fixed inset-auto bottom-4 right-4 z-[1500] m-0 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 border-0 bg-transparent p-0"
    >
      {visible.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </section>
  );
}
