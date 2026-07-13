"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

export type RejectChoice = "never" | "no" | "yes" | "always";

interface RecipeRejectDialogProps {
  open: boolean;
  /** Display name of the recipe being rejected, for the prompt copy. */
  recipeName?: string;
  onResolve: (choice: RejectChoice) => void;
  onClose: () => void;
}

export default function RecipeRejectDialog({
  open,
  recipeName,
  onResolve,
  onClose,
}: RecipeRejectDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Remove from optimizer recipe list?</DialogTitle>
      <DialogContent>
        <p className="text-sm text-gray-400">
          Also remove{" "}
          {recipeName ? <strong>{recipeName}</strong> : "this recipe"} from the
          recipes the optimizer may suggest?
        </p>
        <ul className="text-xs text-gray-400 mt-2 list-disc list-inside">
          <li>
            <strong>Never</strong> — don&apos;t remove, and stop asking.
          </li>
          <li>
            <strong>No</strong> — don&apos;t remove this time.
          </li>
          <li>
            <strong>Yes</strong> — remove this time.
          </li>
          <li>
            <strong>Always</strong> — remove, and always remove from now on.
          </li>
        </ul>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onResolve("never")}>Never</Button>
        <Button onClick={() => onResolve("no")}>No</Button>
        <Button onClick={() => onResolve("yes")}>Yes</Button>
        <Button onClick={() => onResolve("always")} variant="contained">
          Always
        </Button>
      </DialogActions>
    </Dialog>
  );
}
