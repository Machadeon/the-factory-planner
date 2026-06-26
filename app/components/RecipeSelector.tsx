"use client";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Image from "next/image";
import type { SyntheticEvent } from "react";
import { recipes } from "../models/library";
import type Recipe from "../models/recipe";
import { displayRecipeName } from "./RecipeOverrideRow";

interface RecipeSelectorProps {
  /** Slugs of recipes already overridden (excluded from options). */
  existingRecipes: string[];
  onRecipeSelected: (recipe: Recipe) => void;
}

export default function RecipeSelector({
  existingRecipes,
  onRecipeSelected,
  ...other
}: RecipeSelectorProps) {
  const recipeOptions = recipes
    .filter((recipe) => existingRecipes.indexOf(recipe.slug) < 0)
    .map((recipe) => ({ label: displayRecipeName(recipe), recipe }))
    .sort((a, b) => a.label.localeCompare(b.label));

  function onChange(
    _: SyntheticEvent<Element, Event>,
    option: { label: string; recipe: Recipe } | null,
  ) {
    if (option) onRecipeSelected(option.recipe);
  }

  return (
    <Autocomplete
      {...other}
      openOnFocus
      options={recipeOptions}
      getOptionKey={(o) => o.recipe.slug}
      isOptionEqualToValue={(o, v) => o.recipe.slug === v.recipe.slug}
      renderInput={(params) => (
        <TextField {...params} label="Recipe" autoFocus />
      )}
      renderOption={(params, option) => (
        <li {...params} key={params.key}>
          <Image
            key={option.recipe.slug}
            src={option.recipe.building.iconSmall}
            alt={option.recipe.building.name}
            width={24}
            height={24}
            className="inline mr-2"
          />
          {option.label}
        </li>
      )}
      onChange={onChange}
    />
  );
}
