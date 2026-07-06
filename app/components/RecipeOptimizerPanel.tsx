"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { useMemo, useState } from "react";
import { displayNum } from "@/app/lib/format";
import type Factory from "../models/factory";
import { availableOutputsFrom } from "../models/factory-metrics";
import {
  deserializeFactory,
  type StorageLibrary,
} from "../models/factory-storage";
import { buildings, partSlugLookup, recipes } from "../models/game-data";
import {
  MAX_GAME_PHASE,
  type RecipeOptimizerConfig,
  recipeMatchesFilters,
  type ScoringObjective,
  setRecipesEnabled,
} from "../models/optimizer-config";
import { HorizontalDivider } from "./Dividers";
import PartSelector from "./PartSelector";
import PointValuesPanel from "./PointValuesPanel";
import RecipeListPanel from "./RecipeListPanel";
import TextCalculatorField from "./TextCalculatorField";
import ActionRow from "./ui/ActionRow";
import AddItemControl from "./ui/AddItemControl";
import Icon from "./ui/Icon";
import IconButton from "./ui/IconButton";

const OBJECTIVE_OPTIONS: {
  value: ScoringObjective;
  label: string;
  help?: string;
}[] = [
  {
    value: "minResources",
    label: "Minimum resource consumption",
    help: "Prefer recipes that ultimately use fewer raw resources to produce the same output. This often uses more power and/or requires more space.",
  },
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

interface RecipeOptimizerPanelProps {
  factory: Factory;
  library?: StorageLibrary;
  currentFactoryId?: string | null;
  onUpdateLibrary?: (overrides: Record<string, number>) => void;
}

// Inline, always-visible optimizer config (formerly RecipeOptimizerOptionsDialog).
// Live-write: edits write straight to factory.optimizer. Config only affects the
// next Solve/Optimize, so we do not auto-solve here (eager handles auto-rerun).
export default function RecipeOptimizerPanel({
  factory,
  library,
  currentFactoryId,
  onUpdateLibrary,
}: RecipeOptimizerPanelProps) {
  const [showRecipeList, setShowRecipeList] = useState(false);
  const [showPointValues, setShowPointValues] = useState(false);

  const config = factory.optimizer;

  function commit(next: RecipeOptimizerConfig) {
    factory.optimizer = next;
    factory.update();
  }

  function update(patch: Partial<RecipeOptimizerConfig>) {
    commit({ ...factory.optimizer, ...patch });
  }

  // The phase select is a definer: it recomputes the full enabled set across the
  // whole phase range. Buildings unlocked at or below `phase` are enabled, which
  // cascades to recipes — a recipe is enabled when it passes every bulk filter.
  function updatePhase(phase: number) {
    const buildingsEnabled = recipeBuildings
      .filter((b) => b.unlockPhase <= phase)
      .map((b) => b.slug);
    const next = { ...factory.optimizer, phase, buildingsEnabled };
    next.enabledRecipes = recipes
      .filter((r) => recipeMatchesFilters(next, r))
      .map((r) => r.slug);
    commit(next);
  }

  // Master switches keep their own state. Enabling a category adds only the
  // recipes in it that also pass the phase + building filters; disabling removes
  // every recipe in the category.
  function toggleCategory(
    category: "default" | "alternate" | "oreConversion",
    enabled: boolean,
  ) {
    const prev = factory.optimizer;
    const next = {
      ...prev,
      ...(category === "default"
        ? { defaultRecipesEnabled: enabled }
        : category === "alternate"
          ? { alternateRecipesEnabled: enabled }
          : { oreConversionRecipesEnabled: enabled }),
    };
    const inCategory = (r: (typeof recipes)[number]) => {
      if (category === "default") return !r.alternate;
      if (category === "alternate") return r.alternate;
      return r.isOreConversionRecipe();
    };
    const affected = enabled
      ? recipes.filter((r) => inCategory(r) && recipeMatchesFilters(next, r))
      : recipes.filter(inCategory);
    next.enabledRecipes = setRecipesEnabled(
      prev.enabledRecipes,
      affected.map((r) => r.slug),
      enabled,
    );
    commit(next);
  }

  function toggleRecipe(slug: string, enabled: boolean) {
    update({
      enabledRecipes: setRecipesEnabled(
        factory.optimizer.enabledRecipes,
        [slug],
        enabled,
      ),
    });
  }

  // Building switches keep their own state (buildingsEnabled list). Enabling a
  // building adds only its recipes that also pass the phase + category filters;
  // disabling removes every recipe in that building.
  function toggleBuilding(slug: string, enabled: boolean) {
    const prev = factory.optimizer;
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
    commit(next);
  }

  function addAvailablePart(slug: string) {
    update({
      availableParts: [...config.availableParts, { partSlug: slug, rate: 0 }],
    });
  }

  function updateAvailablePartRate(slug: string, rate: number | undefined) {
    update({
      availableParts: config.availableParts.map((p) =>
        p.partSlug === slug ? { ...p, rate: rate ?? 0 } : p,
      ),
    });
  }

  function updateAvailablePartHardLimit(slug: string, hardLimit: boolean) {
    update({
      availableParts: config.availableParts.map((p) =>
        p.partSlug === slug ? { ...p, hardLimit } : p,
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

  // Resolve selected source factories to their names + produced parts/rates.
  const sourceFactories = useMemo(() => {
    if (!library) return [];
    return config.availableFactoryIds.map((id) => {
      const sf = library.factories.find((f) => f.id === id);
      const f = sf ? deserializeFactory(sf, library) : null;
      const outputs = f ? availableOutputsFrom(f) : [];
      return { id, name: sf?.name ?? id, outputs };
    });
  }, [config.availableFactoryIds, library]);

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
    <div>
      <p className="text-lg mb-2">Recipe Optimizer</p>

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
          <div
            key={o.value}
            className="flex flex-row items-center rounded -mx-1 px-1 hover:bg-white/5"
          >
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
              <Button
                variant="contained"
                size="small"
                onClick={() => setShowPointValues((v) => !v)}
              >
                {showPointValues ? "Hide Values" : "Customize Point Values"}
              </Button>
            )}
          </div>
        ))}
      </RadioGroup>

      {showPointValues && (
        <PointValuesPanel
          factory={factory}
          library={library}
          onUpdateLibrary={onUpdateLibrary ?? (() => {})}
        />
      )}

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
          {Array.from({ length: MAX_GAME_PHASE }, (_, i) => i + 1).map((p) => (
            <MenuItem key={p} value={p}>
              Phase {p}
            </MenuItem>
          ))}
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
      <FormControlLabel
        control={
          <Switch
            disabled={!config.defaultRecipesEnabled}
            checked={
              config.defaultRecipesEnabled && config.oreConversionRecipesEnabled
            }
            onChange={(_, v) => toggleCategory("oreConversion", v)}
          />
        }
        label="Ore conversion recipes"
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
                    <Icon
                      src={building.iconSmall}
                      alt={building.name}
                      size={20}
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
        {config.enabledRecipes.length} of {recipes.length} recipes enabled. The
        controls above are helpers; fine-tune individual recipes here.
      </p>
      <ActionRow
        onClick={() => setShowRecipeList((s) => !s)}
        aria-expanded={showRecipeList}
        className="flex flex-row items-center p-1 mt-1"
      >
        <TuneIcon fontSize="small" />
        <span className="text-sm ml-1">
          {showRecipeList ? "Hide recipes" : "Manage recipes"}
        </span>
      </ActionRow>
      {showRecipeList && (
        <div className="mt-2">
          <RecipeListPanel
            enabledRecipes={config.enabledRecipes}
            onToggle={toggleRecipe}
          />
        </div>
      )}

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
            <Icon src={part.iconSmall} alt={part.name} size={24} />
            <span className="text-sm grow">{part.name}</span>
            <TextCalculatorField
              variant="outlined"
              size="small"
              label="Available /min"
              className="w-32"
              value={ap.rate}
              allowClear
              onCalculate={(v) => updateAvailablePartRate(ap.partSlug, v)}
              onClear={() => updateAvailablePartRate(ap.partSlug, undefined)}
            />
            <Tooltip title="Only this supply is used; the optimizer won't produce more of this part.">
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={ap.hardLimit ?? false}
                    onChange={(_, v) =>
                      updateAvailablePartHardLimit(ap.partSlug, v)
                    }
                  />
                }
                label={<span className="text-xs">Hard limit</span>}
                className="m-0"
              />
            </Tooltip>
            <IconButton
              aria-label="Remove available part"
              title=""
              onClick={() => removeAvailablePart(ap.partSlug)}
              className="p-1"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
        );
      })}
      <AddItemControl
        label="Add available part"
        triggerClassName="flex flex-row items-center p-1 mt-1"
        className="mt-2"
      >
        {(close) => (
          <PartSelector
            existingParts={partExclusions}
            onPartSelected={(part) => {
              addAvailablePart(part.slug);
              close();
            }}
          />
        )}
      </AddItemControl>

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
            <IconButton
              aria-label="Remove source factory"
              title=""
              onClick={() => removeSourceFactory(sf.id)}
              className="p-1"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
          {sf.outputs.map((o) => (
            <div
              key={o.part.slug}
              className="flex flex-row items-center gap-x-2 ml-2"
            >
              <Icon src={o.part.iconSmall} alt={o.part.name} size={20} />
              <span className="text-xs text-gray-400 grow">{o.part.name}</span>
              <span className="text-xs text-gray-400">
                {displayNum(o.rate)}/min
              </span>
            </div>
          ))}
        </div>
      ))}
      {library && factoryOptions.length > 0 && (
        <AddItemControl
          label="Add source factory"
          triggerClassName="flex flex-row items-center p-1 mt-1"
          className="mt-2"
        >
          {(close) => (
            <Autocomplete
              options={factoryOptions}
              openOnFocus
              blurOnSelect
              value={null}
              onChange={(_, option) => {
                if (option) {
                  addSourceFactory(option.id);
                  close();
                }
              }}
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
          )}
        </AddItemControl>
      )}
    </div>
  );
}
