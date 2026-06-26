"use client";

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import type { MouseEvent } from "react";
import Clickable from "./Clickable";

interface SuggestedActionsProps {
  onAccept: (e: MouseEvent<HTMLDivElement>) => void;
  onReject: (e: MouseEvent<HTMLDivElement>) => void;
}

/** "Suggested" chip with accept (make permanent) and reject affordances. */
export default function SuggestedActions({
  onAccept,
  onReject,
}: SuggestedActionsProps) {
  return (
    <span className="flex flex-row items-center gap-x-1">
      <Chip label="Suggested" size="small" color="info" />
      <Tooltip title="Accept (make permanent)">
        <span>
          <Clickable onClick={onAccept} className="p-1">
            <CheckIcon fontSize="small" />
          </Clickable>
        </span>
      </Tooltip>
      <Tooltip title="Reject">
        <span>
          <Clickable onClick={onReject} className="p-1">
            <CloseIcon fontSize="small" />
          </Clickable>
        </span>
      </Tooltip>
    </span>
  );
}
