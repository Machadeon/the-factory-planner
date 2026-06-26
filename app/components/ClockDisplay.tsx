"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useState } from "react";

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
      <Tooltip
        title={copied ? "Copied!" : `Copy "${fullPrecision}"`}
        enterDelay={300}
      >
        <IconButton size="small" onClick={copy} className="p-0">
          <ContentCopyIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </span>
  );
}
