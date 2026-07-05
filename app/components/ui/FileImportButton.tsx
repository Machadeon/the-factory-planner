import UploadIcon from "@mui/icons-material/Upload";
import { type ReactNode, useRef } from "react";
import IconButton from "./IconButton";

export interface FileImportButtonProps {
  "aria-label": string;
  onFile: (file: File) => void;
  accept?: string;
  /** Trigger icon; defaults to an upload icon. */
  children?: ReactNode;
  className?: string;
}

export default function FileImportButton({
  "aria-label": ariaLabel,
  onFile,
  accept,
  children,
  className,
}: FileImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <IconButton
        aria-label={ariaLabel}
        onClick={() => inputRef.current?.click()}
        className={className}
      >
        {children ?? <UploadIcon fontSize="small" />}
      </IconButton>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        data-testid={`file-import-input:${ariaLabel}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          // Reset so re-selecting the same file fires change again.
          e.target.value = "";
        }}
      />
    </>
  );
}
