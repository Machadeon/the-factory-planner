"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useState } from "react";
import IconButton from "../ui/IconButton";

interface ClockDisplayProps {
  clock: number;
}

export default function ClockDisplay({ clock }: ClockDisplayProps) {
  const [copied, setCopied] = useState(false);
  const fullPrecision = `${clock.toFixed(5)}%`;

  function copy() {
    navigator.clipboard.writeText(fullPrecision);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className="inline-flex items-center gap-x-0.5 ps-1">
      <span>{clock.toFixed(1)}%</span>
      <IconButton
        aria-label={copied ? "Copied!" : `Copy "${fullPrecision}"`}
        onClick={copy}
        className="p-0"
        tooltipEnterDelay={300}
      >
        <ContentCopyIcon className="text-[14px]!" />
      </IconButton>
    </span>
  );
}
