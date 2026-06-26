"use client";

import EastIcon from "@mui/icons-material/East";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";
import type { ReactNode } from "react";
import type Recipe from "../models/recipe";
import type { RecipePart } from "../models/recipe";
import { displayNum } from "../utils";

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

function PartIcons({ parts }: { parts: RecipePart[] }) {
  return (
    <>
      {parts.map((p) => (
        <span
          key={p.part.slug}
          className="flex flex-row items-center gap-x-0.5"
        >
          <Tooltip title={p.part.name}>
            <Image
              src={p.part.iconSmall}
              alt={p.part.name}
              width={20}
              height={20}
            />
          </Tooltip>
          <span className="text-xs text-gray-400">
            {displayNum(p.quantity)}
          </span>
        </span>
      ))}
    </>
  );
}

interface RecipeOverrideRowProps {
  recipe: Recipe;
  /** When true the recipe is denied — render dimmed/struck-through. */
  denied?: boolean;
  onClick?: () => void;
  /** Trailing control(s), e.g. an allow/deny toggle or remove button. */
  trailing?: ReactNode;
}

export default function RecipeOverrideRow({
  recipe,
  denied,
  onClick,
  trailing,
}: RecipeOverrideRowProps) {
  return (
    <div
      className={`flex flex-row items-center gap-x-2 py-1${
        onClick ? " cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <Tooltip title={recipe.building.name}>
        <Image
          src={recipe.building.iconSmall}
          alt={recipe.building.name}
          width={24}
          height={24}
        />
      </Tooltip>
      <span
        className={`text-sm w-44 shrink-0 ${
          denied ? "line-through text-gray-500" : ""
        }`}
      >
        {displayRecipeName(recipe)}
      </span>
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
