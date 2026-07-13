"use client";

import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { recipes } from "../../models/game-data";
import type Recipe from "../../models/recipe";
import RecipeOverrideRow, { displayRecipeName } from "./RecipeOverrideRow";

const sortedRecipes = [...recipes].sort((a, b) =>
  displayRecipeName(a).localeCompare(displayRecipeName(b)),
);

// Memoized so toggling/searching only re-renders the rows whose `enabled`
// actually changed, not all 276. Relies on a stable `onToggle` (see below).
const RecipeToggleRow = memo(function RecipeToggleRow({
  recipe,
  enabled,
  hidden,
  onToggle,
}: {
  recipe: Recipe;
  enabled: boolean;
  hidden: boolean;
  onToggle: (slug: string, enabled: boolean) => void;
}) {
  return (
    <RecipeOverrideRow
      recipe={recipe}
      hidden={hidden}
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
});

interface RecipeListPanelProps {
  enabledRecipes: string[];
  onToggle: (slug: string, enabled: boolean) => void;
}

// Inline, always-visible recipe enable/disable list (formerly RecipeListDialog).
export default function RecipeListPanel({
  enabledRecipes,
  onToggle,
}: RecipeListPanelProps) {
  const [query, setQuery] = useState("");

  // Keep a stable toggle handler so memoized rows don't all re-render when the
  // parent passes a fresh onToggle closure after an enabledRecipes change.
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;
  const handleToggle = useCallback((slug: string, enabled: boolean) => {
    onToggleRef.current(slug, enabled);
  }, []);

  const enabledSet = useMemo(() => new Set(enabledRecipes), [enabledRecipes]);

  // All rows stay mounted in stable name order; search only flips each row's
  // `hidden` flag. `matched` is null when there's no query (everything shows).
  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const set = new Set<string>();
    for (const r of sortedRecipes) {
      if (
        displayRecipeName(r).toLowerCase().includes(q) ||
        r.building.name.toLowerCase().includes(q)
      ) {
        set.add(r.slug);
      }
    }
    return set;
  }, [query]);

  const noMatches = matched !== null && matched.size === 0;

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">
        Only enabled recipes are considered by the optimizer.
      </p>
      <TextField
        size="small"
        fullWidth
        placeholder="Search recipes"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-[60vh] overflow-y-auto mt-2">
        {sortedRecipes.map((recipe) => (
          <RecipeToggleRow
            key={recipe.slug}
            recipe={recipe}
            enabled={enabledSet.has(recipe.slug)}
            hidden={matched !== null && !matched.has(recipe.slug)}
            onToggle={handleToggle}
          />
        ))}
        {noMatches && (
          <p className="text-sm text-gray-400 py-2">No matching recipes.</p>
        )}
      </div>
    </div>
  );
}
