"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from "@mui/material";

interface FactoryJsonDialogProps {
  open: boolean;
  onClose: () => void;
  buildJson: () => unknown;
}

export default function FactoryJsonDialog({
  open,
  onClose,
  buildJson,
}: FactoryJsonDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex items-center justify-between">
        Factory JSON
        <Tooltip title="Copy to clipboard">
          <IconButton
            size="small"
            aria-label="Copy to clipboard"
            onClick={() =>
              navigator.clipboard.writeText(
                JSON.stringify(buildJson(), null, 2),
              )
            }
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        <pre className="text-xs overflow-auto whitespace-pre-wrap break-all">
          {JSON.stringify(buildJson(), null, 2)}
        </pre>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
