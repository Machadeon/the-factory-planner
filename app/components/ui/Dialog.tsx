// Barrel re-export for MUI's Dialog family (allowlisted — focus trap is the
// hard part MUI already solved, ADR-0001). App code imports these from here
// instead of "@mui/material" directly, satisfying wrap-and-hide with zero
// behavior change from the underlying widgets.
export { default as Dialog } from "@mui/material/Dialog";
export { default as DialogActions } from "@mui/material/DialogActions";
export { default as DialogContent } from "@mui/material/DialogContent";
export { default as DialogTitle } from "@mui/material/DialogTitle";
