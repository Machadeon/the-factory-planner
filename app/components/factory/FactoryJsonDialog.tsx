"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Button from "../ui/Button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../ui/Dialog";
import IconButton from "../ui/IconButton";

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
        <IconButton
          aria-label="Copy to clipboard"
          className="p-1"
          onClick={() =>
            navigator.clipboard.writeText(JSON.stringify(buildJson(), null, 2))
          }
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
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
