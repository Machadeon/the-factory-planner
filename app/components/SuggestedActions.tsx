"use client";

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Chip from "@mui/material/Chip";
import type { MouseEvent } from "react";
import IconButton from "./ui/IconButton";

interface SuggestedActionsProps {
  onAccept: (e: MouseEvent<HTMLButtonElement>) => void;
  onReject: (e: MouseEvent<HTMLButtonElement>) => void;
}

/** "Suggested" chip with accept (make permanent) and reject affordances. */
export default function SuggestedActions({
  onAccept,
  onReject,
}: SuggestedActionsProps) {
  return (
    <span className="flex flex-row items-center gap-x-1">
      <Chip label="Suggested" size="small" color="info" />
      <IconButton
        aria-label="Accept (make permanent)"
        onClick={onAccept}
        className="p-1"
      >
        <CheckIcon fontSize="small" />
      </IconButton>
      <IconButton aria-label="Reject" onClick={onReject} className="p-1">
        <CloseIcon fontSize="small" />
      </IconButton>
    </span>
  );
}
