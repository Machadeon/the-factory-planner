// Barrel re-export for MUI Drawer — allowlisted per the 2026-07-21 amendment
// to ADR-0001 (plans/adrs/01-styling-system.md): the focus-trap-adjacent
// open/close/restore behavior here is exactly what the historical
// drawer-loop bug lived in, so it stays on MUI's tested implementation
// rather than being hand-rolled.
export { default as Drawer } from "@mui/material/Drawer";
