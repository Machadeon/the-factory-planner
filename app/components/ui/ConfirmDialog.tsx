import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import type { ReactNode } from "react";

type ConfirmSeverity = "default" | "warning" | "danger";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Maps the confirm button color: default→primary, warning→warning, danger→error. */
  severity?: ConfirmSeverity;
  /** Optional middle action for three-choice dialogs (e.g. "Discard & load"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const severityColor = {
  default: "primary",
  warning: "warning",
  danger: "error",
} as const;

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  severity = "default",
  secondaryLabel,
  onSecondary,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions>
        {/* Cancel gets initial focus so Enter never confirms by accident. */}
        <Button autoFocus onClick={onCancel}>
          {cancelLabel}
        </Button>
        {secondaryLabel && (
          <Button onClick={onSecondary}>{secondaryLabel}</Button>
        )}
        <Button
          variant="contained"
          color={severityColor[severity]}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
