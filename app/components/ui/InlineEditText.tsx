import { useRef, useState } from "react";
import TextField from "./TextField";

export interface InlineEditTextProps {
  value: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  "aria-label"?: string;
  className?: string;
}

// Commit fires on Enter and blur whether or not the value changed (matches
// the drawer's former commitEdit). Escape and empty-trim cancel instead.
export default function InlineEditText({
  value,
  onCommit,
  onCancel,
  "aria-label": ariaLabel,
  className,
}: InlineEditTextProps) {
  const [draft, setDraft] = useState(value);
  // Set by Escape so the trailing blur cannot commit the reverted value;
  // reset when a new edit session focuses the input.
  const cancelledRef = useRef(false);

  function commit() {
    if (cancelledRef.current) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    onCommit(trimmed);
  }

  return (
    <TextField
      size="small"
      value={draft}
      autoFocus
      aria-label={ariaLabel}
      onFocus={() => {
        cancelledRef.current = false;
      }}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          cancelledRef.current = true;
          setDraft(value);
          onCancel();
        }
      }}
      className={className}
    />
  );
}
