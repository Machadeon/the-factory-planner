import AddIcon from "@mui/icons-material/Add";
import { type ReactNode, useRef, useState } from "react";
import ActionRow from "./ActionRow";

export interface AddItemControlProps {
  label: string;
  children: (close: () => void) => ReactNode;
  /** Collapse when focus leaves the revealed child. ConstraintsPanel keeps its current stay-open behavior with false. */
  closeOnBlur?: boolean;
  triggerClassName?: string;
}

export default function AddItemControl({
  label,
  children,
  closeOnBlur = true,
  triggerClassName,
}: AddItemControlProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!closeOnBlur) return;
    const next = e.relatedTarget;
    if (next) {
      if (!wrapperRef.current?.contains(next)) close();
      return;
    }
    // relatedTarget is null for clicks on non-focusable content inside the
    // wrapper and for window blur — confirm focus actually left via a rAF
    // recheck of activeElement before closing.
    requestAnimationFrame(() => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(document.activeElement)) return;
      close();
    });
  }

  if (!open) {
    return (
      <ActionRow
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "flex flex-row items-center p-1"}
      >
        <AddIcon fontSize="small" />
        <span className="text-sm ml-1">{label}</span>
      </ActionRow>
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: onBlur is focus containment for the revealed child, not an interactive handler
    <div ref={wrapperRef} onBlur={handleBlur}>
      {children(close)}
    </div>
  );
}
