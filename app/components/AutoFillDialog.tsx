"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type Factory from "../models/factory";
import {
  type AutoFillConfig,
  defaultAutoFillConfig,
  MAX_GAME_PHASE,
  type ScoringObjective,
} from "../models/factory";
import {
  deserializeFactory,
  type StorageLibrary,
} from "../models/factory-storage";
import { partSlugLookup, recipes } from "../models/library";
import type Recipe from "../models/recipe";
import { displayNum } from "../utils";
import Clickable from "./Clickable";
import { HorizontalDivider } from "./Dividers";
import PartSelector from "./PartSelector";
import RecipeOverrideRow, { displayRecipeName } from "./RecipeOverrideRow";

const OBJECTIVE_OPTIONS: { value: ScoringObjective; label: string }[] = [
  { value: "sinkPoints", label: "Max sink points" },
  { value: "power", label: "Min power" },
  { value: "buildings", label: "Min buildings" },
  { value: "inputValue", label: "Min input value" },
];

const recipeBySlug: Record<string, Recipe> = {};
for (const r of recipes) recipeBySlug[r.slug] = r;

function isRecipeAllowed(config: AutoFillConfig, recipe: Recipe): boolean {
  if (recipe.slug in config.recipeOverrides) {
    return config.recipeOverrides[recipe.slug];
  }
  return recipe.alternate
    ? config.alternateRecipesEnabled
    : config.defaultRecipesEnabled;
}

interface AutoFillDialogProps {
  open: boolean;
  onClose: () => void;
  factory: Factory;
  onApply: () => void;
  library?: StorageLibrary;
  currentFactoryId?: string | null;
}

export default function AutoFillDialog({
  open,
  onClose,
  factory,
  onApply,
  library,
  currentFactoryId,
}: AutoFillDialogProps) {
  const [config, setConfig] = useState<AutoFillConfig>(() => ({
    ...defaultAutoFillConfig(),
    ...factory.autoFill,
  }));
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally sync only when dialog opens, not on every factory.autoFill mutation
  useEffect(() => {
    if (open) {
      setConfig({ ...defaultAutoFillConfig(), ...factory.autoFill });
      setShowPartSelector(false);
      setRecipeSearch("");
    }
  }, [open]);

  function update(patch: Partial<AutoFillConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  // Toggling a master switch clears the per-recipe overrides in that category so
  // the switch is the source of truth again. Reversible via Cancel.
  function toggleCategory(category: "default" | "alternate", enabled: boolean) {
    setConfig((prev) => {
      const overrides = { ...prev.recipeOverrides };
      for (const slug of Object.keys(overrides)) {
        const recipe = recipeBySlug[slug];
        if (!recipe) continue;
        if (
          (category === "alternate" && recipe.alternate) ||
          (category === "default" && !recipe.alternate)
        ) {
          delete overrides[slug];
        }
      }
      return category === "alternate"
        ? {
            ...prev,
            alternateRecipesEnabled: enabled,
            recipeOverrides: overrides,
          }
        : {
            ...prev,
            defaultRecipesEnabled: enabled,
            recipeOverrides: overrides,
          };
    });
  }

  function toggleRecipeOverride(recipe: Recipe) {
    setConfig((prev) => {
      const overrides = { ...prev.recipeOverrides };
      overrides[recipe.slug] = !isRecipeAllowed(prev, recipe);
      return { ...prev, recipeOverrides: overrides };
    });
  }

  function removeRecipeOverride(slug: string) {
    setConfig((prev) => {
      const overrides = { ...prev.recipeOverrides };
      delete overrides[slug];
      return { ...prev, recipeOverrides: overrides };
    });
  }

  function addAvailablePart(slug: string) {
    update({ availableParts: [...config.availableParts, slug] });
    setShowPartSelector(false);
  }

  function removeAvailablePart(slug: string) {
    update({ availableParts: config.availableParts.filter((s) => s !== slug) });
  }

  function addSourceFactory(id: string) {
    if (!config.availableFactoryIds.includes(id)) {
      update({ availableFactoryIds: [...config.availableFactoryIds, id] });
    }
  }

  function removeSourceFactory(id: string) {
    update({
      availableFactoryIds: config.availableFactoryIds.filter((i) => i !== id),
    });
  }

  function handleApply() {
    factory.autoFill = config;
    factory.autoCalculateRates();
    onApply();
    onClose();
  }

  const overrideSlugs = Object.keys(config.recipeOverrides);

  const recipeResults = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase();
    if (!q) return [];
    return recipes
      .filter(
        (r) =>
          !(r.slug in config.recipeOverrides) &&
          displayRecipeName(r).toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [recipeSearch, config.recipeOverrides]);

  // Resolve selected source factories to their names + produced parts/rates.
  const sourceFactories = useMemo(() => {
    if (!library) return [];
    return config.availableFactoryIds.map((id) => {
      const sf = library.factories.find((f) => f.id === id);
      const f = sf ? deserializeFactory(sf, library) : null;
      const outputs = f ? factory.availableOutputsFrom(f) : [];
      return { id, name: sf?.name ?? id, outputs };
    });
  }, [config.availableFactoryIds, library, factory]);

  const factoryOptions = useMemo(() => {
    if (!library) return [];
    return library.factories
      .filter(
        (f) =>
          f.id !== currentFactoryId &&
          !config.availableFactoryIds.includes(f.id),
      )
      .map((f) => ({ label: f.name, id: f.id }));
  }, [library, currentFactoryId, config.availableFactoryIds]);

  const partExclusions = config.availableParts;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Auto-fill Recipes</DialogTitle>
      <DialogContent>
        {/* Run mode */}
        <FormControlLabel
          control={
            <Switch
              checked={config.eager}
              onChange={(_, v) => update({ eager: v })}
            />
          }
          label="Re-run on every edit (eager)"
        />
        <p className="text-xs text-gray-400 mb-1">
          May be slow with many recipes.
        </p>

        <HorizontalDivider />

        {/* Scoring objective */}
        <p className="text-sm mt-2 mb-1">Optimize for</p>
        <RadioGroup
          value={config.objective}
          onChange={(_, v) => update({ objective: v as ScoringObjective })}
        >
          {OBJECTIVE_OPTIONS.map((o) => (
            <FormControlLabel
              key={o.value}
              value={o.value}
              control={<Radio size="small" />}
              label={o.label}
            />
          ))}
        </RadioGroup>

        <HorizontalDivider />

        {/* Keep vs overwrite */}
        <FormControlLabel
          control={
            <Switch
              checked={config.overwrite}
              onChange={(_, v) => update({ overwrite: v })}
            />
          }
          label={
            config.overwrite
              ? "Overwrite all production lines"
              : "Fill gaps only (keep my recipes)"
          }
        />

        <HorizontalDivider />

        {/* Tech / game phase filter */}
        <div className="flex flex-row items-center gap-x-2 mt-2 mb-2">
          <span className="text-sm w-28 shrink-0">Game phase</span>
          <Select
            size="small"
            value={config.phase}
            onChange={(e) => update({ phase: Number(e.target.value) })}
          >
            {Array.from({ length: MAX_GAME_PHASE }, (_, i) => i + 1).map(
              (p) => (
                <MenuItem key={p} value={p}>
                  Phase {p}
                </MenuItem>
              ),
            )}
          </Select>
        </div>
        <FormControlLabel
          control={
            <Switch
              checked={config.defaultRecipesEnabled}
              onChange={(_, v) => toggleCategory("default", v)}
            />
          }
          label="Default recipes enabled"
        />
        <FormControlLabel
          control={
            <Switch
              checked={config.alternateRecipesEnabled}
              onChange={(_, v) => toggleCategory("alternate", v)}
            />
          }
          label="Alternate recipes enabled"
        />

        {/* Active overrides */}
        <p className="text-xs text-gray-400 mt-2 mb-1">Recipe overrides</p>
        {overrideSlugs.length === 0 ? (
          <p className="text-sm text-gray-400">No recipe overrides.</p>
        ) : (
          overrideSlugs.map((slug) => {
            const recipe = recipeBySlug[slug];
            if (!recipe) return null;
            return (
              <RecipeOverrideRow
                key={slug}
                recipe={recipe}
                denied={config.recipeOverrides[slug] === false}
                trailing={
                  <Clickable
                    onClick={() => removeRecipeOverride(slug)}
                    className="p-1"
                  >
                    <DeleteIcon fontSize="small" />
                  </Clickable>
                }
              />
            );
          })
        )}

        {/* Recipe search */}
        <TextField
          variant="outlined"
          size="small"
          label="Search recipes to override"
          fullWidth
          className="mt-2"
          value={recipeSearch}
          onChange={(e) => setRecipeSearch(e.target.value)}
        />
        {recipeResults.map((recipe) => (
          <RecipeOverrideRow
            key={recipe.slug}
            recipe={recipe}
            denied={!isRecipeAllowed(config, recipe)}
            onClick={() => toggleRecipeOverride(recipe)}
          />
        ))}

        <HorizontalDivider />

        {/* Part availability */}
        <p className="text-sm mt-2 mb-1">Available parts</p>
        {config.availableParts.length === 0 && (
          <p className="text-sm text-gray-400 mb-1">
            No parts marked available. Add parts already produced elsewhere to
            prefer them.
          </p>
        )}
        {config.availableParts.map((slug) => {
          const part = partSlugLookup[slug];
          if (!part) return null;
          return (
            <div key={slug} className="flex flex-row items-center gap-x-2 mb-1">
              <Image
                src={part.iconSmall}
                alt={part.name}
                width={24}
                height={24}
              />
              <span className="text-sm grow">{part.name}</span>
              <Clickable
                onClick={() => removeAvailablePart(slug)}
                className="p-1"
              >
                <DeleteIcon fontSize="small" />
              </Clickable>
            </div>
          );
        })}
        {showPartSelector ? (
          <div className="mt-2">
            <PartSelector
              existingParts={partExclusions}
              onPartSelected={(part) => addAvailablePart(part.slug)}
            />
          </div>
        ) : (
          <Clickable
            onClick={() => setShowPartSelector(true)}
            className="flex flex-row items-center p-1 mt-1"
          >
            <AddIcon fontSize="small" />
            <span className="text-sm ml-1">Add available part</span>
          </Clickable>
        )}

        {/* Source factories */}
        <p className="text-sm mt-3 mb-1">Source factories</p>
        {sourceFactories.length === 0 && (
          <p className="text-sm text-gray-400 mb-1">
            No source factories selected.
          </p>
        )}
        {sourceFactories.map((sf) => (
          <div key={sf.id} className="mb-2">
            <div className="flex flex-row items-center gap-x-2">
              <span className="text-sm grow">{sf.name}</span>
              <Clickable
                onClick={() => removeSourceFactory(sf.id)}
                className="p-1"
              >
                <DeleteIcon fontSize="small" />
              </Clickable>
            </div>
            {sf.outputs.map((o) => (
              <div
                key={o.part.slug}
                className="flex flex-row items-center gap-x-2 ml-2"
              >
                <Image
                  src={o.part.iconSmall}
                  alt={o.part.name}
                  width={20}
                  height={20}
                />
                <span className="text-xs text-gray-400 grow">
                  {o.part.name}
                </span>
                <span className="text-xs text-gray-400">
                  {displayNum(o.rate)}/min
                </span>
              </div>
            ))}
          </div>
        ))}
        {library && factoryOptions.length > 0 && (
          <Autocomplete
            options={factoryOptions}
            openOnFocus
            blurOnSelect
            value={null}
            onChange={(_, option) => option && addSourceFactory(option.id)}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Add source factory" />
            )}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
