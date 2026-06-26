"use client";

import EastIcon from "@mui/icons-material/East";
import { memo, type ReactNode } from "react";
import type Recipe from "../models/recipe";
import type { RecipePart } from "../models/recipe";
import { displayNum } from "../utils";
import Icon from "./Icon";

/** Recipe name with any leading "Alternate:" prefix removed. */
export function displayRecipeName(recipe: Recipe): string {
  return recipe.name.replace(/^Alternate:\s*/i, "");
}

function recipePowerLabel(recipe: Recipe): string {
  if (recipe.customPowerUsage && recipe.building.basePowerUsage === 0) {
    return `${displayNum(recipe.minPowerUsage ?? 0)}–${displayNum(
      recipe.maxPowerUsage ?? 0,
    )} MW`;
  }
  return `${displayNum(recipe.building.basePowerUsage)} MW`;
}

const PartIcons = memo(function PartIcons({ parts }: { parts: RecipePart[] }) {
  return (
    <div className="flex w-40">
      {parts.map((p) => (
        <span
          key={p.part.slug}
          className="flex flex-row items-center gap-x-0.5 ml-2"
        >
          <Icon src={p.part.iconSmall} label={p.part.name} size={20} />
          <span className="text-xs text-gray-400">
            {displayNum(p.quantity)}
          </span>
        </span>
      ))}
    </div>
  );
});

interface RecipeOverrideRowProps {
  recipe: Recipe;
  onClick?: () => void;
  /** Leading control(s) rendered before the building icon, e.g. a toggle. */
  leading?: ReactNode;
  /** Trailing control(s), e.g. an allow/deny toggle or remove button. */
  trailing?: ReactNode;
  /**
   * When true the row is kept mounted but hidden. Lets long lists filter via a
   * cheap prop flip instead of unmounting hundreds of heavy MUI rows per
   * keystroke (the dominant cost in RecipeListDialog search).
   */
  hidden?: boolean;
}

function RecipeOverrideRow({
  recipe,
  onClick,
  leading,
  trailing,
  hidden,
}: RecipeOverrideRowProps) {
  return (
    <div
      // content-visibility lets the browser skip layout/paint for rows scrolled
      // out of the dialog's viewport; contain-intrinsic-size reserves the height.
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto 40px",
        display: hidden ? "none" : undefined,
      }}
      className={`flex flex-row items-center gap-x-2 py-1 px-1${
        onClick
          ? " cursor-pointer rounded hover:bg-black/5 dark:hover:bg-white/10"
          : ""
      }`}
      onClick={onClick}
    >
      {leading}
      <Icon
        src={recipe.building.iconSmall}
        label={recipe.building.name}
        size={24}
      />
      <span className="text-sm w-44 shrink-0">{displayRecipeName(recipe)}</span>
      <span className="text-xs text-gray-400 w-20 shrink-0">
        {recipePowerLabel(recipe)}
      </span>
      <div className="flex flex-row items-center gap-x-1 grow flex-wrap">
        <PartIcons parts={recipe.ingredients} />
        <EastIcon fontSize="small" className="text-gray-500" />
        <PartIcons parts={recipe.products} />
      </div>
      {trailing}
    </div>
  );
}

export default memo(RecipeOverrideRow);
