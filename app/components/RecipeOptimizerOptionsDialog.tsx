"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import TuneIcon from "@mui/icons-material/Tune";
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
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type Factory from "../models/factory";
import {
  defaultRecipeOptimizerConfig,
  MAX_GAME_PHASE,
  type RecipeOptimizerConfig,
  recipeMatchesFilters,
  type ScoringObjective,
  setRecipesEnabled,
} from "../models/factory";
import {
  deserializeFactory,
  type StorageLibrary,
} from "../models/factory-storage";
import { buildings, partSlugLookup, recipes } from "../models/library";
import { displayNum } from "../utils";
import Clickable from "./Clickable";
import { HorizontalDivider } from "./Dividers";
import PartSelector from "./PartSelector";
import RecipeListDialog from "./RecipeListDialog";
import TextCalculatorField from "./TextCalculatorField";

const OBJECTIVE_OPTIONS: {
  value: ScoringObjective;
  label: string;
  help?: string;
}[] = [
  {
    value: "sinkPoints",
    label: "Maximum AWESOME sink point yield",
    help: "Prefer recipes that use less valuable or fewer inputs to produce the same output. This often uses more power and/or requires more space.",
  },
  {
    value: "power",
    label: "Minimum power consumption",
    help: "Prefer recipes that use less power to produce the same output. This often uses smaller and fewer buildings but consumes more resources.",
  },
  {
    value: "buildings",
    label: "Minimum factory size",
    help: "Prefer recipes from smaller buildings, or that require fewer buildings. This often consumes more resources.",
  },
  {
    value: "logistics",
    label: "Simple logistics",
    help: "Prefer recipes that minimize byproducts and parts per minute between recipes. This often consumes more resources.",
  },
  {
    value: "inputValue",
    label: "Minimum inputs based on custom point values",
    help: "Prefer recipes that minimize total resource consumption based on global limits using a custom point system. Configure part point value by clicking on the button to the right.",
  },
];

// Buildings that actually run craftable recipes, grouped by menuGroup/menuGroupIndex.
const recipeBuildings = buildings
  .filter((b) => recipes.some((r) => r.building.slug === b.slug))
  .sort((a, b) => {
    if (a.menuGroup !== b.menuGroup)
      return a.menuGroup.localeCompare(b.menuGroup);
    return a.menuGroupIndex - b.menuGroupIndex;
  });

const GROUP_ORDER: Record<string, number> = {
  factory: 0,
  smelter: 1,
  refinery: 2,
  generator: 3,
};
const GROUP_LABEL: Record<string, string> = {
  factory: "Factories",
  smelter: "Smelters",
  refinery: "Refineries",
  generator: "Generators",
};

const recipeBuildingGroups = recipeBuildings
  .reduce<{ group: string; buildings: (typeof recipeBuildings)[0][] }[]>(
    (acc, b) => {
      const last = acc[acc.length - 1];
      if (last && last.group === b.menuGroup) last.buildings.push(b);
      else acc.push({ group: b.menuGroup, buildings: [b] });
      return acc;
    },
    [],
  )
  .sort((a, b) => (GROUP_ORDER[a.group] ?? 99) - (GROUP_ORDER[b.group] ?? 99));

interface RecipeOptimizerDialogProps {
  open: boolean;
  onClose: () => void;
  factory: Factory;
  onApply: () => void;
  library?: StorageLibrary;
  currentFactoryId?: string | null;
}

export default function RecipeOptimizerOptionsDialog({
  open,
  onClose,
  factory,
  onApply,
  library,
  currentFactoryId,
}: RecipeOptimizerDialogProps) {
  const [config, setConfig] = useState<RecipeOptimizerConfig>(() => ({
    ...defaultRecipeOptimizerConfig(),
    ...factory.optimizer,
  }));
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [showFactorySelector, setShowFactorySelector] = useState(false);
  const [showRecipeList, setShowRecipeList] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally sync only when dialog opens, not on every factory.optimizer mutation
  useEffect(() => {
    if (open) {
      setConfig({ ...defaultRecipeOptimizerConfig(), ...factory.optimizer });
      setShowPartSelector(false);
      setShowFactorySelector(false);
      setShowRecipeList(false);
    }
  }, [open]);

  function update(patch: Partial<RecipeOptimizerConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  // The phase select is a definer: it recomputes the full enabled set across the
  // whole phase range. Buildings unlocked at or below `phase` are enabled, which
  // cascades to recipes — a recipe is enabled when it passes every bulk filter.
  function updatePhase(phase: number) {
    setConfig((prev) => {
      const buildingsEnabled = recipeBuildings
        .filter((b) => b.unlockPhase <= phase)
        .map((b) => b.slug);
      const next = { ...prev, phase, buildingsEnabled };
      next.enabledRecipes = recipes
        .filter((r) => recipeMatchesFilters(next, r))
        .map((r) => r.slug);
      return next;
    });
  }

  // Master switches keep their own state. Enabling a category adds only the
  // recipes in it that also pass the phase + building filters; disabling removes
  // every recipe in the category. So enabling "alternate" never re-enables a
  // recipe whose building is off or that is locked above the current phase.
  function toggleCategory(category: "default" | "alternate", enabled: boolean) {
    setConfig((prev) => {
      const next = {
        ...prev,
        ...(category === "alternate"
          ? { alternateRecipesEnabled: enabled }
          : { defaultRecipesEnabled: enabled }),
      };
      const inCategory = (r: (typeof recipes)[number]) =>
        category === "alternate" ? r.alternate : !r.alternate;
      const affected = enabled
        ? recipes.filter((r) => inCategory(r) && recipeMatchesFilters(next, r))
        : recipes.filter(inCategory);
      next.enabledRecipes = setRecipesEnabled(
        prev.enabledRecipes,
        affected.map((r) => r.slug),
        enabled,
      );
      return next;
    });
  }

  function toggleRecipe(slug: string, enabled: boolean) {
    setConfig((prev) => ({
      ...prev,
      enabledRecipes: setRecipesEnabled(prev.enabledRecipes, [slug], enabled),
    }));
  }

  // Building switches keep their own state (buildingsEnabled list). Enabling a
  // building adds only its recipes that also pass the phase + category filters;
  // disabling removes every recipe in that building.
  function toggleBuilding(slug: string, enabled: boolean) {
    setConfig((prev) => {
      const buildingsEnabled = enabled
        ? [...prev.buildingsEnabled, slug]
        : prev.buildingsEnabled.filter((s) => s !== slug);
      const next = { ...prev, buildingsEnabled };
      const buildingRecipes = recipes.filter((r) => r.building.slug === slug);
      const affected = enabled
        ? buildingRecipes.filter((r) => recipeMatchesFilters(next, r))
        : buildingRecipes;
      next.enabledRecipes = setRecipesEnabled(
        prev.enabledRecipes,
        affected.map((r) => r.slug),
        enabled,
      );
      return next;
    });
  }

  function addAvailablePart(slug: string) {
    update({
      availableParts: [...config.availableParts, { partSlug: slug }],
    });
    setShowPartSelector(false);
  }

  function updateAvailablePartRate(slug: string, rate: number | undefined) {
    update({
      availableParts: config.availableParts.map((p) =>
        p.partSlug === slug ? { ...p, rate } : p,
      ),
    });
  }

  function removeAvailablePart(slug: string) {
    update({
      availableParts: config.availableParts.filter((p) => p.partSlug !== slug),
    });
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
    factory.optimizer = config;
    factory.autoCalculateRates();
    onApply();
    onClose();
  }

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

  const partExclusions = config.availableParts.map((p) => p.partSlug);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Recipe Optimizer Options</DialogTitle>
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
        <p className="text-lg mt-2 mb-1">Optimize for</p>
        <RadioGroup
          value={config.objective}
          onChange={(_, v) => update({ objective: v as ScoringObjective })}
        >
          {OBJECTIVE_OPTIONS.map((o) => (
            <div key={o.value} className="flex flex-row items-center">
              <FormControlLabel
                className="grow"
                value={o.value}
                control={<Radio size="small" />}
                label={
                  <div className="flex">
                    {o.label}
                    <Tooltip title={o.help}>
                      <HelpOutlineOutlinedIcon className="ml-1" />
                    </Tooltip>
                  </div>
                }
              />
              {o.value === "inputValue" && (
                <Button variant="contained" size="small">
                  Customize Point Values
                </Button>
              )}
            </div>
          ))}
        </RadioGroup>

        <HorizontalDivider />

        {/* Keep vs overwrite */}
        <div className="text-md mt-2">
          Should the optimizer replace existing recipes?
        </div>
        <FormControlLabel
          control={
            <Switch
              checked={config.overwrite}
              onChange={(_, v) => update({ overwrite: v })}
            />
          }
          label={
            config.overwrite
              ? "Overwrite all recipes"
              : "Fill gaps only (keep my recipes)"
          }
        />

        <HorizontalDivider />

        {/* Tech / game phase filter */}
        <div className="flex flex-row text-lg">Recipe Filters</div>
        <div className="text-sm text-gray-400 mb-2">
          Filter recipes by game phase and other controls. Changing game phase
          will reset all recipe selections.
        </div>
        <div className="flex flex-row items-center gap-x-2 mt-2 mb-2">
          <span className="text-md w-28 shrink-0">Game phase</span>
          <Select
            size="small"
            value={config.phase}
            onChange={(e) => updatePhase(Number(e.target.value))}
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
          label="Default recipes"
        />
        <FormControlLabel
          control={
            <Switch
              checked={config.alternateRecipesEnabled}
              onChange={(_, v) => toggleCategory("alternate", v)}
            />
          }
          label="Alternate recipes"
        />

        {/* Buildings */}
        <p className="text-md mt-4">Buildings</p>
        <p className="text-sm mt-2 mb-2 text-gray-400">
          Enable or disable which buildings are allowed.
        </p>
        <div className="flex flex-row flex-wrap gap-x-6">
          {recipeBuildingGroups.map(({ group, buildings: groupBuildings }) => (
            <div key={group} className="flex flex-col">
              <p className="text-sm text-gray-400 mb-1">
                {GROUP_LABEL[group] ?? group}
              </p>
              {groupBuildings.map((building) => (
                <FormControlLabel
                  key={building.slug}
                  control={
                    <Switch
                      size="small"
                      checked={config.buildingsEnabled.includes(building.slug)}
                      disabled={config.phase < building.unlockPhase}
                      onChange={(_, v) => toggleBuilding(building.slug, v)}
                    />
                  }
                  label={
                    <span className="flex flex-row items-center gap-x-1">
                      <Image
                        src={building.iconSmall}
                        alt={building.name}
                        width={20}
                        height={20}
                      />
                      <span className="text-sm">{building.name}</span>
                    </span>
                  }
                />
              ))}
            </div>
          ))}
        </div>

        {/* Recipe management */}
        <p className="text-sm text-gray-400 mb-1 mt-4">
          {config.enabledRecipes.length} of {recipes.length} recipes enabled.
          The controls above are helpers; fine-tune individual recipes here.
        </p>
        <Clickable
          onClick={() => setShowRecipeList(true)}
          className="flex flex-row items-center p-1 mt-1"
        >
          <TuneIcon fontSize="small" />
          <span className="text-sm ml-1">Manage recipes</span>
        </Clickable>

        <HorizontalDivider />

        {/* Part availability */}
        <p className="text-md mt-4 mb-1">Available parts</p>
        {config.availableParts.length === 0 && (
          <p className="text-sm text-gray-400 mb-1">
            Add parts already produced elsewhere to prefer them.
          </p>
        )}
        {config.availableParts.map((ap) => {
          const part = partSlugLookup[ap.partSlug];
          if (!part) return null;
          return (
            <div
              key={ap.partSlug}
              className="flex flex-row items-center gap-x-2 mb-2"
            >
              <Image
                src={part.iconSmall}
                alt={part.name}
                width={24}
                height={24}
              />
              <span className="text-sm grow">{part.name}</span>
              <TextCalculatorField
                variant="outlined"
                size="small"
                label="Available /min"
                className="w-32"
                value={ap.rate ?? ""}
                allowClear
                onCalculate={(v) => updateAvailablePartRate(ap.partSlug, v)}
                onClear={() => updateAvailablePartRate(ap.partSlug, undefined)}
              />
              <Clickable
                onClick={() => removeAvailablePart(ap.partSlug)}
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
              onBlur={() => setShowPartSelector(false)}
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
        <p className="text-md mt-4 mb-1">Source factories</p>
        {sourceFactories.length === 0 && (
          <p className="text-sm text-gray-400 mb-1">
            Specify source factories to bring their outputs into the equation.
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
        {library &&
          factoryOptions.length > 0 &&
          (showFactorySelector ? (
            <div className="mt-2">
              <Autocomplete
                options={factoryOptions}
                openOnFocus
                blurOnSelect
                value={null}
                onChange={(_, option) => {
                  if (option) {
                    addSourceFactory(option.id);
                    setShowFactorySelector(false);
                  }
                }}
                onBlur={() => setShowFactorySelector(false)}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Add source factory"
                    autoFocus
                  />
                )}
              />
            </div>
          ) : (
            <Clickable
              onClick={() => setShowFactorySelector(true)}
              className="flex flex-row items-center p-1 mt-1"
            >
              <AddIcon fontSize="small" />
              <span className="text-sm ml-1">Add source factory</span>
            </Clickable>
          ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
      <RecipeListDialog
        open={showRecipeList}
        onClose={() => setShowRecipeList(false)}
        enabledRecipes={config.enabledRecipes}
        onToggle={toggleRecipe}
      />
    </Dialog>
  );
}
