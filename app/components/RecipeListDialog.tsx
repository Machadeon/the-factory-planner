"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useMemo, useState } from "react";
import { recipes } from "../models/library";
import RecipeOverrideRow, { displayRecipeName } from "./RecipeOverrideRow";

const sortedRecipes = [...recipes].sort((a, b) =>
  displayRecipeName(a).localeCompare(displayRecipeName(b)),
);

interface RecipeListDialogProps {
  open: boolean;
  onClose: () => void;
  enabledRecipes: string[];
  onToggle: (slug: string, enabled: boolean) => void;
}

export default function RecipeListDialog({
  open,
  onClose,
  enabledRecipes,
  onToggle,
}: RecipeListDialogProps) {
  const [query, setQuery] = useState("");

  const enabledSet = useMemo(() => new Set(enabledRecipes), [enabledRecipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? sortedRecipes.filter(
          (r) =>
            displayRecipeName(r).toLowerCase().includes(q) ||
            r.building.name.toLowerCase().includes(q),
        )
      : sortedRecipes;
    // Enabled recipes first, then by name (sortedRecipes is already name-sorted).
    return [...matched].sort((a, b) => {
      const ea = enabledSet.has(a.slug);
      const eb = enabledSet.has(b.slug);
      if (ea !== eb) return ea ? -1 : 1;
      return 0;
    });
  }, [query, enabledSet]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manage recipes</DialogTitle>
      <DialogContent>
        <p className="text-xs text-gray-400 mb-2">
          Only enabled recipes are used by auto-fill.
        </p>
        <TextField
          size="small"
          fullWidth
          placeholder="Search recipes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-[60vh] overflow-y-auto mt-2">
          {filtered.map((recipe) => {
            const enabled = enabledSet.has(recipe.slug);
            return (
              <RecipeOverrideRow
                key={recipe.slug}
                recipe={recipe}
                onClick={() => onToggle(recipe.slug, !enabled)}
                leading={
                  // Visual only: the whole row handles the toggle, so the switch
                  // ignores pointer events and is read-only to avoid a double flip.
                  <Switch
                    size="small"
                    checked={enabled}
                    readOnly
                    tabIndex={-1}
                    sx={{ pointerEvents: "none" }}
                  />
                }
              />
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 py-2">No matching recipes.</p>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
