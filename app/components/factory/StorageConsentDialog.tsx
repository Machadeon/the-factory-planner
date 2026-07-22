"use client";

import { grantConsent } from "../../models/storage-service";
import Button from "../ui/Button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "../ui/Dialog";

interface Props {
  open: boolean;
  onAllow: () => void;
  onCancel: () => void;
}

export default function StorageConsentDialog({
  open,
  onAllow,
  onCancel,
}: Props) {
  function handleAllow() {
    grantConsent();
    onAllow();
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Save factories to this browser?</DialogTitle>
      <DialogContent>
        <p className="mb-4">
          This app can save your factories in your browser using{" "}
          <strong>localStorage</strong> — a small storage area built into your
          browser.
        </p>
        <p className="mb-4">
          Your factory data stays entirely on your device. Nothing is sent to
          any server, and no account is required. You can export your factories
          as JSON files at any time for backup or sharing.
        </p>
        <p className="text-sm text-gray-400">
          You can revoke this permission at any time by clearing your browser's
          site data for this page.
        </p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleAllow} variant="contained">
          Allow
        </Button>
      </DialogActions>
    </Dialog>
  );
}
